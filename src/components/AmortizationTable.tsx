import { formatCurrencyBR } from "../lib/financial";
import { AmortizationRow } from "../types/amortization";

interface AmortizationTableProps {
  rows: AmortizationRow[];
  onManualContributionChange: (month: number, value: number) => void;
  onFgtsContributionChange: (month: number, value: number) => void;
}

const money = (value: number) => (value > 0 ? formatCurrencyBR(value) : "-");

export function AmortizationTable({
  rows,
  onManualContributionChange,
  onFgtsContributionChange
}: AmortizationTableProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
      <div className="flex flex-col gap-1 border-b border-slate-200 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Cronograma de amortização</h2>
          <p className="text-sm text-slate-500">Edite os aportes na própria tabela para recalcular a simulação.</p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{rows.length} parcelas</span>
      </div>

      <div className="max-h-[680px] overflow-auto">
        <table className="min-w-[1680px] border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="table-group bg-goodblue-700" colSpan={8}>
                Valores do contrato
              </th>
              <th className="table-group bg-goodgreen-700" colSpan={2}>
                Aportes
              </th>
              <th className="table-group bg-goodblue-600" colSpan={6}>
                Valores corrigidos com amortizações
              </th>
            </tr>
            <tr>
              {[
                "Parcela",
                "Faltam",
                "Saldo Devedor Inicial",
                "Juros",
                "Saldo Atual",
                "Amortização",
                "Parcela",
                "Saldo Devedor Atual",
                "Amortização Manual",
                "Amortização FGTS",
                "Saldo Devedor Inicial",
                "Juros",
                "Saldo Atual",
                "Amortização",
                "Nova Parcela",
                "Saldo Devedor Atual"
              ].map((header) => (
                <th key={header} className="table-head">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month} className="odd:bg-white even:bg-slate-50/70 hover:bg-goodblue-50/60">
                <td className="table-cell font-bold text-slate-900">{row.month}</td>
                <td className="table-cell">{row.remainingMonths}</td>
                <td className="table-cell">{money(row.contractInitialBalance)}</td>
                <td className="table-cell">{money(row.contractInterest)}</td>
                <td className="table-cell">{money(row.contractCurrentBalance)}</td>
                <td className="table-cell">{money(row.contractAmortization)}</td>
                <td className="table-cell font-semibold text-goodblue-700">{money(row.contractInstallment)}</td>
                <td className="table-cell">{money(row.contractFinalBalance)}</td>
                <td className="table-cell bg-goodgreen-50/70">
                  <input
                    type="number"
                    min={0}
                    step="100"
                    value={row.manualContribution || ""}
                    onChange={(event) => onManualContributionChange(row.month, Math.max(0, Number(event.target.value)))}
                    className="h-9 w-32 rounded-lg border border-goodgreen-200 bg-white px-2 text-right text-sm font-semibold text-goodgreen-700 outline-none focus:border-goodgreen-500 focus:ring-3 focus:ring-goodgreen-100"
                    aria-label={`Amortização manual da parcela ${row.month}`}
                  />
                </td>
                <td className="table-cell bg-goodgreen-50/70">
                  <input
                    type="number"
                    min={0}
                    step="100"
                    value={row.fgtsContribution || ""}
                    onChange={(event) => onFgtsContributionChange(row.month, Math.max(0, Number(event.target.value)))}
                    className="h-9 w-32 rounded-lg border border-goodgreen-200 bg-white px-2 text-right text-sm font-semibold text-goodgreen-700 outline-none focus:border-goodgreen-500 focus:ring-3 focus:ring-goodgreen-100"
                    aria-label={`Amortização FGTS da parcela ${row.month}`}
                  />
                </td>
                <td className="table-cell">{money(row.simulatedInitialBalance)}</td>
                <td className="table-cell">{money(row.simulatedInterest)}</td>
                <td className="table-cell">{money(row.simulatedCurrentBalance)}</td>
                <td className="table-cell">{money(row.simulatedAmortization)}</td>
                <td className="table-cell font-semibold text-goodgreen-700">{money(row.simulatedInstallment)}</td>
                <td className="table-cell">{money(row.simulatedFinalBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
