import { ContributionModalBase } from "./ContributionModalBase";
import { AmortizationContributionEvent } from "../types/amortization";

interface ManualContributionModalProps {
  isOpen: boolean;
  prazoMeses: number;
  events: AmortizationContributionEvent[];
  effectiveUsed: number;
  onClose: () => void;
  onApply: (events: AmortizationContributionEvent[]) => void;
  onClear: () => void;
}

export function ManualContributionModal({ isOpen, prazoMeses, events, effectiveUsed, onClose, onApply, onClear }: ManualContributionModalProps) {
  return (
    <ContributionModalBase
      isOpen={isOpen}
      title="Configurar Aportes Manuais"
      description="Defina o valor e a periodicidade dos aportes manuais recorrentes. O sistema preenche automaticamente as parcelas dentro do intervalo e você ainda pode editar células individuais para adicionar aportes avulsos ou pular meses específicos."
      prazoMeses={prazoMeses}
      source="MANUAL"
      events={events}
      defaults={{ value: 0, frequency: 1, firstMonth: 1, hasLimit: false }}
      applyLabel="Aplicar aportes manuais"
      clearLabel="Limpar Aportes Manuais"
      clearConfirmation="Deseja remover todos os aportes manuais desta simulação?"
      effectiveUsed={effectiveUsed}
      onClose={onClose}
      onApply={onApply}
      onClear={onClear}
    />
  );
}
