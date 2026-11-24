import { Eraser } from "lucide-react";
import { PageHeader } from "../ui/PageHeader";

export function IncomeAnalysisHeader({ onClear }: { onClear: () => void }) {
  return (
    <PageHeader
      title="Extratos Bancários"
      description="Analise extratos e calcule a renda média considerada."
      actions={<button type="button" className="btn-muted" onClick={onClear}><Eraser className="h-4 w-4" /> Limpar análise</button>}
    />
  );
}
