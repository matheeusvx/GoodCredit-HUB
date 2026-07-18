import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  formatCurrencyBR,
  formatInputCurrencyBR,
  generateRecurringContributions,
  parseNumberBR
} from "../lib/financial";
import {
  AmortizationContributionEvent,
  ContributionSource,
  RecurringContributionConfig
} from "../types/amortization";

interface ContributionModalBaseProps {
  isOpen: boolean;
  title: string;
  description: string;
  prazoMeses: number;
  source: ContributionSource;
  events: AmortizationContributionEvent[];
  defaults: RecurringContributionConfig;
  fixedFrequency?: number;
  helperText?: string;
  applyLabel: string;
  clearLabel: string;
  clearConfirmation: string;
  effectiveUsed: number;
  onClose: () => void;
  onApply: (events: AmortizationContributionEvent[]) => void;
  onClear: () => void;
}

function newEvent(source: ContributionSource, month: number, requestedAmount = 0): AmortizationContributionEvent {
  return {
    id: `${source.toLowerCase()}-${month}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    month,
    source,
    requestedAmount,
    enabled: true
  };
}

export function ContributionModalBase({
  isOpen,
  title,
  description,
  prazoMeses,
  source,
  events,
  defaults,
  fixedFrequency,
  helperText,
  applyLabel,
  clearLabel,
  clearConfirmation,
  effectiveUsed,
  onClose,
  onApply,
  onClear
}: ContributionModalBaseProps) {
  const [config, setConfig] = useState<RecurringContributionConfig>(defaults);
  const [valueInput, setValueInput] = useState("");
  const [draftEvents, setDraftEvents] = useState<AmortizationContributionEvent[]>([]);
  const [eventValueInputs, setEventValueInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setConfig({ ...defaults, frequency: fixedFrequency ?? defaults.frequency });
    setValueInput("");
    setDraftEvents(events.map((event) => ({ ...event })));
    setEventValueInputs(
      Object.fromEntries(events.map((event) => [event.id, formatInputCurrencyBR(event.requestedAmount)]))
    );
  }, [isOpen]);

  const validation = useMemo(() => {
    const errors: string[] = [];
    if (config.value < 0) errors.push("Aporte não pode ser negativo.");
    if (config.frequency <= 0) errors.push("Frequência deve ser maior que zero.");
    if (config.firstMonth > prazoMeses) errors.push("Primeiro aporte não pode ser maior que o prazo.");
    if (config.hasLimit && (config.limitMonth ?? 0) < config.firstMonth) {
      errors.push("Limite final não pode ser menor que o primeiro aporte.");
    }
    if (draftEvents.some((event) => event.month < 1 || event.month > prazoMeses)) {
      errors.push("Todos os eventos devem estar dentro do prazo do financiamento.");
    }
    return errors;
  }, [config, draftEvents, prazoMeses]);

  const preview = useMemo(() => {
    const map = generateRecurringContributions(
      { ...config, frequency: fixedFrequency ?? config.frequency },
      prazoMeses
    );
    const months = Object.keys(map).map(Number).sort((a, b) => a - b);
    const total = months.reduce((sum, month) => sum + map[month], 0);
    return { map, months, total };
  }, [config, fixedFrequency, prazoMeses]);

  if (!isOpen) return null;

  function buildFinalEvents() {
    const merged = new Map<number, AmortizationContributionEvent>();
    draftEvents.forEach((event) => merged.set(event.month, event));
    if (config.value > 0) {
      preview.months.forEach((month) => {
        const existing = merged.get(month);
        merged.set(month, {
          id: existing?.id ?? newEvent(source, month).id,
          month,
          source,
          requestedAmount: preview.map[month],
          enabled: existing?.enabled ?? true
        });
      });
    }
    return [...merged.values()]
      .filter((event) => event.requestedAmount > 0 && event.month >= 1 && event.month <= prazoMeses)
      .sort((a, b) => a.month - b.month);
  }

  function addSingleEvent() {
    const usedMonths = new Set(draftEvents.map((event) => event.month));
    let month = 1;
    while (usedMonths.has(month) && month <= prazoMeses) month += 1;
    if (month > prazoMeses) return;
    const event = newEvent(source, month);
    setDraftEvents((current) => [...current, event].sort((a, b) => a.month - b.month));
    setEventValueInputs((current) => ({ ...current, [event.id]: "" }));
  }

  function clearAll() {
    if (!window.confirm(clearConfirmation)) return;
    onClear();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" title="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-bold text-slate-900">Adicionar programação recorrente</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="field">
                <span>Valor por aporte</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valueInput}
                  onChange={(event) => {
                    const value = event.target.value.replace(/[^\d.,R$\s]/g, "");
                    setValueInput(value);
                    setConfig((current) => ({ ...current, value: Math.max(0, parseNumberBR(value)) }));
                  }}
                  onBlur={() => setValueInput(config.value > 0 ? formatInputCurrencyBR(config.value) : "")}
                  placeholder="R$ 10.000,00"
                />
              </label>

              {fixedFrequency ? (
                <div className="field">
                  <span>Periodicidade</span>
                  <div className="flex h-11 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                    A cada {fixedFrequency} meses
                  </div>
                </div>
              ) : (
                <label className="field">
                  <span>A cada quantos meses</span>
                  <input type="number" min={1} step={1} value={config.frequency} onChange={(event) => setConfig({ ...config, frequency: Math.max(1, Math.floor(Number(event.target.value) || 1)) })} />
                </label>
              )}

              <label className="field">
                <span>Primeiro aporte no mês</span>
                <input type="number" min={1} max={prazoMeses} step={1} value={config.firstMonth} onChange={(event) => setConfig({ ...config, firstMonth: Math.max(1, Math.floor(Number(event.target.value) || 1)) })} />
              </label>
            </div>

            <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={config.hasLimit} onChange={(event) => setConfig({ ...config, hasLimit: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-goodgreen-600 focus:ring-goodgreen-500" />
              Limitar até um mês específico
            </label>
            {config.hasLimit && (
              <label className="field mt-4 max-w-xs">
                <span>Último mês</span>
                <input type="number" min={config.firstMonth} max={prazoMeses} step={1} value={config.limitMonth ?? prazoMeses} onChange={(event) => setConfig({ ...config, limitMonth: Math.floor(Number(event.target.value) || prazoMeses) })} />
              </label>
            )}
          </div>

          {helperText && <p className="rounded-lg bg-goodblue-50 px-4 py-3 text-sm text-goodblue-700">{helperText}</p>}

          <div className="grid gap-3 rounded-lg border border-goodgreen-100 bg-goodgreen-50 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-goodgreen-700">Total teórico configurado</p>
              <p className="mt-1 font-bold text-goodgreen-800">{preview.months.length} aportes · {formatCurrencyBR(preview.total)}</p>
              <p className="mt-1 text-sm text-slate-600">Meses: {preview.months.slice(0, 12).join(", ") || "-"}{preview.months.length > 12 ? " ..." : ""}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Efetivamente utilizado no cenário atual</p>
              <p className="mt-1 font-bold text-slate-900">{formatCurrencyBR(effectiveUsed)}</p>
              <p className="mt-1 text-sm text-slate-600">A quitação antecipada pode limitar o total utilizado.</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-950">Aportes cadastrados</h3>
                <p className="text-sm text-slate-500">Edite, desative ou exclua eventos individuais.</p>
              </div>
              <button type="button" onClick={addSingleEvent} className="btn-secondary">
                <Plus className="h-4 w-4" /> Novo aporte
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {draftEvents.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Nenhum aporte cadastrado.</p>
              ) : draftEvents.map((event) => (
                <div key={event.id} className="grid items-end gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[110px_minmax(180px,1fr)_120px_44px]">
                  <label className="field">
                    <span>Parcela</span>
                    <input type="number" min={1} max={prazoMeses} value={event.month} onChange={(input) => setDraftEvents((current) => current.map((item) => item.id === event.id ? { ...item, month: Math.max(1, Math.floor(Number(input.target.value) || 1)) } : item))} />
                  </label>
                  <label className="field">
                    <span>Valor</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={eventValueInputs[event.id] ?? ""}
                      onChange={(input) => {
                        const value = input.target.value.replace(/[^\d.,R$\s]/g, "");
                        setEventValueInputs((current) => ({ ...current, [event.id]: value }));
                        setDraftEvents((current) => current.map((item) => item.id === event.id ? { ...item, requestedAmount: Math.max(0, parseNumberBR(value)) } : item));
                      }}
                      onBlur={() => setEventValueInputs((current) => ({ ...current, [event.id]: event.requestedAmount > 0 ? formatInputCurrencyBR(event.requestedAmount) : "" }))}
                    />
                  </label>
                  <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={event.enabled} onChange={(input) => setDraftEvents((current) => current.map((item) => item.id === event.id ? { ...item, enabled: input.target.checked } : item))} />
                    {event.enabled ? "Ativo" : "Inativo"}
                  </label>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                    title="Excluir aporte"
                    onClick={() => {
                      if (window.confirm("Deseja excluir este aporte?")) setDraftEvents((current) => current.filter((item) => item.id !== event.id));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {validation.length > 0 && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{validation.join(" ")}</div>}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={clearAll} className="btn-muted text-red-700" disabled={events.length === 0}>
            <Trash2 className="h-4 w-4" /> {clearLabel}
          </button>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-muted">Cancelar</button>
            <button type="button" onClick={() => { if (validation.length === 0) { onApply(buildFinalEvents()); onClose(); } }} className="btn-primary" disabled={validation.length > 0}>
              {applyLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
