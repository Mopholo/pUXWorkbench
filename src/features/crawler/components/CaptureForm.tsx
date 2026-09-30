import { useState, type FormEvent } from "react";

interface Props {
  isCapturing: boolean;
  onCapture: (url: string) => Promise<void>;
}

export function CaptureForm({ isCapturing, onCapture }: Props) {
  const [url, setUrl] = useState("https://example.com");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onCapture(url);
  }

  return (
    <form className="capture-form" onSubmit={submit}>
      <input
        aria-label="Source URL"
        value={url}
        onChange={(event) => setUrl(event.currentTarget.value)}
        placeholder="https://example.com"
        disabled={isCapturing}
      />
      <button disabled={isCapturing || !url.trim()}>
        {isCapturing ? "Capturing…" : "Capture"}
      </button>
    </form>
  );
}
