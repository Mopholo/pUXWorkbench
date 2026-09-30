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

  return (
    <main className="app-shell">
      <section className="capture-panel">
        <CaptureForm isCapturing={isCapturing || isExecuting} onCapture={captureUrl} />
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
