import "./App.css";
import { CaptureForm } from "../features/crawler/components/CaptureForm";
import { CaptureViewer } from "../features/crawler/components/CaptureViewer";
import { usePageCapture } from "../features/crawler/hooks/usePageCapture";

function App() {
  const { capture, isCapturing, error, runCapture } = usePageCapture();
  return <main className="app-shell"><header className="app-header"><p className="app-header__eyebrow">pUXWorkbench</p><h1>Single Page Capture</h1><p className="app-header__description">Render a website at the canonical 1440px desktop viewport and inspect the captured page.</p></header><section className="capture-panel"><CaptureForm isCapturing={isCapturing} onCapture={runCapture}/>{error && <p className="capture-error" role="alert">{error}</p>}</section>{capture ? <CaptureViewer capture={capture}/> : <section className="empty-state"><h2>No capture yet</h2><p>Enter a URL above to create the first observed page capture.</p></section>}</main>;
}
export default App;
