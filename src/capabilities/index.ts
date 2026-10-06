import { CapabilityRegistry } from "../core/registry.js";
import { coreSmokeCapability } from "./core-smoke.js";

export const capabilityRegistry = new CapabilityRegistry([
  coreSmokeCapability
]);
