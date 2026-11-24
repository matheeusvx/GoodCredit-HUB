import type { ReconstructedPdfLine } from "../../../../types/pdfImport";

function pageLines(pageNumber: number, values: string[]): ReconstructedPdfLine[] {
  return values.map((text, index) => ({ pageNumber, y: 1000 - index * 12, text, items: [] }));
}

export const SYNTHETIC_CTPS_LINES: ReconstructedPdfLine[] = [
  ...pageLines(1, [
    "Carteira de Trabalho Digital",
    "Ministério do Trabalho e Emprego",
    "Data de emissão: 10/01/2020",
    "Documento assinado em: 15/08/2026",
    "Dados Pessoais",
    "Nome: CLIENTE TESTE CTPS",
    "CPF: 000.000.000-00",
    "Data de nascimento: 10/10/1990",
    "Nacionalidade: Brasileira",
    "Sexo: Feminino",
    "Nome da mãe: RESPONSAVEL TESTE",
    "Contratos de Trabalho",
    "01/02/2020 - Aberto",
    "Empregador: EMPRESA ALFA TESTE LTDA",
    "CNPJ Raiz: 00.000.001/0001-00",
    "Estabelecimento: FILIAL ALFA",
    "CNPJ: 00.000.001/0002-00",
    "Cargo: Analista de Crédito",
    "CBO: 4110-10",
    "Tipo de contrato: Prazo determinado",
    "Relação de trabalho: Empregado",
    "Tipo de admissão: Transferência por sucessão",
    "Salário contratual: R$ 4.500,00 por mês",
    "Anotações",
    "01/02/2020 - Salário definido para R$ 3.500,00",
    "15/06/2021 - Salário definido para R$ 4.000,00 com efeito a partir de 01/05/2021",
  ]),
  ...pageLines(2, [
    "05/02/2024 - Salário definido para R$ 4.500,00 com efeito a partir de 01/01/2024",
    "10/03/2023 - Cargo alterado para Analista Sênior com efeito a partir de 01/03/2023",
    "10/03/2023 - CBO alterado para 2525-05 com efeito a partir de 01/03/2023",
    "01/02/2022 - Tipo de contrato alterado para novo prazo determinado",
    "01/02/2023 - Tipo de contrato alterado para prazo indeterminado",
    "01/12/2024 - Férias de 02/01/2025 a 31/01/2025",
    "10/04/2024 - Observação administrativa preservada",
    "15/05/2022 - Aberto",
    "Empregador: EMPRESA BETA TESTE S.A.",
    "CNPJ Raiz: 00.000.002/0001-00",
    "Estabelecimento: MATRIZ BETA",
    "CNPJ: 00.000.002/0001-00",
    "Cargo: Assistente Administrativo",
    "CBO: 4110-05",
    "Tipo de contrato: Prazo indeterminado",
    "Relação de trabalho: Empregado",
    "Tipo de admissão: Admissão",
    "Salário contratual: R$ 2.500,00 mensal",
    "Anotações",
    "15/05/2022 - Salário definido para R$ 2.500,00",
  ]),
  ...pageLines(3, [
    "01/03/2017 - 31/12/2019",
    "Empregador: EMPRESA GAMA TESTE LTDA",
    "CNPJ Raiz: 00.000.003/0001-00",
    "Estabelecimento: MATRIZ GAMA",
    "CNPJ: 00.000.003/0001-00",
    "Cargo: Auxiliar",
    "CBO: 4110-05",
    "Tipo de contrato: Prazo indeterminado",
    "Relação de trabalho: Empregado",
    "Tipo de admissão: Admissão",
    "Salário contratual: R$ 1.900,00 mensal",
    "Anotações",
    "01/03/2017 - Salário definido para R$ 1.500,00",
    "01/02/2019 - Salário definido para R$ 1.900,00",
    "31/12/2019 - Rescisão Contratual",
  ]),
];

export function withSalaryConflict(): ReconstructedPdfLine[] {
  return SYNTHETIC_CTPS_LINES.map((line) => ({
    ...line,
    text: line.text === "Salário contratual: R$ 4.500,00 por mês" ? "Salário contratual: R$ 4.800,00 por mês" : line.text,
  }));
}

export function withoutSecondActiveSalary(): ReconstructedPdfLine[] {
  return SYNTHETIC_CTPS_LINES.filter((line) => line.text !== "Salário contratual: R$ 2.500,00 mensal" && line.text !== "15/05/2022 - Salário definido para R$ 2.500,00");
}
