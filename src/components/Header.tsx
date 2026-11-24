import { RotateCcw, Settings2, Wallet } from "lucide-react";
import { PageHeader } from "./ui/PageHeader";
import { PdfButton } from "./PdfButton";

interface HeaderProps {
  onManualConfig: () => void;
  onFgtsConfig: () => void;
  onGeneratePdf: () => void;
  onReset: () => void;
  hasActiveManualContributions: boolean;
  hasActiveFgts: boolean;
}

export function Header({
  onManualConfig,
  onFgtsConfig,
  onGeneratePdf,
  onReset,
  hasActiveManualContributions,
  hasActiveFgts
}: HeaderProps) {
  return (
    <PageHeader
      title="Planilha de Amortização"
      description="Simule o impacto de aportes e FGTS no financiamento."
      actions={
        <>
          <button
            type="button"
            onClick={onManualConfig}
            className="btn-muted"
            title="Configure aportes adicionais para reduzir o saldo devedor."
          >
            <Settings2 className="h-4 w-4" />
            Aportes manuais
            {hasActiveManualContributions && <ActiveDot className="bg-amber-500" label="ativos" />}
          </button>
          <button
            type="button"
            onClick={onFgtsConfig}
            className="btn-muted"
            title="Configure aportes de FGTS para reduzir o saldo devedor."
          >
            <Wallet className="h-4 w-4" />
            FGTS
            {hasActiveFgts && <ActiveDot className="bg-goodgreen-500" label="ativo" />}
          </button>
          <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />
          <PdfButton onClick={onGeneratePdf} />
          <button type="button" onClick={onReset} className="btn-muted px-3" title="Limpar simulação" aria-label="Limpar simulação">
            <RotateCcw className="h-4 w-4" />
          </button>
        </>
      }
    />
  );
}

function ActiveDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="relative ml-0.5 flex h-2 w-2" title={label}>
      <span className={`absolute inset-0 animate-ping rounded-full opacity-50 ${className}`} />
      <span className={`relative h-2 w-2 rounded-full ${className}`} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
