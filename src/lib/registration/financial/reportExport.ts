import { jsPDF } from "jspdf";
import type { RegistrationCashFlowReport, RegistrationFinancialReportFilters } from "../../../types/registrationFinancial";
import { formatCentsBRL } from "./money";

export function downloadFinancialReportCsv(report: RegistrationCashFlowReport, filters: RegistrationFinancialReportFilters): void {
  const rows = [["Tipo","Descrição","Entradas","Saídas","Saldo"], ...report.categories.map(item=>["Categoria",item.category,formatCentsBRL(item.incomeCents),formatCentsBRL(item.expenseCents),formatCentsBRL(item.balanceCents)]), ...report.processes.map(item=>["Processo",`${item.clientName} - ${item.processReference}`,formatCentsBRL(item.receivedCents),formatCentsBRL(item.paidCents),formatCentsBRL(item.balanceCents)])];
  const csv="\uFEFF"+rows.map(row=>row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(";")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=`relatorio-financeiro-${filters.startDate}-${filters.endDate}.csv`;a.click();URL.revokeObjectURL(url);
}

export function generateFinancialReportPdf(report: RegistrationCashFlowReport, filters: RegistrationFinancialReportFilters, userLabel: string): void {
  const pdf=new jsPDF();let y=16;const margin=15;const width=180;
  const line=(text:string,size=10,bold=false)=>{if(y>278){pdf.addPage();y=16;}pdf.setFont("helvetica",bold?"bold":"normal");pdf.setFontSize(size);const lines=pdf.splitTextToSize(text,width);pdf.text(lines,margin,y);y+=lines.length*4.4+2;};
  pdf.setTextColor(15,118,76);line("GOODCREDIT HUB",11,true);pdf.setTextColor(15,23,42);line("Relatório Financeiro Cartorial",19,true);line(`Período: ${new Date(`${filters.startDate}T12:00:00`).toLocaleDateString("pt-BR")} a ${new Date(`${filters.endDate}T12:00:00`).toLocaleDateString("pt-BR")}`);line(`Responsável: ${userLabel}`);y+=2;
  line("Indicadores",13,true);line(`Entradas líquidas: ${formatCentsBRL(report.netIncomeCents)} | Saídas operacionais: ${formatCentsBRL(report.operationalExpensesCents)} | Devoluções: ${formatCentsBRL(report.refundsCents)}`);line(`Saldo líquido: ${formatCentsBRL(report.netBalanceCents)} | Assessoria: ${formatCentsBRL(report.advisoryReceivedCents)} | Recursos para custas: ${formatCentsBRL(report.costFundsReceivedCents)}`);line(`ITBI: ${formatCentsBRL(report.itbiPaidCents)} | Custas cartorárias: ${formatCentsBRL(report.registryFeesPaidCents)}`);line(`Pagamentos diretos (informativo): ${formatCentsBRL(report.directCustomerPaymentsCents)} | Juros (informativo): ${formatCentsBRL(report.customerInterestCents)}`);line(`A receber: ${formatCentsBRL(report.receivableCents)} | A devolver: ${formatCentsBRL(report.refundableCents)}`);y+=2;
  line(`Saúde financeira: ${report.healthStatus === "HEALTHY"?"Saudável":report.healthStatus === "ATTENTION"?"Atenção":"Crítico"}`,13,true);line(report.healthExplanation);
  y+=2;line("Resumo mensal",13,true);report.monthly.forEach(item=>line(`${item.competence}: entradas ${formatCentsBRL(item.incomeCents)} | saídas ${formatCentsBRL(item.expensesCents+item.refundsCents)} | saldo ${formatCentsBRL(item.netBalanceCents)}`));
  y+=2;line("Resumo por categoria",13,true);report.categories.forEach(item=>line(`${item.category}: entradas ${formatCentsBRL(item.incomeCents)} | saídas ${formatCentsBRL(item.expenseCents)} | saldo ${formatCentsBRL(item.balanceCents)}`));
  y+=3;pdf.setTextColor(71,85,105);line("Relatório interno baseado nos registros do usuário autenticado. Pagamentos diretos e juros do cliente não integram o fluxo de caixa da GoodCredit.",8);
  pdf.save(`relatorio-financeiro-cartorial-${filters.startDate}-${filters.endDate}.pdf`);
}
