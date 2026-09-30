import "./App.css";
import { CaptureForm } from "../features/crawler/components/CaptureForm";
import { CaptureViewer } from "../features/crawler/components/CaptureViewer";
import { useInteractionExecution } from "../features/crawler/hooks/useInteractionExecution";
import { usePageCapture } from "../features/crawler/hooks/usePageCapture";
import { AppErrorBoundary } from "./AppErrorBoundary";

function Workbench() {
  const { capture, isCapturing, error, runCapture } = usePageCapture();
  const {
    result,
    isExecuting,
    error: executionError,
    runInteraction,
    clearExecutionError,
    resetExecution,
  } = useInteractionExecution();

  async function captureUrl(url: string) {
    resetExecution();
    await runCapture(url);
  }

  const isBusy = isCapturing || isExecuting;
  const busyTitle = isCapturing ? "Capturing page…" : "Executing interaction…";
  const busyDetail = isCapturing
    ? "Loading the page, waiting for the UI to stabilize, and recording the capture."
    : "Waiting for the resulting UI to stabilize and capturing the new state.";

  return (
    <main className="app-shell" aria-busy={isBusy}>
      <section className="capture-panel">
        <CaptureForm isCapturing={isBusy} onCapture={captureUrl} />
        {error && <p className="capture-error">{error}</p>}
      </section>

      {capture ? (
        <CaptureViewer
          key={capture.capturedAt}
          capture={capture}
          executionResult={result}
          isExecuting={isExecuting}
          executionError={executionError}
          onInteractionSelected={clearExecutionError}
          onExecute={runInteraction}
        />
      ) : (
        <section className="empty-state">
          <h2>pUXWorkbench</h2>
          <p>Enter a source URL to begin capturing UI states.</p>
        </section>
      )}

      {isBusy && (
        <div className="workbench-busy" role="status" aria-live="polite">
          <div className="workbench-busy__card">
            <span className="spinner spinner--large" aria-hidden="true" />
            <strong>{busyTitle}</strong>
            <span>{busyDetail}</span>
          </div>
        </div>
      )}
    </main>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <Workbench />
    </AppErrorBoundary>
  );
}

export default App;
