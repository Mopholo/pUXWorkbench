import { useState, type FormEvent } from "react";
interface Props { isCapturing: boolean; onCapture: (url: string) => Promise<void> }
export function CaptureForm({ isCapturing, onCapture }: Props) {
  const [url, setUrl] = useState("https://example.com");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await onCapture(url); }
  return <form className="capture-form" onSubmit={submit}><label htmlFor="capture-url">Website URL</label><div className="capture-form__controls"><input id="capture-url" value={url} onChange={(e) => setUrl(e.currentTarget.value)} placeholder="https://example.com" autoComplete="url" disabled={isCapturing}/><button type="submit" disabled={isCapturing || !url.trim()}>{isCapturing ? "Capturing…" : "Capture Page"}</button></div></form>;
}
