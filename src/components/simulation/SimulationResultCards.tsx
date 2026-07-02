import { formatCurrencyBRL, formatPercentBR } from "../../lib/simulation/formatters";
import { SimulationResult } from "../../types/simulation";
import { SummaryCard } from "../SummaryCard";

interface Props {
  result: SimulationResult;
}

export function SimulationResultCards({ result }: Props) {
  const cards = [
    ["Banco pretendido", result.bancoLabel],
    ["Produto/condição de taxa", result.produtoSelecionado],
    ["Cenário", result.cenario],
    ["Modalidade", result.modalidade || "-"],
    ["Valor do imóvel", formatCurrencyBRL(result.valorImovel)],
    ["Entrada recursos próprios", formatCurrencyBRL(result.valorEntrada)],
    ["FGTS considerado", formatCurrencyBRL(result.fgtsConsiderado)],
    ["Entrada total considerada", formatCurrencyBRL(result.entradaTotalConsiderada)],
    ["Valor financiado estimado", formatCurrencyBRL(result.valorFinanciado)],
    ["Prazo", `${result.prazoAnos} anos (${result.nParcelas} meses)`],
    ["Taxa anual", formatPercentBR(result.taxaAno)],
    ["Taxa mensal", formatPercentBR(result.taxaMes)],
    ["Sistema escolhido", result.sistemaAmortizadorEscolhido],
    ["Sistema aplicado", result.sistemaAmortizadorAplicado],
    ["Primeira parcela", formatCurrencyBRL(result.parcelaPrimeira)],
    ["Última parcela", formatCurrencyBRL(result.parcelaUltima)],
    ["Renda bruta familiar", formatCurrencyBRL(result.rendaBrutaFamiliar)],
    ["LTV", formatPercentBR(result.ltv)],
    ["Comprometimento de renda", formatPercentBR(result.comprometimentoRendaBruta)]
  ];

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <SummaryCard
            key={label}
            label={label}
            value={value}
            tone={label.includes("parcela") || label === "Taxa mensal" ? "green" : "slate"}
          />
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <InfoBox title="Observações da taxa" items={result.observacoesTaxa} fallback="Taxa aplicada conforme banco selecionado." />
        <InfoBox
          title="Ajustes e alertas"
          items={[
            ...(result.observacaoSistemaAmortizador ? [result.observacaoSistemaAmortizador] : []),
            ...result.moneyNormalizationLogs,
            ...result.alertas
          ]}
          fallback="Nenhum ajuste automático relevante foi aplicado."
          alert={result.alertas.length > 0}
        />
      </div>
    </section>
  );
}

function InfoBox({
  title,
  items,
  fallback,
  alert = false
}: {
  title: string;
  items: string[];
  fallback: string;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${alert ? "border-amber-200 bg-amber-50" : "border-goodblue-100 bg-goodblue-50"}`}>
      <h3 className={`text-sm font-bold ${alert ? "text-amber-800" : "text-goodblue-700"}`}>{title}</h3>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
        {(items.length > 0 ? items : [fallback]).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
