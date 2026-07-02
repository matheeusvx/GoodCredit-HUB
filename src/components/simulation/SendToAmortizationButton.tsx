import { ArrowRightLeft } from "lucide-react";
import { SimulationResult } from "../../types/simulation";

interface Props {
  result: SimulationResult | null;
  onSend: (result: SimulationResult) => void;
}

export function SendToAmortizationButton({ result, onSend }: Props) {
  return (
    <button type="button" disabled={!result} onClick={() => result && onSend(result)} className="btn-primary disabled:opacity-50">
      <ArrowRightLeft className="h-4 w-4" />
      Enviar para Amortização
    </button>
  );
}
