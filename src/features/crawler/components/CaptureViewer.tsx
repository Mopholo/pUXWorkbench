import { useEffect, useState } from "react";
import type { PageCapture, PageInteraction } from "../../../../shared/schemas/page-capture";
import type { InteractionExecutionResult } from "../../../../shared/schemas/ui-state";
import { InteractionDetails } from "./InteractionDetails";
import { StateTransition } from "./StateTransition";

interface Props {
  capture: PageCapture;
  executionResult: InteractionExecutionResult | null;
  isExecuting: boolean;
  executionError: string | null;
  onInteractionSelected: () => void;
  onExecute: (sourceCapture: PageCapture, interaction: PageInteraction) => Promise<void>;
}

export function CaptureViewer({
  capture,
  executionResult,
  isExecuting,
  executionError,
  onInteractionSelected,
  onExecute,
}: Props) {
  const [selectedInteraction, setSelectedInteraction] = useState<PageInteraction | null>(null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [visibleCapture, setVisibleCapture] = useState<PageCapture>(capture);
  const [viewingTarget, setViewingTarget] = useState(false);

  useEffect(() => {
    setSelectedInteraction(null);
    setVisibleCapture(capture);
    setViewingTarget(false);
  }, [capture]);

  useEffect(() => {
    if (executionResult) {
      setSelectedInteraction(null);
      setVisibleCapture(executionResult.targetState.capture);
      setViewingTarget(true);
    }
  }, [executionResult]);

  function selectInteraction(interaction: PageInteraction): void {
    onInteractionSelected();
    setSelectedInteraction(interaction);
  }

  function viewSource(): void {
    onInteractionSelected();
    setSelectedInteraction(null);
    setVisibleCapture(executionResult?.sourceState.capture ?? capture);
    setViewingTarget(false);
  }

  function viewTarget(): void {
    if (!executionResult) return;
    onInteractionSelected();
    setSelectedInteraction(null);
    setVisibleCapture(executionResult.targetState.capture);
    setViewingTarget(true);
  }

  return (
    <section className="capture-result" aria-label="Page capture">
      {executionResult && (
        <StateTransition result={executionResult} onViewSource={viewSource} onViewTarget={viewTarget} />
      )}

      <header className="capture-result__header">
        <div>
          <p className="capture-result__state-label">{viewingTarget ? "Target state" : "Source state"}</p>
          <h2>{visibleCapture.title || "Untitled page"}</h2>
          <a href={visibleCapture.finalUrl} target="_blank" rel="noreferrer">{visibleCapture.finalUrl}</a>
        </div>
        <dl className="capture-result__metadata">
          <div><dt>Viewport</dt><dd>{visibleCapture.viewport.width} × {visibleCapture.viewport.height}</dd></div>
          <div><dt>Document</dt><dd>{visibleCapture.document.width} × {visibleCapture.document.height}</dd></div>
          <div><dt>Interactions</dt><dd>{visibleCapture.interactions.length}</dd></div>
        </dl>
      </header>

      <div className="capture-toolbar">
        <label className="capture-toolbar__toggle">
          <input
            type="checkbox"
            checked={showOverlays}
            onChange={(event) => setShowOverlays(event.currentTarget.checked)}
          />
          Show interaction overlays
        </label>
        <span>Select an allowed overlay, then explicitly execute it to capture the resulting UI state.</span>
      </div>

      <div className="capture-workspace">
        <div className="capture-viewer">
          <div className="capture-canvas">
            <img
              src={visibleCapture.screenshot.dataUrl}
              alt={`Full-page capture of ${visibleCapture.title || visibleCapture.finalUrl}`}
            />
            {showOverlays && visibleCapture.interactions.map((interaction) => {
              const bounds = interaction.normalizedBounds;
              const isSelected = selectedInteraction?.id === interaction.id;
              const isBlocked = interaction.executionSafety === "blocked";
              return (
                <button
                  key={interaction.id}
                  type="button"
                  className={`interaction-overlay${isSelected ? " interaction-overlay--selected" : ""}${isBlocked ? " interaction-overlay--blocked" : ""}`}
                  style={{
                    left: `${bounds.xRatio * 100}%`,
                    top: `${bounds.yRatio * 100}%`,
                    width: `${bounds.widthRatio * 100}%`,
                    height: `${bounds.heightRatio * 100}%`,
                  }}
                  title={interaction.accessibleName || interaction.visibleText || interaction.elementType}
                  aria-label={`Inspect ${interaction.accessibleName || interaction.visibleText || interaction.elementType}`}
                  onClick={() => selectInteraction(interaction)}
                />
              );
            })}
          </div>
        </div>
        <InteractionDetails
          interaction={selectedInteraction}
          isExecuting={isExecuting}
          executionError={executionError}
          onExecute={(interaction) => onExecute(visibleCapture, interaction)}
        />
      </div>
    </section>
  );
}
