import type { PageInteraction } from "../../../../shared/schemas/page-capture";

interface Props {
  interaction: PageInteraction | null;
}

function displayValue(value: string | null): string {
  return value?.trim() || "—";
}

export function InteractionDetails({ interaction }: Props) {
  if (!interaction) {
    return (
      <aside className="interaction-details interaction-details--empty">
        <h3>Interaction inspector</h3>
        <p>Select a highlighted element in the capture to inspect its observed metadata.</p>
      </aside>
    );
  }

  return (
    <aside className="interaction-details">
      <div className="interaction-details__heading">
        <div>
          <p className="interaction-details__eyebrow">Selected interaction</p>
          <h3>{interaction.accessibleName || interaction.visibleText || interaction.elementType}</h3>
        </div>
        <span className="interaction-details__type">{interaction.elementType}</span>
      </div>

      <dl className="interaction-details__grid">
        <div><dt>ID</dt><dd>{interaction.id}</dd></div>
        <div><dt>Role</dt><dd>{displayValue(interaction.role)}</dd></div>
        <div><dt>Accessible name</dt><dd>{displayValue(interaction.accessibleName)}</dd></div>
        <div><dt>Visible text</dt><dd>{displayValue(interaction.visibleText)}</dd></div>
        <div><dt>Href</dt><dd>{displayValue(interaction.href)}</dd></div>
        <div><dt>Disabled</dt><dd>{interaction.disabled ? "Yes" : "No"}</dd></div>
        <div className="interaction-details__wide"><dt>Selector</dt><dd>{interaction.locator.selector}</dd></div>
        <div><dt>Bounds</dt><dd>{Math.round(interaction.bounds.x)}, {Math.round(interaction.bounds.y)} · {Math.round(interaction.bounds.width)} × {Math.round(interaction.bounds.height)}</dd></div>
        <div><dt>Normalized</dt><dd>{interaction.normalizedBounds.xRatio.toFixed(4)}, {interaction.normalizedBounds.yRatio.toFixed(4)} · {interaction.normalizedBounds.widthRatio.toFixed(4)} × {interaction.normalizedBounds.heightRatio.toFixed(4)}</dd></div>
      </dl>
    </aside>
  );
}
