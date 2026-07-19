import type { FaqCategoryOption, FaqItem } from "../types/faq";

export const FAQ_CONTENT_VERSION = "1.0";
export const FAQ_LAST_REVIEWED_AT: string | null = null;

export const FAQ_CATEGORIES: FaqCategoryOption[] = [
  { value: "ALL", label: "Todas" },
  { value: "CREDIT_APPROVAL", label: "Crédito e aprovação" },
  { value: "FGTS_PROPERTY", label: "FGTS e imóveis" },
  { value: "INCOME_COMPOSITION", label: "Renda e composição" },
  { value: "ENGINEERING_APPRAISAL", label: "Engenharia e avaliação" },
  { value: "CONSTRUCTION", label: "Construção e obra" },
  { value: "DOCUMENTATION", label: "Documentação e cadastros" }
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "pergunta-1",
    number: 1,
    question: "Meu crédito foi aprovado, o que devo fazer?",
    answer: "Providencie a documentação do vendedor e do imóvel para solicitar a avaliação de engenharia.",
    category: "CREDIT_APPROVAL",
    keywords: ["aprovado", "crédito", "engenharia", "documentação", "vendedor", "imóvel"],
    sourcePage: 2
  },
  {
    id: "pergunta-2",
    number: 2,
    question: "Meu crédito foi condicionado, o que devo fazer?",
    answer:
      "É preciso fazer a pesquisa do SCR BACEN. Faça o cadastro no sistema Registrato do BACEN e valide-o pelo internet banking do seu banco.\n\nDentro dessa área, solicite o relatório do SCR, que listará os seus comprometimentos. Com essa pesquisa, a GoodCredit poderá analisar o comprometimento financeiro e verificar se é possível liquidá-lo para seguir com a contratação.",
    category: "CREDIT_APPROVAL",
    keywords: ["condicionado", "SCR", "BACEN", "Registrato", "comprometimento", "crédito"],
    sourcePage: 2,
    links: [
      {
        label: "Acessar o Registrato do Banco Central",
        url: "https://www.bcb.gov.br/cidadaniafinanceira/registrato"
      }
    ]
  },
  {
    id: "pergunta-3",
    number: 3,
    question: "Meu crédito foi reprovado, o que devo fazer?",
    answer:
      "Verifique primeiro o motivo da reprovação do cliente:\n\n- Comprometimento: fazer a pesquisa do SCR BACEN.\n- CONRES: verificar o tipo e se é possível sanar.\n- Prazo: avaliar a alteração de 420 para 360 meses.\n- Rating mínimo: orientar o cliente a gerar mais relacionamento com a CAIXA.\n- Se não for possível resolver neste primeiro momento: ofertar consórcio, gerar a simulação no site da CAIXA e enviar ao cliente.",
    category: "CREDIT_APPROVAL",
    keywords: ["reprovado", "reprovação", "SCR", "CONRES", "rating", "prazo", "consórcio"],
    sourcePage: 2
  },
  {
    id: "pergunta-4",
    number: 4,
    question: "O valor aprovado não me atendeu, o que posso fazer?",
    answer:
      "- Negociar diretamente com o responsável pela venda, como corretor, construtor ou proprietário.\n- Usar o FGTS para suprir o valor restante.\n- Tentar outra modalidade de crédito, conforme o enquadramento.\n- Compor renda com outro participante.\n- Adquirir um imóvel compatível com a capacidade financeira.\n- Aguardar e reavaliar após a baixa dos comprometimentos, se for o caso.",
    category: "CREDIT_APPROVAL",
    keywords: ["valor aprovado", "FGTS", "compor renda", "comprometimento", "imóvel"],
    sourcePage: 2
  },
  {
    id: "pergunta-5",
    number: 5,
    question: "Quanto tempo vale a avaliação aprovada?",
    answer: "180 dias.",
    category: "ENGINEERING_APPRAISAL",
    keywords: ["avaliação", "validade", "180 dias", "engenharia"],
    sourcePage: 3
  },
  {
    id: "pergunta-6",
    number: 6,
    question: "Posso usar uma avaliação aprovada para imóvel novo em um imóvel usado?",
    answer: "Não. Será necessário reavaliar o crédito devido à mudança do produto.",
    category: "ENGINEERING_APPRAISAL",
    keywords: ["avaliação", "imóvel novo", "imóvel usado", "produto", "reavaliar"],
    sourcePage: 3
  },
  {
    id: "pergunta-7",
    number: 7,
    question: "Qual valor a CAIXA libera para financiamento?",
    answer: "Até 80% do valor do imóvel, com base na capacidade financeira e na linha de crédito escolhida.",
    category: "CREDIT_APPROVAL",
    keywords: ["CAIXA", "80%", "valor", "financiamento", "capacidade financeira"],
    sourcePage: 3
  },
  {
    id: "pergunta-8",
    number: 8,
    question: "Qual é a melhor opção: SAC ou PRICE?",
    answer:
      "A GoodCredit poderá simular as duas opções para comparação. Caso os valores da parcela e da entrada no SAC estejam dentro do orçamento, essa opção é mais atrativa para quem deseja reduzir o saldo devedor com maior velocidade.",
    category: "CREDIT_APPROVAL",
    keywords: ["SAC", "PRICE", "parcela", "entrada", "saldo devedor", "simulação"],
    sourcePage: 3
  },
  {
    id: "pergunta-9",
    number: 9,
    question: "Tenho um imóvel. Posso financiar outro?",
    answer:
      "Sim, se a renda comportar dois financiamentos. A exceção é a construção financiada, modalidade em que o cliente não pode ter financiamento ativo.",
    category: "CREDIT_APPROVAL",
    keywords: ["dois imóveis", "financiamento ativo", "renda", "construção financiada"],
    sourcePage: 3
  },
  {
    id: "pergunta-10",
    number: 10,
    question: "Posso antecipar parcelas ao longo do financiamento?",
    answer:
      "Sim. A amortização pode ser feita a qualquer momento do contrato com recursos próprios, reduzindo o prazo ou o valor das parcelas.",
    category: "CREDIT_APPROVAL",
    keywords: ["antecipar", "amortização", "prazo", "parcelas", "recursos próprios"],
    sourcePage: 3
  },
  {
    id: "pergunta-11",
    number: 11,
    question: "Posso usar meu FGTS para pagar a entrada?",
    answer: "Sim, desde que o cliente se enquadre nas regras para uso do FGTS na compra do imóvel.",
    category: "FGTS_PROPERTY",
    keywords: ["FGTS", "entrada", "compra", "regras"],
    sourcePage: 4
  },
  {
    id: "pergunta-12",
    number: 12,
    question: "Quais são as regras para usar o FGTS na compra do imóvel?",
    answer:
      "- Ter no mínimo três anos de trabalho sob o regime do FGTS, somando períodos consecutivos ou não, na mesma empresa ou em empresas diferentes.\n- Não possuir financiamento ativo no Sistema Financeiro de Habitação (SFH) em qualquer parte do país.\n- Não ser proprietário, possuidor, promitente comprador, usufrutuário ou cessionário de imóvel residencial urbano, ou de parte residencial de imóvel misto, concluído ou em construção, localizado no município da residência atual ou onde exerce a ocupação laboral principal, incluindo municípios limítrofes e integrantes da mesma região metropolitana.",
    category: "FGTS_PROPERTY",
    keywords: ["FGTS", "três anos", "SFH", "imóvel residencial", "município limítrofe"],
    sourcePage: 4
  },
  {
    id: "pergunta-13",
    number: 13,
    question: "Tenho imóvel residencial em meu nome na mesma cidade. Posso adquirir outro?",
    answer: "Sim, pela linha SBPE.",
    category: "FGTS_PROPERTY",
    keywords: ["imóvel residencial", "mesma cidade", "SBPE", "adquirir"],
    sourcePage: 4
  },
  {
    id: "pergunta-14",
    number: 14,
    question: "Tenho imóvel residencial em meu nome na mesma cidade. Posso adquirir outro e usar FGTS?",
    answer: "Pode financiar, mas não pode utilizar o FGTS.",
    category: "FGTS_PROPERTY",
    keywords: ["imóvel residencial", "mesma cidade", "FGTS", "financiar"],
    sourcePage: 4
  },
  {
    id: "pergunta-15",
    number: 15,
    question: "Tenho um terreno em meu nome. Posso usar FGTS?",
    answer: "Sim. Ter um terreno não é impeditivo.",
    category: "FGTS_PROPERTY",
    keywords: ["terreno", "FGTS", "impedimento"],
    sourcePage: 4
  },
  {
    id: "pergunta-16",
    number: 16,
    question: "Tenho um imóvel recebido por herança com mais três irmãos. Posso comprar pelo MCMV?",
    answer: "Sim, pois, nesse caso, a cota de propriedade é inferior a 40%.",
    category: "FGTS_PROPERTY",
    keywords: ["herança", "irmãos", "MCMV", "cota", "40%"],
    sourcePage: 5
  },
  {
    id: "pergunta-17",
    number: 17,
    question: "Adquiri um imóvel com minha esposa e agora nos separamos. Posso comprar a parte dela?",
    answer: "Sim. Nesse caso, é um processo de fração ideal: ela será a vendedora e você será o comprador.",
    category: "FGTS_PROPERTY",
    keywords: ["separação", "esposa", "fração ideal", "comprador", "vendedora"],
    sourcePage: 5
  },
  {
    id: "pergunta-18",
    number: 18,
    question: "Posso usar o FGTS para amortizar o financiamento?",
    answer:
      "Sim. O FGTS pode ser usado para amortizar ou liquidar o financiamento e também para pagar parte do valor das parcelas.",
    category: "FGTS_PROPERTY",
    keywords: ["FGTS", "amortizar", "liquidar", "parcelas", "financiamento"],
    sourcePage: 5
  },
  {
    id: "pergunta-19",
    number: 19,
    question: "Qual é o prazo máximo para quitar um financiamento?",
    answer: "420 meses para imóvel novo, imóvel usado e construção; 240 meses para aquisição de terreno.",
    category: "CREDIT_APPROVAL",
    keywords: ["prazo máximo", "420 meses", "240 meses", "terreno", "construção"],
    sourcePage: 5
  },
  {
    id: "pergunta-20",
    number: 20,
    question: "Quais imóveis podem ser comprados com uso do FGTS?",
    answer:
      "Somente os financiados no SFH: imóveis residenciais novos, usados ou em construção, avaliados em até R$ 2.250.000,00.",
    category: "FGTS_PROPERTY",
    keywords: ["FGTS", "SFH", "imóveis", "residencial", "R$ 2.250.000"],
    sourcePage: 5
  },
  {
    id: "pergunta-21",
    number: 21,
    question: "Onde solicito a autorização para o saque do FGTS?",
    answer: "A autorização é solicitada pelo aplicativo FGTS CAIXA. A GoodCredit poderá fornecer o passo a passo.",
    category: "FGTS_PROPERTY",
    keywords: ["autorização", "saque", "FGTS", "aplicativo", "CAIXA"],
    sourcePage: 5
  },
  {
    id: "pergunta-22",
    number: 22,
    question: "Posso utilizar apenas parte do FGTS?",
    answer:
      "Sim. Quando for feito o pedido do FGTS, a GoodCredit entrará em contato para confirmar os valores, e o cliente poderá especificar quanto pretende utilizar. Se essa informação já estiver disponível, ela poderá ser inserida no sistema.",
    category: "FGTS_PROPERTY",
    keywords: ["parte do FGTS", "saque parcial", "valor", "pedido"],
    sourcePage: 6
  },
  {
    id: "pergunta-23",
    number: 23,
    question: "O que é considerado município limítrofe para a CAIXA?",
    answer: "Município limítrofe é aquele que faz divisa com outro município.",
    category: "FGTS_PROPERTY",
    keywords: ["município limítrofe", "cidade", "divisa", "CAIXA"],
    sourcePage: 6
  },
  {
    id: "pergunta-24",
    number: 24,
    question: "Quanto tempo de renda preciso ter para financiar um imóvel?",
    answer:
      "Não é mais exigido tempo mínimo. Basta apresentar o comprovante de renda do último mês trabalhado, que poderá ser utilizado na avaliação.",
    category: "INCOME_COMPOSITION",
    keywords: ["tempo de renda", "comprovante", "último mês", "financiar"],
    sourcePage: 6
  },
  {
    id: "pergunta-25",
    number: 25,
    question: "Quantas pessoas podem compor renda em um financiamento?",
    answer:
      "A CAIXA não possui limitador de participantes no processo de financiamento. É importante ressaltar que todos constarão no contrato como compradores.",
    category: "INCOME_COMPOSITION",
    keywords: ["compor renda", "participantes", "compradores", "contrato", "CAIXA"],
    sourcePage: 6
  },
  {
    id: "pergunta-26",
    number: 26,
    question: "O cliente declarou Imposto de Renda dentro do limite de isenção e a CAIXA não aceitou como comprovação. O que pode ser feito?",
    answer:
      "O cliente pode retificar o Imposto de Renda e apresentar extratos bancários para dar respaldo à retificação.\n\nA comprovação também pode ser feita pela renda informal, mediante extratos bancários, faturas de cartão de crédito, contas de água, luz e telefone, seguro, previdência e outros documentos que comprovem a movimentação financeira.",
    category: "INCOME_COMPOSITION",
    keywords: ["Imposto de Renda", "isenção", "retificação", "renda informal", "extratos bancários"],
    sourcePage: 6
  },
  {
    id: "pergunta-27",
    number: 27,
    question: "No enquadramento pelo MCMV, como a união estável deve ser apresentada para incluir o companheiro no processo?",
    answer:
      "O companheiro não entra como dependente, mas como participante do processo, o que poderá favorecer o aumento do subsídio. Para isso, basta apresentar a união estável.",
    category: "DOCUMENTATION",
    keywords: ["MCMV", "união estável", "companheiro", "participante", "subsídio"],
    sourcePage: 7
  },
  {
    id: "pergunta-28",
    number: 28,
    question: "O cliente possui renda informal. Quais documentos devem ser solicitados?",
    answer:
      "Solicite documentos dos últimos seis meses:\n\n- Extratos bancários.\n- Faturas de cartão de crédito.\n- Comprovantes de água, luz, telefone e internet.\n- Plano de saúde e boletos em geral.\n- Outros documentos que comprovem que a pessoa possui a renda informal informada.",
    category: "INCOME_COMPOSITION",
    keywords: ["renda informal", "documentos", "extratos", "cartão", "comprovantes", "seis meses"],
    sourcePage: 7
  },
  {
    id: "pergunta-29",
    number: 29,
    question: "Rendimentos isentos e não tributáveis declarados no Imposto de Renda podem ser usados como renda comprovada?",
    answer:
      "Contribuintes que receberam rendimentos isentos, não tributáveis ou tributados exclusivamente na fonte, cuja soma tenha sido superior a R$ 200 mil no ano anterior, podem usar o Imposto de Renda para comprovação.",
    category: "INCOME_COMPOSITION",
    keywords: ["rendimentos isentos", "não tributáveis", "Imposto de Renda", "renda comprovada", "R$ 200 mil"],
    sourcePage: 7
  },
  {
    id: "pergunta-30",
    number: 30,
    question: "Após alteração de sobrenome, é necessário atualizar o documento de identificação ou somente o CPF?",
    answer:
      "É necessário alterar o CPF. Quanto ao documento de identificação, se tiver sido emitido antes do casamento, poderá ser usado sem a alteração do sobrenome.",
    category: "DOCUMENTATION",
    keywords: ["sobrenome", "CPF", "documento de identificação", "casamento"],
    sourcePage: 8
  },
  {
    id: "pergunta-31",
    number: 31,
    question: "O que fazer quando o cliente possui dois números de PIS?",
    answer:
      "Utilize o PIS em que o cliente possui os valores a serem debitados. Se houver saldo nas duas contas, o cliente deverá ir a uma agência para unificar os dados no setor de FGTS da CAIXA.",
    category: "DOCUMENTATION",
    keywords: ["PIS", "duas contas", "unificar", "FGTS", "CAIXA"],
    sourcePage: 8
  },
  {
    id: "pergunta-32",
    number: 32,
    question: "A análise da renda informal é menos rigorosa na construção em terreno próprio?",
    answer:
      "Não. A política de análise é a mesma, com base na modalidade e no sistema de amortização: MCMV, Pró-Cotista ou SBPE; PRICE ou SAC.",
    category: "INCOME_COMPOSITION",
    keywords: ["renda informal", "construção", "terreno próprio", "MCMV", "Pró-Cotista", "SBPE", "PRICE", "SAC"],
    sourcePage: 8
  },
  {
    id: "pergunta-33",
    number: 33,
    question: "Como analisar empresário com alto faturamento que não declarou Imposto de Renda?",
    answer:
      "É possível apresentar os três últimos pró-labores e os extratos bancários para dar respaldo aos documentos apresentados.",
    category: "INCOME_COMPOSITION",
    keywords: ["empresário", "faturamento", "Imposto de Renda", "pró-labore", "extratos bancários"],
    sourcePage: 8
  },
  {
    id: "pergunta-34",
    number: 34,
    question: "Como o banco apura a renda informal?",
    answer:
      "A renda informal é analisada de forma gerencial. Apresente o máximo possível de documentos que deem respaldo às informações levadas ao gerente.\n\nSerá marcada uma entrevista para explicar o trabalho, como o serviço é realizado e há quanto tempo a renda informal existe. Esse modelo evita divergências no momento da assinatura do contrato, pois a renda já terá sido avaliada pelo gerente.",
    category: "INCOME_COMPOSITION",
    keywords: ["banco", "renda informal", "apuração", "gerente", "entrevista", "documentos"],
    sourcePage: 9
  },
  {
    id: "pergunta-35",
    number: 35,
    question: "Se houver administrador não sócio no contrato social, é necessário apresentar os documentos dele?",
    answer: "Somente devem ser apresentados os documentos dos administradores previstos na Certidão Simplificada da Junta Comercial.",
    category: "DOCUMENTATION",
    keywords: ["administrador", "não sócio", "contrato social", "Certidão Simplificada", "Junta Comercial"],
    sourcePage: 9
  },
  {
    id: "pergunta-36",
    number: 36,
    question: "A simulação utiliza os dados do participante mais velho mesmo quando ele possui renda inferior?",
    answer: "Sim. A simulação sempre utilizará os dados do participante de maior idade.",
    category: "CREDIT_APPROVAL",
    keywords: ["simulação", "participante mais velho", "idade", "renda inferior"],
    sourcePage: 9
  },
  {
    id: "pergunta-37",
    number: 37,
    question: "Como gerar o SCPO?",
    answer:
      "O SCPO é emitido pelo endereço indicado abaixo. A emissão geralmente é feita pelo contador da empresa, mas, por ser um documento gerado on-line, qualquer pessoa que possua as informações da obra pode gerar o arquivo.",
    category: "DOCUMENTATION",
    keywords: ["SCPO", "documento", "contador", "obra", "emissão"],
    sourcePage: 9,
    links: [{ label: "Acessar o SCPO", url: "http://scpo.mte.gov.br/" }]
  },
  {
    id: "pergunta-38",
    number: 38,
    question: "O que fazer quando o engenheiro avalia o imóvel acima do valor de compra e venda?",
    answer:
      "A GoodCredit gerará a proposta no sistema usando o valor de compra e venda. Geralmente isso não causa impacto. Assim que a proposta estiver finalizada, a equipe entrará em contato.",
    category: "ENGINEERING_APPRAISAL",
    keywords: ["engenheiro", "avaliação acima", "valor de compra", "proposta"],
    sourcePage: 10
  },
  {
    id: "pergunta-39",
    number: 39,
    question: "O que fazer quando o engenheiro avalia o imóvel abaixo do valor de compra e venda?",
    answer:
      "Informe ao cliente se o valor aprovado atende à contratação. Em caso positivo, o processo poderá continuar. Em caso negativo, o cliente ou corretor deverá solicitar a contestação do laudo.",
    category: "ENGINEERING_APPRAISAL",
    keywords: ["engenheiro", "avaliação abaixo", "valor aprovado", "contestação", "laudo"],
    sourcePage: 10
  },
  {
    id: "pergunta-40",
    number: 40,
    question: "O cliente reside em outra cidade. Ele pode usar o FGTS para adquirir o imóvel?",
    answer:
      "É necessário comprovar que trabalha ou reside na cidade em que pretende adquirir o imóvel. Se não reside nela, deverá comprovar que trabalha na cidade ou em município limítrofe.",
    category: "FGTS_PROPERTY",
    keywords: ["outra cidade", "FGTS", "residência", "trabalho", "município limítrofe"],
    sourcePage: 10
  },
  {
    id: "pergunta-41",
    number: 41,
    question: "Um casal vai compor renda, mas um dos participantes já possui imóvel na mesma cidade. A renda pode ser utilizada?",
    answer:
      "Se o casamento for pelo regime de comunhão parcial de bens e o imóvel do participante tiver sido adquirido antes do casamento, o outro participante poderá usar o FGTS. A renda de quem possui o imóvel poderá ser utilizada.",
    category: "FGTS_PROPERTY",
    keywords: ["casal", "compor renda", "imóvel", "mesma cidade", "comunhão parcial", "FGTS"],
    sourcePage: 10
  },
  {
    id: "pergunta-42",
    number: 42,
    question: "Um financiamento de veículo pode impactar a aprovação do crédito imobiliário?",
    answer:
      "O financiamento do veículo impacta o comprometimento da renda. É necessário analisar a renda atual e os comprometimentos. A GoodCredit poderá fazer essa avaliação após o envio da documentação.",
    category: "CREDIT_APPROVAL",
    keywords: ["financiamento de veículo", "carro", "comprometimento", "renda", "aprovação"],
    sourcePage: 11
  },
  {
    id: "pergunta-43",
    number: 43,
    question: "Fiz uma avaliação para imóvel novo. Posso alterar para imóvel usado?",
    answer:
      "Quando os comprovantes de renda e residência estiverem atualizados, basta solicitar a mudança e gerar uma nova avaliação. Não será necessária autorização de QV. O ideal é usar os documentos mais atualizados na avaliação, pois haverá prazo de até 60 dias para fazer a alteração.",
    category: "ENGINEERING_APPRAISAL",
    keywords: ["avaliação", "imóvel novo", "imóvel usado", "QV", "60 dias", "documentos"],
    sourcePage: 11
  },
  {
    id: "pergunta-44",
    number: 44,
    question: "A obra de aquisição de terreno e construção ou construção em terreno próprio pode ser executada por pessoa física?",
    answer:
      "Sim. A obra pode ser executada por pessoa física, inclusive por administração própria pelo proponente do financiamento.",
    category: "CONSTRUCTION",
    keywords: ["obra", "terreno", "construção", "pessoa física", "administração própria"],
    sourcePage: 11
  },
  {
    id: "pergunta-45",
    number: 45,
    question: "É necessário ter o projeto da obra aprovado?",
    answer:
      "Sim. O projeto da obra deve ser aprovado pela prefeitura do município. A prefeitura e a CAIXA exigem o projeto aprovado para o início da obra. A aprovação é solicitada por meio de requerimento de Licença de Construção, também chamado de Alvará da Obra, documento que libera o início da construção.",
    category: "CONSTRUCTION",
    keywords: ["projeto aprovado", "obra", "prefeitura", "CAIXA", "Licença de Construção", "Alvará"],
    sourcePage: 11
  },
  {
    id: "pergunta-46",
    number: 46,
    question: "Como comprovar renda por meio de aluguel?",
    answer:
      "Apresente o contrato de aluguel ou arrendamento acompanhado dos seguintes documentos:\n\n- Quatro últimos comprovantes de recebimento em nome do locador, para verificar o valor médio mensal do aluguel. São aceitos extrato da conta de recebimento, recibo de pagamento, comprovantes de depósito, comprovantes de transferência, DOC e boletos bancários.\n- Documento que comprove o locador como um dos proprietários: IPTU ou ITR do imóvel, ou Certidão Atualizada de Inteiro Teor do Imóvel.",
    category: "INCOME_COMPOSITION",
    keywords: ["aluguel", "renda", "contrato", "arrendamento", "locador", "IPTU", "ITR"],
    sourcePage: 12
  },
  {
    id: "pergunta-47",
    number: 47,
    question: "É possível financiar 100% da obra quando o terreno pertence ao cliente?",
    answer:
      "Na modalidade MCMV, é possível liberar até 80% do valor do terreno para pagamento. Na modalidade SBPE ou Pró-Cotista, é possível fazer o pagamento de até 100% da obra.",
    category: "CONSTRUCTION",
    keywords: ["100%", "obra", "terreno", "MCMV", "SBPE", "Pró-Cotista"],
    sourcePage: 12
  },
  {
    id: "pergunta-48",
    number: 48,
    question: "Como é feito o pagamento do valor da obra?",
    answer:
      "O engenheiro escolhido pelo cliente gerará uma planilha chamada PCI, documento da CAIXA que discrimina o cronograma físico-financeiro. Esse cronograma apresenta os percentuais de evolução da obra e, consequentemente, os pagamentos de cada medição.",
    category: "CONSTRUCTION",
    keywords: ["pagamento", "obra", "engenheiro", "PCI", "cronograma", "medição"],
    sourcePage: 12
  },
  {
    id: "pergunta-49",
    number: 49,
    question: "Durante o período da obra é paga a parcela do financiamento?",
    answer: "Não. Durante o período da obra, são pagos juros conforme os valores liberados em cada medição.",
    category: "CONSTRUCTION",
    keywords: ["obra", "parcela", "juros", "medição", "liberação"],
    sourcePage: 13
  },
  {
    id: "pergunta-50",
    number: 50,
    question: "O terreno pode estar registrado em nome de apenas um dos participantes da construção em terreno próprio?",
    answer:
      "Depende. Se o processo envolver cônjuges ou companheiros e for possível comprovar a relação por certidão de casamento ou união estável, o terreno poderá estar em nome de apenas um dos participantes. Nas demais situações, o terreno deverá estar em nome de todos os participantes do processo.",
    category: "CONSTRUCTION",
    keywords: ["terreno", "registro", "participantes", "cônjuges", "união estável", "construção"],
    sourcePage: 13
  }
];
