import { ContributionModalBase } from "./ContributionModalBase";
import { ContributionMap } from "../types/amortization";

interface FgtsContributionModalProps {
  isOpen: boolean;
  prazoMeses: number;
  onClose: () => void;
  onApply: (contributions: ContributionMap) => void;
}

export function FgtsContributionModal({ isOpen, prazoMeses, onClose, onApply }: FgtsContributionModalProps) {
  return (
    <ContributionModalBase
      isOpen={isOpen}
      title="Configurar Amortização com FGTS"
      description="Defina o valor e a periodicidade dos aportes de FGTS. O sistema preenche automaticamente as parcelas correspondentes e recalcula o saldo devedor."
      prazoMeses={prazoMeses}
      defaults={{ value: 0, frequency: 24, firstMonth: 24, hasLimit: false }}
      helperText="24 meses = a cada 2 anos, regra padrão utilizada para simulação de FGTS."
      applyLabel="Aplicar FGTS"
      onClose={onClose}
      onApply={onApply}
    />
  );
}
