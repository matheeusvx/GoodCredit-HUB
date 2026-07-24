export const MAX_FINANCEABLE_PERCENT = 80;
export const MAX_FINANCEABLE_PERCENT_DECIMAL = MAX_FINANCEABLE_PERCENT / 100;

export function clampFinanceablePercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value, MAX_FINANCEABLE_PERCENT_DECIMAL);
}
