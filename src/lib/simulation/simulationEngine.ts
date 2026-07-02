import { AmortizationSystem, BankCode, SimulationFormData, SimulationResult } from "../../types/simulation";
import { formatCurrencyBRL, formatPercentBR, monthlyRateFromAnnual, normalizeMoneyValue, parseNumberBR } from "./formatters";
import { runTaxEngine } from "./taxEngine";

export function resolveAllowedAmortizer(bankCode: BankCode, chosenSystem: AmortizationSystem): AmortizationSystem {
  const escolhido = chosenSystem === "PRICE" ? "PRICE" : "SAC";
  switch (bankCode) {
    case "CAIXA":
      return escolhido;
    case "ITAU":
      return "PRICE";
    case "BRADESCO":
      return escolhido;
    case "SANTANDER":
    case "INTER":
      return "SAC";
    default:
      return escolhido;
  }
}

export function calcParcelaPRICE(pv: number, i: number, n: number): number {
  if (!Number.isFinite(pv) || pv <= 0) return NaN;
  if (!Number.isFinite(i) || i < 0) return NaN;
  if (!Number.isFinite(n) || n <= 0) return NaN;
  if (i === 0) return pv / n;
  const denom = 1 - Math.pow(1 + i, -n);
  if (denom <= 0) return NaN;
  return (pv * i) / denom;
}

export function calcParcelasSAC(pv: number, i: number, n: number) {
  if (!Number.isFinite(pv) || pv <= 0) return { primeira: NaN, ultima: NaN, amort: NaN };
  if (!Number.isFinite(i) || i < 0) return { primeira: NaN, ultima: NaN, amort: NaN };
  if (!Number.isFinite(n) || n <= 0) return { primeira: NaN, ultima: NaN, amort: NaN };
  const amort = pv / n;
  const primeira = amort + pv * i;
  const saldoAntesUltima = pv - amort * (n - 1);
  const ultima = amort + saldoAntesUltima * i;
  return { primeira, ultima, amort };
}

export function runSimulation(formData: SimulationFormData): SimulationResult {
  const normalizations = [
    normalizeMoneyValue(formData.valorImovelInput, "Valor do imóvel"),
    normalizeMoneyValue(formData.valorFinanciamentoInput, "Valor do financiamento"),
    normalizeMoneyValue(formData.rendaBrutaFamiliarInput, "Renda bruta familiar"),
    normalizeMoneyValue(formData.saldoFgtsInput, "Saldo de FGTS"),
    normalizeMoneyValue(formData.valorEntradaInput, "Entrada com recurso próprio")
  ];
  const [valorImovelNorm, financiamentoNorm, rendaNorm, fgtsNorm, entradaNorm] = normalizations;
  const moneyNormalizationLogs = normalizations.flatMap((item) => (item.log ? [item.log] : []));

  const valorImovel = valorImovelNorm.value;
  const rendaBrutaFamiliar = rendaNorm.value;
  const valorEntrada = formData.pretendeEntrada === "SIM" ? entradaNorm.value : 0;
  const saldoFGTS = fgtsNorm.value;
  const fgtsConsiderado = formData.possuiFgts === "SIM" && saldoFGTS > 0 ? saldoFGTS : 0;
  const entradaTotalConsiderada = valorEntrada + fgtsConsiderado;
  const valorFinanciado = financiamentoNorm.value > 0 ? financiamentoNorm.value : valorImovel * 0.8;
  const prazoAnos = Math.min(35, Math.max(1, Math.floor(parseNumberBR(formData.prazoAnosInput) || 30)));
  const nParcelas = prazoAnos * 12;

  const taxResult = runTaxEngine({ formData, valorImovel, rendaBrutaFamiliar });
  const sistemaAmortizadorEscolhido = formData.sistemaAmortizador === "PRICE" ? "PRICE" : "SAC";
  const sistemaAmortizadorAplicado = resolveAllowedAmortizer(taxResult.bancoCodigo, sistemaAmortizadorEscolhido);
  const taxaMes = monthlyRateFromAnnual(taxResult.taxaAno);

  const price = calcParcelaPRICE(valorFinanciado, taxaMes, nParcelas);
  const sac = calcParcelasSAC(valorFinanciado, taxaMes, nParcelas);
  const parcelaPrimeira = sistemaAmortizadorAplicado === "PRICE" ? price : sac.primeira;
  const parcelaUltima = sistemaAmortizadorAplicado === "PRICE" ? price : sac.ultima;
  const parcelaAproximada = parcelaPrimeira;
  const ltv = valorImovel > 0 ? valorFinanciado / valorImovel : 0;
  const comprometimentoRendaBruta = rendaBrutaFamiliar > 0 ? parcelaPrimeira / rendaBrutaFamiliar : 0;
  const alertas: string[] = [];

  if (valorFinanciado > valorImovel && valorImovel > 0) {
    alertas.push("Valor financiado maior que o valor do imóvel informado.");
  }
  if (taxResult.ltvMaxRef && ltv > taxResult.ltvMaxRef) {
    alertas.push(`LTV acima da referência da regra (${formatPercentBR(taxResult.ltvMaxRef)}).`);
  }
  if (entradaTotalConsiderada > valorImovel && valorImovel > 0) {
    alertas.push("Entrada total considerada maior que o valor do imóvel.");
  }

  const observacaoSistemaAmortizador =
    sistemaAmortizadorAplicado !== sistemaAmortizadorEscolhido
      ? `O cliente selecionou ${sistemaAmortizadorEscolhido}, porém o banco ${taxResult.bancoLabel} trabalha nesta regra com ${sistemaAmortizadorAplicado}. A simulação foi ajustada automaticamente.`
      : undefined;

  const textoSimulacao = [
    "Simulação inicial aproximada:",
    "",
    `- Banco pretendido: ${taxResult.bancoLabel}`,
    `- Cenário: ${taxResult.cenario}`,
    `- Modalidade: ${labelOperation(formData.tipoOperacao)}`,
    `- Condição de taxa: ${taxResult.produtoSelecionado} - ${taxResult.criterioSelecionado}`,
    `- Valor do imóvel: ${formatCurrencyBRL(valorImovel)}`,
    `- Entrada recursos próprios: ${formatCurrencyBRL(valorEntrada)}`,
    `- FGTS considerado: ${formatCurrencyBRL(fgtsConsiderado)}`,
    `- Entrada total considerada: ${formatCurrencyBRL(entradaTotalConsiderada)}`,
    `- Valor financiado estimado: ${formatCurrencyBRL(valorFinanciado)}`,
    `- Prazo: ${prazoAnos} anos (${nParcelas} meses)`,
    `- Taxa de referência: ${formatPercentBR(taxResult.taxaAno)} a.a. (${formatPercentBR(taxaMes)} a.m.)`,
    `- Sistema amortizador escolhido: ${sistemaAmortizadorEscolhido}`,
    `- Sistema amortizador aplicado: ${sistemaAmortizadorAplicado} (${sistemaAmortizadorAplicado === "SAC" ? "parcela decrescente" : "parcela constante"})`,
    `- Parcela aprox. 1ª: ${formatCurrencyBRL(parcelaPrimeira)}`,
    `- Parcela última: ${formatCurrencyBRL(parcelaUltima)}`,
    `- Renda bruta familiar informada: ${formatCurrencyBRL(rendaBrutaFamiliar)}`,
    `- LTV: ${formatPercentBR(ltv)}`,
    `- Comprometimento aprox. da renda bruta: ${formatPercentBR(comprometimentoRendaBruta)}`,
    "",
    "Observação:",
    "Esta é uma simulação para referência. A análise detalhada pode variar conforme política vigente do banco, perfil e validação documental."
  ].join("\n");

  return {
    ...taxResult,
    taxaMes,
    nomeCompleto: formData.nomeCompleto,
    valorImovel,
    valorEntrada,
    saldoFGTS,
    fgtsConsiderado,
    entradaTotalConsiderada,
    valorFinanciado,
    prazoAnos,
    nParcelas,
    sistemaAmortizadorEscolhido,
    sistemaAmortizadorAplicado,
    observacaoSistemaAmortizador,
    parcelaPrimeira,
    parcelaUltima,
    parcelaAproximada,
    rendaBrutaFamiliar,
    ltv,
    comprometimentoRendaBruta,
    moneyNormalizationLogs,
    alertas,
    textoSimulacao
  };
}

function labelOperation(value: SimulationFormData["tipoOperacao"]): string {
  if (value === "NOVO") return "Aquisição de Imóvel Novo";
  if (value === "USADO") return "Aquisição de Imóvel Usado";
  if (value === "TERRENO") return "Aquisição de Terreno";
  return "Não informada";
}
