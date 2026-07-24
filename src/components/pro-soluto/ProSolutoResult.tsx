import {
  BadgeDollarSign,
  Building2,
  CircleDashed,
  Landmark,
  WalletCards
} from "lucide-react";
import { formatCurrencyBRL } from "../../lib/fgts/currency";
import { ProSolutoCalculationResult, ProSolutoForm } from "../../types/proSoluto";
import { ProSolutoAlerts } from "./ProSolutoAlerts";

interface Props {
  form: ProSolutoForm;
  result: ProSolutoCalculationResult;
}

const statusLabels = {
  HAS_PRO_SOLUTO: "Existe valor a complementar",
  FULLY_COVERED: "Valor integralmente coberto",
  SURPLUS_RESOURCES: "Recursos acima do necessário",
  INCOMPLETE: "Aguardando dados obrigatórios"
} as const;

function formatPercent(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

interface ResultBlockProps {
  icon: typeof Building2;
  title: string;
  rows: Array<[string, string]>;
  tone?: "default" | "highlight";
}

function ResultBlock({ icon: Icon, title, rows, tone = "default" }: ResultBlockProps) {
  const classes =
    tone === "highlight"
      ? "border-goodgreen-200 bg-goodgreen-50"
      : "border-slate-200 bg-white";

  return (
    <section className={`rounded-lg border p-4 ${classes}`}>
      <div className="flex items-center gap-2">
        <Icon
          className={`h-4 w-4 ${
            tone === "highlight" ? "text-goodgreen-700" : "text-slate-500"
          }`}
        />
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      <dl className="mt-3 space-y-2.5">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <dt className="text-xs leading-5 text-slate-500">{label}</dt>
            <dd className="text-sm font-bold text-slate-900 sm:text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ProSolutoResult({ form, result }: Props) {
  const incomplete = result.status === "INCOMPLETE";

  return (
    <aside className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-panel xl:sticky xl:top-6">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-goodgreen-50 text-goodgreen-700">
          <BadgeDollarSign className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-950">Resultado do Pró-Soluto</h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            {statusLabels[result.status]}
          </p>
        </div>
      </div>

      {incomplete ? (
        <div className="p-5">
          <div className="flex flex-col items-center rounded-lg border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
            <CircleDashed className="h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm font-bold text-slate-800">
              Preencha os dados obrigatórios
            </p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
              O resultado será exibido somente após a validação do CCV, da avaliação, do
              percentual e do crédito.
            </p>
          </div>
          <div className="mt-4">
            <ProSolutoAlerts alerts={result.warnings} />
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-5">
          <ResultBlock
            icon={Building2}
            title="1. Valor da operação"
            rows={[
              ["Valor que o vendedor precisa receber — CCV", formatCurrencyBRL(form.sellerReceivableAmount)],
              ["Avaliação do imóvel", formatCurrencyBRL(form.appraisalValue)]
            ]}
          />

          <ResultBlock
            icon={Landmark}
            title="2. Limite pela avaliação"
            rows={[
              ["Percentual máximo financiável", formatPercent(result.validatedFinanceablePercent)],
              ["Limite de financiamento", formatCurrencyBRL(result.appraisalFinancingLimit)]
            ]}
          />

          <ResultBlock
            icon={WalletCards}
            title="3. Recursos disponíveis"
            rows={[
              [
                "Crédito aprovado",
                form.creditNotApprovedYet
                  ? "Ainda não aprovado"
                  : formatCurrencyBRL(form.approvedCreditAmount || 0)
              ],
              [
                "Financiamento considerado",
                `${formatCurrencyBRL(result.financingConsidered)}${
                  result.financingIsEstimated ? " (estimado)" : ""
                }`
              ],
              ["FGTS utilizado", formatCurrencyBRL(form.fgtsAmount)],
              ["Entrada já paga", formatCurrencyBRL(form.paidEntryAmount)],
              ["Total de recursos disponíveis", formatCurrencyBRL(result.totalAvailableResources)]
            ]}
          />

          <ResultBlock
            icon={BadgeDollarSign}
            title="4. Pró-soluto"
            tone="highlight"
            rows={[
              ["Valor a complementar", formatCurrencyBRL(result.proSoluto)],
              ["Percentual descoberto", formatPercent(result.uncoveredPercent)],
              ["Recursos excedentes", formatCurrencyBRL(result.surplusResources)]
            ]}
          />

          <div
            className={`rounded-lg border px-4 py-4 ${
              result.proSoluto > 0
                ? "border-amber-200 bg-amber-50"
                : "border-goodgreen-200 bg-goodgreen-50"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
              Pró-soluto apurado
            </p>
            <p
              className={`mt-2 text-3xl font-bold ${
                result.proSoluto > 0 ? "text-amber-900" : "text-goodgreen-800"
              }`}
            >
              {formatCurrencyBRL(result.proSoluto)}
            </p>
            <p className="mt-2 text-sm leading-5 text-slate-600">
              {result.proSoluto > 0
                ? "Valor ainda necessário para completar o recebimento do vendedor."
                : "Nenhum valor adicional de pró-soluto foi identificado."}
            </p>
          </div>

          <ProSolutoAlerts alerts={result.warnings} />
        </div>
      )}
    </aside>
  );
}
