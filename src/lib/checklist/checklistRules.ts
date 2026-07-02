import { ChecklistCategory, ChecklistProfile } from "../../types/checklist";

export const CHECKLIST_RULES: Record<
  ChecklistProfile,
  {
    label: string;
    title: string;
    categories: ChecklistCategory[];
  }
> = {
  COMPRADOR_CLT: {
    label: "Comprador - Empregado CLT",
    title: "Checklist Documental - Comprador CLT",
    categories: [
      {
        id: "clt-pessoal-residencial",
        title: "Documentação Pessoal e Residencial",
        icon: "user",
        items: [
          { id: "rg-cnh", label: "RG/CNH" },
          { id: "comprovante-endereco", label: "Comprovante de endereço" },
          { id: "certidao-casamento", label: "Certidão de nascimento ou casamento, frente e verso" },
          { id: "ctps-digital", label: "CTPS Digital" },
          { id: "pis", label: "PIS" }
        ]
      },
      {
        id: "clt-renda-fiscal",
        title: "Comprovação de Renda e Fiscal",
        icon: "wallet",
        items: [
          { id: "holerites-3", label: "3 últimos holerites" },
          { id: "extratos-3", label: "Extratos bancários dos últimos 3 meses" },
          { id: "ir-recibo", label: "Declaração/Recibo de Imposto de Renda" }
        ]
      },
      {
        id: "clt-regra-holerite",
        title: "Regra do Holerite",
        icon: "alert",
        items: [],
        alerts: [
          { id: "holerite-mensal", label: "Enviar apenas holerites mensais.", tone: "warning" },
          { id: "holerite-adiantamento", label: "Não enviar holerite de adiantamento.", tone: "danger" }
        ]
      }
    ]
  },
  COMPRADOR_AUTONOMO: {
    label: "Comprador - Profissional Autônomo",
    title: "Checklist Documental - Comprador Autônomo",
    categories: [
      {
        id: "autonomo-identificacao",
        title: "Identificação e Localização",
        icon: "user",
        items: [
          { id: "rg-cnh", label: "RG/CNH" },
          { id: "comprovante-endereco", label: "Comprovante de endereço" },
          { id: "certidao-estado-civil", label: "Certidão de estado civil" },
          { id: "tempo-moradia", label: "Tempo de moradia atual" },
          { id: "cidade-trabalho", label: "Cidade onde trabalha" }
        ]
      },
      {
        id: "autonomo-financeiro",
        title: "Evidências Financeiras e Fiscais",
        icon: "wallet",
        items: [
          { id: "extratos-3", label: "Extratos bancários dos últimos 3 meses" },
          { id: "ir-se-houver", label: "Declaração/Recibo de Imposto de Renda, caso tenha declarado" }
        ]
      }
    ]
  },
  VENDEDOR_PJ: {
    label: "Vendedor - Pessoa Jurídica",
    title: "Checklist Documental - Vendedor Pessoa Jurídica",
    categories: [
      {
        id: "pj-imovel",
        title: "Documentos Essenciais do Imóvel",
        icon: "home",
        items: [
          { id: "matricula-30", label: "Matrícula atualizada, máximo 30 dias" },
          { id: "iptu", label: "IPTU" },
          { id: "vistoria", label: "Contato para agendamento de vistoria técnica" }
        ],
        alerts: [
          {
            id: "custo-matricula",
            label: "Custo da matrícula atualizada: R$ 80,00 via PIX pela central ONR, caso necessário.",
            tone: "info"
          }
        ]
      },
      {
        id: "pj-empresa",
        title: "Identificação Jurídica da Empresa",
        icon: "building",
        items: [
          { id: "contrato-social", label: "Contrato social com última alteração consolidada" },
          { id: "relacao-socios", label: "Relação de sócios" },
          { id: "cartao-cnpj", label: "Cartão CNPJ ativo" }
        ]
      },
      {
        id: "pj-representantes",
        title: "Identificação dos Representantes ou Procuradores",
        icon: "users",
        items: [
          { id: "rg-cnh", label: "RG/CNH" },
          { id: "comprovante-endereco", label: "Comprovante de endereço" },
          { id: "certidao-estado-civil", label: "Certidão de estado civil" },
          { id: "pacto", label: "Pacto antenupcial, se houver" }
        ]
      },
      {
        id: "pj-bancarios",
        title: "Dados Bancários para Crédito",
        icon: "bank",
        items: [
          { id: "banco", label: "Banco" },
          { id: "agencia", label: "Agência" },
          { id: "conta", label: "Conta corrente em nome da empresa" }
        ],
        alerts: [{ id: "conta-empresa", label: "A conta para crédito deve estar em nome da empresa.", tone: "warning" }]
      }
    ]
  }
};

export const FGTS_CATEGORY: ChecklistCategory = {
  id: "fgts",
  title: "Requisitos para Uso do FGTS",
  icon: "piggy",
  items: [
    { id: "pis-fgts", label: "Número do PIS, se aplicável" },
    { id: "extrato-fgts", label: "Extrato atualizado do FGTS" }
  ],
  alerts: [
    { id: "fgts-demais-docs", label: "O envio do extrato de FGTS é obrigatório junto aos demais documentos.", tone: "danger" },
    { id: "fgts-caixa", label: "O extrato de FGTS é obrigatório conforme exigência atual da CAIXA.", tone: "warning" }
  ]
};

export const PROCURADOR_CATEGORY: ChecklistCategory = {
  id: "procurador",
  title: "Regra para Procuradores",
  icon: "file",
  items: [],
  alerts: [
    {
      id: "procuracao-legal",
      label: "Obrigatória apresentação da procuração legal além dos documentos pessoais.",
      tone: "danger"
    }
  ]
};

export const GOLDEN_RULES: ChecklistCategory = {
  id: "regras-ouro",
  title: "Regras de Ouro para o Envio",
  icon: "shield",
  items: [
    { id: "pdf-obrigatorio", label: "Formato obrigatório: PDF" },
    { id: "arquivos-pdf", label: "Todos os arquivos devem ser enviados obrigatoriamente em formato PDF para aceite." },
    { id: "prazo-envio", label: "Prazo de envio: enviar toda a documentação em até 2 dias para evitar atrasos na conferência." }
  ],
  alerts: [{ id: "pdf-alerta", label: "Arquivos obrigatoriamente em PDF.", tone: "warning" }]
};
