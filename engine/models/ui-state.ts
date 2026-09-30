import type { PageCapture, PageInteraction } from "./page-capture.ts";

export interface UIState {
  id: string;
  pageUrl: string;
  scrollPosition: { x: number; y: number };
  capture: PageCapture;
  parentStateId: string | null;
  triggeringInteractionId: string | null;
}

export interface UITransition {
  id: string;
  sourceStateId: string;
  targetStateId: string;
  interaction: PageInteraction;
  changed: boolean;
  changeSignals: {
    urlChanged: boolean;
    titleChanged: boolean;
    documentSizeChanged: boolean;
    interactionSetChanged: boolean;
    screenshotChanged: boolean;
  };
}

export interface InteractionExecutionResult {
  sourceState: UIState;
  targetState: UIState;
  transition: UITransition;
}
