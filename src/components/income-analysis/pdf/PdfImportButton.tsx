import { FileSearch } from "lucide-react";

export function PdfImportButton({ onClick }: { onClick: () => void }) {
  return <button type="button" className="btn-secondary" onClick={onClick}><FileSearch className="h-4 w-4" /> Selecionar PDF</button>;
}
