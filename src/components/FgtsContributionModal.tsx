import { ContributionModalBase } from "./ContributionModalBase";
import { AmortizationContributionEvent } from "../types/amortization";

interface FgtsContributionModalProps {
  isOpen: boolean;
  prazoMeses: number;
  events: AmortizationContributionEvent[];
  effectiveUsed: number;
  onClose: () => void;
  onApply: (events: AmortizationContributionEvent[]) => void;
  onClear: () => void;
}

export function FgtsContributionModal({ isOpen, prazoMeses, events, effectiveUsed, onClose, onApply, onClear }: FgtsContributionModalProps) {
  return (
    <ContributionModalBase
      isOpen={isOpen}
      title="Configurar Amortização com FGTS"
      description="Defina o valor e a periodicidade dos aportes de FGTS. O sistema preenche automaticamente as parcelas correspondentes e recalcula o saldo devedor."
      prazoMeses={prazoMeses}
      source="FGTS"
      events={events}
      defaults={{ value: 0, frequency: 24, firstMonth: 24, hasLimit: false }}
      fixedFrequency={24}
      helperText="24 meses = a cada 2 anos, regra padrão utilizada para simulação de FGTS."
      applyLabel="Aplicar FGTS"
      clearLabel="Limpar FGTS"
      clearConfirmation="Deseja remover todos os aportes de FGTS desta simulação?"
      effectiveUsed={effectiveUsed}
      onClose={onClose}
      onApply={onApply}
      onClear={onClear}
    />
  );
}
