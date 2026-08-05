export const BRADESCO_RELATED_PARTY_SANITIZED = [
  { description: "RECEBIMENTO TED D REMET. MARIA HELENA SOUZA", amount: 500 },
  { description: "PIX RECEBIDO REM: MARIA HELENA SOUZA", amount: 758 },
  { description: "PIX RECEBIDO REM: JOAO PEDRO SILVA", amount: 900 },
  { description: "PIX RECEBIDO REM: MARIA HELENA SOUZA ME", amount: 2500 },
  { description: "PIX RECEBIDO REM: JOAO PEDRO SILVA SERVICOS LTDA", amount: 1800 },
  { description: "PIX RECEBIDO REM: 4 SERVICE PDV LTDA", amount: 395.12 },
  { description: "PIX RECEBIDO REM: MARIA APARECIDA SOUZA", amount: 300 },
] as const;

export const BRADESCO_RELATED_PARTY_EXPECTED = {
  sameHolderAmount: 1258,
  spouseAmount: 900,
  companyAmount: 4695.12,
  thirdPartyAmount: 300,
} as const;

