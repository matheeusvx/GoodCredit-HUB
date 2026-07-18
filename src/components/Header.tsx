import { RotateCcw, Settings, Wallet } from "lucide-react";
import { PdfButton } from "./PdfButton";
import { AmortizationSystem } from "../types/amortization";

interface HeaderProps {
  nomeCliente: string;
  sistema: AmortizationSystem;
  onClientNameChange: (value: string) => void;
  onSystemChange: (value: AmortizationSystem) => void;
  onManualConfig: () => void;
  onFgtsConfig: () => void;
  onGeneratePdf: () => void;
  onReset: () => void;
  hasActiveManualContributions: boolean;
  hasActiveFgts: boolean;
}

export function Header({
  nomeCliente,
  sistema,
  onClientNameChange,
  onSystemChange,
  onManualConfig,
  onFgtsConfig,
  onGeneratePdf,
  onReset,
  hasActiveManualContributions,
  hasActiveFgts
}: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-5 px-4 py-5 sm:px-6 xl:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-goodgreen-600">GoodCredit Hub</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Planilha de Amortização</h1>
            <p className="mt-1 text-sm text-slate-600">Simule o impacto de amortizações no financiamento</p>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(220px,320px)_auto] xl:items-end">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome do cliente</span>
              <input
                value={nomeCliente}
                onChange={(event) => onClientNameChange(event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-goodblue-500 focus:ring-4 focus:ring-goodblue-100"
                placeholder="Cliente GoodCredit"
              />
            </label>

            <div className="flex h-11 rounded-lg border border-slate-200 bg-slate-50 p-1">
              {(["SAC", "PRICE"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onSystemChange(item)}
                  className={`min-w-20 rounded-md px-4 text-sm font-bold transition ${
                    sistema === item ? "bg-goodblue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onManualConfig}
            className={hasActiveManualContributions ? "btn-secondary border-amber-500 bg-amber-500 text-white hover:bg-amber-600" : "btn-secondary"}
            title={hasActiveManualContributions ? "Existem aportes manuais aplicados nesta simulação." : "Configure aportes adicionais para reduzir o saldo devedor."}
          >
            <Settings className="h-4 w-4" />
            {hasActiveManualContributions ? "Manuais Ativos" : "Aportes Manuais"}
          </button>
          <button
            type="button"
            onClick={onFgtsConfig}
            className={hasActiveFgts ? "btn-primary" : "btn-secondary"}
            title={hasActiveFgts ? "Existem aportes de FGTS aplicados nesta simulação." : "Configure aportes de FGTS para reduzir o saldo devedor."}
          >
            <Wallet className="h-4 w-4" />
            {hasActiveFgts ? "FGTS Ativo" : "Configurar FGTS"}
          </button>
          <PdfButton onClick={onGeneratePdf} />
          <button type="button" onClick={onReset} className="btn-muted">
            <RotateCcw className="h-4 w-4" />
            Limpar simulação
          </button>
        </div>
      </div>
    </header>
  );
}
