import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;

export async function createBrowserSession(): Promise<BrowserSession> {
  const browser = await chromium.launch({ headless: true });
  const chromiumVersion = browser.version();
  const userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromiumVersion} Safari/537.36`;

  const context = await browser.newContext({
    viewport: DESKTOP_VIEWPORT,
    deviceScaleFactor: 1,
    userAgent,
    locale: "en-CA",
  });
  const page = await context.newPage();
  return { browser, context, page };
}

export async function closeBrowserSession(session: BrowserSession): Promise<void> {
  await session.context.close();
  await session.browser.close();
}
