import { describe, expect, it } from "vitest";
import { calculateCashFlowReport, calculateOperationalDashboard } from "./operationalReport";
import { calculateRegistrationFinancialMetrics } from "./calculations";
import type { RegistrationFinancialCase, RegistrationFinancialReportFilters, RegistrationFinancialTransaction } from "../../../types/registrationFinancial";

const baseCase: RegistrationFinancialCase = {
  id:"c1",ownerId:"u1",clientName:"Cliente",processReference:"P1",registryOffice:"1º RI",city:"São Paulo",controlNumber:1,signingDate:"2026-08-01",referralSource:"LL",bankBranch:"Caixa 3262",iqStatus:"CAIXA",paymentStatus:"TO_CHARGE",collectionStatus:"TO_CHARGE",itbiAmountCents:100000,itbiPaymentStatus:"PENDING",protocolReference:"123",registryCostsCents:50000,registryCostsPaymentStatus:"PENDING",operationalStatus:"Em andamento",operationalStatusUpdatedAt:null,bankDeliveryDate:null,sellerPaymentStatus:"PENDING",sellerPaymentDate:null,operationMode:"FULL_PAYMENT_TO_GOODCREDIT",advisoryFeeExpectedCents:200000,estimatedItbiCents:100000,estimatedRegistryCents:50000,estimatedOtherCostsCents:0,notes:"",financialFinalizedAt:null,openedAt:"2026-08-01",archivedAt:null,createdAt:"2026-08-01T00:00:00Z",updatedAt:"2026-08-01T00:00:00Z"
};
function tx(type: RegistrationFinancialTransaction["transactionType"], amount: number, patch: Partial<RegistrationFinancialTransaction> = {}): RegistrationFinancialTransaction { return { id:crypto.randomUUID(),caseId:"c1",ownerId:"u1",transactionType:type,category:"",transactionDate:"2026-08-02",amountCents:amount,advisoryAllocationCents:0,costAllocationCents:0,customerInterestCents:0,customerTotalPaidCents:amount,adjustmentDirection:null,paymentMethod:"Pix",installments:null,installmentAmountCents:null,cardBrand:"",beneficiary:"",referenceNumber:"",description:"",notes:"",createdAt:"",updatedAt:"",...patch }; }
const filters: RegistrationFinancialReportFilters = { startDate:"2026-08-01",endDate:"2026-08-31",clientSearch:"",processSearch:"",operationMode:"ALL",registryOffice:"",iqStatus:"ALL",paymentStatus:"ALL",collectionStatus:"ALL",archive:"ACTIVE" };

describe("relatório financeiro cartorial", () => {
  it("mantém juros e pagamentos diretos fora do caixa", () => {
    const transactions = [tx("INCOME",300000,{advisoryAllocationCents:200000,costAllocationCents:100000,customerInterestCents:20000,customerTotalPaidCents:320000}),tx("EXPENSE",70000,{category:"ITBI"}),tx("DIRECT_CUSTOMER_PAYMENT",50000,{category:"Custas cartorárias"})];
    const record = { financialCase:baseCase,metrics:calculateRegistrationFinancialMetrics(baseCase,transactions) };
    const report = calculateCashFlowReport([record],transactions,filters);
    expect(report.netIncomeCents).toBe(300000);
    expect(report.operationalExpensesCents).toBe(70000);
    expect(report.netBalanceCents).toBe(230000);
    expect(report.customerInterestCents).toBe(20000);
    expect(report.directCustomerPaymentsCents).toBe(50000);
  });
  it("classifica saldo negativo como crítico e explica o motivo", () => {
    const transactions = [tx("INCOME",10000,{advisoryAllocationCents:10000}),tx("EXPENSE",20000)];
    const report = calculateCashFlowReport([{financialCase:baseCase,metrics:calculateRegistrationFinancialMetrics(baseCase,transactions)}],transactions,filters);
    expect(report.healthStatus).toBe("CRITICAL");
    expect(report.healthExplanation).toContain("superam");
  });
  it("resume somente os quatro indicadores operacionais", () => {
    const transactions = [tx("INCOME",200000,{advisoryAllocationCents:200000})];
    const dashboard = calculateOperationalDashboard([{financialCase:baseCase,metrics:calculateRegistrationFinancialMetrics(baseCase,transactions)}]);
    expect(dashboard).toEqual({activeProcesses:1,toCharge:1,receivedByGoodCreditCents:200000,pendingItbiOrRegistry:1});
  });
  it("separa as alocações de uma entrada no resumo por categoria", () => {
    const transactions = [tx("INCOME",300000,{advisoryAllocationCents:180000,costAllocationCents:120000})];
    const report = calculateCashFlowReport([{financialCase:baseCase,metrics:calculateRegistrationFinancialMetrics(baseCase,transactions)}],transactions,filters);
    expect(report.categories.find((item) => item.category === "Assessoria")?.incomeCents).toBe(180000);
    expect(report.categories.find((item) => item.category === "Recursos para custas")?.incomeCents).toBe(120000);
  });
  it("classifica pagamento sem recurso correspondente como crítico", () => {
    const transactions = [
      tx("INCOME",100000,{advisoryAllocationCents:100000}),
      tx("EXPENSE",50000,{category:"ITBI"})
    ];
    const report = calculateCashFlowReport([{financialCase:baseCase,metrics:calculateRegistrationFinancialMetrics(baseCase,transactions)}],transactions,filters);
    expect(report.netBalanceCents).toBe(50000);
    expect(report.healthStatus).toBe("CRITICAL");
    expect(report.healthExplanation).toContain("sem recursos correspondentes");
  });
});
