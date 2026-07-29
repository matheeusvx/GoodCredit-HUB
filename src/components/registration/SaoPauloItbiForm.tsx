import { Calculator, RotateCcw } from "lucide-react";
import type { SaoPauloOperationType } from "../../lib/registration/itbi/saoPauloItbi.types";

export type YesNoInput = "" | "YES" | "NO";

export interface SaoPauloItbiFormValues {
  purchasePrice: string;
  referenceValue: string;
  financedAmount: string;
  operationType: SaoPauloOperationType;
  isIndividualPerson: YesNoInput;
  isExclusivelyResidential: YesNoInput;
  isFirstPropertyAcquisition: YesNoInput;
  isMinhaCasaMinhaVida: YesNoInput;
}

export type SaoPauloItbiFormErrors = Partial<Record<
  "purchasePrice" | "referenceValue" | "financedAmount" | "form",
  string
>>;

const OPERATION_OPTIONS: Array<{ value: SaoPauloOperationType; label: string }> = [
  { value: "CASH_PURCHASE", label: "Compra sem financiamento" },
  { value: "SFH", label: "Financiamento pelo SFH" },
  { value: "PAR", label: "Programa de Arrendamento Residencial — PAR" },
  { value: "HIS", label: "Habitação de Interesse Social — HIS" },
  { value: "CONSORTIUM", label: "Consórcio" },
  { value: "SFI", label: "Financiamento pelo SFI" },
];

function YesNoField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: YesNoInput;
  onChange: (value: YesNoInput) => void;
}) {
  return (
    <label htmlFor={id} className="flex h-full flex-col text-sm font-semibold text-slate-700">
      <span className="md:min-h-[3.75rem]">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as YesNoInput)}
        className="input-field mt-2 h-12"
      >
        <option value="">Selecione</option>
        <option value="YES">Sim</option>
        <option value="NO">Não</option>
      </select>
    </label>
  );
}

function MoneyField({
  id,
  label,
  help,
  value,
  error,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  help: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  return (
    <label htmlFor={id} className="flex h-full flex-col text-sm font-semibold text-slate-700">
      <span className="flex flex-col md:min-h-16">
        <span>{label}</span>
        <span id={helpId} className="mt-1 text-xs font-normal leading-5 text-slate-500">{help}</span>
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder="R$ 0,00"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${helpId} ${errorId}` : helpId}
        className={`input-field mt-2 h-12 ${error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : ""}`}
      />
      {error && <span id={errorId} className="mt-2 block text-sm font-semibold text-rose-700" role="alert">{error}</span>}
    </label>
  );
}

export function SaoPauloItbiForm({
  values,
  errors,
  onChange,
  onMoneyBlur,
  onCalculate,
  onClear,
}: {
  values: SaoPauloItbiFormValues;
  errors: SaoPauloItbiFormErrors;
  onChange: <K extends keyof SaoPauloItbiFormValues>(
    field: K,
    value: SaoPauloItbiFormValues[K]
  ) => void;
  onMoneyBlur: (field: "purchasePrice" | "referenceValue" | "financedAmount") => void;
  onCalculate: () => void;
  onClear: () => void;
}) {
  const requiresFinancing = values.operationType !== "CASH_PURCHASE";
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="sp-itbi-form-title">
      <div className="border-b border-slate-100 pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-goodgreen-600">São Paulo/SP · regra 2026</p>
        <h3 id="sp-itbi-form-title" className="mt-1 text-lg font-bold text-slate-950">Dados da operação</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">A base será o maior valor entre a transação e o Valor Venal de Referência.</p>
      </div>

      <div className="mt-5 grid items-stretch gap-5 md:grid-cols-2">
        <MoneyField
          id="sp-purchase-price"
          label="Valor da compra e venda"
          help="Informe o valor total declarado na transação."
          value={values.purchasePrice}
          error={errors.purchasePrice}
          onChange={(value) => onChange("purchasePrice", value)}
          onBlur={() => onMoneyBlur("purchasePrice")}
        />
        <MoneyField
          id="sp-reference-value"
          label="Valor Venal de Referência"
          help="Consulte o valor informado pela Prefeitura de São Paulo."
          value={values.referenceValue}
          error={errors.referenceValue}
          onChange={(value) => onChange("referenceValue", value)}
          onBlur={() => onMoneyBlur("referenceValue")}
        />
        <label htmlFor="sp-operation-type" className="block text-sm font-semibold text-slate-700 md:col-span-2">
          Modalidade da operação
          <select
            id="sp-operation-type"
            value={values.operationType}
            onChange={(event) => onChange("operationType", event.target.value as SaoPauloOperationType)}
            className="input-field mt-2 h-12"
          >
            {OPERATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        {requiresFinancing && (
          <div className="md:col-span-2">
            <MoneyField
              id="sp-financed-amount"
              label="Valor efetivamente financiado ou crédito utilizado"
              help="Informe somente o valor efetivo do financiamento ou da carta de crédito."
              value={values.financedAmount}
              error={errors.financedAmount}
              onChange={(value) => onChange("financedAmount", value)}
              onBlur={() => onMoneyBlur("financedAmount")}
            />
          </div>
        )}
      </div>

      <fieldset className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <legend className="px-1 text-sm font-bold text-slate-900">Possível isenção para primeiro imóvel</legend>
        <p className="mt-1 text-xs leading-5 text-slate-500">As respostas permitem apenas verificar um possível enquadramento inicial.</p>
        <div className="mt-4 grid items-stretch gap-4 md:grid-cols-2">
          <YesNoField id="sp-individual" label="O adquirente é pessoa física?" value={values.isIndividualPerson} onChange={(value) => onChange("isIndividualPerson", value)} />
          <YesNoField id="sp-residential" label="O imóvel será de uso exclusivamente residencial?" value={values.isExclusivelyResidential} onChange={(value) => onChange("isExclusivelyResidential", value)} />
          <YesNoField id="sp-first-property" label="Esta é a primeira aquisição imobiliária do beneficiário?" value={values.isFirstPropertyAcquisition} onChange={(value) => onChange("isFirstPropertyAcquisition", value)} />
          <YesNoField id="sp-mcmv" label="A operação está enquadrada no Minha Casa, Minha Vida?" value={values.isMinhaCasaMinhaVida} onChange={(value) => onChange("isMinhaCasaMinhaVida", value)} />
        </div>
      </fieldset>

      {errors.form && <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800" role="alert">{errors.form}</p>}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onCalculate} className="btn-primary sm:min-w-36">
          <Calculator className="h-4 w-4" aria-hidden="true" /> Calcular
        </button>
        <button type="button" onClick={onClear} className="btn-muted sm:min-w-44">
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Limpar simulação
        </button>
      </div>
    </section>
  );
}
