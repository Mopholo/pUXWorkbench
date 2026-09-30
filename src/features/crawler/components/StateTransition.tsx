import type { InteractionExecutionResult } from "../../../../shared/schemas/ui-state";

interface Props {
  result: InteractionExecutionResult;
  onViewSource: () => void;
  onViewTarget: () => void;
}

export function StateTransition({ result, onViewSource, onViewTarget }: Props) {
  const { transition, sourceState, targetState } = result;
  const label = transition.interaction.accessibleName || transition.interaction.visibleText || transition.interaction.elementType;

  return (
    <section className="state-transition" aria-label="Captured state transition">
      <div>
        <p className="state-transition__eyebrow">Milestone 3 transition</p>
        <h3>{transition.changed ? "UI state changed" : "No meaningful change detected"}</h3>
        <p className="state-transition__path">
          <button type="button" onClick={onViewSource}>Source</button>
          <span>—[{label}]→</span>
          <button type="button" onClick={onViewTarget}>Target</button>
        </p>
      </div>
      <dl className="state-transition__signals">
        <div><dt>URL</dt><dd>{transition.changeSignals.urlChanged ? "Changed" : "Same"}</dd></div>
        <div><dt>Title</dt><dd>{transition.changeSignals.titleChanged ? "Changed" : "Same"}</dd></div>
        <div><dt>Document</dt><dd>{transition.changeSignals.documentSizeChanged ? "Changed" : "Same"}</dd></div>
        <div><dt>Interactions</dt><dd>{transition.changeSignals.interactionSetChanged ? "Changed" : "Same"}</dd></div>
        <div><dt>Pixels</dt><dd>{transition.changeSignals.screenshotChanged ? "Changed" : "Same"}</dd></div>
      </dl>
      <div className="state-transition__ids">
        <span>Source: {sourceState.id}</span>
        <span>Target: {targetState.id}</span>
      </div>
    </section>
  );
}
