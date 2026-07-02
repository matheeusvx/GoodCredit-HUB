import { ContributionModalBase } from "./ContributionModalBase";
import { ContributionMap } from "../types/amortization";

interface ManualContributionModalProps {
  isOpen: boolean;
  prazoMeses: number;
  onClose: () => void;
  onApply: (contributions: ContributionMap) => void;
}

export function ManualContributionModal({ isOpen, prazoMeses, onClose, onApply }: ManualContributionModalProps) {
  return (
    <ContributionModalBase
      isOpen={isOpen}
      title="Configurar Aportes Manuais"
      description="Defina o valor e a periodicidade dos aportes manuais recorrentes. O sistema preenche automaticamente as parcelas dentro do intervalo e você ainda pode editar células individuais para adicionar aportes avulsos ou pular meses específicos."
      prazoMeses={prazoMeses}
      defaults={{ value: 0, frequency: 1, firstMonth: 1, hasLimit: false }}
      applyLabel="Aplicar aportes manuais"
      onClose={onClose}
      onApply={onApply}
    />
  );
}
