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
  followInteraction: (interaction: PageInteraction) => boolean;
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

/**
 * Stable semantic identity for an interaction inside a captured state.
 *
 * CSS selectors, generated interaction ids and pixel bounds are evidence, but
 * they are deliberately excluded from the primary identity because a fresh
 * capture of the same logical control may produce different selector/bounds
 * details. This key answers "is this the same observed action?" rather than
 * "is this byte-for-byte the same discovery record?".
 */
export function interactionIdentity(interaction: PageInteraction): string {
  const semantic = [
    interaction.elementType,
    interaction.role ?? "",
    interaction.accessibleName?.trim() ?? "",
    interaction.visibleText?.trim() ?? "",
    interaction.href ?? "",
    interaction.inputType ?? "",
    interaction.formMethod ?? "",
    interaction.formAction ?? "",
    interaction.locator.id ?? "",
    interaction.locator.name ?? "",
    interaction.locator.testId ?? "",
  ].join("|");

  // Controls with no useful semantics still need a deterministic fallback.
  const hasSemanticAnchor = Boolean(
    interaction.href ||
    interaction.accessibleName?.trim() ||
    interaction.visibleText?.trim() ||
    interaction.locator.id ||
    interaction.locator.name ||
    interaction.locator.testId,
  );

  return hasSemanticAnchor ? semantic : `${semantic}|${interaction.locator.selector}`;
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

function appendHistory(graph: Pick<CaptureGraphState, "history" | "historyIndex">, stateId: string) {
  const prefix = graph.history.slice(0, graph.historyIndex + 1);
  const last = prefix[prefix.length - 1];
  const history = last === stateId ? prefix : [...prefix, stateId];
  return { history, historyIndex: history.length - 1 };
}

function replaceHistoryState(history: string[], fromId: string | null, toId: string) {
  if (!fromId || fromId === toId) return history;
  return history.map((id) => (id === fromId ? toId : id));
}

export const useCaptureGraph = create<CaptureGraphState>((set, get) => ({
  states: {}, transitions: {}, currentStateId: null, history: [], historyIndex: -1,

  startCapture(capture) {
    const state = initialState(capture);
    set({ states: { [state.id]: state }, transitions: {}, currentStateId: state.id, history: [state.id], historyIndex: 0 });
  },

  recordExecution(result) {
    const graph = get();
    const displayedSourceId = graph.currentStateId;
    const states = { ...graph.states };
    const transitions = { ...graph.transitions };

    // The initial capture uses a temporary UI id. On first execution the engine
    // supplies its deterministic graph id. Rewrite graph/history references;
    // do not turn that normalization into another visit.
    if (displayedSourceId && displayedSourceId !== result.sourceState.id) {
      delete states[displayedSourceId];
      for (const [id, transition] of Object.entries(transitions)) {
        if (transition.sourceStateId === displayedSourceId || transition.targetStateId === displayedSourceId) {
          transitions[id] = {
            ...transition,
            sourceStateId: transition.sourceStateId === displayedSourceId ? result.sourceState.id : transition.sourceStateId,
            targetStateId: transition.targetStateId === displayedSourceId ? result.sourceState.id : transition.targetStateId,
          };
        }
      }
    }

    states[result.sourceState.id] = result.sourceState;
    states[result.targetState.id] = result.targetState;

    // One semantic action from one source state owns one graph edge. If the
    // engine is ever invoked again for a known action, retain the existing edge
    // instead of stacking duplicate transitions.
    const existing = findCapturedTransition(
      transitions,
      states,
      result.sourceState.id,
      result.transition.interaction,
    );
    if (!existing) transitions[result.transition.id] = result.transition;

    const normalizedHistory = replaceHistoryState(graph.history, displayedSourceId, result.sourceState.id);
    const normalizedIndex = graph.historyIndex;
    const historyUpdate = appendHistory(
      { history: normalizedHistory, historyIndex: normalizedIndex },
      result.targetState.id,
    );

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
    if (graph.currentStateId === stateId) return;
    const historyUpdate = appendHistory(graph, stateId);
    set({ currentStateId: stateId, ...historyUpdate });
  },

  followInteraction(interaction) {
    const graph = get();
    if (!graph.currentStateId) return false;
    const transition = findCapturedTransition(graph.transitions, graph.states, graph.currentStateId, interaction);
    if (!transition) return false;

    // A self-edge is still a known graph traversal, but it must not add A → A
    // noise to the tester's Back/Forward history.
    if (transition.targetStateId === graph.currentStateId) return true;

    const historyUpdate = appendHistory(graph, transition.targetStateId);
    set({ currentStateId: transition.targetStateId, ...historyUpdate });
    return true;
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
