import { invoke } from "@tauri-apps/api/core";
import type { PageCapture, PageInteraction } from "../../../../shared/schemas/page-capture";
import {
  interactionExecutionResultSchema,
  type InteractionExecutionResult,
} from "../../../../shared/schemas/ui-state";

export async function executeInteraction(
  sourceCapture: PageCapture,
  interaction: PageInteraction,
): Promise<InteractionExecutionResult> {
  const result = await invoke<unknown>("execute_interaction", {
    sourceCapture,
    interaction,
  });
  return interactionExecutionResultSchema.parse(result);
}
