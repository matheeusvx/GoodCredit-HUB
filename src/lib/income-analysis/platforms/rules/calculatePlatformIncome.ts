import type {
  PlatformIncomeDocument,
  PlatformIncomeResult,
  PlatformIncomeStatus,
} from "../../../../types/platformIncome";
import {
  competenceIndex,
  holderIdentityKey,
  normalizePlatformText,
} from "../platformUtils";

export const PLATFORM_INCOME_METHOD =
  "Menor renda bruta entre os quatro comprovantes mensais mais recentes da mesma plataforma.";

function ignored(
  document: PlatformIncomeDocument,
  reason: string
): PlatformIncomeDocument {
  return {
    ...document,
    isValidForIncomeCalculation: false,
    invalidReason: reason,
  };
}

function baseResult(
  documents: PlatformIncomeDocument[],
  status: PlatformIncomeStatus,
  warnings: string[]
): PlatformIncomeResult {
  const first = documents[0];
  return {
    platform: first?.platform || "UBER",
    holderName: first?.holderName || null,
    holderCpf: first?.holderCpf || null,
    validDocuments: [],
    selectedDocuments: [],
    ignoredDocuments: documents,
    consideredGrossIncome: null,
    determiningCompetence: null,
    status,
    method: PLATFORM_INCOME_METHOD,
    warnings,
    canSendToSimulation: false,
  };
}

function hasNonConsecutiveMonths(documents: PlatformIncomeDocument[]): boolean {
  const indexes = documents
    .map((document) => document.competence)
    .filter((value): value is string => Boolean(value))
    .map(competenceIndex)
    .sort((left, right) => right - left);
  return indexes.some((value, index) => index > 0 && indexes[index - 1] - value !== 1);
}

export function calculatePlatformIncomeResult(
  documents: PlatformIncomeDocument[],
  hasBankTransactions = false
): PlatformIncomeResult | null {
  if (!documents.length) return null;
  const platforms = new Set(documents.map((document) => document.platform));
  if (platforms.size > 1) {
    return baseResult(
      documents,
      "REVIEW_REQUIRED",
      ["Os comprovantes pertencem a plataformas diferentes e não podem formar um conjunto único."]
    );
  }
  if (hasBankTransactions) {
    return baseResult(
      documents,
      "REVIEW_REQUIRED",
      ["Extratos bancários e comprovantes de plataforma devem ser analisados separadamente."]
    );
  }

  const annualDocuments = documents
    .filter((document) => document.documentPeriod === "ANNUAL")
    .map((document) => ignored(document, "Documento anual não substitui comprovante mensal."));
  const invalidDocuments = documents
    .filter((document) =>
      document.documentPeriod !== "ANNUAL" && !document.isValidForIncomeCalculation
    );
  if (invalidDocuments.some((document) =>
    document.invalidReason?.includes("divergentes")
  )) {
    return {
      ...baseResult(
        documents,
        "VALUE_DIVERGENCE",
        ["Existe divergência entre os valores brutos apresentados no mesmo documento."]
      ),
      ignoredDocuments: [...annualDocuments, ...invalidDocuments],
    };
  }

  const monthlyCandidates = documents.filter(
    (document) =>
      document.documentPeriod === "MONTHLY"
      && document.isValidForIncomeCalculation
      && document.competence
      && document.grossIncome !== null
  );
  const cpfKeys = new Set(
    monthlyCandidates
      .map((document) => document.holderCpf)
      .filter((value): value is string => Boolean(value))
  );
  const nameKeys = new Set(
    monthlyCandidates
      .map((document) => normalizePlatformText(document.holderName || ""))
      .filter(Boolean)
  );
  if (cpfKeys.size > 1 || (cpfKeys.size === 0 && nameKeys.size > 1)) {
    return {
      ...baseResult(
        documents,
        "HOLDER_MISMATCH",
        ["Os comprovantes apresentados não pertencem ao mesmo titular."]
      ),
      ignoredDocuments: [...annualDocuments, ...invalidDocuments],
    };
  }

  const holderKeys = new Set(
    monthlyCandidates.map((document) =>
      holderIdentityKey(document.holderCpf, document.holderName)
    )
  );
  if (holderKeys.size > 1 && cpfKeys.size === 0) {
    return {
      ...baseResult(
        documents,
        "HOLDER_MISMATCH",
        ["Os comprovantes apresentados não pertencem ao mesmo titular."]
      ),
      ignoredDocuments: [...annualDocuments, ...invalidDocuments],
    };
  }

  const byCompetence = new Map<string, PlatformIncomeDocument[]>();
  monthlyCandidates.forEach((document) => {
    const competence = document.competence!;
    const values = byCompetence.get(competence) || [];
    values.push(document);
    byCompetence.set(competence, values);
  });
  const conflictingDuplicate = [...byCompetence.values()].find((group) =>
    new Set(group.map((document) => Math.round((document.grossIncome || 0) * 100))).size > 1
  );
  if (conflictingDuplicate) {
    return {
      ...baseResult(
        documents,
        "DUPLICATE_COMPETENCE",
        ["A mesma competência possui comprovantes com valores brutos diferentes."]
      ),
      ignoredDocuments: [...annualDocuments, ...invalidDocuments],
    };
  }

  const duplicateDocuments: PlatformIncomeDocument[] = [];
  const deduplicated = [...byCompetence.values()].map((group) => {
    duplicateDocuments.push(
      ...group.slice(1).map((document) =>
        ignored(document, "Documento duplicado da mesma competência.")
      )
    );
    return group[0];
  }).sort((left, right) =>
    (right.competence || "").localeCompare(left.competence || "")
  );

  const selectedDocuments = deduplicated.slice(0, 4);
  const olderDocuments = deduplicated.slice(4).map((document) =>
    ignored(document, "Competência anterior aos quatro comprovantes mais recentes.")
  );
  const ignoredDocuments = [
    ...annualDocuments,
    ...invalidDocuments,
    ...duplicateDocuments,
    ...olderDocuments,
  ];
  if (selectedDocuments.length < 4) {
    return {
      ...baseResult(
        documents,
        "INSUFFICIENT_DOCUMENTS",
        [
          "São necessários os quatro comprovantes mensais mais recentes emitidos pela mesma plataforma.",
          `Comprovantes válidos encontrados: ${selectedDocuments.length} de 4.`,
        ]
      ),
      holderName: selectedDocuments[0]?.holderName || monthlyCandidates[0]?.holderName || null,
      holderCpf: selectedDocuments[0]?.holderCpf || monthlyCandidates[0]?.holderCpf || null,
      validDocuments: deduplicated,
      selectedDocuments,
      ignoredDocuments,
    };
  }

  const warnings: string[] = [];
  if (hasNonConsecutiveMonths(selectedDocuments)) {
    warnings.push("Os quatro comprovantes mais recentes possuem competências não consecutivas.");
  }
  const determiningDocument = selectedDocuments.reduce((lowest, document) =>
    (document.grossIncome || 0) < (lowest.grossIncome || 0) ? document : lowest
  );

  return {
    platform: selectedDocuments[0].platform,
    holderName: selectedDocuments[0].holderName,
    holderCpf: selectedDocuments[0].holderCpf,
    validDocuments: deduplicated,
    selectedDocuments,
    ignoredDocuments,
    consideredGrossIncome: determiningDocument.grossIncome,
    determiningCompetence: determiningDocument.competence,
    status: "COMPLETE",
    method: PLATFORM_INCOME_METHOD,
    warnings,
    canSendToSimulation: true,
  };
}
