import type { Page } from "playwright";
import { discoverInteractions } from "../interactions/interaction-discovery.ts";
import type { PageCapture } from "../models/page-capture.ts";

export async function captureCurrentPage(page: Page, requestedUrl: string): Promise<PageCapture> {
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
  await page.goto(requestedUrl, { waitUntil: "networkidle", timeout: 30_000 });
  return captureCurrentPage(page, requestedUrl);
}
