import { createBrowserSession, closeBrowserSession } from "../browser/browser-manager.ts";
import { capturePage } from "../capture/page-capture.ts";

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("A URL is required.");
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(candidate);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only HTTP and HTTPS URLs are supported.");
  return url.toString();
}

async function main(): Promise<void> {
  const input = process.argv[2];
  if (!input) throw new Error("Usage: capture-page <url>");
  const session = await createBrowserSession();
  try {
    const result = await capturePage(session.page, normalizeUrl(input));
    process.stdout.write(JSON.stringify(result));
  } finally {
    await closeBrowserSession(session);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
