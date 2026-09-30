import { useState } from "react";
import type { PageCapture, PageInteraction } from "../../../../shared/schemas/page-capture";
import type { InteractionExecutionResult } from "../../../../shared/schemas/ui-state";
import { executeInteraction } from "../services/interactionService";

export function useInteractionExecution() {
  const [result, setResult] = useState<InteractionExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runInteraction(
    sourceCapture: PageCapture,
    interaction: PageInteraction,
  ): Promise<void> {
    setIsExecuting(true);
    setError(null);
    try {
      setResult(await executeInteraction(sourceCapture, interaction));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsExecuting(false);
    }
  }

  function clearExecutionError(): void {
    setError(null);
  }

  function resetExecution(): void {
    setResult(null);
    setError(null);
  }

  return {
    result,
    isExecuting,
    error,
    runInteraction,
    clearExecutionError,
    resetExecution,
  };
}
