import { useEffect, useState, type CSSProperties } from "react";
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
  onExecute: (capture: PageCapture, interaction: PageInteraction, allowReview: boolean) => Promise<void>;
}

interface ViewportOverlay {
  interaction: PageInteraction;
  style: CSSProperties;
}

function getViewportOverlay(capture: PageCapture, interaction: PageInteraction): ViewportOverlay | null {
  const { bounds } = interaction;
  const { scrollPosition, viewport } = capture;

  const viewportLeft = scrollPosition.x;
  const viewportTop = scrollPosition.y;
  const viewportRight = viewportLeft + viewport.width;
  const viewportBottom = viewportTop + viewport.height;

  const clippedLeft = Math.max(bounds.x, viewportLeft);
  const clippedTop = Math.max(bounds.y, viewportTop);
  const clippedRight = Math.min(bounds.x + bounds.width, viewportRight);
  const clippedBottom = Math.min(bounds.y + bounds.height, viewportBottom);

  if (clippedRight <= clippedLeft || clippedBottom <= clippedTop) {
    return null;
  }

  return {
    interaction,
    style: {
      left: `${((clippedLeft - viewportLeft) / viewport.width) * 100}%`,
      top: `${((clippedTop - viewportTop) / viewport.height) * 100}%`,
      width: `${((clippedRight - clippedLeft) / viewport.width) * 100}%`,
      height: `${((clippedBottom - clippedTop) / viewport.height) * 100}%`,
    },
  };
}

export function CaptureViewer({
  capture,
  executionResult,
  isExecuting,
  executionError,
  onInteractionSelected,
  onExecute,
}: Props) {
  const [selected, setSelected] = useState<PageInteraction | null>(null);
  const [overlays, setOverlays] = useState(true);
  const [visible, setVisible] = useState<PageCapture>(capture);
  const [target, setTarget] = useState(false);
  const [mode, setMode] = useState<"viewport" | "full">("viewport");

  useEffect(() => {
    setSelected(null);
    setVisible(capture);
    setTarget(false);
    setMode("viewport");
  }, [capture]);

  useEffect(() => {
    if (!executionResult) return;

    setSelected(null);
    setVisible(executionResult.targetState.capture);
    setTarget(true);
    setMode(executionResult.transition.kind === "view" ? "viewport" : "full");
  }, [executionResult]);

  function select(interaction: PageInteraction) {
    onInteractionSelected();
    setSelected(interaction);
  }

  function showSource() {
    onInteractionSelected();
    setSelected(null);
    setVisible(executionResult?.sourceState.capture ?? capture);
    setTarget(false);
  }

  function showTarget() {
    if (!executionResult) return;

    onInteractionSelected();
    setSelected(null);
    setVisible(executionResult.targetState.capture);
    setTarget(true);
  }

  const overlaysToRender: ViewportOverlay[] =
    mode === "full"
      ? visible.interactions.map((interaction) => ({
          interaction,
          style: {
            left: `${interaction.normalizedBounds.xRatio * 100}%`,
            top: `${interaction.normalizedBounds.yRatio * 100}%`,
            width: `${interaction.normalizedBounds.widthRatio * 100}%`,
            height: `${interaction.normalizedBounds.heightRatio * 100}%`,
          },
        }))
      : visible.interactions
          .map((interaction) => getViewportOverlay(visible, interaction))
          .filter((overlay): overlay is ViewportOverlay => overlay !== null);

  return (
    <section className="capture-result">
      <div className="capture-topbar">
        <div className="capture-location">
          <span>{target ? "Target" : "Source"}</span>
          <a href={visible.finalUrl} target="_blank" rel="noreferrer">
            {visible.finalUrl}
          </a>
        </div>

        {executionResult && (
          <StateTransition
            result={executionResult}
            onViewSource={showSource}
            onViewTarget={showTarget}
          />
        )}

        <div className="capture-modes">
          <button
            className={mode === "viewport" ? "active" : ""}
            onClick={() => setMode("viewport")}
          >
            Viewport
          </button>
          <button
            className={mode === "full" ? "active" : ""}
            onClick={() => setMode("full")}
          >
            Full page
          </button>
        </div>
      </div>

      <div className="capture-toolbar">
        <label>
          <input
            type="checkbox"
            checked={overlays}
            onChange={(event) => setOverlays(event.currentTarget.checked)}
          />{" "}
          Overlays
        </label>
        <span>
          {visible.title || "Untitled"} · {visible.interactions.length} interactions · scroll{" "}
          {Math.round(visible.scrollPosition.y)}px
        </span>
      </div>

      <div className="capture-workspace">
        <div className="capture-main">
          <div className="capture-viewer">
            <div className={`capture-canvas capture-canvas--${mode}`}>
              <img
                src={mode === "full" ? visible.screenshot.dataUrl : visible.viewportScreenshot.dataUrl}
                alt={`Capture of ${visible.title || visible.finalUrl}`}
              />

              {overlays &&
                overlaysToRender.map(({ interaction, style }) => {
                  const isSelected = selected?.id === interaction.id;

                  return (
                    <button
                      key={interaction.id}
                      type="button"
                      className={`interaction-overlay interaction-overlay--${interaction.executionSafety}${
                        isSelected ? " interaction-overlay--selected" : ""
                      }`}
                      style={style}
                      title={interaction.accessibleName || interaction.visibleText || interaction.elementType}
                      onClick={() => select(interaction)}
                    />
                  );
                })}
            </div>
          </div>

          <div className="capture-dimensions" aria-label="Capture dimensions">
            <span>
              Viewport {visible.viewport.width} × {visible.viewport.height}
            </span>
            <span>
              Page {visible.document.width} × {visible.document.height}
            </span>
          </div>
        </div>

        <InteractionDetails
          interaction={selected}
          isExecuting={isExecuting}
          executionError={executionError}
          onExecute={(interaction, allowReview) => onExecute(visible, interaction, allowReview)}
        />
      </div>

      {isExecuting && (
        <div className="execution-overlay">
          <span className="spinner spinner--large" />
          <strong>Executing interaction…</strong>
          <span>Waiting for the resulting UI to stabilize and capturing the new state.</span>
        </div>
      )}
    </section>
  );
}
