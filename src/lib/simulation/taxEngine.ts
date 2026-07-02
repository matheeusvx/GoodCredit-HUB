import { AmortizationSystem, BankCode, OperationType, SimulationFormData, TaxEngineResult } from "../../types/simulation";
import { monthlyRateFromAnnual, normalizeBancoCode } from "./formatters";

const CONFIG = {
  TAXAS_FIXAS_AA: {
    INTER: 0.095,
    BRADESCO_PRINCIPAL: 0.1199,
    BRADESCO_PRIVATE: 0.117,
    ITAU_PERSONNALITE: 0.117,
    ITAU_UNICLASS: 0.12,
    SANTANDER_SAC: 0.1169,
    SANTANDER_PRICE: 0.1404,
    CAIXA_SBPE: 0.1149
  },
  UFS_NORTE_NORDESTE: new Set(["AC", "AL", "AP", "AM", "BA", "CE", "MA", "PA", "PB", "PE", "PI", "RN", "RO", "RR", "SE", "TO"]),
  MCMV: {
    F1: { rendaMin: 0, rendaMax: 2160, taxaMin: 0.04594, taxaMax: 0.048548, novo: { ltv: 0.8, valorMaxImovel: 275000 }, usado: { ltv: 0.8, valorMaxImovel: 275000 } },
    F2: { rendaMin: 2160.01, rendaMax: 2850, taxaMin: 0.048548, taxaMax: 0.051162, novo: { ltv: 0.8, valorMaxImovel: 275000 }, usado: { ltv: 0.8, valorMaxImovel: 275000 } },
    F3: { rendaMin: 2850.01, rendaMax: 3200, taxaMin: 0.051162, taxaMax: 0.053782, novo: { ltv: 0.8, valorMaxImovel: 275000 }, usado: { ltv: 0.8, valorMaxImovel: 275000 } },
    F4: { rendaMin: 3200.01, rendaMax: 3500, taxaMin: 0.053782, taxaMax: 0.056408, novo: { ltv: 0.8, valorMaxImovel: 275000 }, usado: { ltv: 0.8, valorMaxImovel: 275000 } },
    F5: { rendaMin: 3500.01, rendaMax: 4000, taxaMin: 0.061678, taxaMax: 0.061678, novo: { ltv: 0.8, valorMaxImovel: 275000 }, usado: { ltv: 0.8, valorMaxImovel: 275000 } },
    F6: { rendaMin: 4000.01, rendaMax: 5000, taxaMin: 0.07229, taxaMax: 0.07229, novo: { ltv: 0.8, valorMaxImovel: 275000 }, usado: { ltv: 0.8, valorMaxImovel: 275000 } },
    F7: { rendaMin: 5000.01, rendaMax: 9600, taxa: 0.084722, novo: { ltv: 0.8, valorMaxImovel: 400000 }, usado: { ltv: 0.8, valorMaxImovel: 400000 } },
    F8: { rendaMin: 9600.01, rendaMax: 13000, taxa: 0.1047, novo: { ltv: 0.8, valorMaxImovel: 600000 }, usado: { ltv: 0.6, valorMaxImovel: 600000 } }
  }
} as const;

const BANK_LABELS: Record<BankCode, string> = {
  CAIXA: "Caixa",
  INTER: "Inter",
  BRADESCO: "Bradesco",
  ITAU: "Itaú",
  SANTANDER: "Santander",
  DESCONHECIDO: "Banco não identificado"
};

type McmvBand = keyof typeof CONFIG.MCMV;

function getScenario(tipoFinanciamento: string, tipoOperacao: OperationType | "") {
  if (tipoFinanciamento === "COMERCIAL") return "COMERCIAL";
  if (tipoOperacao === "TERRENO") return "TERRENO";
  return "RESIDENCIAL";
}

function getModality(tipoOperacao: OperationType | ""): "novo" | "usado" | "terreno" | "" {
  if (tipoOperacao === "NOVO") return "novo";
  if (tipoOperacao === "USADO") return "usado";
  if (tipoOperacao === "TERRENO") return "terreno";
  return "";
}

function findMcmvBand(renda: number): McmvBand | undefined {
  return (Object.keys(CONFIG.MCMV) as McmvBand[]).find((key) => {
    const band = CONFIG.MCMV[key];
    return renda >= band.rendaMin && renda <= band.rendaMax;
  });
}

export function runTaxEngine(args: {
  formData: SimulationFormData;
  valorImovel: number;
  rendaBrutaFamiliar: number;
}): TaxEngineResult {
  const bancoCodigo = normalizeBancoCode(args.formData.bancoPretendido || "");
  const cenario = getScenario(args.formData.tipoFinanciamento, args.formData.tipoOperacao);
  const modalidade = getModality(args.formData.tipoOperacao);
  const uf = args.formData.uf.trim().toUpperCase();
  const observacoesTaxa: string[] = [];

  let taxaAno = 0.11;
  let taxaAnoMin: number | undefined;
  let taxaAnoMax: number | undefined;
  let produtoSelecionado = "Taxa padrão de referência";
  let criterioSelecionado = "Banco não identificado";
  let ltvMaxRef: number | undefined;
  let valorMaxImovelRegra: number | undefined;

  if (bancoCodigo === "CAIXA") {
    const isEligibleContext = cenario === "RESIDENCIAL" && (modalidade === "novo" || modalidade === "usado") && args.rendaBrutaFamiliar <= 13000;
    const bandKey = isEligibleContext ? findMcmvBand(args.rendaBrutaFamiliar) : undefined;
    const band = bandKey ? CONFIG.MCMV[bandKey] : undefined;
    const rule = band && modalidade !== "terreno" && modalidade !== "" ? band[modalidade] : undefined;

    if (bandKey && band && rule && args.valorImovel <= rule.valorMaxImovel) {
      const taxaNorteNordeste = "taxaMin" in band ? band.taxaMin : band.taxa;
      const taxaDemais = "taxaMax" in band ? band.taxaMax : band.taxa;
      taxaAno = CONFIG.UFS_NORTE_NORDESTE.has(uf) ? taxaNorteNordeste : taxaDemais;
      taxaAnoMin = taxaNorteNordeste;
      taxaAnoMax = taxaDemais;
      produtoSelecionado = bandKey === "F8" ? "Caixa Classe Média" : "Caixa MCMV";
      criterioSelecionado = `${produtoSelecionado} ${bandKey}`;
      ltvMaxRef = rule.ltv;
      valorMaxImovelRegra = rule.valorMaxImovel;
      observacoesTaxa.push("Enquadramento Caixa aplicado conforme renda, UF, modalidade e valor do imóvel.");
    } else {
      taxaAno = CONFIG.TAXAS_FIXAS_AA.CAIXA_SBPE;
      produtoSelecionado = "Caixa SBPE";
      criterioSelecionado = "Fora dos critérios MCMV/Classe Média nesta simulação";
      ltvMaxRef = 0.8;
      observacoesTaxa.push("Caixa SBPE aplicada por ausência de enquadramento MCMV/Classe Média.");
    }
  } else if (bancoCodigo === "INTER") {
    taxaAno = CONFIG.TAXAS_FIXAS_AA.INTER;
    produtoSelecionado = "Inter PF";
    criterioSelecionado = "Taxa fixa Inter";
    ltvMaxRef = 0.8;
  } else if (bancoCodigo === "BRADESCO") {
    taxaAno = CONFIG.TAXAS_FIXAS_AA.BRADESCO_PRINCIPAL;
    produtoSelecionado = "Bradesco Principal";
    criterioSelecionado = "Perfil principal";
    ltvMaxRef = 0.8;
  } else if (bancoCodigo === "ITAU") {
    taxaAno = CONFIG.TAXAS_FIXAS_AA.ITAU_UNICLASS;
    produtoSelecionado = "Itaú Uniclass";
    criterioSelecionado = "Perfil Uniclass";
    ltvMaxRef = 0.8;
  } else if (bancoCodigo === "SANTANDER") {
    const chosenSystem: AmortizationSystem = args.formData.sistemaAmortizador === "PRICE" ? "PRICE" : "SAC";
    taxaAno = chosenSystem === "PRICE" ? CONFIG.TAXAS_FIXAS_AA.SANTANDER_PRICE : CONFIG.TAXAS_FIXAS_AA.SANTANDER_SAC;
    produtoSelecionado = chosenSystem === "PRICE" ? "Santander PRICE" : "Santander SAC";
    criterioSelecionado = "Taxa conforme sistema escolhido";
    ltvMaxRef = 0.8;
  }

  return {
    bancoCodigo,
    bancoLabel: BANK_LABELS[bancoCodigo],
    cenario,
    modalidade,
    produtoSelecionado,
    criterioSelecionado,
    taxaAno,
    taxaMes: monthlyRateFromAnnual(taxaAno),
    taxaAnoMin,
    taxaAnoMax,
    observacoesTaxa,
    ltvMaxRef,
    valorMaxImovelRegra
  };
}
