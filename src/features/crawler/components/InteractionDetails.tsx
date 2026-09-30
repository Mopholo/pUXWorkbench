import type { PageInteraction } from "../../../../shared/schemas/page-capture";

interface Props {
  interaction: PageInteraction | null;
  isExecuting: boolean;
  executionError: string | null;
  onExecute: (interaction: PageInteraction, allowReview: boolean) => Promise<void>;
}

const value = (input: string | null) => input?.trim() || "—";

export function InteractionDetails({
  interaction,
  isExecuting,
  executionError,
  onExecute,
}: Props) {
  if (!interaction) {
    return (
      <aside className="interaction-details interaction-details--empty">
        <h3>Interaction inspector</h3>
        <p>Select an overlay to inspect and execute it.</p>
      </aside>
    );
  }

  const blocked = interaction.executionSafety === "blocked";
  const review = interaction.executionSafety === "review";
  const safetyLabel = blocked
    ? "Execution blocked"
    : review
      ? "Review required"
      : "Safe to execute";

  return (
    <aside className="interaction-details">
      <div className="interaction-details__heading">
        <h3>{interaction.accessibleName || interaction.visibleText || interaction.elementType}</h3>
        <span className="interaction-details__type">{interaction.elementType}</span>
      </div>

      <div className="interaction-action-row">
        <span
          className={`execution-safety-tag execution-safety-tag--${interaction.executionSafety}`}
          title={interaction.executionReason}
        >
          {safetyLabel}
        </span>
        <button
          type="button"
          className="interaction-execute"
          disabled={blocked || isExecuting}
          onClick={() => onExecute(interaction, review)}
        >
          {isExecuting ? (
            <>
              <span className="spinner" />
              Executing…
            </>
          ) : review ? (
            "Allow & execute"
          ) : (
            "Execute interaction"
          )}
        </button>
      </div>

      {review && (
        <p className="interaction-review-note">
          Allowing this interaction is recorded on the resulting transition as classifier feedback.
        </p>
      )}

      {executionError && (
        <p className="interaction-execution-error" role="alert">
          {executionError}
        </p>
      )}

      <dl className="interaction-details__grid">
        <div>
          <dt>ID</dt>
          <dd>{interaction.id}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{value(interaction.role)}</dd>
        </div>
        <div>
          <dt>Accessible name</dt>
          <dd>{value(interaction.accessibleName)}</dd>
        </div>
        <div>
          <dt>Visible text</dt>
          <dd>{value(interaction.visibleText)}</dd>
        </div>
        <div>
          <dt>Href</dt>
          <dd>{value(interaction.href)}</dd>
        </div>
        <div>
          <dt>Disabled</dt>
          <dd>{interaction.disabled ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Input type</dt>
          <dd>{value(interaction.inputType)}</dd>
        </div>
        <div>
          <dt>Form method</dt>
          <dd>{value(interaction.formMethod)}</dd>
        </div>
        <div className="interaction-details__wide">
          <dt>Form action</dt>
          <dd>{value(interaction.formAction)}</dd>
        </div>
        <div className="interaction-details__wide">
          <dt>Selector</dt>
          <dd>{interaction.locator.selector}</dd>
        </div>
        <div>
          <dt>Bounds</dt>
          <dd>
            {Math.round(interaction.bounds.x)}, {Math.round(interaction.bounds.y)} ·{" "}
            {Math.round(interaction.bounds.width)} × {Math.round(interaction.bounds.height)}
          </dd>
        </div>
      </dl>
    </aside>
  );
}
