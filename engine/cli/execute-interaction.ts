import { createBrowserSession, closeBrowserSession } from "../browser/browser-manager.ts";
import { executeInteraction } from "../interactions/interaction-executor.ts";
import type { PageCapture, PageInteraction } from "../models/page-capture.ts";

interface ExecutionInput {
  sourceCapture: PageCapture;
  interaction: PageInteraction;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const rawInput = await readStdin();
  if (!rawInput.trim()) throw new Error("Interaction execution input is required.");

  const input = JSON.parse(rawInput) as ExecutionInput;
  const session = await createBrowserSession();
  try {
    const result = await executeInteraction(session.page, input.sourceCapture, input.interaction);
    process.stdout.write(JSON.stringify(result));
  } finally {
    await closeBrowserSession(session);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
