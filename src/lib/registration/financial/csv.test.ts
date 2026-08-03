import { describe, expect, it } from "vitest";
import { buildRegistrationFinancialCsv } from "./csv";
import { calculateRegistrationFinancialMetrics } from "./calculations";
import type { RegistrationFinancialCase } from "../../../types/registrationFinancial";

describe("CSV dos balancetes", () => {
  it("exporta somente os registros fornecidos e escapa o conteúdo", () => {
    const financialCase: RegistrationFinancialCase = { id: "1", ownerId: "owner", clientName: "Cliente; Exemplo", processReference: "P-1", registryOffice: "Cartório", city: "Diadema", controlNumber:1,signingDate:null,referralSource:"",bankBranch:"",iqStatus:null,paymentStatus:"ADVISORY_ONLY",collectionStatus:null,itbiAmountCents:0,itbiPaymentStatus:null,protocolReference:"",registryCostsCents:0,registryCostsPaymentStatus:null,operationalStatus:"",operationalStatusUpdatedAt:null,bankDeliveryDate:null,sellerPaymentStatus:null,sellerPaymentDate:null, operationMode: "ADVISORY_ONLY", advisoryFeeExpectedCents: 200_000, estimatedItbiCents: 0, estimatedRegistryCents: 0, estimatedOtherCostsCents: 0, notes: "", financialFinalizedAt: null, openedAt: "2026-07-31", archivedAt: null, createdAt: "2026-07-31T00:00:00Z", updatedAt: "2026-07-31T00:00:00Z" };
    const csv = buildRegistrationFinancialCsv([{ financialCase, metrics: calculateRegistrationFinancialMetrics(financialCase, []) }]);
    expect(csv).toContain('"Cliente; Exemplo"');
    expect(csv).toContain('"Somente assessoria"');
  });
});
