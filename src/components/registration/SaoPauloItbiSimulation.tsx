import { Info } from "lucide-react";
import { useState } from "react";
import {
  formatCurrencyBRL,
  normalizeCurrencyInput,
  parseCurrencyBRL,
} from "../../lib/fgts/currency";
import { calculateSaoPauloItbi } from "../../lib/registration/itbi/saoPauloItbi";
import type {
  SaoPauloItbiInput,
  SaoPauloItbiResult,
} from "../../lib/registration/itbi/saoPauloItbi.types";
import {
  SaoPauloItbiForm,
  type SaoPauloItbiFormErrors,
  type SaoPauloItbiFormValues,
  type YesNoInput,
} from "./SaoPauloItbiForm";
import { SaoPauloItbiResult as SaoPauloItbiResultView } from "./SaoPauloItbiResult";

const INITIAL_VALUES: SaoPauloItbiFormValues = {
  purchasePrice: "",
  referenceValue: "",
  financedAmount: "",
  operationType: "CASH_PURCHASE",
  isIndividualPerson: "",
  isExclusivelyResidential: "",
  isFirstPropertyAcquisition: "",
  isMinhaCasaMinhaVida: "",
};

function booleanChoice(value: YesNoInput): boolean | null {
  return value === "" ? null : value === "YES";
}

export function SaoPauloItbiSimulation() {
  const [values, setValues] = useState<SaoPauloItbiFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<SaoPauloItbiFormErrors>({});
  const [result, setResult] = useState<SaoPauloItbiResult | null>(null);

  function change<K extends keyof SaoPauloItbiFormValues>(
    field: K,
    value: SaoPauloItbiFormValues[K]
  ) {
    if (
      ["purchasePrice", "referenceValue", "financedAmount"].includes(field)
      && typeof value === "string"
    ) {
      const normalizedValue = normalizeCurrencyInput(value);
      const invalid = value.includes("-") || normalizedValue !== value;
      setValues((current) => ({
        ...current,
        [field]: normalizedValue,
      }));
      setErrors((current) => ({
        ...current,
        [field]: invalid ? "Informe um valor válido e não negativo." : undefined,
        form: undefined,
      }));
    } else {
      setValues((current) => ({ ...current, [field]: value }));
      setErrors((current) => ({ ...current, form: undefined }));
    }
    setResult(null);
  }

  function blurMoney(
    field: "purchasePrice" | "referenceValue" | "financedAmount"
  ) {
    const parsed = parseCurrencyBRL(values[field]);
    if (parsed > 0 && !errors[field]) {
      setValues((current) => ({
        ...current,
        [field]: formatCurrencyBRL(parsed),
      }));
    }
  }

  function calculate() {
    const nextErrors: SaoPauloItbiFormErrors = {};
    const purchasePrice = parseCurrencyBRL(values.purchasePrice);
    const referenceValue = parseCurrencyBRL(values.referenceValue);
    const requiresFinancing = values.operationType !== "CASH_PURCHASE";
    const financedAmount = requiresFinancing
      ? parseCurrencyBRL(values.financedAmount)
      : null;

    if (errors.purchasePrice) nextErrors.purchasePrice = errors.purchasePrice;
    if (errors.referenceValue) nextErrors.referenceValue = errors.referenceValue;
    if (requiresFinancing && errors.financedAmount) {
      nextErrors.financedAmount = errors.financedAmount;
    }
    if (!values.purchasePrice.trim() || purchasePrice <= 0) {
      nextErrors.purchasePrice = "Informe um valor de compra e venda maior que zero.";
    }
    if (!values.referenceValue.trim() || referenceValue <= 0) {
      nextErrors.referenceValue = "Informe um Valor Venal de Referência maior que zero.";
    }
    if (
      requiresFinancing
      && (!values.financedAmount.trim() || !financedAmount || financedAmount <= 0)
    ) {
      nextErrors.financedAmount = "Informe o valor efetivamente financiado ou o crédito utilizado.";
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setResult(null);
      return;
    }

    const input: SaoPauloItbiInput = {
      purchasePrice,
      referenceValue,
      financedAmount,
      operationType: values.operationType,
      contractYear: 2026,
      isIndividualPerson: booleanChoice(values.isIndividualPerson),
      isExclusivelyResidential: booleanChoice(values.isExclusivelyResidential),
      isFirstPropertyAcquisition: booleanChoice(values.isFirstPropertyAcquisition),
      isMinhaCasaMinhaVida: booleanChoice(values.isMinhaCasaMinhaVida),
    };
    const nextResult = calculateSaoPauloItbi(input);
    setValues((current) => ({
      ...current,
      purchasePrice: formatCurrencyBRL(purchasePrice),
      referenceValue: formatCurrencyBRL(referenceValue),
      financedAmount: financedAmount ? formatCurrencyBRL(financedAmount) : "",
    }));
    setErrors(nextResult.errors.length
      ? { form: nextResult.errors.join(" ") }
      : {});
    setResult(nextResult);
  }

  function clear() {
    setValues(INITIAL_VALUES);
    setErrors({});
    setResult(null);
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(390px,0.9fr)_minmax(0,1.1fr)]">
      <SaoPauloItbiForm
        values={values}
        errors={errors}
        onChange={change}
        onMoneyBlur={blurMoney}
        onCalculate={calculate}
        onClear={clear}
      />
      <div aria-live="polite" aria-atomic="true">
        {result ? (
          <SaoPauloItbiResultView result={result} />
        ) : (
          <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
            <Info className="mx-auto h-6 w-6 text-goodblue-500" aria-hidden="true" />
            <h3 className="mt-3 font-bold text-slate-900">Resultado da simulação</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Informe CCV, VVR e a modalidade para calcular a estimativa conforme a regra de 2026.</p>
          </section>
        )}
      </div>
    </div>
  );
}
