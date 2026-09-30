import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export interface BrowserSession { browser: Browser; context: BrowserContext; page: Page }

const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;

export async function createBrowserSession(): Promise<BrowserSession> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: DESKTOP_VIEWPORT, deviceScaleFactor: 1 });
  const page = await context.newPage();
  return { browser, context, page };
}

export async function closeBrowserSession(session: BrowserSession): Promise<void> {
  await session.context.close();
  await session.browser.close();
}
