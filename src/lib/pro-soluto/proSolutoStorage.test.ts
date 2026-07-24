import { describe, expect, it } from "vitest";
import {
  migrateLegacyProSolutoState,
  readProSolutoForm,
  storeProSolutoForm
} from "./proSolutoStorage";

describe("proSolutoStorage", () => {
  it("migra os campos válidos da versão 1 e ignora subsídio e outros recursos", () => {
    const migrated = migrateLegacyProSolutoState({
      version: 1,
      form: {
        clientName: "Processo exemplo",
        purchasePrice: 270000,
        appraisalValue: 250000,
        financeablePercent: 0.8,
        approvedFinancing: 200000,
        useEstimatedFinancing: false,
        fgtsAmount: 28000,
        subsidyAmount: 5000,
        paidEntryAmount: 10000,
        otherOwnResources: 7000
      }
    });

    expect(migrated).toEqual({
      clientName: "Processo exemplo",
      sellerReceivableAmount: 270000,
      appraisalValue: 250000,
      financeablePercent: 0.8,
      approvedCreditAmount: 200000,
      creditNotApprovedYet: false,
      fgtsAmount: 28000,
      paidEntryAmount: 10000
    });
    expect(migrated).not.toHaveProperty("subsidyAmount");
    expect(migrated).not.toHaveProperty("otherOwnResources");
  });

  it("prioriza o estado v2 quando os dois formatos estão salvos", () => {
    const storage = {
      getItem(key: string) {
        if (key.endsWith("_v2")) {
          return JSON.stringify({
            version: 2,
            form: {
              sellerReceivableAmount: 300000,
              appraisalValue: 300000,
              financeablePercent: 0.8
            }
          });
        }
        return JSON.stringify({ version: 1, form: { purchasePrice: 100000 } });
      }
    };

    expect(readProSolutoForm(storage).sellerReceivableAmount).toBe(300000);
  });

  it("ajusta um percentual antigo de 95% para o limite de 80%", () => {
    const migrated = migrateLegacyProSolutoState({
      version: 1,
      form: {
        purchasePrice: 270000,
        appraisalValue: 250000,
        financeablePercent: 0.95,
        approvedFinancing: 200000
      }
    });

    expect(migrated.financeablePercent).toBe(0.8);
  });

  it("nunca persiste percentual superior a 80%", () => {
    let saved = "";
    storeProSolutoForm(
      {
        setItem(_key, value) {
          saved = value;
        }
      },
      {
        clientName: "",
        sellerReceivableAmount: 270000,
        appraisalValue: 250000,
        financeablePercent: 0.95,
        approvedCreditAmount: 200000,
        creditNotApprovedYet: false,
        fgtsAmount: 0,
        paidEntryAmount: 0
      }
    );

    expect(JSON.parse(saved).form.financeablePercent).toBe(0.8);
  });
});
