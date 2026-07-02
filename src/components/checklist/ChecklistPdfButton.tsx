import jsPDF from "jspdf";
import { FileText } from "lucide-react";
import { GeneratedChecklist } from "../../types/checklist";

interface Props {
  checklist: GeneratedChecklist | null;
}

export function ChecklistPdfButton({ checklist }: Props) {
  async function generatePdf() {
    if (!checklist) return;

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 14;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let y = 16;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(84, 163, 76);
    pdf.text("GoodCredit", margin, y);

    y += 12;
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(18);
    pdf.text("Checklist Documental", margin, y);
    y += 8;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Cliente/processo: ${checklist.formData.nome || "Nao informado"}`, margin, y);
    y += 6;
    pdf.text(`Perfil: ${checklist.profileLabel}`, margin, y);
    y += 6;
    pdf.text(`Data de geracao: ${new Date(checklist.generatedAt).toLocaleDateString("pt-BR")}`, margin, y);
    y += 10;

    const writeLine = (text: string, indent = 0) => {
      const lines = pdf.splitTextToSize(text, pageWidth - margin * 2 - indent);
      lines.forEach((line: string) => {
        if (y > pageHeight - 18) {
          pdf.addPage();
          y = 16;
        }
        pdf.text(line, margin + indent, y);
        y += 5;
      });
    };

    [...checklist.categories, checklist.goldenRules].forEach((category) => {
      if (y > pageHeight - 30) {
        pdf.addPage();
        y = 16;
      }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(29, 99, 139);
      writeLine(category.title);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      category.items.forEach((item) => writeLine(`- ${item.label}`, 4));
      category.alerts?.forEach((alert) => writeLine(`Alerta: ${alert.label}`, 4));
      y += 3;
    });

    if (checklist.importantAlerts.length > 0) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(180, 83, 9);
      writeLine("Alertas importantes");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      checklist.importantAlerts.forEach((alert) => writeLine(`- ${alert.label}`, 4));
    }

    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text("GoodCredit - Checklist documental gerado localmente no GoodCredit Hub.", margin, pageHeight - 8);
    pdf.save(`goodcredit-checklist-${checklist.formData.nome || "documental"}.pdf`);
  }

  return (
    <button type="button" disabled={!checklist} onClick={generatePdf} className="btn-secondary disabled:opacity-50">
      <FileText className="h-4 w-4" />
      Gerar PDF
    </button>
  );
}
