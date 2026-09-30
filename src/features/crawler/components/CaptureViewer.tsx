import { useEffect, useState, type CSSProperties } from "react";
import type { PageCapture, PageInteraction } from "../../../../shared/schemas/page-capture";
import type { UIState, UITransition } from "../../../../shared/schemas/ui-state";
import { InteractionDetails } from "./InteractionDetails";
import { StateNavigation } from "./StateNavigation";
import { findCapturedTransition } from "../hooks/useCaptureGraph";

interface Props {
  state: UIState;
  states: Record<string, UIState>;
  transitions: Record<string, UITransition>;
  stateCount: number;
  transitionCount: number;
  canBack: boolean;
  canForward: boolean;
  isExecuting: boolean;
  executionError: string | null;
  onInteractionSelected: () => void;
  onExecute: (interaction: PageInteraction, allowReview: boolean) => Promise<void>;
  onNavigate: (stateId: string) => void;
  onBack: () => void;
  onForward: () => void;
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
  state, states, transitions, stateCount, transitionCount, canBack, canForward,
  isExecuting, executionError, onInteractionSelected, onExecute, onNavigate, onBack, onForward,
}: Props) {
  const [selected, setSelected] = useState<PageInteraction | null>(null);
  const [overlays, setOverlays] = useState(true);
  const [mode, setMode] = useState<"viewport" | "full">(() => localStorage.getItem("pux:capture-view-mode") === "full" ? "full" : "viewport");
  const visible = state.capture;

  useEffect(() => { setSelected(null); onInteractionSelected(); }, [state.id]);

  useEffect(() => { localStorage.setItem("pux:capture-view-mode", mode); }, [mode]);

  function knownTransition(interaction: PageInteraction) {
    return findCapturedTransition(transitions, states, state.id, interaction);
  }

  function select(interaction: PageInteraction) {
    onInteractionSelected();
    const transition = knownTransition(interaction);
    if (transition) {
      onNavigate(transition.targetStateId);
      return;
    }
    setSelected(interaction);
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
          <span>Captured</span>
          <a href={visible.finalUrl} target="_blank" rel="noreferrer">{visible.finalUrl}</a>
        </div>

        <StateNavigation state={state} stateCount={stateCount} transitionCount={transitionCount} canBack={canBack} canForward={canForward} onBack={onBack} onForward={onForward} />

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
                <div key={region.id} className="occlusion-overlay" style={{...style,zIndex:Math.max(1,Math.min(2147480000,region.stackingOrder))}} aria-hidden="true" />
              ))}

              {overlays && orderedOverlays.map(({ interaction, style }) => {
                const isSelected = selected?.id === interaction.id;
                return (
                  <div
                    key={`outline-${interaction.id}`}
                    className={`interaction-overlay interaction-overlay--${interaction.executionSafety}${knownTransition(interaction) ? " interaction-overlay--captured" : ""}${isSelected ? " interaction-overlay--selected" : ""}`}
                    style={{ ...style, zIndex: Math.max(2, Math.min(2147480001, interaction.stackingOrder + 1)) }}
                    aria-hidden="true"
                  />
                );
              })}

              {overlays && orderedOverlays.flatMap(({ interaction }) => {
                const regions = interaction.hitTestSampled ? interaction.hitTestRegions : [interaction.bounds];
                return regions.map((region, regionIndex) => {
                  const viewportLeft = visible.scrollPosition.x;
                  const viewportTop = visible.scrollPosition.y;
                  const viewportRight = viewportLeft + visible.viewport.width;
                  const viewportBottom = viewportTop + visible.viewport.height;
                  let left = region.x;
                  let top = region.y;
                  let right = region.x + region.width;
                  let bottom = region.y + region.height;
                  let regionStyle: CSSProperties;
                  if (mode === "viewport") {
                    left = Math.max(left, viewportLeft); top = Math.max(top, viewportTop);
                    right = Math.min(right, viewportRight); bottom = Math.min(bottom, viewportBottom);
                    if (right <= left || bottom <= top) return null;
                    regionStyle = {
                      left: `${((left - viewportLeft) / visible.viewport.width) * 100}%`,
                      top: `${((top - viewportTop) / visible.viewport.height) * 100}%`,
                      width: `${((right - left) / visible.viewport.width) * 100}%`,
                      height: `${((bottom - top) / visible.viewport.height) * 100}%`,
                    };
                  } else {
                    regionStyle = {
                      left: `${(left / visible.document.width) * 100}%`,
                      top: `${(top / visible.document.height) * 100}%`,
                      width: `${((right - left) / visible.document.width) * 100}%`,
                      height: `${((bottom - top) / visible.document.height) * 100}%`,
                    };
                  }
                  return (
                    <button
                      key={`hit-${interaction.id}-${regionIndex}`}
                      type="button"
                      className={`interaction-hit-region${knownTransition(interaction) ? " interaction-hit-region--captured" : ""}`}
                      style={{ ...regionStyle, zIndex: Math.max(3, Math.min(2147483640, interaction.stackingOrder + 2)) }}
                      title={`${interaction.accessibleName || interaction.visibleText || interaction.elementType}${knownTransition(interaction) ? " · captured destination" : ""}`}
                      onClick={() => select(interaction)}
                    />
                  );
                }).filter(Boolean);
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
          onExecute={onExecute}
        />
      </div>

    </section>
  );
}
