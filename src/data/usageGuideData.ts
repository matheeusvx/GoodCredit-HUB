import type { UsageGuide } from "../types/usageGuide";

export const USAGE_GUIDE_VERSION = "1.0";
export const USAGE_GUIDE_LAST_REVIEWED_AT: string | null = null;

export const USAGE_GUIDES: UsageGuide[] = [
  {
    id: "home",
    anchor: "inicio",
    title: "Início",
    shortDescription: "Visão geral do Hub, ferramentas disponíveis e fluxo do financiamento.",
    destination: "home",
    icon: "home",
    keywords: ["dashboard", "menu lateral", "ferramentas", "fluxo", "status", "atalhos"],
    keyFeatures: ["Cards dos módulos", "Fluxo do financiamento", "Status das ferramentas"],
    purpose: "A página Início apresenta as ferramentas disponíveis no GoodCredit Hub e oferece uma visão geral das etapas de um financiamento imobiliário.",
    whenToUse: [
      "Ao iniciar uma jornada de atendimento e escolher a ferramenta adequada.",
      "Para consultar o fluxo geral do financiamento.",
      "Para identificar quais módulos estão ativos ou em desenvolvimento."
    ],
    requiredInformation: [
      { name: "Nenhuma informação obrigatória", description: "A página é apenas de navegação e consulta; não solicita dados do cliente." }
    ],
    steps: [
      { id: "home-1", title: "Consulte as ferramentas", description: "Leia os cards para entender a finalidade resumida de cada módulo ativo." },
      { id: "home-2", title: "Abra um módulo", description: "Use o botão do card desejado ou selecione o mesmo item no menu lateral." },
      { id: "home-3", title: "Acompanhe o fluxo", description: "Consulte as etapas de simulação, documentação, engenharia, análise, contrato, assinatura, registro e pagamento." },
      { id: "home-4", title: "Retorne quando necessário", description: "Selecione Início no menu lateral para voltar ao painel principal." }
    ],
    results: [
      { title: "Ferramentas disponíveis", description: "Reúne os cards dos módulos ativos e seus acessos." },
      { title: "Fluxo geral do financiamento", description: "Organiza as principais etapas da operação em uma sequência de referência." },
      { title: "Status dos módulos", description: "Diferencia ferramentas ativas das que ainda estão em desenvolvimento." }
    ],
    actions: [
      { title: "Acessar um módulo", description: "Os botões dos cards abrem diretamente a ferramenta escolhida." },
      { title: "Usar o menu lateral", description: "O item ativo indica a tela atual e permite alternar entre os módulos." }
    ],
    cautions: [
      "Os conteúdos e resultados do Hub têm caráter de apoio e não representam aprovação bancária.",
      "Módulos identificados como em desenvolvimento não estão disponíveis para operação."
    ],
    commonMistakes: [
      "Interpretar o fluxo geral como prazo garantido para cada etapa.",
      "Usar um card de status como resultado de uma análise de cliente."
    ]
  },
  {
    id: "amortization",
    anchor: "planilha-amortizacao",
    title: "Planilha de Amortização",
    shortDescription: "Projete o saldo devedor e o impacto de aportes manuais e de FGTS.",
    destination: "amortization",
    icon: "amortization",
    keywords: ["amortização", "SAC", "PRICE", "aportes", "FGTS", "saldo devedor", "juros", "parcelas", "PDF"],
    keyFeatures: ["SAC e PRICE", "Aportes manuais e FGTS", "Gráfico, tabela e PDF"],
    purpose: "A Planilha de Amortização projeta a evolução de um financiamento e compara o contrato original com um cenário contendo amortizações adicionais.",
    whenToUse: [
      "Para analisar redução de prazo e economia de juros.",
      "Para comparar projeções em SAC e PRICE.",
      "Para simular aportes manuais ou aportes de FGTS.",
      "Para gerar uma projeção em PDF para conferência ou apresentação."
    ],
    requiredInformation: [
      { name: "Nome do cliente", description: "Identifica a projeção e o relatório.", example: "Cliente GoodCredit" },
      { name: "Valor financiado", description: "Valor efetivamente financiado, em reais.", required: true, example: "R$ 250.000,00" },
      { name: "Prazo em meses", description: "Quantidade total de parcelas do contrato, limitada a 420 meses.", required: true, example: "360" },
      { name: "Taxa anual efetiva", description: "Taxa anual do contrato; a taxa mensal é calculada automaticamente.", required: true, example: "9,81%" },
      { name: "Sistema", description: "Escolha entre SAC e PRICE conforme o contrato.", required: true, example: "SAC" }
    ],
    steps: [
      { id: "amortization-1", title: "Informe o contrato", description: "Preencha valor financiado, prazo em meses e taxa anual efetiva." },
      { id: "amortization-2", title: "Selecione o sistema", description: "Escolha SAC ou PRICE no cabeçalho." },
      { id: "amortization-3", title: "Configure aportes", description: "Use Aportes Manuais ou Configurar FGTS. O FGTS usa periodicidade fixa de 24 meses e ambos permitem eventos individuais." },
      { id: "amortization-4", title: "Revise o impacto", description: "Compare os indicadores, o gráfico do saldo devedor e as duas áreas da tabela de parcelas." },
      { id: "amortization-5", title: "Ajuste quando necessário", description: "Edite valores manuais e de FGTS na tabela ou limpe os grupos de aportes." },
      { id: "amortization-6", title: "Gere o relatório", description: "Use Gerar PDF depois de conferir os parâmetros e os aportes aplicados." }
    ],
    results: [
      { title: "Taxa mensal", description: "Conversão automática da taxa anual efetiva para uso na projeção." },
      { title: "Impacto das Amortizações", description: "Mostra total amortizado, aportes utilizados, economia de juros, prazo corrigido, parcelas eliminadas e redução do custo total." },
      { title: "Gráfico do saldo devedor", description: "Compara a evolução original com o saldo corrigido pelas amortizações." },
      { title: "Tabela de parcelas", description: "Detalha contrato, aportes e valores corrigidos mês a mês; meses posteriores à quitação permanecem visíveis." },
      { title: "Quitação antecipada", description: "Indica a parcela em que o saldo corrigido chega a zero e quantas parcelas foram eliminadas." }
    ],
    actions: [
      { title: "Aportes Manuais / Manuais Ativos", description: "Configura recorrência e eventos avulsos; o rótulo indica quando existem valores ativos." },
      { title: "Configurar FGTS / FGTS Ativo", description: "Configura os eventos de FGTS com intervalo fixo de 24 meses." },
      { title: "Limpar Aportes Manuais, Limpar FGTS ou Limpar Tudo", description: "Remove somente o grupo escolhido ou todos os aportes." },
      { title: "Gerar PDF", description: "Cria um relatório local com parâmetros, impacto, gráfico e parcelas principais." },
      { title: "Limpar simulação", description: "Restaura os valores padrão e remove os aportes salvos nesta planilha." }
    ],
    cautions: [
      "Aportes reduzem o saldo devedor; valores superiores ao saldo necessário ou posteriores à quitação não são utilizados.",
      "O último aporte pode ser aplicado parcialmente para evitar saldo negativo.",
      "A projeção matemática pode variar do contrato real por seguros, encargos, indexadores e atualização do saldo."
    ],
    commonMistakes: [
      "Informar o valor do imóvel no lugar do valor efetivamente financiado.",
      "Digitar a taxa mensal no campo destinado à taxa anual efetiva.",
      "Somar novamente os aportes ao total corrigido, embora eles já estejam incluídos nas parcelas simuladas.",
      "Ignorar o aviso de aportes não utilizados após a quitação."
    ]
  },
  {
    id: "financing-simulation",
    anchor: "simulacao-financiamento",
    title: "Simulação de Financiamento",
    shortDescription: "Estime taxa, parcelas, LTV e comprometimento de renda da operação.",
    destination: "simulation",
    icon: "simulation",
    keywords: ["simulação", "financiamento", "banco", "taxa", "parcela", "LTV", "renda", "entrada", "FGTS", "MCMV", "SBPE"],
    keyFeatures: ["Regras por banco", "SAC ou PRICE", "Envio para amortização"],
    purpose: "A Simulação de Financiamento gera uma estimativa inicial da operação com base nos dados informados e nas regras comerciais configuradas no Hub.",
    whenToUse: [
      "Para estimar taxa e parcelas antes da análise bancária.",
      "Para verificar LTV e comprometimento aproximado da renda.",
      "Para comparar o sistema escolhido com o sistema permitido pelo banco.",
      "Para enviar os parâmetros resultantes à Planilha de Amortização."
    ],
    requiredInformation: [
      { name: "Dados do cliente", description: "Nome ou processo, data de nascimento do proponente de maior idade e estado civil.", required: true, example: "Cliente Exemplo, 10/05/1985, Casado(a)" },
      { name: "Dados da operação", description: "Tipo de financiamento, tipo de operação, UF, valor do imóvel, valor do financiamento e renda bruta familiar.", required: true, example: "Residencial, imóvel usado, SP" },
      { name: "Banco e sistema", description: "Banco pretendido, SAC ou PRICE e prazo em anos, limitado a 35 anos.", required: true, example: "CAIXA, SAC, 30 anos" },
      { name: "Entrada e FGTS", description: "Informe se haverá FGTS e recurso próprio; os valores só impactam quando a resposta for Sim.", example: "FGTS de R$ 30.000,00" }
    ],
    steps: [
      { id: "simulation-1", title: "Preencha o cliente", description: "Informe nome, data de nascimento e estado civil. A versão pública não solicita CPF, telefone ou e-mail." },
      { id: "simulation-2", title: "Descreva a operação", description: "Selecione os tipos, a UF e informe imóvel, financiamento e renda." },
      { id: "simulation-3", title: "Escolha banco e sistema", description: "Defina banco, SAC ou PRICE e prazo em anos." },
      { id: "simulation-4", title: "Informe entrada e FGTS", description: "Ative cada recurso e preencha seu valor somente quando ele fizer parte da operação." },
      { id: "simulation-5", title: "Calcule e confira", description: "Clique em Calcular Simulação e revise alertas, taxa, parcelas, LTV e comprometimento." },
      { id: "simulation-6", title: "Continue a análise", description: "Use Enviar para Amortização para preencher a planilha com o nome, financiamento, prazo, taxa e sistema aplicado." }
    ],
    results: [
      { title: "Banco, produto e taxa", description: "Mostra a condição de referência selecionada pelo motor de taxas e as observações aplicáveis." },
      { title: "Sistema escolhido e aplicado", description: "Indica eventual ajuste automático conforme o sistema permitido pelo banco." },
      { title: "Primeira e última parcela", description: "No SAC, evidencia a redução esperada; no PRICE, apresenta a parcela aproximada constante." },
      { title: "LTV", description: "Relaciona o valor financiado ao valor do imóvel e pode gerar alerta quando ultrapassa a referência." },
      { title: "Comprometimento de renda", description: "Relaciona a primeira parcela à renda bruta familiar informada." },
      { title: "Resumo da Simulação", description: "Reúne os principais dados, ajustes e avisos em texto formatado." }
    ],
    actions: [
      { title: "Calcular Simulação", description: "Valida os campos e gera o resultado estimativo." },
      { title: "Limpar", description: "Restaura o formulário e remove o resultado atual." },
      { title: "Enviar para Amortização", description: "Transfere os parâmetros calculados para a Planilha de Amortização, mediante confirmação quando já houver dados." }
    ],
    cautions: [
      "A simulação não representa aprovação de crédito e utiliza taxas de referência configuradas.",
      "Condições finais dependem do banco, perfil, documentos e avaliação do imóvel.",
      "Valores monetários positivos menores que R$ 1.000,00 são interpretados em milhares e o resultado informa essa normalização."
    ],
    commonMistakes: [
      "Interpretar o resultado como aprovação bancária.",
      "Informar renda líquida no campo de renda bruta familiar.",
      "Desconsiderar o ajuste automático do sistema amortizador permitido pelo banco.",
      "Enviar para a amortização sem conferir valor financiado, prazo e taxa aplicada."
    ]
  },
  {
    id: "pro-soluto",
    anchor: "pro-soluto",
    title: "Cálculo de Pró-Soluto",
    shortDescription: "Identifique a parte da operação ainda não coberta pelos recursos informados.",
    destination: "pro-soluto",
    icon: "pro-soluto",
    keywords: ["pró-soluto", "pro soluto", "avaliação", "financiamento", "FGTS", "subsídio", "entrada", "recursos próprios", "relatório"],
    keyFeatures: ["Composição da operação", "Financiamento estimado", "Resumo e relatório"],
    purpose: "O pró-soluto representa o valor da operação que ainda não foi coberto pelo financiamento e pelos demais recursos informados.",
    whenToUse: [
      "Para conferir a composição financeira da compra.",
      "Para estimar a diferença quando o financiamento ainda não foi aprovado.",
      "Para identificar recursos excedentes ou uma parcela ainda descoberta.",
      "Para importar os valores já preenchidos na Simulação de Financiamento."
    ],
    requiredInformation: [
      { name: "Nome do cliente ou processo", description: "Identificação opcional usada no resumo e no relatório.", example: "Processo Silva" },
      { name: "Valor de compra e venda", description: "Preço reconhecido na negociação.", required: true, example: "R$ 300.000,00" },
      { name: "Avaliação da engenharia", description: "Valor avaliado; se omitido, a base considera o preço de compra.", example: "R$ 290.000,00" },
      { name: "Percentual financiável", description: "Percentual aplicável à operação para estimar o limite.", example: "80,00%" },
      { name: "Financiamento aprovado", description: "Valor aprovado pelo banco, quando já disponível.", example: "R$ 220.000,00" },
      { name: "Recursos complementares", description: "FGTS, subsídio, entrada ou parcelas pagas e outros recursos próprios.", example: "FGTS de R$ 20.000,00" }
    ],
    steps: [
      { id: "pro-soluto-1", title: "Informe a negociação", description: "Preencha o valor de compra e, se disponível, a avaliação da engenharia." },
      { id: "pro-soluto-2", title: "Defina o financiamento", description: "Informe o percentual financiável e o valor aprovado, ou marque que o financiamento ainda não foi aprovado." },
      { id: "pro-soluto-3", title: "Inclua os recursos", description: "Preencha FGTS, subsídio, entrada já paga e outros recursos próprios reconhecidos." },
      { id: "pro-soluto-4", title: "Revise o resultado", description: "Confira base, limite, financiamento considerado, total coberto e pró-soluto." },
      { id: "pro-soluto-5", title: "Registre a análise", description: "Copie o resumo ou gere o relatório depois que os dados estiverem completos." }
    ],
    results: [
      { title: "Base financiável", description: "Valor de referência adotado entre compra e avaliação para aplicar o percentual informado." },
      { title: "Limite financiável", description: "Estimativa obtida pela base e pelo percentual; não equivale a aprovação." },
      { title: "Financiamento considerado", description: "Valor aprovado limitado à operação ou, quando marcado, o limite tratado como estimativa." },
      { title: "Total coberto", description: "Soma do financiamento considerado e dos recursos complementares." },
      { title: "Pró-soluto estimado", description: "Parte da operação ainda não coberta pelos recursos informados, acompanhada do percentual descoberto." },
      { title: "Recursos excedentes", description: "Valor informado além do necessário para cobrir a operação." }
    ],
    actions: [
      { title: "Importar Simulação", description: "Preenche compra, financiamento, FGTS e entrada a partir da Simulação de Financiamento salva no navegador." },
      { title: "Copiar Resumo", description: "Copia o resultado completo quando os dados são válidos." },
      { title: "Gerar Relatório", description: "Gera um PDF local com a composição e os alertas." },
      { title: "Limpar Cálculo", description: "Apaga os dados deste cálculo após confirmação." }
    ],
    cautions: [
      "Financiamento estimado é apenas uma referência e não representa valor aprovado pelo banco.",
      "A avaliação de engenharia e o percentual financiável precisam corresponder à operação analisada.",
      "Alertas de valor aprovado acima do limite ou recursos excedentes devem ser conferidos."
    ],
    commonMistakes: [
      "Preencher o preço de compra no campo de avaliação sem ter uma avaliação efetiva.",
      "Tratar o limite financiável como financiamento aprovado.",
      "Informar novamente como recursos próprios valores já incluídos na entrada.",
      "Ignorar que a importação pode substituir os valores atuais após confirmação."
    ]
  },
  {
    id: "income-analysis",
    anchor: "apuracao-renda",
    title: "Apuração de Renda",
    shortDescription: "Analise extratos localmente, revise entradas e consolide a renda confirmada.",
    destination: "income-analysis",
    icon: "income",
    keywords: ["apuração", "renda", "extrato", "PDF", "CSV", "Excel", "OCR", "banco", "conciliação", "mediana", "pagador"],
    keyFeatures: ["PDF, CSV e Excel", "Revisão de movimentações", "Relatório e envio à simulação"],
    purpose: "A Apuração de Renda processa extratos bancários no navegador, classifica movimentações e consolida indicadores para apoiar a conferência de renda.",
    whenToUse: [
      "Para analisar um ou vários extratos de bancos, contas ou participantes.",
      "Para revisar quais créditos podem compor renda.",
      "Para identificar recorrência, concentração por pagador e estabilidade.",
      "Para enviar a renda mensal confirmada à Simulação de Financiamento."
    ],
    requiredInformation: [
      { name: "Cliente ou processo", description: "Nome usado no relatório e na integração com a simulação.", example: "Cliente Exemplo" },
      { name: "Extratos bancários", description: "Arquivos PDF, CSV, XLSX ou XLS de até 30 MB cada; múltiplos arquivos podem ser combinados.", required: true, example: "extrato-abril.pdf" },
      { name: "Pessoas relacionadas", description: "Nomes e relações confirmadas, quando necessários para apoiar a classificação de transferências.", example: "Maria — cônjuge" }
    ],
    steps: [
      { id: "income-1", title: "Adicione os extratos", description: "Arraste ou selecione arquivos PDF, CSV, XLSX ou XLS. Arquivos repetidos, vazios ou acima do limite são ignorados." },
      { id: "income-2", title: "Informe relações confirmadas", description: "Cadastre pessoas relacionadas somente quando essa informação tiver sido validada." },
      { id: "income-3", title: "Inicie a análise", description: "O sistema processa os arquivos localmente, detecta o formato e identifica movimentações. OCR é usado apenas quando o PDF realmente precisa." },
      { id: "income-4", title: "Revise as movimentações", description: "Use Revisar movimentações para conferir pendências, alertas, duplicidades e classificações sugeridas." },
      { id: "income-5", title: "Confira os indicadores", description: "Analise renda confirmada, renda potencial, pendências, competências, estabilidade, concentração e conciliação." },
      { id: "income-6", title: "Conclua o fluxo", description: "Gere o relatório ou envie a renda confirmada para a Simulação de Financiamento." }
    ],
    results: [
      { title: "Renda confirmada", description: "Valor mensal formado pelas entradas classificadas e confirmadas como renda." },
      { title: "Renda potencial e valores pendentes", description: "Separam créditos que ainda dependem de revisão antes da conclusão." },
      { title: "Média ou mediana mensal", description: "Resume os meses completos considerados pela análise." },
      { title: "Estabilidade", description: "Indica a consistência dos valores ao longo das competências disponíveis." },
      { title: "Concentração e recorrência", description: "Mostra participação e frequência dos principais pagadores confirmados." },
      { title: "Conciliação", description: "Compara totais identificados com os totais do extrato quando o formato fornece essa referência." }
    ],
    actions: [
      { title: "Iniciar análise", description: "Processa os arquivos adicionados no navegador." },
      { title: "Revisar movimentações", description: "Abre a revisão avançada para ajustar classificações, motivos e pendências." },
      { title: "Gerar relatório", description: "Gera o relatório da apuração atual." },
      { title: "Enviar renda para Simulação", description: "Preenche a renda bruta familiar na Simulação de Financiamento quando existe renda confirmada." },
      { title: "Nova análise", description: "Limpa arquivos e resultados para iniciar outro processo." }
    ],
    cautions: [
      "Nem toda entrada bancária é renda; transferências próprias, reembolsos, estornos e duplicidades podem ser desconsiderados.",
      "Entradas pendentes não devem ser tratadas como renda confirmada antes da revisão.",
      "Divergências de conciliação precisam ser analisadas antes de concluir.",
      "Os arquivos são processados localmente e não são enviados ou armazenados pela plataforma."
    ],
    commonMistakes: [
      "Confirmar todas as entradas como renda sem revisar a origem.",
      "Considerar transferência entre contas próprias como receita profissional.",
      "Ignorar meses incompletos, valores pendentes ou divergências de conciliação.",
      "Enviar a renda para a simulação antes de revisar movimentações sinalizadas."
    ]
  },
  {
    id: "document-checklist",
    anchor: "checklist-documental",
    title: "Checklist Documental",
    shortDescription: "Gere listas de documentos por perfil e acompanhe a conferência dos itens.",
    destination: "checklist",
    icon: "checklist",
    keywords: ["checklist", "documentos", "comprador", "vendedor", "CLT", "autônomo", "pessoa jurídica", "FGTS", "procurador", "matrícula", "PDF"],
    keyFeatures: ["Perfis documentais", "Alertas complementares", "Mensagem e PDF"],
    purpose: "O Checklist Documental organiza documentos, alertas e regras de envio conforme o participante e o perfil selecionado.",
    whenToUse: [
      "Para orientar um comprador empregado CLT ou profissional autônomo.",
      "Para conferir os documentos de um vendedor pessoa jurídica.",
      "Para incluir requisitos adicionais de FGTS, procurador ou matrícula atualizada.",
      "Para enviar uma mensagem pronta ou gerar um PDF do checklist."
    ],
    requiredInformation: [
      { name: "Nome do cliente ou processo", description: "Identificação opcional exibida no checklist e nas saídas.", example: "Processo 2026-01" },
      { name: "Tipo de participante", description: "Comprador ou vendedor.", required: true, example: "Comprador" },
      { name: "Tipo de pessoa", description: "Pessoa física ou pessoa jurídica, compatível com o perfil.", required: true, example: "Pessoa Física" },
      { name: "Perfil", description: "Comprador CLT, comprador autônomo ou vendedor pessoa jurídica.", required: true, example: "Empregado CLT" },
      { name: "Regras Complementares", description: "Banco, uso de FGTS, tipo de operação, procurador e necessidade de matrícula atualizada.", example: "CAIXA, usa FGTS, imóvel usado" }
    ],
    steps: [
      { id: "checklist-1", title: "Defina o participante", description: "Informe o tipo de participante, o tipo de pessoa e o perfil documental compatível." },
      { id: "checklist-2", title: "Configure as regras", description: "Selecione banco, FGTS, operação, procurador e matrícula atualizada conforme o processo." },
      { id: "checklist-3", title: "Gere o checklist", description: "Clique em Gerar Checklist para criar as categorias, documentos, alertas e Regras de Ouro." },
      { id: "checklist-4", title: "Acompanhe a conferência", description: "Marque visualmente cada documento recebido; o progresso fica salvo neste navegador." },
      { id: "checklist-5", title: "Compartilhe", description: "Copie a mensagem pronta ou gere o PDF depois de revisar o conteúdo." }
    ],
    results: [
      { title: "Categorias de documentos", description: "Agrupam os itens aplicáveis ao perfil selecionado." },
      { title: "Alertas importantes", description: "Destacam regras de holerite, FGTS, matrícula, conta da empresa ou procuração quando aplicáveis." },
      { title: "Documentos conferidos", description: "Os controles visuais permitem acompanhar quais itens já foram recebidos." },
      { title: "Regras de Ouro para o Envio", description: "Reforçam formato PDF e prazo recomendado para o envio da documentação." }
    ],
    actions: [
      { title: "Gerar Checklist", description: "Valida o perfil e cria o resultado documental." },
      { title: "Copiar Mensagem", description: "Copia uma mensagem formatada para WhatsApp com documentos e alertas." },
      { title: "Gerar PDF", description: "Cria um checklist institucional para o perfil selecionado." },
      { title: "Limpar", description: "Remove seleções, resultado e marcações salvas do checklist." }
    ],
    cautions: [
      "O checklist varia conforme o perfil e as regras complementares informadas.",
      "A lista não substitui a conferência do analista e o banco pode solicitar documentos adicionais.",
      "Selecione tipos de participante, pessoa e perfil compatíveis para evitar validações."
    ],
    commonMistakes: [
      "Gerar um perfil de comprador para um vendedor ou selecionar pessoa jurídica para comprador nesta versão.",
      "Deixar FGTS, procurador ou matrícula como Não quando a condição existe.",
      "Tratar os documentos marcados como validação definitiva da instituição financeira."
    ]
  },
  {
    id: "fgts",
    anchor: "uso-fgts",
    title: "Uso de FGTS",
    shortDescription: "Verifique condições, compare renda e planeje utilizações do FGTS.",
    destination: "fgts",
    icon: "fgts",
    keywords: ["FGTS", "elegibilidade", "holerite", "Caixa Aqui", "competência", "amortização", "24 meses", "prestações", "80%", "WhatsApp", "relatório"],
    keyFeatures: ["Verificador inicial", "Comparação de renda", "Planejamento e documentos"],
    purpose: "O módulo Uso de FGTS reúne uma verificação inicial, comparação de renda, planejamento de amortizações, simulação de parte das prestações e checklist documental.",
    whenToUse: [
      "Para orientar inicialmente sobre as condições de uso do FGTS.",
      "Para comparar o holerite com a renda estimada pelo depósito mensal do FGTS.",
      "Para planejar eventos de amortização com intervalo fixo de 24 meses.",
      "Para estimar a cobertura de parte das prestações e organizar os documentos."
    ],
    requiredInformation: [
      { name: "Verificador inicial", description: "Modalidade pretendida e respostas sobre tempo no FGTS, financiamento ativo, imóveis, localização, quitação e enquadramento." },
      { name: "Comparação de renda", description: "Competências, valor bruto do holerite, depósito mensal, tipo de vínculo e percentual de recolhimento.", example: "04/2026, R$ 4.800,00 e R$ 400,00" },
      { name: "Planejamento de amortização", description: "Datas, saldo atual, depósito mensal, primeiro aporte e forma de definir os valores dos eventos." },
      { name: "Parte das prestações", description: "Valor da prestação, quantidade de prestações, cobertura desejada e saldo disponível." },
      { name: "Documentos", description: "Marcação dos itens já recebidos para acompanhar o preparo do processo." }
    ],
    steps: [
      { id: "fgts-1", title: "Faça a verificação inicial", description: "Responda às perguntas de elegibilidade e selecione a modalidade pretendida. O resultado é orientativo." },
      { id: "fgts-2", title: "Compare as rendas", description: "Informe holerite e depósito de FGTS da mesma competência, confirme o vínculo e valide se o depósito é regular." },
      { id: "fgts-3", title: "Leia a recomendação", description: "O sistema compara o maior valor e orienta qual opção selecionar no Caixa Aqui, desde que as competências e confirmações estejam válidas." },
      { id: "fgts-4", title: "Planeje as amortizações", description: "Defina os dados do contrato e os valores; a periodicidade permanece fixa a cada 24 meses. Revise os eventos individualmente." },
      { id: "fgts-5", title: "Estime parte das prestações", description: "Informe prestação, quantidade, cobertura de até 80% e saldo disponível para visualizar a distribuição mensal." },
      { id: "fgts-6", title: "Revise documentos e saídas", description: "Marque os documentos, copie o resumo, gere o relatório ou envie os eventos de amortização à planilha." }
    ],
    results: [
      { title: "Verificação inicial", description: "Apresenta orientação, necessidade de confirmação ou possível impedimento sem declarar elegibilidade definitiva." },
      { title: "Resultado da Comparação de Renda", description: "Exibe holerite, depósito, percentual, renda estimada, diferenças, maior valor, competência e status." },
      { title: "Opção no Caixa Aqui", description: "No cadastro do Caixa Aqui, deve ser selecionada a opção correspondente ao maior valor entre a renda estimada pelo depósito do FGTS e o valor bruto do contracheque/holerite." },
      { title: "Cronograma de amortização", description: "Mostra os eventos projetados a cada 24 meses, saldo disponível, valor a utilizar e saldo remanescente." },
      { title: "Pagamento de parte das prestações", description: "Mostra cobertura solicitada, uso do FGTS, complemento mensal do cliente e suficiência do saldo, limitado teoricamente a 80%." }
    ],
    actions: [
      { title: "Copiar Resumo", description: "Copia a orientação da análise, inclusive comparação de renda e alertas." },
      { title: "Gerar Relatório de FGTS", description: "Gera um relatório local com as informações e resultados do módulo." },
      { title: "Enviar para Planilha de Amortização", description: "Transfere somente os eventos ativos de amortização; pagamento de parte das prestações não é enviado como redução direta." },
      { title: "Limpar Análise", description: "Remove a análise e o checklist de documentos salvos neste navegador." }
    ],
    cautions: [
      "As competências do holerite e do depósito precisam ser iguais; divergências bloqueiam a recomendação definitiva.",
      "Depósitos atípicos, de férias, 13º, ajuste retroativo ou recolhimento acumulado exigem revisão.",
      "A existência de imóvel em outro estado e sua quitação exigem análise adicional.",
      "A utilização efetiva do FGTS depende das regras vigentes e da validação do agente financeiro."
    ],
    commonMistakes: [
      "Comparar holerite e FGTS de competências diferentes.",
      "Usar um depósito atípico como se fosse recolhimento mensal regular.",
      "Alterar mentalmente a periodicidade: o planejamento do módulo usa intervalo fixo de 24 meses.",
      "Entender a orientação inicial como autorização definitiva de uso.",
      "Confundir pagamento de parte das prestações com amortização direta do saldo devedor."
    ]
  },
  {
    id: "faq",
    anchor: "faq-atendimento",
    title: "FAQ de Atendimento",
    shortDescription: "Consulte respostas internas por pesquisa, categoria e número da pergunta.",
    destination: "faq",
    icon: "faq",
    keywords: ["FAQ", "atendimento", "perguntas", "respostas", "pesquisa", "categorias", "copiar resposta", "copiar link"],
    keyFeatures: ["50 perguntas e respostas", "Pesquisa e categorias", "Links internos"],
    purpose: "O FAQ de Atendimento facilita a consulta às 50 perguntas e respostas do material interno revisado da GoodCredit.",
    whenToUse: [
      "Durante o atendimento, para localizar uma orientação por assunto ou palavra-chave.",
      "Para consultar perguntas de crédito, FGTS, renda, engenharia, construção ou documentação.",
      "Para copiar uma resposta ou compartilhar o link interno de uma pergunta específica."
    ],
    requiredInformation: [
      { name: "Termo de pesquisa", description: "Palavra, assunto ou número da pergunta; a busca ignora acentos e maiúsculas.", example: "renda informal" },
      { name: "Categoria", description: "Filtro opcional para restringir as perguntas exibidas.", example: "FGTS e imóveis" }
    ],
    steps: [
      { id: "faq-1", title: "Pesquise ou filtre", description: "Digite no campo de pesquisa e, se necessário, selecione uma categoria." },
      { id: "faq-2", title: "Abra a pergunta", description: "Selecione o cabeçalho do acordeão para visualizar a resposta; várias perguntas podem permanecer abertas." },
      { id: "faq-3", title: "Controle a lista", description: "Use Abrir todas ou Fechar todas para ajustar as perguntas atualmente filtradas." },
      { id: "faq-4", title: "Compartilhe a orientação", description: "Use Copiar resposta ou Copiar link dentro da pergunta aberta." }
    ],
    results: [
      { title: "Quantidade de resultados", description: "Indica quantas perguntas correspondem à pesquisa e à categoria." },
      { title: "Resposta expandida", description: "Apresenta o conteúdo revisado, listas e links externos existentes no material." },
      { title: "Link por pergunta", description: "A âncora abre automaticamente a pergunta correspondente e mantém sua numeração visível." }
    ],
    actions: [
      { title: "Abrir todas / Fechar todas", description: "Expande ou recolhe as perguntas do resultado atual." },
      { title: "Copiar resposta", description: "Copia a pergunta e a respectiva resposta." },
      { title: "Copiar link", description: "Copia um endereço interno estável para a pergunta." },
      { title: "Limpar pesquisa", description: "Restaura todos os itens quando não há resultado ou quando o usuário deseja reiniciar a consulta." }
    ],
    cautions: [
      "As respostas possuem caráter orientativo e dependem do perfil, modalidade, documentos, regras vigentes e validação da instituição financeira.",
      "O FAQ é material de consulta; ele não substitui a análise do processo."
    ],
    commonMistakes: [
      "Tratar uma resposta geral como aprovação ou garantia para um caso específico.",
      "Pesquisar apenas uma expressão muito longa e não tentar termos principais ou categorias.",
      "Compartilhar uma resposta sem considerar os alertas e o contexto da operação."
    ]
  }
];
