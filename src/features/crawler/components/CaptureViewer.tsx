import type { PageCapture } from "../../../../shared/schemas/page-capture";
interface Props { capture: PageCapture }
export function CaptureViewer({ capture }: Props) {
  return <section className="capture-result" aria-label="Page capture"><header className="capture-result__header"><div><h2>{capture.title || "Untitled page"}</h2><a href={capture.finalUrl} target="_blank" rel="noreferrer">{capture.finalUrl}</a></div><dl className="capture-result__metadata"><div><dt>Viewport</dt><dd>{capture.viewport.width} × {capture.viewport.height}</dd></div><div><dt>Document</dt><dd>{capture.document.width} × {capture.document.height}</dd></div></dl></header><div className="capture-viewer"><img src={capture.screenshot.dataUrl} alt={`Full-page capture of ${capture.title || capture.finalUrl}`}/></div></section>;
}
