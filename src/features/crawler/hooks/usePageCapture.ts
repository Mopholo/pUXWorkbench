import { useState } from "react";
import type { PageCapture } from "../../../../shared/schemas/page-capture";
import { capturePage } from "../services/captureService";
const paint=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
export function usePageCapture() {
  const [capture, setCapture] = useState<PageCapture | null>(null); const [isCapturing, setIsCapturing] = useState(false); const [error, setError] = useState<string | null>(null);
  async function runCapture(url: string): Promise<PageCapture | null> { setIsCapturing(true); setError(null); await paint(); try { const next=await capturePage(url); setCapture(next); return next; } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); return null; } finally { setIsCapturing(false); } }
  return { capture, isCapturing, error, runCapture };
}
