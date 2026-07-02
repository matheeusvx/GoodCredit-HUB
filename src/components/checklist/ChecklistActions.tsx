import { CheckCircle2, Clipboard, Eraser, FileCheck2 } from "lucide-react";
import { useState } from "react";
import { buildChecklistWhatsAppMessage } from "../../lib/checklist/messageBuilder";
import { GeneratedChecklist } from "../../types/checklist";
import { ChecklistPdfButton } from "./ChecklistPdfButton";

interface Props {
  checklist: GeneratedChecklist | null;
  onGenerate: () => void;
  onClear: () => void;
}

export function ChecklistActions({ checklist, onGenerate, onClear }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    if (!checklist) return;
    const message = buildChecklistWhatsAppMessage(checklist);
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onGenerate} className="btn-primary">
        <FileCheck2 className="h-4 w-4" />
        Gerar Checklist
      </button>
      <button type="button" onClick={onClear} className="btn-muted">
        <Eraser className="h-4 w-4" />
        Limpar
      </button>
      <button type="button" disabled={!checklist} onClick={copyMessage} className="btn-secondary disabled:opacity-50">
        {copied ? <CheckCircle2 className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
        {copied ? "Mensagem copiada" : "Copiar Mensagem"}
      </button>
      <ChecklistPdfButton checklist={checklist} />
    </div>
  );
}
