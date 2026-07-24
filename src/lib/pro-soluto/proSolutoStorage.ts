import {
  LegacyStoredProSolutoState,
  ProSolutoForm,
  StoredProSolutoState
} from "../../types/proSoluto";
import { MAX_FINANCEABLE_PERCENT_DECIMAL, clampFinanceablePercent } from "./proSolutoConstants";

export const PRO_SOLUTO_STORAGE_KEY = "goodcredit_pro_soluto_state_v2";
export const LEGACY_PRO_SOLUTO_STORAGE_KEY = "goodcredit_pro_soluto_state";

export const INITIAL_PRO_SOLUTO_FORM: ProSolutoForm = {
  clientName: "",
  sellerReceivableAmount: 0,
  appraisalValue: 0,
  financeablePercent: MAX_FINANCEABLE_PERCENT_DECIMAL,
  approvedCreditAmount: null,
  creditNotApprovedYet: false,
  fgtsAmount: 0,
  paidEntryAmount: 0
};

function nonNegativeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function nullablePositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeCurrentForm(form: Partial<ProSolutoForm> | undefined): ProSolutoForm {
  return {
    clientName: typeof form?.clientName === "string" ? form.clientName : "",
    sellerReceivableAmount: nonNegativeNumber(form?.sellerReceivableAmount),
    appraisalValue: nonNegativeNumber(form?.appraisalValue),
    financeablePercent: clampFinanceablePercent(nonNegativeNumber(form?.financeablePercent)),
    approvedCreditAmount: nullablePositiveNumber(form?.approvedCreditAmount),
    creditNotApprovedYet: form?.creditNotApprovedYet === true,
    fgtsAmount: nonNegativeNumber(form?.fgtsAmount),
    paidEntryAmount: nonNegativeNumber(form?.paidEntryAmount)
  };
}

export function migrateLegacyProSolutoState(value: unknown): ProSolutoForm {
  if (!value || typeof value !== "object") return INITIAL_PRO_SOLUTO_FORM;

  const current = value as Partial<StoredProSolutoState>;
  if (current.version === 2) {
    return normalizeCurrentForm(current.form);
  }

  const legacy = value as LegacyStoredProSolutoState;
  const form = legacy.form;
  if (!form) return INITIAL_PRO_SOLUTO_FORM;

  return {
    clientName: typeof form.clientName === "string" ? form.clientName : "",
    sellerReceivableAmount: nonNegativeNumber(form.purchasePrice),
    appraisalValue: nonNegativeNumber(form.appraisalValue),
    financeablePercent: clampFinanceablePercent(nonNegativeNumber(form.financeablePercent)),
    approvedCreditAmount: nullablePositiveNumber(form.approvedFinancing),
    creditNotApprovedYet: form.useEstimatedFinancing === true,
    fgtsAmount: nonNegativeNumber(form.fgtsAmount),
    paidEntryAmount: nonNegativeNumber(form.paidEntryAmount)
  };
}

export function readProSolutoForm(storage: Pick<Storage, "getItem">): ProSolutoForm {
  const raw = storage.getItem(PRO_SOLUTO_STORAGE_KEY) ?? storage.getItem(LEGACY_PRO_SOLUTO_STORAGE_KEY);
  if (!raw) return INITIAL_PRO_SOLUTO_FORM;

  try {
    return migrateLegacyProSolutoState(JSON.parse(raw));
  } catch {
    return INITIAL_PRO_SOLUTO_FORM;
  }
}

export function storeProSolutoForm(storage: Pick<Storage, "setItem">, form: ProSolutoForm): void {
  const state: StoredProSolutoState = { version: 2, form: normalizeCurrentForm(form) };
  storage.setItem(PRO_SOLUTO_STORAGE_KEY, JSON.stringify(state));
}
