import { useState } from "react";
import type { PageCapture, PageInteraction } from "../../../../shared/schemas/page-capture";
import { InteractionDetails } from "./InteractionDetails";

interface Props {
  capture: PageCapture;
}

export function CaptureViewer({ capture }: Props) {
  const [selectedInteraction, setSelectedInteraction] = useState<PageInteraction | null>(null);
  const [showOverlays, setShowOverlays] = useState(true);

  return (
    <section className="capture-result" aria-label="Page capture">
      <header className="capture-result__header">
        <div>
          <h2>{capture.title || "Untitled page"}</h2>
          <a href={capture.finalUrl} target="_blank" rel="noreferrer">{capture.finalUrl}</a>
        </div>
        <dl className="capture-result__metadata">
          <div><dt>Viewport</dt><dd>{capture.viewport.width} × {capture.viewport.height}</dd></div>
          <div><dt>Document</dt><dd>{capture.document.width} × {capture.document.height}</dd></div>
          <div><dt>Interactions</dt><dd>{capture.interactions.length}</dd></div>
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
        <span>Click an overlay to inspect it. Milestone 2 does not execute interactions.</span>
      </div>

      <div className="capture-workspace">
        <div className="capture-viewer">
          <div className="capture-canvas">
            <img
              src={capture.screenshot.dataUrl}
              alt={`Full-page capture of ${capture.title || capture.finalUrl}`}
            />
            {showOverlays && capture.interactions.map((interaction) => {
              const bounds = interaction.normalizedBounds;
              const isSelected = selectedInteraction?.id === interaction.id;
              return (
                <button
                  key={interaction.id}
                  type="button"
                  className={`interaction-overlay${isSelected ? " interaction-overlay--selected" : ""}`}
                  style={{
                    left: `${bounds.xRatio * 100}%`,
                    top: `${bounds.yRatio * 100}%`,
                    width: `${bounds.widthRatio * 100}%`,
                    height: `${bounds.heightRatio * 100}%`,
                  }}
                  title={interaction.accessibleName || interaction.visibleText || interaction.elementType}
                  aria-label={`Inspect ${interaction.accessibleName || interaction.visibleText || interaction.elementType}`}
                  onClick={() => setSelectedInteraction(interaction)}
                />
              );
            })}
          </div>
        </div>
        <InteractionDetails interaction={selectedInteraction} />
      </div>
    </section>
  );
}
