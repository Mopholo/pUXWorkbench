import type { Page } from "playwright";
import { discoverInteractions } from "../interactions/interaction-discovery.ts";
import type { PageCapture } from "../models/page-capture.ts";

export async function waitForCaptureStability(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded", { timeout: 5_000 }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => undefined);
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }).catch(() => undefined);

  // Give entrance transitions, lazy layout work, and short CSS animations time to settle
  // before geometry and pixels are sampled from the same visual state.
  await page.waitForTimeout(800);
}

export async function captureCurrentPage(page: Page, requestedUrl: string): Promise<PageCapture> {
  await waitForCaptureStability(page);

  const title = await page.title();
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("The browser page does not have a configured viewport.");

  const documentSize = await page.evaluate(() => ({
    width: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0),
    height: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0),
  }));

  const interactions = await discoverInteractions(page, documentSize);
  const screenshot = await page.screenshot({ fullPage: true, type: "png" });

  return {
    requestedUrl,
    finalUrl: page.url(),
    title,
    capturedAt: new Date().toISOString(),
    viewport,
    document: documentSize,
    interactions,
    screenshot: {
      mediaType: "image/png",
      dataUrl: `data:image/png;base64,${screenshot.toString("base64")}`,
    },
  };
}

export async function capturePage(page: Page, requestedUrl: string): Promise<PageCapture> {
  await page.goto(requestedUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  return captureCurrentPage(page, requestedUrl);
}
