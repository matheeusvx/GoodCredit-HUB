import { ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "../ui/PageHeader";

interface Props {
  title: string;
  modeLabel: string;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
}

export function ComplianceChecklistHeader({ saving, onBack, onSave }: Props) {
  return (
    <PageHeader
      title="Checklist de Conformidade"
      description="Registre as conferências internas deste processo."
      actions={
        <>
          <button type="button" onClick={onBack} className="btn-muted">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <button type="button" onClick={onSave} disabled={saving} className="btn-primary">
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar agora"}
          </button>
        </>
      }
    />
  );
}
