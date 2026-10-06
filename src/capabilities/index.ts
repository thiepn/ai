import { CapabilityRegistry } from "../core/registry.js";
import { coreSmokeCapability } from "./core-smoke.js";
import { languagesCorrectCapability } from "./languages/correct.js";
import { languagesExplainCapability } from "./languages/explain.js";

export const capabilityRegistry = new CapabilityRegistry([
  coreSmokeCapability,
  languagesCorrectCapability,
  languagesExplainCapability
]);
