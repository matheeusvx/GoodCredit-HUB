import { jsPDF } from "jspdf";
import { REGISTRATION_FINANCIAL_MODE_LABELS, REGISTRATION_FINANCIAL_STATUS_LABELS, REGISTRATION_TRANSACTION_LABELS } from "./constants";
import { formatCentsBRL } from "./money";
import type { RegistrationFinancialCaseDetail } from "../../../types/registrationFinancial";

function filename(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "cliente"; }

async function loadLogo(): Promise<string | null> {
  try {
    const response = await fetch("/logo-goodcredit-hub.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function generateRegistrationFinancialPdf(detail: RegistrationFinancialCaseDetail): Promise<void> {
  const pdf = new jsPDF();
  const margin = 16;
  const width = 178;
  let y = 18;
  const line = (text: string, size = 10, bold = false) => {
    if (y > 280) { pdf.addPage(); y = 18; }
    pdf.setFontSize(size); pdf.setFont("helvetica", bold ? "bold" : "normal");
    const lines = pdf.splitTextToSize(text, width); pdf.text(lines, margin, y); y += lines.length * (size * 0.42) + 2;
  };
  const logo = await loadLogo();
  if (logo) { pdf.addImage(logo, "PNG", margin, y, 30, 22); y += 24; }
  pdf.setTextColor(15, 118, 76); line("GOODCREDIT HUB", 11, true);
  pdf.setTextColor(15, 23, 42); line("Balancete Cartorial", 20, true);
  line(`Cliente: ${detail.financialCase.clientName}`, 11, true);
  line(`Processo: ${detail.financialCase.processReference || "Não informado"}`);
  line(`Cartório: ${detail.financialCase.registryOffice || "Não informado"} | Cidade: ${detail.financialCase.city || "Não informada"}`);
  line(`Modalidade: ${REGISTRATION_FINANCIAL_MODE_LABELS[detail.financialCase.operationMode]}`);
  line(`Status: ${REGISTRATION_FINANCIAL_STATUS_LABELS[detail.metrics.status]}`);
  y += 3; line("Resumo financeiro", 13, true);
  line(`Assessoria prevista: ${formatCentsBRL(detail.financialCase.advisoryFeeExpectedCents)} | Recebida: ${formatCentsBRL(detail.metrics.advisoryReceivedCents)} | Pendente: ${formatCentsBRL(detail.metrics.advisoryPendingCents)}`);
  line(`Recursos para custas: ${formatCentsBRL(detail.metrics.costFundsReceivedCents)} | Despesas GoodCredit: ${formatCentsBRL(detail.metrics.goodCreditExpensesCents)}`);
  line(`Saldo disponível: ${formatCentsBRL(detail.metrics.availableBalanceCents)} | Complemento: ${formatCentsBRL(detail.metrics.complementRequiredCents)} | Devoluções: ${formatCentsBRL(detail.metrics.refundsCents)}`);
  line(`Pagamentos diretos do cliente: ${formatCentsBRL(detail.metrics.directCustomerPaymentsCents)} (informativo)`);
  line(`Juros pagos pelo cliente: ${formatCentsBRL(detail.metrics.customerInterestCents)} (não integra o saldo de custas)`);
  y += 3; line("Estimativas", 13, true);
  line(`ITBI: ${formatCentsBRL(detail.financialCase.estimatedItbiCents)} | Registro: ${formatCentsBRL(detail.financialCase.estimatedRegistryCents)} | Outras custas: ${formatCentsBRL(detail.financialCase.estimatedOtherCostsCents)}`);
  y += 3; line("Histórico de lançamentos", 13, true);
  if (detail.transactions.length === 0) line("Nenhum lançamento registrado.");
  detail.transactions.forEach((item) => line(`${new Date(`${item.transactionDate}T12:00:00`).toLocaleDateString("pt-BR")} | ${REGISTRATION_TRANSACTION_LABELS[item.transactionType]} | ${formatCentsBRL(item.amountCents)} | ${item.description || item.category || "Sem descrição"}`));
  y += 4; pdf.setTextColor(71, 85, 105); line("Este balancete é um controle operacional interno da GoodCredit. Os valores devem ser conferidos com os comprovantes e documentos oficiais do processo.", 9);
  line(`Gerado em ${new Date().toLocaleString("pt-BR")}.`, 8);
  pdf.save(`balancete-cartorial-${filename(detail.financialCase.clientName)}.pdf`);
}
