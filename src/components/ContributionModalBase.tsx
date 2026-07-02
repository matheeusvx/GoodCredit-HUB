import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatCurrencyBR, generateRecurringContributions } from "../lib/financial";
import { ContributionMap, RecurringContributionConfig } from "../types/amortization";

interface ContributionModalBaseProps {
  isOpen: boolean;
  title: string;
  description: string;
  prazoMeses: number;
  defaults: RecurringContributionConfig;
  helperText?: string;
  applyLabel: string;
  onClose: () => void;
  onApply: (contributions: ContributionMap) => void;
}

export function ContributionModalBase({
  isOpen,
  title,
  description,
  prazoMeses,
  defaults,
  helperText,
  applyLabel,
  onClose,
  onApply
}: ContributionModalBaseProps) {
  const [config, setConfig] = useState<RecurringContributionConfig>(defaults);

  useEffect(() => {
    if (isOpen) setConfig(defaults);
  }, [defaults, isOpen]);

  const validation = useMemo(() => {
    const errors: string[] = [];
    if (config.value < 0) errors.push("Aporte não pode ser negativo.");
    if (config.frequency <= 0) errors.push("Frequência deve ser maior que zero.");
    if (config.firstMonth > prazoMeses) errors.push("Primeiro aporte não pode ser maior que o prazo.");
    if (config.hasLimit && (config.limitMonth ?? 0) < config.firstMonth) {
      errors.push("Limite final não pode ser menor que o primeiro aporte.");
    }
    return errors;
  }, [config, prazoMeses]);

  const preview = useMemo(() => {
    const map = generateRecurringContributions(config, prazoMeses);
    const months = Object.keys(map)
      .map(Number)
      .sort((a, b) => a - b);
    const total = months.reduce((sum, month) => sum + map[month], 0);
    return { map, months, total };
  }, [config, prazoMeses]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">{title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="field">
              <span>Valor por aporte</span>
              <input
                type="number"
                min={0}
                step="100"
                value={config.value || ""}
                onChange={(event) => setConfig({ ...config, value: Math.max(0, Number(event.target.value)) })}
              />
            </label>

            <label className="field">
              <span>A cada quantos meses</span>
              <input
                type="number"
                min={1}
                step={1}
                value={config.frequency}
                onChange={(event) =>
                  setConfig({ ...config, frequency: Math.max(1, Math.floor(Number(event.target.value) || 1)) })
                }
              />
            </label>

            <label className="field">
              <span>Primeiro aporte no mês</span>
              <input
                type="number"
                min={1}
                max={prazoMeses}
                step={1}
                value={config.firstMonth}
                onChange={(event) =>
                  setConfig({ ...config, firstMonth: Math.max(1, Math.floor(Number(event.target.value) || 1)) })
                }
              />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={config.hasLimit}
              onChange={(event) => setConfig({ ...config, hasLimit: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-goodgreen-600 focus:ring-goodgreen-500"
            />
            Limitar até um mês específico
          </label>

          {config.hasLimit && (
            <label className="field max-w-xs">
              <span>Último mês</span>
              <input
                type="number"
                min={config.firstMonth}
                max={prazoMeses}
                step={1}
                value={config.limitMonth ?? prazoMeses}
                onChange={(event) =>
                  setConfig({ ...config, limitMonth: Math.floor(Number(event.target.value) || prazoMeses) })
                }
              />
            </label>
          )}

          {helperText && <p className="rounded-lg bg-goodblue-50 px-4 py-3 text-sm text-goodblue-700">{helperText}</p>}

          <div className="rounded-lg border border-goodgreen-100 bg-goodgreen-50 p-4">
            <p className="font-bold text-goodgreen-700">
              {preview.months.length} aportes de {formatCurrencyBR(config.value)} — total {formatCurrencyBR(preview.total)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Meses: {preview.months.slice(0, 12).join(", ") || "-"}
              {preview.months.length > 12 ? " ..." : ""}
            </p>
          </div>

          {validation.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {validation.join(" ")}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="btn-muted">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              if (validation.length === 0) {
                onApply(preview.map);
                onClose();
              }
            }}
            className="btn-primary"
            disabled={validation.length > 0}
          >
            {applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
