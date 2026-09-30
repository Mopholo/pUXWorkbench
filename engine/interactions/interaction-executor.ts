import { createHash } from "node:crypto";
import type { Locator, Page } from "playwright";
import { captureCurrentPage } from "../capture/page-capture.ts";
import type { PageCapture, PageInteraction } from "../models/page-capture.ts";
import type { InteractionExecutionResult, UIState } from "../models/ui-state.ts";

function stateId(prefix: string, capture: PageCapture): string {
  const digest = createHash("sha256")
    .update(`${capture.finalUrl}\n${capture.title}\n${capture.screenshot.dataUrl}`)
    .digest("hex")
    .slice(0, 16);
  return `${prefix}-${digest}`;
}

function screenshotHash(capture: PageCapture): string {
  return createHash("sha256").update(capture.screenshot.dataUrl).digest("hex");
}

function interactionSignature(capture: PageCapture): string {
  return capture.interactions
    .map((interaction) => [
      interaction.elementType,
      interaction.role ?? "",
      interaction.accessibleName,
      interaction.visibleText,
      interaction.href ?? "",
      Math.round(interaction.bounds.x),
      Math.round(interaction.bounds.y),
      Math.round(interaction.bounds.width),
      Math.round(interaction.bounds.height),
    ].join("|"))
    .sort()
    .join("\n");
}

function candidateLocators(page: Page, interaction: PageInteraction): Locator[] {
  const candidates: Locator[] = [];

  if (interaction.locator.id) candidates.push(page.locator(`[id=${JSON.stringify(interaction.locator.id)}]`));
  if (interaction.locator.testId) candidates.push(page.getByTestId(interaction.locator.testId));

  if (interaction.role && interaction.accessibleName) {
    candidates.push(page.getByRole(
      interaction.role as Parameters<Page["getByRole"]>[0],
      { name: interaction.accessibleName, exact: true },
    ));
  }

  if (interaction.elementType === "a" && interaction.accessibleName) {
    candidates.push(page.getByRole("link", { name: interaction.accessibleName, exact: true }));
  }

  if (interaction.elementType === "button" && interaction.accessibleName) {
    candidates.push(page.getByRole("button", { name: interaction.accessibleName, exact: true }));
  }

  if (interaction.locator.name) {
    candidates.push(page.locator(`${interaction.locator.tagName}[name=${JSON.stringify(interaction.locator.name)}]`));
  }

  if (interaction.visibleText) {
    candidates.push(page.locator(interaction.locator.tagName).filter({ hasText: interaction.visibleText }));
  }

  candidates.push(page.locator(interaction.locator.selector));
  return candidates;
}

async function resolveInteraction(page: Page, interaction: PageInteraction): Promise<Locator> {
  let best: { locator: Locator; distance: number } | null = null;

  for (const candidate of candidateLocators(page, interaction)) {
    const count = Math.min(await candidate.count().catch(() => 0), 12);
    for (let index = 0; index < count; index += 1) {
      const locator = candidate.nth(index);
      if (!(await locator.isVisible().catch(() => false))) continue;
      const box = await locator.boundingBox().catch(() => null);
      if (!box) continue;

      const distance = Math.hypot(
        box.x - interaction.bounds.x,
        box.y - interaction.bounds.y,
        box.width - interaction.bounds.width,
        box.height - interaction.bounds.height,
      );
      if (!best || distance < best.distance) best = { locator, distance };
    }
    if (best && best.distance < 2) break;
  }

  if (!best) {
    throw new Error(
      `The selected interaction could not be reconstructed from its semantic identity or fallback selector: ${interaction.locator.selector}`,
    );
  }

  return best.locator;
}

export async function executeInteraction(
  page: Page,
  sourceCapture: PageCapture,
  interaction: PageInteraction,
): Promise<InteractionExecutionResult> {
  if (interaction.executionSafety !== "allowed") {
    throw new Error(interaction.executionReason);
  }

  await page.goto(sourceCapture.finalUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const locator = await resolveInteraction(page, interaction);
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ timeout: 10_000 });

  const targetCapture = await captureCurrentPage(page, sourceCapture.requestedUrl);
  const scrollPosition = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));

  const sourceState: UIState = {
    id: stateId("state", sourceCapture),
    pageUrl: sourceCapture.finalUrl,
    scrollPosition: { x: 0, y: 0 },
    capture: sourceCapture,
    parentStateId: null,
    triggeringInteractionId: null,
  };

  const targetState: UIState = {
    id: stateId("state", targetCapture),
    pageUrl: targetCapture.finalUrl,
    scrollPosition,
    capture: targetCapture,
    parentStateId: sourceState.id,
    triggeringInteractionId: interaction.id,
  };

  const changeSignals = {
    urlChanged: sourceCapture.finalUrl !== targetCapture.finalUrl,
    titleChanged: sourceCapture.title !== targetCapture.title,
    documentSizeChanged:
      sourceCapture.document.width !== targetCapture.document.width ||
      sourceCapture.document.height !== targetCapture.document.height,
    interactionSetChanged: interactionSignature(sourceCapture) !== interactionSignature(targetCapture),
    screenshotChanged: screenshotHash(sourceCapture) !== screenshotHash(targetCapture),
  };
  const changed = Object.values(changeSignals).some(Boolean);

  return {
    sourceState,
    targetState,
    transition: {
      id: `transition-${sourceState.id}-${interaction.id}-${targetState.id}`,
      sourceStateId: sourceState.id,
      targetStateId: targetState.id,
      interaction,
      changed,
      changeSignals,
    },
  };
}
