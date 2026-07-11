import { FgtsAmortizationEvent, FgtsProjectionForm, FgtsProjectionResult } from "../../types/fgts";

function addMonths(date: string, months: number): string {
  if (!date) return "";
  const value = new Date(`${date}T12:00:00`);
  if (Number.isNaN(value.getTime())) return "";
  value.setMonth(value.getMonth() + months);
  return value.toISOString().slice(0, 10);
}

export function getNextEligibleDate(lastUsageDate: string): string { return addMonths(lastUsageDate, 24); }

export function projectFgtsContributions(form: FgtsProjectionForm): FgtsProjectionResult {
  const periodicity = Math.max(1, Math.floor(form.periodicityMonths || 24));
  const first = Math.max(1, Math.floor(form.firstContributionMonth || periodicity));
  const limit = Math.min(Math.max(1, form.remainingTermMonths), form.lastMonth || form.remainingTermMonths);
  const events: FgtsAmortizationEvent[] = [];
  let remaining = Math.max(0, form.currentBalance);
  let previousMonth = 0;
  for (let month = first; month <= limit; month += periodicity) {
    const accumulated = Math.max(0, form.monthlyDeposit) * (month - previousMonth);
    let available = remaining;
    if (form.contributionMode === "MONTHLY_PROJECTION") available += accumulated;
    let amount = form.contributionMode === "FIXED" ? Math.min(available || form.fixedAmount, Math.max(0, form.fixedAmount)) : available;
    if (form.contributionMode === "CURRENT_BALANCE") amount = events.length === 0 ? remaining : 0;
    if (form.contributionMode === "INDIVIDUAL") amount = Math.max(0, form.fixedAmount);
    const eventDate = form.contractDate ? addMonths(form.contractDate, month) : "";
    const remainder = Math.max(0, available - amount);
    events.push({ id: `fgts-${month}`, eventNumber: events.length + 1, month, estimatedDate: eventDate, availableBalance: available, amount, remainingBalance: remainder, active: amount > 0, note: "", source: "FGTS" });
    remaining = remainder;
    previousMonth = month;
  }
  return { nextEligibleDate: form.neverUsed ? "" : getNextEligibleDate(form.lastUsageDate), events, totalProjected: events.filter((event) => event.active).reduce((sum, event) => sum + event.amount, 0) };
}
