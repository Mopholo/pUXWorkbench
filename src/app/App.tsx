import { useEffect } from "react";
import "./App.css";
import { CaptureForm } from "../features/crawler/components/CaptureForm";
import { CaptureViewer } from "../features/crawler/components/CaptureViewer";
import { useInteractionExecution } from "../features/crawler/hooks/useInteractionExecution";
import { usePageCapture } from "../features/crawler/hooks/usePageCapture";
import { findCapturedTransition, useCaptureGraph } from "../features/crawler/hooks/useCaptureGraph";
import { AppErrorBoundary } from "./AppErrorBoundary";

function Workbench() {
  const { capture, isCapturing, error, runCapture } = usePageCapture();
  const { result, isExecuting, error: executionError, runInteraction, clearExecutionError, resetExecution } = useInteractionExecution();
  const graph = useCaptureGraph();
  const currentState = graph.currentStateId ? graph.states[graph.currentStateId] : null;

  async function captureUrl(url: string) {
    resetExecution();
    const next = await runCapture(url);
    if (next) {
      graph.reset();
      graph.startCapture(next);
    }
  }

  async function executeCurrent(interaction: Parameters<typeof runInteraction>[1], allowReview: boolean) {
    const liveGraph = useCaptureGraph.getState();
    const sourceStateId = liveGraph.currentStateId;
    if (!sourceStateId) return;

    // Defense in depth: the viewer normally follows known edges before the
    // inspector opens. If stale UI still calls Execute, never contact the live
    // site for an interaction whose graph edge is already known.
    const known = findCapturedTransition(liveGraph.transitions, liveGraph.states, sourceStateId, interaction);
    if (known) {
      liveGraph.followInteraction(interaction);
      resetExecution();
      return;
    }

    const source = liveGraph.states[sourceStateId];
    if (!source) return;
    await runInteraction(source.capture, interaction, allowReview);
  }

  useEffect(() => {
    if (!result) return;
    const liveGraph = useCaptureGraph.getState();
    const existing = findCapturedTransition(
      liveGraph.transitions,
      liveGraph.states,
      result.sourceState.id,
      result.transition.interaction,
    );
    if (!existing) liveGraph.recordExecution(result);
  }, [result]);

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

      {currentState ? (
        <CaptureViewer
          state={currentState}
          states={graph.states}
          transitions={graph.transitions}
          stateCount={Object.keys(graph.states).length}
          transitionCount={Object.keys(graph.transitions).length}
          canBack={graph.historyIndex > 0}
          canForward={graph.historyIndex >= 0 && graph.historyIndex < graph.history.length - 1}
          isExecuting={isExecuting}
          executionError={executionError}
          onInteractionSelected={clearExecutionError}
          onExecute={executeCurrent}
          onFollowInteraction={(interaction) => {
            resetExecution();
            return useCaptureGraph.getState().followInteraction(interaction);
          }}
          onBack={() => { resetExecution(); useCaptureGraph.getState().back(); }}
          onForward={() => { resetExecution(); useCaptureGraph.getState().forward(); }}
        />
      ) : capture ? null : (
        <section className="empty-state"><h2>pUXWorkbench</h2><p>Enter a source URL to begin capturing UI states.</p></section>
      )}

      {isBusy && <div className="workbench-busy" role="status" aria-live="polite"><div className="workbench-busy__card"><span className="spinner spinner--large" aria-hidden="true" /><strong>{busyTitle}</strong><span>{busyDetail}</span></div></div>}
    </main>
  );
}

function App() { return <AppErrorBoundary><Workbench /></AppErrorBoundary>; }
export default App;
