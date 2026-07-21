import type { SimplifiedItbiInput, SimplifiedItbiResult } from "../../types/registration";
import { getRegistrationCity } from "./registrationCities";

const SBC_RATE = 0.025;
const SBC_FIXED_DEDUCTION = 2250;
const SBC_MINIMUM_EXCLUSIVE = 200000;

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function baseResult(input: SimplifiedItbiInput): SimplifiedItbiResult {
  return {
    city: input.city,
    status: "INVALID_INPUT",
    purchasePrice: Number.isFinite(input.purchasePrice) ? input.purchasePrice : 0,
    rate: null,
    fixedDeduction: 0,
    grossTax: null,
    estimatedItbi: null,
    rangeLabel: null,
    equivalentReductionPercent: null,
    warnings: []
  };
}

function calculateSaoBernardo(input: SimplifiedItbiInput): SimplifiedItbiResult {
  const result = baseResult(input);

  if (input.purchasePrice <= SBC_MINIMUM_EXCLUSIVE) {
    return {
      ...result,
      status: "RULE_NOT_APPLICABLE",
      warnings: [
        "Esta regra simplificada é aplicável somente a imóveis com valor de compra e venda superior a R$ 200.000,00.",
        "Para valores inferiores ou iguais a esse limite, é necessário conferir manualmente a regra aplicável antes da emissão da guia."
      ]
    };
  }

  const grossTax = roundCurrency(input.purchasePrice * SBC_RATE);
  return {
    ...result,
    status: "CALCULATED",
    rate: SBC_RATE,
    fixedDeduction: SBC_FIXED_DEDUCTION,
    grossTax,
    estimatedItbi: roundCurrency(Math.max(0, grossTax - SBC_FIXED_DEDUCTION)),
    rangeLabel: "Superior a R$ 200.000,00"
  };
}

function diademaRule(purchasePrice: number): Pick<SimplifiedItbiResult, "rate" | "rangeLabel" | "equivalentReductionPercent"> {
  if (purchasePrice <= 50000) {
    return { rate: 0.005, rangeLabel: "Até R$ 50.000,00", equivalentReductionPercent: 0.8 };
  }
  if (purchasePrice <= 100000) {
    return { rate: 0.01, rangeLabel: "De R$ 50.000,01 até R$ 100.000,00", equivalentReductionPercent: 0.6 };
  }
  if (purchasePrice <= 150000) {
    return { rate: 0.015, rangeLabel: "De R$ 100.000,01 até R$ 150.000,00", equivalentReductionPercent: 0.4 };
  }
  return { rate: 0.025, rangeLabel: "Acima de R$ 150.000,00", equivalentReductionPercent: 0 };
}

function calculateDiadema(input: SimplifiedItbiInput): SimplifiedItbiResult {
  const result = baseResult(input);
  const rule = diademaRule(input.purchasePrice);
  return {
    ...result,
    ...rule,
    status: "CALCULATED",
    grossTax: roundCurrency(input.purchasePrice * (rule.rate ?? 0)),
    estimatedItbi: roundCurrency(Math.max(0, input.purchasePrice * (rule.rate ?? 0)))
  };
}

export function calculateSimplifiedItbi(input: SimplifiedItbiInput): SimplifiedItbiResult {
  const result = baseResult(input);

  if (!Number.isFinite(input.purchasePrice) || input.purchasePrice <= 0) {
    return {
      ...result,
      warnings: ["O valor de compra e venda precisa ser maior que zero."]
    };
  }

  const city = getRegistrationCity(input.city);
  if (city.availability === "IN_DEVELOPMENT") {
    return {
      ...result,
      status: "IN_DEVELOPMENT",
      warnings: ["As regras de ITBI desta cidade ainda estão em desenvolvimento."]
    };
  }

  return input.city === "SAO_BERNARDO_DO_CAMPO" ? calculateSaoBernardo(input) : calculateDiadema(input);
}
