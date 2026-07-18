import { ProSolutoForm as ProSolutoFormData } from "../../types/proSoluto";

export interface ProSolutoInputValues {
  purchasePrice: string;
  appraisalValue: string;
  financeablePercent: string;
  approvedFinancing: string;
  fgtsAmount: string;
  subsidyAmount: string;
  paidEntryAmount: string;
  otherOwnResources: string;
}

type MoneyField = Exclude<keyof ProSolutoInputValues, "financeablePercent">;

interface Props {
  form: ProSolutoFormData;
  inputs: ProSolutoInputValues;
  errors: string[];
  onFormChange: (patch: Partial<ProSolutoFormData>) => void;
  onMoneyChange: (field: MoneyField, value: string) => void;
  onMoneyBlur: (field: MoneyField) => void;
  onPercentChange: (value: string) => void;
  onPercentBlur: () => void;
}

interface CurrencyFieldProps {
  id: string;
  label: string;
  value: string;
  hint?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}

function CurrencyField({ id, label, value, hint, disabled, onChange, onBlur }: CurrencyFieldProps) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder="R$ 0,00"
        className="input-field"
      />
      {hint && <span className="text-xs leading-5 text-slate-500">{hint}</span>}
    </label>
  );
}

export function ProSolutoForm({
  form,
  inputs,
  errors,
  onFormChange,
  onMoneyChange,
  onMoneyBlur,
  onPercentChange,
  onPercentBlur
}: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-goodgreen-600">Composição da operação</p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">Dados da Operação</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Informe os valores reconhecidos na negociação. Os resultados são atualizados automaticamente.
        </p>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <label htmlFor="pro-soluto-client" className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700">Nome do cliente ou processo</span>
          <input
            id="pro-soluto-client"
            type="text"
            value={form.clientName}
            onChange={(event) => onFormChange({ clientName: event.target.value })}
            placeholder="Opcional"
            className="input-field"
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <CurrencyField
            id="pro-soluto-purchase"
            label="Valor de compra e venda *"
            value={inputs.purchasePrice}
            onChange={(value) => onMoneyChange("purchasePrice", value)}
            onBlur={() => onMoneyBlur("purchasePrice")}
          />
          <CurrencyField
            id="pro-soluto-appraisal"
            label="Avaliação da engenharia"
            value={inputs.appraisalValue}
            hint="Se não houver avaliação, a base será o valor de compra."
            onChange={(value) => onMoneyChange("appraisalValue", value)}
            onBlur={() => onMoneyBlur("appraisalValue")}
          />

          <label htmlFor="pro-soluto-percent" className="flex min-w-0 flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">Percentual financiável</span>
            <input
              id="pro-soluto-percent"
              type="text"
              inputMode="decimal"
              value={inputs.financeablePercent}
              onChange={(event) => onPercentChange(event.target.value)}
              onBlur={onPercentBlur}
              placeholder="Ex.: 80,00%"
              className="input-field"
            />
            <span className="text-xs leading-5 text-slate-500">Use o percentual correspondente à operação.</span>
          </label>

          <CurrencyField
            id="pro-soluto-approved"
            label="Financiamento aprovado pelo banco"
            value={inputs.approvedFinancing}
            disabled={form.useEstimatedFinancing}
            hint={form.useEstimatedFinancing ? "O limite calculado será tratado como estimativa." : undefined}
            onChange={(value) => onMoneyChange("approvedFinancing", value)}
            onBlur={() => onMoneyBlur("approvedFinancing")}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-goodblue-100 bg-goodblue-50 p-4">
          <input
            type="checkbox"
            checked={form.useEstimatedFinancing}
            onChange={(event) => onFormChange({ useEstimatedFinancing: event.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-goodgreen-600 focus:ring-goodgreen-500"
          />
          <span>
            <span className="block text-sm font-bold text-goodblue-900">O financiamento ainda não foi aprovado</span>
            <span className="mt-1 block text-xs leading-5 text-goodblue-700">
              O limite calculado será usado apenas como estimativa e não representa aprovação bancária.
            </span>
          </span>
        </label>

        <div>
          <h3 className="text-base font-bold text-slate-900">Recursos complementares</h3>
          <p className="mt-1 text-sm text-slate-500">Inclua somente valores já reconhecidos na composição da compra.</p>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <CurrencyField
              id="pro-soluto-fgts"
              label="FGTS utilizado"
              value={inputs.fgtsAmount}
              onChange={(value) => onMoneyChange("fgtsAmount", value)}
              onBlur={() => onMoneyBlur("fgtsAmount")}
            />
            <CurrencyField
              id="pro-soluto-subsidy"
              label="Subsídio"
              value={inputs.subsidyAmount}
              onChange={(value) => onMoneyChange("subsidyAmount", value)}
              onBlur={() => onMoneyBlur("subsidyAmount")}
            />
            <CurrencyField
              id="pro-soluto-entry"
              label="Entrada, sinal ou parcelas já pagas"
              value={inputs.paidEntryAmount}
              onChange={(value) => onMoneyChange("paidEntryAmount", value)}
              onBlur={() => onMoneyBlur("paidEntryAmount")}
            />
            <CurrencyField
              id="pro-soluto-other"
              label="Outros recursos próprios"
              value={inputs.otherOwnResources}
              onChange={(value) => onMoneyChange("otherOwnResources", value)}
              onBlur={() => onMoneyBlur("otherOwnResources")}
            />
          </div>
        </div>

        {errors.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3" role="alert">
            <p className="text-sm font-bold text-amber-900">Confira os dados para concluir</p>
            <ul className="mt-2 space-y-1 text-sm text-amber-800">
              {errors.map((error) => <li key={error}>• {error}</li>)}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

