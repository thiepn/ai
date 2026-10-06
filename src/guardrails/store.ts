export type BudgetReservation = {
  key: string;
  reservedNanosUsd: number;
  ttlSeconds: number;
};

export interface GuardrailStore {
  claimNonce(key: string, ttlSeconds: number): Promise<boolean>;

  incrementFixedWindow(
    key: string,
    ttlSeconds: number
  ): Promise<number>;

  reserveBudget(
    key: string,
    amountNanosUsd: number,
    limitNanosUsd: number,
    ttlSeconds: number
  ): Promise<boolean>;

  adjustBudget(
    key: string,
    deltaNanosUsd: number,
    ttlSeconds: number
  ): Promise<number>;

  incrementMetric(
    key: string,
    amount: number,
    ttlSeconds: number
  ): Promise<number>;

  getNumber(key: string): Promise<number>;
}
