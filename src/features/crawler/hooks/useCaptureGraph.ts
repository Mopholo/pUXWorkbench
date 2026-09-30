import { create } from "zustand";
import type { PageCapture, PageInteraction } from "../../../../shared/schemas/page-capture";
import type { InteractionExecutionResult, UIState, UITransition } from "../../../../shared/schemas/ui-state";

interface CaptureGraphState {
  states: Record<string, UIState>;
  transitions: Record<string, UITransition>;
  currentStateId: string | null;
  history: string[];
  historyIndex: number;
  startCapture: (capture: PageCapture) => void;
  recordExecution: (result: InteractionExecutionResult) => void;
  navigateTo: (stateId: string) => void;
  back: () => void;
  forward: () => void;
  reset: () => void;
}

function initialState(capture: PageCapture): UIState {
  return {
    id: `capture-${capture.capturedAt}`,
    pageUrl: capture.finalUrl,
    scrollPosition: capture.scrollPosition,
    capture,
    parentStateId: null,
    triggeringInteractionId: null,
  };
}

export function interactionIdentity(interaction: PageInteraction): string {
  return [
    interaction.elementType,
    interaction.role ?? "",
    interaction.accessibleName ?? "",
    interaction.visibleText ?? "",
    interaction.href ?? "",
    interaction.locator.id ?? "",
    interaction.locator.name ?? "",
    interaction.locator.testId ?? "",
    interaction.locator.selector,
    Math.round(interaction.bounds.x),
    Math.round(interaction.bounds.y),
    Math.round(interaction.bounds.width),
    Math.round(interaction.bounds.height),
  ].join("|");
}

export function findCapturedTransition(
  transitions: Record<string, UITransition>,
  states: Record<string, UIState>,
  sourceStateId: string,
  interaction: PageInteraction,
): UITransition | undefined {
  const identity = interactionIdentity(interaction);
  return Object.values(transitions).find(
    (transition) =>
      transition.sourceStateId === sourceStateId &&
      interactionIdentity(transition.interaction) === identity &&
      Boolean(states[transition.targetStateId]),
  );
}

function appendHistory(graph: CaptureGraphState, stateId: string, replaceStateId?: string) {
  const prefix = graph.history
    .slice(0, graph.historyIndex + 1)
    .map((id) => (replaceStateId && id === replaceStateId ? stateId : id));

  const last = prefix[prefix.length - 1];
  const history = last === stateId ? prefix : [...prefix, stateId];
  return { history, historyIndex: history.length - 1 };
}

export const useCaptureGraph = create<CaptureGraphState>((set, get) => ({
  states: {}, transitions: {}, currentStateId: null, history: [], historyIndex: -1,

  startCapture(capture) {
    const state = initialState(capture);
    set({ states: { [state.id]: state }, transitions: {}, currentStateId: state.id, history: [state.id], historyIndex: 0 });
  },

  recordExecution(result) {
    const graph = get();
    const oldSourceId = graph.currentStateId;
    const states = { ...graph.states };
    const transitions = { ...graph.transitions };

    // The first engine execution replaces the temporary capture id with the
    // engine's deterministic graph-state id. History references are rewritten,
    // not duplicated.
    if (oldSourceId && oldSourceId !== result.sourceState.id) delete states[oldSourceId];
    states[result.sourceState.id] = result.sourceState;
    states[result.targetState.id] = result.targetState;

    // An edge is unique by source state + semantic interaction identity. Once
    // known, that interaction is graph traversal, not another live execution.
    const existing = findCapturedTransition(
      transitions,
      states,
      result.sourceState.id,
      result.transition.interaction,
    );
    if (!existing) transitions[result.transition.id] = result.transition;

    const normalizedGraph = { ...graph, history: graph.history, historyIndex: graph.historyIndex };
    const historyUpdate = appendHistory(normalizedGraph, result.targetState.id, oldSourceId ?? undefined);
    set({
      states,
      transitions,
      currentStateId: result.targetState.id,
      ...historyUpdate,
    });
  },

  navigateTo(stateId) {
    const graph = get();
    if (!graph.states[stateId]) return;
    if (graph.currentStateId === stateId) return; // self-edge/current state: no history noise
    const historyUpdate = appendHistory(graph, stateId);
    set({ currentStateId: stateId, ...historyUpdate });
  },

  back() {
    const graph = get();
    if (graph.historyIndex <= 0) return;
    const historyIndex = graph.historyIndex - 1;
    set({ historyIndex, currentStateId: graph.history[historyIndex] });
  },

  forward() {
    const graph = get();
    if (graph.historyIndex >= graph.history.length - 1) return;
    const historyIndex = graph.historyIndex + 1;
    set({ historyIndex, currentStateId: graph.history[historyIndex] });
  },

  reset() { set({ states: {}, transitions: {}, currentStateId: null, history: [], historyIndex: -1 }); },
}));
