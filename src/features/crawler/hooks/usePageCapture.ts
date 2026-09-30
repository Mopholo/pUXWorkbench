import { useState } from "react";
import type { PageCapture } from "../../../../shared/schemas/page-capture";
import { capturePage } from "../services/captureService";

export function usePageCapture() {
  const [capture, setCapture] = useState<PageCapture | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runCapture(url: string): Promise<void> {
    setIsCapturing(true);
    setError(null);
    try {
      setCapture(await capturePage(url));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsCapturing(false);
    }
  }

  return { capture, isCapturing, error, runCapture };
}
