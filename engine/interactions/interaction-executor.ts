import { createHash } from "node:crypto";
import type { Page } from "playwright";
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

async function settleAfterInteraction(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded", { timeout: 5_000 }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 2_500 }).catch(() => undefined);
  await page.waitForTimeout(350);
}

export async function executeInteraction(
  page: Page,
  sourceCapture: PageCapture,
  interaction: PageInteraction,
): Promise<InteractionExecutionResult> {
  if (interaction.executionSafety !== "allowed") {
    throw new Error(interaction.executionReason);
  }

  await page.goto(sourceCapture.finalUrl, { waitUntil: "networkidle", timeout: 30_000 });

  const locator = page.locator(interaction.locator.selector).first();
  if ((await locator.count()) === 0) {
    throw new Error(`The selected interaction could not be reconstructed: ${interaction.locator.selector}`);
  }

  await locator.scrollIntoViewIfNeeded();
  await locator.click({ timeout: 10_000 });
  await settleAfterInteraction(page);

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
