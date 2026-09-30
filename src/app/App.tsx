import "./App.css";
import { CaptureForm } from "../features/crawler/components/CaptureForm";
import { CaptureViewer } from "../features/crawler/components/CaptureViewer";
import { useInteractionExecution } from "../features/crawler/hooks/useInteractionExecution";
import { usePageCapture } from "../features/crawler/hooks/usePageCapture";

function App() {
  const { capture, isCapturing, error, runCapture } = usePageCapture();
  const {
    result: executionResult,
    isExecuting,
    error: executionError,
    runInteraction,
    clearExecutionError,
    resetExecution,
  } = useInteractionExecution();

  async function captureUrl(url: string): Promise<void> {
    resetExecution();
    await runCapture(url);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="app-header__eyebrow">pUXWorkbench</p>
        <h1>UI State Capture</h1>
        <p className="app-header__description">
          Capture a page, inspect its interactions, explicitly execute eligible controls, and record the resulting UI state and transition.
        </p>
      </header>

      <section className="capture-panel">
        <CaptureForm isCapturing={isCapturing || isExecuting} onCapture={captureUrl} />
        {error && <p className="capture-error" role="alert">{error}</p>}
      </section>

      {capture ? (
        <CaptureViewer
          key={capture.capturedAt}
          capture={capture}
          executionResult={executionResult}
          isExecuting={isExecuting}
          executionError={executionError}
          onInteractionSelected={clearExecutionError}
          onExecute={runInteraction}
        />
      ) : (
        <section className="empty-state">
          <h2>No capture yet</h2>
          <p>Enter a URL above to capture a source state and discover its interactive elements.</p>
        </section>
      )}
    </main>
  );
}

export default App;
