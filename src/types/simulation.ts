import { AmortizationSystem } from "./amortization";

export type BankCode = "CAIXA" | "INTER" | "BRADESCO" | "ITAU" | "SANTANDER" | "DESCONHECIDO";
export type { AmortizationSystem };
export type FinancingType = "RESIDENCIAL" | "COMERCIAL";
export type OperationType = "NOVO" | "USADO" | "TERRENO";
export type CivilStatus = "SOLTEIRO" | "CASADO" | "SEPARADO" | "DIVORCIADO" | "VIUVO";
export type YesNo = "SIM" | "NAO";

export interface SimulationFormData {
  nomeCompleto: string;
  dataNascimento: string;
  estadoCivil: CivilStatus | "";
  tipoFinanciamento: FinancingType | "";
  tipoOperacao: OperationType | "";
  valorImovelInput: string;
  valorFinanciamentoInput: string;
  rendaBrutaFamiliarInput: string;
  uf: string;
  bancoPretendido: BankCode | "";
  sistemaAmortizador: AmortizationSystem;
  prazoAnosInput: string;
  possuiFgts: YesNo;
  saldoFgtsInput: string;
  pretendeEntrada: YesNo;
  valorEntradaInput: string;
}

export interface TaxEngineResult {
  bancoCodigo: BankCode;
  bancoLabel: string;
  cenario: "RESIDENCIAL" | "COMERCIAL" | "TERRENO";
  modalidade: "novo" | "usado" | "terreno" | "";
  produtoSelecionado: string;
  criterioSelecionado: string;
  taxaAno: number;
  taxaMes: number;
  taxaAnoMin?: number;
  taxaAnoMax?: number;
  observacoesTaxa: string[];
  ltvMaxRef?: number;
  valorMaxImovelRegra?: number;
}

export interface SimulationResult extends TaxEngineResult {
  nomeCompleto: string;
  valorImovel: number;
  valorEntrada: number;
  saldoFGTS: number;
  fgtsConsiderado: number;
  entradaTotalConsiderada: number;
  valorFinanciado: number;
  prazoAnos: number;
  nParcelas: number;
  sistemaAmortizadorEscolhido: AmortizationSystem;
  sistemaAmortizadorAplicado: AmortizationSystem;
  observacaoSistemaAmortizador?: string;
  parcelaPrimeira: number;
  parcelaUltima: number;
  parcelaAproximada: number;
  rendaBrutaFamiliar: number;
  ltv: number;
  comprometimentoRendaBruta: number;
  moneyNormalizationLogs: string[];
  alertas: string[];
  textoSimulacao: string;
}
