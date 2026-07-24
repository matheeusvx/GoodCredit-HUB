import { Building2, Landmark, WalletCards } from "lucide-react";
import { MAX_FINANCEABLE_PERCENT } from "../../lib/pro-soluto/proSolutoConstants";
import { ProSolutoForm as ProSolutoFormData } from "../../types/proSoluto";

export interface ProSolutoInputValues {
  sellerReceivableAmount: string;
  appraisalValue: string;
  financeablePercent: string;
  approvedCreditAmount: string;
  fgtsAmount: string;
  paidEntryAmount: string;
}

export type ProSolutoMoneyField = Exclude<
  keyof ProSolutoInputValues,
  "financeablePercent"
>;

interface Props {
  form: ProSolutoFormData;
  inputs: ProSolutoInputValues;
  errors: string[];
  onFormChange: (patch: Partial<ProSolutoFormData>) => void;
  onMoneyChange: (field: ProSolutoMoneyField, value: string) => void;
  onMoneyBlur: (field: ProSolutoMoneyField) => void;
  onPercentChange: (value: string) => void;
  onPercentBlur: () => void;
}

interface CurrencyFieldProps {
  id: string;
  label: string;
  value: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}

function CurrencyField({
  id,
  label,
  value,
  hint,
  disabled,
  required,
  onChange,
  onBlur
}: CurrencyFieldProps) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-2">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {required ? " *" : ""}
      </span>
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

interface FormSectionProps {
  icon: typeof Building2;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

function FormSection({ icon: Icon, eyebrow, title, description, children }: FormSectionProps) {
  return (
    <section className="border-b border-slate-100 pb-6 last:border-b-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-goodgreen-600">
            {eyebrow}
          </p>
          <h3 className="mt-1 text-base font-bold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
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
  const percentLimitError = errors.find((error) =>
    error.includes(`permitido é de ${MAX_FINANCEABLE_PERCENT}%`)
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-slate-950">Dados da Operação</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Informe os valores da negociação. A avaliação é usada somente para calcular o
          limite de financiamento.
        </p>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <label htmlFor="pro-soluto-client" className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700">
            Nome do cliente ou processo
          </span>
          <input
            id="pro-soluto-client"
            type="text"
            value={form.clientName}
            onChange={(event) => onFormChange({ clientName: event.target.value })}
            placeholder="Opcional"
            className="input-field"
          />
        </label>

        <FormSection
          icon={Building2}
          eyebrow="1. Operação"
          title="Valor acordado e avaliação"
          description="O CCV representa quanto o vendedor precisa receber. A avaliação não substitui esse valor."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <CurrencyField
              id="pro-soluto-seller-receivable"
              label="Valor que o vendedor precisa receber — CCV"
              value={inputs.sellerReceivableAmount}
              required
              hint="Informe o valor total acordado na compra e venda."
              onChange={(value) => onMoneyChange("sellerReceivableAmount", value)}
              onBlur={() => onMoneyBlur("sellerReceivableAmount")}
            />
            <CurrencyField
              id="pro-soluto-appraisal"
              label="Valor de avaliação do imóvel"
              value={inputs.appraisalValue}
              required
              hint="Base usada exclusivamente para estimar o limite financiável."
              onChange={(value) => onMoneyChange("appraisalValue", value)}
              onBlur={() => onMoneyBlur("appraisalValue")}
            />
          </div>
        </FormSection>

        <FormSection
          icon={Landmark}
          eyebrow="2. Financiamento"
          title="Limite e crédito aprovado"
          description="O crédito considerado será o menor valor entre a aprovação e o limite calculado pela avaliação."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label htmlFor="pro-soluto-percent" className="flex min-w-0 flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Percentual máximo financiável *
              </span>
              <input
                id="pro-soluto-percent"
                type="text"
                inputMode="decimal"
                value={inputs.financeablePercent}
                onChange={(event) => onPercentChange(event.target.value)}
                onBlur={onPercentBlur}
                placeholder="Ex.: 80,00%"
                aria-invalid={Boolean(percentLimitError)}
                className="input-field"
              />
              <span
                className={`text-xs leading-5 ${
                  percentLimitError ? "font-semibold text-red-600" : "text-slate-500"
                }`}
              >
                {percentLimitError ||
                  `O percentual máximo permitido nesta operação é de ${MAX_FINANCEABLE_PERCENT}% sobre o valor de avaliação.`}
              </span>
            </label>

            <CurrencyField
              id="pro-soluto-approved"
              label="Crédito aprovado"
              value={inputs.approvedCreditAmount}
              required={!form.creditNotApprovedYet}
              disabled={form.creditNotApprovedYet}
              hint={
                form.creditNotApprovedYet
                  ? "O limite calculado será tratado como estimativa."
                  : "Informe o valor efetivamente aprovado pelo banco."
              }
              onChange={(value) => onMoneyChange("approvedCreditAmount", value)}
              onBlur={() => onMoneyBlur("approvedCreditAmount")}
            />
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-goodblue-100 bg-goodblue-50 p-4">
            <input
              type="checkbox"
              checked={form.creditNotApprovedYet}
              onChange={(event) =>
                onFormChange({ creditNotApprovedYet: event.target.checked })
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-goodgreen-600 focus:ring-goodgreen-500"
            />
            <span>
              <span className="block text-sm font-bold text-goodblue-900">
                O crédito ainda não foi aprovado
              </span>
              <span className="mt-1 block text-xs leading-5 text-goodblue-700">
                O sistema usará o limite da avaliação apenas como estimativa, sem indicar
                aprovação bancária.
              </span>
            </span>
          </label>
        </FormSection>

        <FormSection
          icon={WalletCards}
          eyebrow="3. Recursos"
          title="Valores já aplicados na operação"
          description="Considere somente FGTS efetivamente utilizado e entrada já paga ao vendedor."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <CurrencyField
              id="pro-soluto-fgts"
              label="FGTS utilizado"
              value={inputs.fgtsAmount}
              onChange={(value) => onMoneyChange("fgtsAmount", value)}
              onBlur={() => onMoneyBlur("fgtsAmount")}
            />
            <CurrencyField
              id="pro-soluto-entry"
              label="Entrada já paga"
              value={inputs.paidEntryAmount}
              hint="Inclua sinal ou parcelas já entregues ao vendedor."
              onChange={(value) => onMoneyChange("paidEntryAmount", value)}
              onBlur={() => onMoneyBlur("paidEntryAmount")}
            />
          </div>
        </FormSection>

        {errors.length > 0 && (
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
            role="alert"
          >
            <p className="text-sm font-bold text-amber-900">Confira os dados para calcular</p>
            <ul className="mt-2 space-y-1 text-sm text-amber-800">
              {errors.map((error) => (
                <li key={error}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
