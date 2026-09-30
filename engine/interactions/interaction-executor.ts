import { createHash } from "node:crypto";
import type { Locator, Page } from "playwright";
import { captureCurrentPage, waitForCaptureStability } from "../capture/page-capture.ts";
import type { PageCapture, PageInteraction, ReconstructionStep } from "../models/page-capture.ts";
import type { InteractionExecutionResult, TransitionKind, UIState } from "../models/ui-state.ts";

function stateId(c: PageCapture) {
  // State identity describes the observed UI structure, not volatile screenshot
  // bytes. Re-capturing the same logical state must resolve to the same graph
  // node so A -> A is a self-edge rather than a chain of duplicate A nodes.
  const structuralIdentity = [
    c.finalUrl,
    c.title,
    `${Math.round(c.scrollPosition.x)},${Math.round(c.scrollPosition.y)}`,
    `${c.viewport.width}x${c.viewport.height}`,
    `${c.document.width}x${c.document.height}`,
    sig(c),
  ].join("\n");
  return `state-${createHash("sha256").update(structuralIdentity).digest("hex").slice(0, 16)}`;
}
function hash(c: PageCapture) { return createHash("sha256").update(c.screenshot.dataUrl).digest("hex"); }
function sig(c: PageCapture) {
  return c.interactions.map(i => [i.elementType, i.role ?? "", i.accessibleName, i.visibleText, i.href ?? "", Math.round(i.bounds.x), Math.round(i.bounds.y), Math.round(i.bounds.width), Math.round(i.bounds.height)].join("|")).sort().join("\n");
}

function candidates(page: Page, i: PageInteraction): Locator[] {
  const c: Locator[] = [];
  if (i.locator.id) c.push(page.locator(`[id=${JSON.stringify(i.locator.id)}]`));
  if (i.locator.testId) c.push(page.getByTestId(i.locator.testId));
  if (i.role && i.accessibleName) c.push(page.getByRole(i.role as Parameters<Page["getByRole"]>[0], { name: i.accessibleName, exact: true }));
  if (i.elementType === "a" && i.accessibleName) c.push(page.getByRole("link", { name: i.accessibleName, exact: true }));
  if (i.elementType === "button" && i.accessibleName) c.push(page.getByRole("button", { name: i.accessibleName, exact: true }));
  if (i.elementType === "select" && i.accessibleName) c.push(page.getByRole("combobox", { name: i.accessibleName, exact: true }));
  if (i.elementType === "select") c.push(page.locator("select"));
  if (i.href && i.elementType === "a") c.push(page.locator(`a[href=${JSON.stringify(i.href)}]`));
  if (i.locator.name) c.push(page.locator(`${i.locator.tagName}[name=${JSON.stringify(i.locator.name)}]`));
  if (i.visibleText) c.push(page.locator(i.locator.tagName).filter({ hasText: i.visibleText }));
  c.push(page.locator(i.locator.selector));
  return c;
}

async function resolve(page: Page, i: PageInteraction) {
  let best: { locator: Locator; distance: number } | null = null;
  for (const candidate of candidates(page, i)) {
    const count = Math.min(await candidate.count().catch(() => 0), 12);
    for (let n = 0; n < count; n++) {
      const l = candidate.nth(n);
      if (!await l.isVisible().catch(() => false)) continue;
      const b = await l.boundingBox().catch(() => null);
      if (!b) continue;
      const d = Math.hypot(b.x - i.bounds.x, b.y - i.bounds.y, b.width - i.bounds.width, b.height - i.bounds.height);
      if (!best || d < best.distance) best = { locator: l, distance: d };
    }
    if (best && best.distance < 2) break;
  }
  if (!best) throw new Error(`The selected interaction could not be reconstructed: ${i.accessibleName || i.locator.selector}`);
  return best.locator;
}

async function clickAndFollow(page: Page, interaction: PageInteraction): Promise<Page> {
  const locator = await resolve(page, interaction);
  await locator.scrollIntoViewIfNeeded();
  const context = page.context();
  const popupPromise = context.waitForEvent("page", { timeout: 1200 }).catch(() => null);
  await locator.click({ timeout: 10000 });
  const popup = await popupPromise;
  const target = popup ?? page;
  if (popup) await popup.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => undefined);
  await waitForCaptureStability(target);
  return target;
}

async function reconstructSource(page: Page, source: PageCapture): Promise<Page> {
  const reconstruction = source.reconstruction ?? { baseUrl: source.finalUrl, steps: [] };
  await page.goto(reconstruction.baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForCaptureStability(page);
  let current = page;
  for (const step of reconstruction.steps) {
    if (step.sourceScrollPosition.x || step.sourceScrollPosition.y) {
      await current.evaluate(({ x, y }) => scrollTo(x, y), step.sourceScrollPosition);
    }
    current = await clickAndFollow(current, step.interaction);
  }
  if (source.scrollPosition.x || source.scrollPosition.y) {
    await current.evaluate(({ x, y }) => scrollTo(x, y), source.scrollPosition);
    await current.waitForTimeout(100);
  }
  return current;
}

function navigationScope(from: string, to: string) {
  if (from === to) return "none" as const;
  const a = new URL(from).hostname, b = new URL(to).hostname;
  if (a === b) return "same-host" as const;
  if (a.endsWith(`.${b}`) || b.endsWith(`.${a}`)) return "subdomain" as const;
  const ap = a.split(".").slice(-2).join("."), bp = b.split(".").slice(-2).join(".");
  if (ap === bp) return "subdomain" as const;
  return "external" as const;
}
function kind(signals: { urlChanged: boolean; titleChanged: boolean; documentSizeChanged: boolean; interactionSetChanged: boolean; screenshotChanged: boolean; scrollChanged: boolean }): TransitionKind {
  if (signals.urlChanged) return "navigation";
  if (signals.scrollChanged && !signals.documentSizeChanged && !signals.interactionSetChanged) return "view";
  if (signals.titleChanged || signals.documentSizeChanged || signals.interactionSetChanged || signals.screenshotChanged) return "structural";
  return "none";
}

export async function executeInteraction(page: Page, source: PageCapture, interaction: PageInteraction, allowReview = false): Promise<InteractionExecutionResult> {
  if (interaction.executionSafety === "blocked") throw new Error(interaction.executionReason);
  if (interaction.executionSafety === "review" && !allowReview) throw new Error("This interaction requires review. Explicitly allow it before execution.");

  const reconstructedPage = await reconstructSource(page, source);
  const before = await reconstructedPage.evaluate(() => ({ x: scrollX, y: scrollY }));
  const targetPage = await clickAndFollow(reconstructedPage, interaction);
  const target = await captureCurrentPage(targetPage, source.requestedUrl);

  const priorSteps = source.reconstruction?.steps ?? [];
  const step: ReconstructionStep = { interaction, allowReview, sourceScrollPosition: source.scrollPosition };
  target.reconstruction = {
    baseUrl: source.reconstruction?.baseUrl ?? source.finalUrl,
    steps: [...priorSteps, step],
  };

  const sourceState: UIState = { id: stateId(source), pageUrl: source.finalUrl, scrollPosition: source.scrollPosition, capture: source, parentStateId: null, triggeringInteractionId: null };
  const targetState: UIState = { id: stateId(target), pageUrl: target.finalUrl, scrollPosition: target.scrollPosition, capture: target, parentStateId: sourceState.id, triggeringInteractionId: interaction.id };
  const signals = {
    urlChanged: source.finalUrl !== target.finalUrl,
    titleChanged: source.title !== target.title,
    documentSizeChanged: source.document.width !== target.document.width || source.document.height !== target.document.height,
    interactionSetChanged: sig(source) !== sig(target),
    screenshotChanged: hash(source) !== hash(target),
    scrollChanged: Math.abs(target.scrollPosition.x - before.x) > 2 || Math.abs(target.scrollPosition.y - before.y) > 2,
  };
  const changed = Object.values(signals).some(Boolean);
  return { sourceState, targetState, transition: { id: `transition-${sourceState.id}-${interaction.id}-${targetState.id}`, sourceStateId: sourceState.id, targetStateId: targetState.id, interaction, changed, kind: kind(signals), safetyOverrideApplied: interaction.executionSafety === "review" && allowReview, openedNewPage: targetPage !== reconstructedPage, navigationScope: navigationScope(source.finalUrl, target.finalUrl), changeSignals: signals } };
}
