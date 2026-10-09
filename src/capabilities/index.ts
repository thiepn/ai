import { CapabilityRegistry } from "../core/registry.js";
import { coreSmokeCapability } from "./core-smoke.js";
import { languagesCorrectCapability } from "./languages/correct.js";
import { languagesExplainCapability } from "./languages/explain.js";
import { languagesGenerateExerciseCapability } from "./languages/exercise.js";
import { languagesConversationCapability } from "./languages/conversation.js";
import { financeInterpretQuestionCapability } from "./finance/interpret-question.js";
import { pdfPlanWorkflowCapability } from "./pdf/plan-workflow.js";

import { recipeGenerateCapability, recipeExtractCapability, recipeCookingHelpCapability } from "./recipe/index.js";

export const capabilityRegistry = new CapabilityRegistry([
  coreSmokeCapability,
  languagesCorrectCapability,
  languagesExplainCapability,
  languagesGenerateExerciseCapability,
  languagesConversationCapability,
  financeInterpretQuestionCapability,
  pdfPlanWorkflowCapability,
  recipeGenerateCapability,
  recipeExtractCapability,
  recipeCookingHelpCapability
]);
