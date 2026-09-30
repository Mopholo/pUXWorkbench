import { invoke } from "@tauri-apps/api/core";
import { pageCaptureSchema, type PageCapture } from "../../../../shared/schemas/page-capture";

export async function capturePage(url: string): Promise<PageCapture> {
  return pageCaptureSchema.parse(await invoke<unknown>("capture_page", { url }));
}
