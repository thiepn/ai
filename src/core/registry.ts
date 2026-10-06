import type { AnyCapabilityDefinition } from "./capability.js";

export class CapabilityRegistry {
  readonly #capabilities = new Map<string, AnyCapabilityDefinition>();

  constructor(capabilities: readonly AnyCapabilityDefinition[] = []) {
    for (const capability of capabilities) {
      this.register(capability);
    }
  }

  register(capability: AnyCapabilityDefinition): void {
    if (this.#capabilities.has(capability.id)) {
      throw new Error(`Duplicate capability id: ${capability.id}`);
    }

    this.#capabilities.set(capability.id, capability);
  }

  get(id: string): AnyCapabilityDefinition | undefined {
    return this.#capabilities.get(id);
  }

  has(id: string): boolean {
    return this.#capabilities.has(id);
  }

  list(): readonly AnyCapabilityDefinition[] {
    return [...this.#capabilities.values()];
  }
}
