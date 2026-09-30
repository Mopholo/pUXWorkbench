import type { UIState } from "../../../../shared/schemas/ui-state";

interface Props {
  state: UIState;
  stateCount: number;
  transitionCount: number;
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

export function StateNavigation({ state, stateCount, transitionCount, canBack, canForward, onBack, onForward }: Props) {
  return (
    <div className="state-navigation">
      <button type="button" onClick={onBack} disabled={!canBack} title="Back through captured-state history">←</button>
      <button type="button" onClick={onForward} disabled={!canForward} title="Forward through captured-state history">→</button>
      <span className="state-navigation__current" title={state.id}>{state.capture.title || "Untitled state"}</span>
      <span className="state-navigation__counts">{stateCount} states · {transitionCount} transitions</span>
    </div>
  );
}
