import jsPDF from "jspdf";
import type { CtpsAnalysis } from "../../../types/ctpsAnalysis";
import {
  CTPS_CONFIDENCE_LABEL,
  CTPS_CONTRACT_LABEL,
  formatCtpsCurrency,
  formatCtpsDate,
  formatEmploymentDuration,
  employmentDuration,
  maskCtpsCpf,
} from "./ctpsPresentation";

function safeFileName(value: string | null): string {
  return (value || "cliente").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cliente";
}

export function buildCtpsSummaryPdf(analysis: CtpsAnalysis): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const margin = 15;
  const maxWidth = 180;
  let y = 16;
  const pageBottom = 282;

  const ensure = (height = 8) => {
    if (y + height <= pageBottom) return;
    pdf.addPage();
    y = 16;
  };
  const heading = (title: string) => {
    ensure(12);
    y += 3;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text(title, margin, y);
    y += 6;
  };
  const line = (label: string, value: string) => {
    ensure(7);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85);
    pdf.text(`${label}:`, margin, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(pdf.splitTextToSize(value, 128), margin + 48, y);
    y += 6;
  };
  const paragraph = (value: string) => {
    const rows = pdf.splitTextToSize(value, maxWidth);
    ensure(rows.length * 4 + 3);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(rows, margin, y);
    y += rows.length * 4 + 2;
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(22, 101, 52);
  pdf.text("GOODCREDIT HUB", margin, y);
  y += 8;
  pdf.setFontSize(16);
  pdf.setTextColor(15, 23, 42);
  pdf.text("ANÁLISE DE PERFIL — CARTEIRA DE TRABALHO", margin, y);
  y += 10;
  line("Cliente", analysis.holder.name || "Não identificado");
  line("CPF", maskCtpsCpf(analysis.holder.cpf));
  line("Data da análise", new Date(analysis.document.analysisDate).toLocaleString("pt-BR"));

  heading("RESUMO PROFISSIONAL");
  line("Vínculos ativos", String(analysis.summary.activeEmploymentCount));
  line("Vínculos encerrados", String(analysis.summary.terminatedEmploymentCount));
  line("Salários vigentes", formatCtpsCurrency(analysis.summary.currentContractualIncome));
  line("Vínculo ativo mais antigo", formatCtpsDate(analysis.summary.oldestActiveAdmissionDate));

  heading("VÍNCULOS ATIVOS");
  const active = analysis.employments.filter((employment) => employment.status === "ACTIVE");
  if (!active.length) paragraph("Nenhum vínculo ativo identificado.");
  active.forEach((employment) => {
    paragraph(`${employment.employer.name || "Empregador não identificado"} | CNPJ ${employment.employer.cnpj || "—"} | ${employment.currentPosition || "Cargo não identificado"} | admissão ${formatCtpsDate(employment.admissionDate)} | ${formatEmploymentDuration(employmentDuration(employment.admissionDate, null, analysis.document.analysisDate))}.`);
  });

  heading("SALÁRIOS CONTRATUAIS VIGENTES");
  if (!active.length) paragraph("Não aplicável.");
  active.forEach((employment) => paragraph(`${employment.employer.name || "Empregador não identificado"}: ${formatCtpsCurrency(employment.currentSalary?.amount)} (${CTPS_CONFIDENCE_LABEL[employment.currentSalary?.confidence || "LOW"]} confiança).`));

  heading("HISTÓRICO PROFISSIONAL");
  const terminated = analysis.employments.filter((employment) => employment.status === "TERMINATED");
  if (!terminated.length) paragraph("Nenhum vínculo encerrado identificado.");
  terminated.forEach((employment) => paragraph(`${employment.employer.name || "Empregador não identificado"} | ${formatCtpsDate(employment.admissionDate)} a ${formatCtpsDate(employment.terminationDate)} | ${employment.currentPosition || "Cargo não identificado"} | ${CTPS_CONTRACT_LABEL[employment.contractType]}.`));

  heading("HISTÓRICO SALARIAL RESUMIDO");
  analysis.employments.forEach((employment) => {
    paragraph(`${employment.employer.name || "Empregador não identificado"}: ${employment.salaryHistory.length ? employment.salaryHistory.map((salary) => `${formatCtpsDate(salary.effectiveFrom)} — ${formatCtpsCurrency(salary.amount)}`).join("; ") : "sem anotações salariais estruturadas"}.`);
  });

  heading("ALERTAS / INCONSISTÊNCIAS");
  if (!analysis.alerts.length) paragraph("Nenhum alerta identificado.");
  analysis.alerts.forEach((alert) => paragraph(`[${alert.severity}] ${alert.message}`));

  heading("QUALIDADE DA LEITURA");
  line("Confiança", CTPS_CONFIDENCE_LABEL[analysis.quality.confidence]);
  line("Método", analysis.document.extractionMethod === "PDF_TEXT" ? "Camada de texto do PDF" : analysis.document.extractionMethod === "PDF_OCR" ? "OCR local" : "Texto do PDF + OCR local");
  line("Eventos reconhecidos", String(analysis.quality.recognizedEventCount));
  paragraph("Os valores apresentados correspondem às informações identificadas na Carteira de Trabalho analisada e não representam, isoladamente, aprovação ou renda aceita para fins de crédito.");
  return pdf;
}

export function downloadCtpsSummaryPdf(analysis: CtpsAnalysis): void {
  buildCtpsSummaryPdf(analysis).save(`goodcredit-ctps-${safeFileName(analysis.holder.name)}.pdf`);
}
