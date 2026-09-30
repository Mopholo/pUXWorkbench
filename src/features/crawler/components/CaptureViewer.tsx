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
  const [mode, setMode] = useState<"viewport" | "full">(() => localStorage.getItem("pux:capture-view-mode") === "full" ? "full" : "viewport");

  useEffect(() => {
    setSelected(null);
    setVisible(capture);
    setTarget(false);
  }, [capture]);

  useEffect(() => {
    if (!executionResult) return;

    setSelected(null);
    setVisible(executionResult.targetState.capture);
    setTarget(true);
  }, [executionResult]);

  useEffect(() => { localStorage.setItem("pux:capture-view-mode", mode); }, [mode]);

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

  const orderedOverlays = [...overlaysToRender].sort(
    (left, right) => left.interaction.stackingOrder - right.interaction.stackingOrder,
  );

  const occlusionsToRender = (visible.occlusions ?? []).map((region) => {
    if (mode === "full") return { region, style: { left:`${region.normalizedBounds.xRatio*100}%`, top:`${region.normalizedBounds.yRatio*100}%`, width:`${region.normalizedBounds.widthRatio*100}%`, height:`${region.normalizedBounds.heightRatio*100}%` } as CSSProperties };
    const b=region.bounds,v=visible.viewport,sp=visible.scrollPosition; const l=Math.max(b.x,sp.x),t=Math.max(b.y,sp.y),r=Math.min(b.x+b.width,sp.x+v.width),bt=Math.min(b.y+b.height,sp.y+v.height);
    if(r<=l||bt<=t)return null; return {region,style:{left:`${((l-sp.x)/v.width)*100}%`,top:`${((t-sp.y)/v.height)*100}%`,width:`${((r-l)/v.width)*100}%`,height:`${((bt-t)/v.height)*100}%`} as CSSProperties};
  }).filter((x): x is NonNullable<typeof x> => x !== null);

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

              {overlays && occlusionsToRender.map(({region,style}) => (
                <div key={region.id} className="occlusion-overlay" style={{...style,zIndex:Math.max(1,Math.min(2147480000,region.stackingOrder))}} title={`${region.kind} occlusion`} />
              ))}

              {overlays &&
                orderedOverlays.map(({ interaction, style }) => {
                  const isSelected = selected?.id === interaction.id;

                  return (
                    <button
                      key={interaction.id}
                      type="button"
                      className={`interaction-overlay interaction-overlay--${interaction.executionSafety}${
                        isSelected ? " interaction-overlay--selected" : ""
                      }`}
                      style={{ ...style, zIndex: Math.max(2, Math.min(2147480001, interaction.stackingOrder + 1)) }}
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

    </section>
  );
}
