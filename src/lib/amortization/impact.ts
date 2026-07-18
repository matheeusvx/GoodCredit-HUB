import {
  AmortizationContributionEvent,
  AmortizationImpactSummary,
  AmortizationRow,
  ContributionMap,
  ContributionSource
} from "../../types/amortization";

export const MONEY_EPSILON = 0.01;

export function isValidContributionEvent(event: AmortizationContributionEvent, termMonths = Infinity): boolean {
  return (
    event.enabled &&
    Number.isInteger(event.month) &&
    event.month > 0 &&
    event.month <= termMonths &&
    Number.isFinite(event.requestedAmount) &&
    event.requestedAmount > 0
  );
}

export function hasActiveContributions(
  events: AmortizationContributionEvent[],
  source?: ContributionSource,
  termMonths = Infinity
): boolean {
  return events.some((event) => (!source || event.source === source) && isValidContributionEvent(event, termMonths));
}

export function contributionMapToEvents(
  map: ContributionMap,
  source: ContributionSource
): AmortizationContributionEvent[] {
  return Object.entries(map)
    .map(([month, requestedAmount]) => ({
      id: `${source.toLowerCase()}-${month}`,
      month: Number(month),
      source,
      requestedAmount: Number(requestedAmount),
      enabled: true
    }))
    .filter((event) => Number.isFinite(event.month) && Number.isFinite(event.requestedAmount))
    .sort((a, b) => a.month - b.month);
}

export function contributionEventsToMap(
  events: AmortizationContributionEvent[],
  source: ContributionSource,
  termMonths: number
): ContributionMap {
  return events.reduce<ContributionMap>((map, event) => {
    if (event.source === source && isValidContributionEvent(event, termMonths)) {
      map[event.month] = (map[event.month] ?? 0) + event.requestedAmount;
    }
    return map;
  }, {});
}

export function upsertContributionEvent(
  events: AmortizationContributionEvent[],
  source: ContributionSource,
  month: number,
  requestedAmount: number
): AmortizationContributionEvent[] {
  const existing = events.find((event) => event.source === source && event.month === month);
  if (requestedAmount <= 0) {
    return events.filter((event) => event.id !== existing?.id);
  }

  const nextEvent: AmortizationContributionEvent = {
    id: existing?.id ?? `${source.toLowerCase()}-${month}-${Date.now()}`,
    month,
    source,
    requestedAmount,
    enabled: true
  };

  return [...events.filter((event) => event.id !== existing?.id), nextEvent].sort((a, b) => a.month - b.month);
}

export function calculateAmortizationImpact(
  rows: AmortizationRow[],
  configuredEvents: AmortizationContributionEvent[] = []
): AmortizationImpactSummary {
  const originalTermMonths = rows.length;
  const payoffRow = rows.find((row) => row.payoff);
  const payoffMonth = payoffRow?.month ?? null;
  const correctedTermMonths = payoffMonth ?? originalTermMonths;
  const eliminatedInstallments = Math.max(0, originalTermMonths - correctedTermMonths);
  const originalInterestTotal = rows.reduce((sum, row) => sum + row.contractInterest, 0);
  const correctedInterestTotal = rows.reduce((sum, row) => sum + row.simulatedInterest, 0);
  const interestSavings = Math.max(0, originalInterestTotal - correctedInterestTotal);
  const manualAmortizationApplied = rows.reduce((sum, row) => sum + row.manualContributionApplied, 0);
  const fgtsAmortizationApplied = rows.reduce((sum, row) => sum + row.fgtsContributionApplied, 0);
  const totalAmortizationApplied = manualAmortizationApplied + fgtsAmortizationApplied;
  const originalProjectedTotal = rows.reduce((sum, row) => sum + row.contractInstallment, 0);

  // simulatedInstallment already includes the regular payment and applied contributions.
  const correctedProjectedTotal = rows.reduce((sum, row) => sum + row.simulatedInstallment, 0);
  const totalCostReduction = Math.max(0, originalProjectedTotal - correctedProjectedTotal);
  const invalidEventResults = configuredEvents
    .filter((event) => event.enabled && !isValidContributionEvent(event, originalTermMonths))
    .map((event) => ({
      month: event.month,
      source: event.source,
      requestedAmount: Math.max(0, event.requestedAmount),
      appliedAmount: 0,
      unusedAmount: Math.max(0, event.requestedAmount),
      status: "INVALID" as const
    }));
  const eventResults = [...rows.flatMap((row) => row.eventResults), ...invalidEventResults];
  const unusedManualAmount = eventResults
    .filter((event) => event.source === "MANUAL")
    .reduce((sum, event) => sum + event.unusedAmount, 0);
  const unusedFgtsAmount = eventResults
    .filter((event) => event.source === "FGTS")
    .reduce((sum, event) => sum + event.unusedAmount, 0);

  return {
    originalTermMonths,
    correctedTermMonths,
    eliminatedInstallments,
    termReductionPercent: originalTermMonths > 0 ? eliminatedInstallments / originalTermMonths : 0,
    originalInterestTotal,
    correctedInterestTotal,
    interestSavings,
    interestSavingsPercent: originalInterestTotal > 0 ? interestSavings / originalInterestTotal : 0,
    manualAmortizationApplied,
    fgtsAmortizationApplied,
    totalAmortizationApplied,
    manualSharePercent: totalAmortizationApplied > 0 ? manualAmortizationApplied / totalAmortizationApplied : 0,
    fgtsSharePercent: totalAmortizationApplied > 0 ? fgtsAmortizationApplied / totalAmortizationApplied : 0,
    originalProjectedTotal,
    correctedProjectedTotal,
    totalCostReduction,
    totalCostReductionPercent: originalProjectedTotal > 0 ? totalCostReduction / originalProjectedTotal : 0,
    payoffMonth,
    paidOff: payoffMonth !== null,
    unusedManualAmount,
    unusedFgtsAmount,
    eventResults
  };
}
