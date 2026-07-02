import { FileText } from "lucide-react";

interface PdfButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function PdfButton({ onClick, disabled = false }: PdfButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="btn-primary disabled:opacity-60">
      <FileText className="h-4 w-4" />
      Gerar PDF
    </button>
  );
}
