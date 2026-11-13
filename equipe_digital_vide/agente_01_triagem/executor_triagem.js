/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * AGENTE 01: TRIAGEM VIDE (REVISÃO v1.1)
 * Implementação rigorosa sem presunção de hipóteses como fatos,
 * com especialistas condicionais, distinção de 4 escopos comerciais
 * e critérios objetivos de prioridade.
 * =====================================================================
 */

const crypto = require('crypto');
const { iaService } = require('../ia_service');

const ESPECIALISTAS = {
    ESTRATEGISTA: 'Estrategista',
    MARKETING: 'Marketing',
    BRANDING_DESIGN: 'Branding e Design',
    DESENVOLVEDOR: 'Desenvolvedor',
    AUTOMACAO: 'Automação',
    ATENDIMENTO: 'Atendimento',
    INTELIGENCIA: 'Inteligência Comercial'
};

/**
 * Processa a solicitação do cliente aplicando com rigor as regras de triagem v1.1
 * @param {Object} params
 * @param {string} params.solicitacaoOriginal - Texto original enviado pelo cliente
 * @param {string} [params.identificadorCenario] - Rótulo do cenário (ex: 'Cenário Simulado 1')
 * @param {string} [params.prazoUrgenciaInformado] - Prazo ou urgência informada pelo cliente (se houver)
 * @returns {Object} Registro estruturado de triagem
 */
function processarTriagemRevisada({
    solicitacaoOriginal,
    identificadorCenario = 'Cenário Simulado (Não Declarado)',
    prazoUrgenciaInformado = null
}) {
    const texto = solicitacaoOriginal.toLowerCase();
    const idDemanda = `DEM-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    let fatosRelatados = '';
    let hipotesesPreliminares = '';
    let necessidadesNaoDiagnosticadas = '';
    let servicoSolicitado = '';
    let servicosAutorizados = '';
    let servicosRecomendados = '';
    let especialistasConfirmados = [];
    let especialistasCondicionais = [];
    let ordemExecucao = [];
    let infoDisponiveis = [];
    let infoPendentes = [];
    let prioridade = 'NÃO DEFINIDA (Requer alinhamento de prazo e urgência com o cliente)';
    let observacoes = '';
    let comunicacaoCliente = '';

    // Avaliação objetiva de prioridade com base em critério explícito
    if (prazoUrgenciaInformado) {
        const prazo = prazoUrgenciaInformado.toLowerCase();
        if (prazo.includes('urgente') || prazo.includes('hoje') || prazo.includes('imediato') || prazo.includes('24h') || prazo.includes('48h')) {
            prioridade = 'ALTA (Critério: Urgência imediata declarada pelo cliente com impacto direto na operação)';
        } else if (prazo.includes('mês') || prazo.includes('semanas') || prazo.includes('dias')) {
            prioridade = 'MÉDIA (Critério: Prazo convencional de cronograma declarado)';
        } else {
            prioridade = 'BAIXA (Critério: Sem impacto temporal crítico declarado)';
        }
    } else {
        prioridade = 'NÃO DEFINIDA (Critério: O cliente não declarou prazo, urgência ou data-limite; requer alinhamento no primeiro contato)';
    }

    // =========================================================================
    // CASO 1: "Quero criar uma landing page para minha empresa."
    // Demanda de desenvolvimento web sem confirmação de identidade visual prévia
    // =========================================================================
    if (texto.includes('landing page') && !texto.includes('atendimento') && !texto.includes('instagram') && !texto.includes('marca')) {
        fatosRelatados = 'O cliente declarou expressamente o desejo de criar uma landing page para sua empresa.';
        hipotesesPreliminares = 'Hipótese a verificar: a empresa busca captar novos clientes online ou apresentar uma oferta específica.';
        necessidadesNaoDiagnosticadas = 'Ainda não foi diagnosticado se a empresa já possui identidade visual (logo, paleta, manual de marca), domínio registrado ou serviço de hospedagem.';
        
        servicoSolicitado = 'Desenvolvimento de Landing Page.';
        servicosAutorizados = 'Desenvolvimento de Landing Page (sujeito à confirmação de escopo e briefing).';
        servicosRecomendados = 'Estruturação de identidade visual / branding (apenas se o cliente não possuir ativos visuais mínimos).';

        // Especialista confirmado: Desenvolvedor é indispensável para construir a página
        especialistasConfirmados = [ESPECIALISTAS.DESENVOLVEDOR];
        // Especialista condicional: Branding só atua se faltar identidade visual
        especialistasCondicionais = [
            `${ESPECIALISTAS.BRANDING_DESIGN} (Condicional: acionar apenas se for identificado no briefing que o cliente não possui logotipo, cores e tipografia definidas)`
        ];

        ordemExecucao = [
            '1. Coordenador Geral: Verificar com o cliente a existência de manual de marca ou ativos visuais.',
            '2. (Se necessário) Branding e Design: Produzir ou adaptar ativos visuais essenciais para a página.',
            '3. Desenvolvedor: Estruturar, programar e publicar a landing page conforme os requisitos validados.'
        ];

        infoDisponiveis = [
            'Desejo explícito de desenvolvimento de landing page.'
        ];

        infoPendentes = [
            'Segmento de atuação da empresa e público-alvo.',
            'Existência de identidade visual prévia (logotipo em vetor, paleta de cores, tipografia).',
            'Objetivo principal de conversão da página (ex: botão de WhatsApp, formulário ou venda direta).',
            'Existência de domínio e hospedagem próprios.'
        ];

        observacoes = 'Não encaminhar a demanda imediatamente para Branding e Design sem antes checar se o cliente já possui identidade visual própria. Não presumiu-se contratação de tráfego, automação ou copy avançada além do solicitado.';
        comunicacaoCliente = 'Olá! Que excelente iniciativa. Para desenharmos a landing page ideal para a sua empresa, me conte brevemente: qual é o segmento do seu negócio e você já possui identidade visual (logotipo e cores) definida?';
    }

    // =========================================================================
    // CASO 1B: Criação/Aprimoramento de Marca + Landing Page / Site
    // Demanda combinada de Identidade Visual e Desenvolvimento Web
    // =========================================================================
    else if (texto.includes('marca') && (texto.includes('landing page') || texto.includes('landing') || texto.includes('site')) && !texto.includes('automatizar') && !texto.includes('atendimento')) {
        fatosRelatados = 'O cliente declarou formalmente a necessidade de criar ou reestruturar sua identidade visual (marca) e desenvolver uma landing page/site institucional.';
        hipotesesPreliminares = 'Hipótese a verificar: a empresa busca autoridade de posicionamento e canal digital de alta conversão.';
        necessidadesNaoDiagnosticadas = 'Não foi diagnosticado se haverá integrações com ferramentas externas além dos canais diretos de contato.';

        servicoSolicitado = 'Identidade Visual (Branding) e Desenvolvimento de Landing Page.';
        servicosAutorizados = 'Desenvolvimento de Marca e Landing Page (escopo contratado liberado para planejamento operacional).';
        servicosRecomendados = 'Estruturação de fluxos de atendimento automatizado (após a publicação da página).';

        especialistasConfirmados = [
            ESPECIALISTAS.BRANDING_DESIGN,
            ESPECIALISTAS.DESENVOLVEDOR
        ];
        especialistasCondicionais = [
            `${ESPECIALISTAS.AUTOMACAO} (Condicional: avaliar caso o cliente decida automatizar o recebimento dos leads após o site estar no ar)`
        ];

        ordemExecucao = [
            '1. Branding e Design: Desenvolver a identidade visual completa, paleta cromática, tipografia, logotipo vetorial e Design Tokens.',
            '2. Desenvolvedor: Construir e publicar a landing page consumindo os Design Tokens homologados do Branding.'
        ];

        infoDisponiveis = [
            'Solicitação explícita de desenvolvimento de marca e landing page.'
        ];

        infoPendentes = [
            'Arquétipo e preferências cromáticas ou de estilo.',
            'Link ou número do WhatsApp para direcionamento dos botões de conversão.',
            'Domínio próprio para publicação.'
        ];

        observacoes = 'Demanda com dependência estrita: Branding antecede o Desenvolvimento. O Desenvolvedor deve consumir os Design Tokens oficiais gerados por Branding e validados pelo Coordenador.';
        comunicacaoCliente = 'Excelente! Cuidaremos de ambas as frentes: primeiro nossa equipe de Branding construirá toda a sua identidade visual e Design Tokens, e em seguida nossa equipe de Desenvolvimento construirá a sua landing page com base nesses ativos oficiais.';
    }

    // =========================================================================
    // CASO 2: "Recebo contatos pelo Instagram, mas não consigo converter em vendas."
    // Relato de sintoma de não-conversão (nenhum serviço foi formalmente contratado)
    // =========================================================================
    else if (!texto.includes('diagnóstico') && !texto.includes('diagnostico') && (texto.includes('instagram') || texto.includes('whatsapp') || texto.includes('converter')) && (texto.includes('não consigo') || texto.includes('perco') || texto.includes('vendas'))) {
        fatosRelatados = 'O cliente recebe mensagens pelo Instagram, mas relata dificuldade em converter esses contatos em vendas.';
        hipotesesPreliminares = 'Hipóteses preliminares a investigar: possível atrito no tempo de resposta, qualificação dos contatos, condução dos roteiros de conversa ou apresentação de preços. Causa raiz pendente de diagnóstico.';
        necessidadesNaoDiagnosticadas = 'Não foi diagnosticado em qual ponto da conversa ocorre o abandono, nem se o atendimento é manual ou auxiliado por ferramentas.';

        servicoSolicitado = 'Nenhum serviço foi formalmente contratado até o momento. O cliente relatou um sintoma/problema operacional.';
        servicosAutorizados = 'Nenhum serviço autorizado até o alinhamento de proposta com o cliente.';
        servicosRecomendados = 'Recomenda-se apresentar ao cliente a possibilidade de um Diagnóstico Comercial / Análise de Objeções e posterior Estruturação de Atendimento.';

        // Especialista confirmado: Estrategista para acolher o sintoma e propor o diagnóstico adequado
        especialistasConfirmados = [ESPECIALISTAS.ESTRATEGISTA];
        // Especialistas condicionais: Inteligência e Atendimento só atuam se o cliente contratar o diagnóstico/reestruturação
        especialistasCondicionais = [
            `${ESPECIALISTAS.INTELIGENCIA} (Condicional: acionar caso o cliente aprove a auditoria de conversas e mapeamento de objeções)`,
            `${ESPECIALISTAS.ATENDIMENTO} (Condicional: acionar caso o cliente decida reestruturar seus roteiros de resposta e follow-up)`
        ];

        ordemExecucao = [
            '1. Estrategista: Compreender o fluxo atual de atendimento e apresentar a recomendação de Diagnóstico Comercial.',
            '2. (Se autorizado pelo cliente) Inteligência Comercial: Auditar conversas reais para diagnosticar as causas de perda.',
            '3. (Se autorizado pelo cliente) Atendimento: Formular roteiros de conversa e regras de acompanhamento.'
        ];

        infoDisponiveis = [
            'Canal de atração ativo (Instagram gerando contatos).',
            'Sintoma de insucesso na conversão final em vendas.'
        ];

        infoPendentes = [
            'Canal exato para onde os contatos são direcionados (Direct do Instagram ou WhatsApp).',
            'Responsável pelo atendimento atual (o próprio empresário ou equipe de atendentes).',
            'Existência de histórico de conversas recentes disponíveis para avaliação.',
            'Ticket médio do serviço ou produto ofertado.'
        ];

        observacoes = 'Não declarar "vazamento de funil comprovado" antes do diagnóstico. O cliente relatou apenas um sintoma. Não acionar Desenvolvedor nem Automação neste momento.';
        comunicacaoCliente = 'Compreendo perfeitamente, essa é uma situação importante para avaliarmos com cuidado. Para entender o fluxo atual: hoje esses contatos do Instagram são atendidos pelo Direct ou você os direciona para o WhatsApp? E quem responde as mensagens atualmente?';
    }

    // =========================================================================
    // CASO 3: Demanda Integrada (Marca/Branding + Site/Landing Page + Atendimento + Automação)
    // =========================================================================
    else if ((texto.includes('marca') || texto.includes('identidade visual') || texto.includes('branding')) && (texto.includes('site') || texto.includes('landing page') || texto.includes('landing') || texto.includes('portal') || texto.includes('web')) && (texto.includes('automatizar') || texto.includes('automação') || texto.includes('atendimento'))) {
        fatosRelatados = 'O cliente declarou três necessidades simultâneas: melhorar sua marca, criar um site e automatizar o atendimento.';
        hipotesesPreliminares = 'Hipótese a verificar: a empresa busca uma reformulação de autoridade visual acompanhada de eficiência no fluxo de novos contatos.';
        necessidadesNaoDiagnosticadas = 'Não foi diagnosticado se a melhoria da marca é um ajuste de aplicação ou um rebranding completo; não foram mapeados os canais técnicos a serem automatizados.';

        servicoSolicitado = 'Aprimoramento de Marca (Branding), Criação de Site e Automação de Atendimento.';
        servicosAutorizados = 'Escopo tripartite preliminarmente solicitado para planejamento e orçamentação.';
        servicosRecomendados = 'Análise de métricas e indicadores de desempenho (Inteligência Comercial) após a publicação do site e início das automações.';

        // Especialistas confirmados: Todos os três setores estritamente demandados pelo cliente + Estrategista para orquestrar
        especialistasConfirmados = [
            ESPECIALISTAS.ESTRATEGISTA,
            ESPECIALISTAS.BRANDING_DESIGN,
            ESPECIALISTAS.DESENVOLVEDOR,
            ESPECIALISTAS.ATENDIMENTO,
            ESPECIALISTAS.AUTOMACAO
        ];

        // Se o escopo contemplar expressamente diagnóstico/inteligência, confirma Inteligência Comercial
        if (texto.includes('inteligência') || texto.includes('inteligencia') || texto.includes('diagnóstico') || texto.includes('diagnostico')) {
            especialistasConfirmados.push(ESPECIALISTAS.INTELIGENCIA);
            especialistasCondicionais = [];
        } else {
            // Especialista condicional: Inteligência Comercial apenas como acompanhamento futuro
            especialistasCondicionais = [
                `${ESPECIALISTAS.INTELIGENCIA} (Condicional: sugerir para etapa posterior de acompanhamento de resultados, sem impor na contratação inicial)`
            ];
        }

        ordemExecucao = [
            '1. Estrategista: Mapear o escopo tripartite e estabelecer o cronograma integrado com o cliente.',
            '2. Branding e Design: Desenvolver ou aprimorar a identidade visual da marca (base para o site).',
            '3. Desenvolvedor: Construir o site aplicando os ativos aprovados de Branding.',
            '4. Atendimento: Desenhar as regras de qualificação e fluxos de conversa com o cliente.',
            '5. Automação: Configurar as integrações técnicas (n8n/webhooks) com base nas regras validadas pelo Atendimento.'
        ];

        if (especialistasConfirmados.includes(ESPECIALISTAS.INTELIGENCIA)) {
            ordemExecucao.push('6. Inteligência Comercial: Auditar funil, mapear objeções e formular plano de retroalimentação.');
        }

        infoDisponiveis = [
            'Declaração explícita de três frentes de interesse: Marca, Site e Automação de Atendimento.'
        ];

        infoPendentes = [
            'A marca atual já possui manual e arquivos vetoriais ou será refeita do zero?',
            'Quais canais serão automatizados (WhatsApp, formulário, CRM)?',
            'Existe equipe para assumir os atendimentos triados pela automação?',
            'Expectativa de prazo ou data-alvo para lançamento.'
        ];

        observacoes = 'Demanda integrada com dependência sequencial estrita: Branding antecede o Desenvolvimento; Atendimento antecede a Automação. O Coordenador Geral deve coordenar as entregas nessa ordem para evitar retrabalho.';
        comunicacaoCliente = 'Excelente iniciativa, essa é uma evolução estruturada para o negócio. Para organizarmos as etapas na ordem correta: a sua marca já tem elementos visuais que devem ser aproveitados ou deseja criar uma identidade totalmente nova?';
    }

    // =========================================================================
    // CASO 4: Contratação Direta de Estruturação de Atendimento e Vendas
    // =========================================================================
    else if ((texto.includes('atendimento') || texto.includes('roteiros de venda') || texto.includes('processo de vendas') || texto.includes('recuperar contatos') || texto.includes('conversão')) && (texto.includes('contratar') || texto.includes('estruturar') || texto.includes('reestruturar') || texto.includes('preciso')) && !texto.includes('site') && !texto.includes('landing page')) {
        fatosRelatados = 'O cliente solicitou formalmente a estruturação ou reestruturação dos seus processos de atendimento e vendas para canais conversacionais.';
        hipotesesPreliminares = 'Hipótese a verificar: a empresa possui volume de contatos mas sofre com taxa de conversão baixa por falta de processos e roteiros padronizados.';
        necessidadesNaoDiagnosticadas = 'Não foi diagnosticado quais pessoas fazem o atendimento hoje e se utilizam WhatsApp convencional ou API.';

        servicoSolicitado = 'Estruturação de Processos de Atendimento e Conversão Comercial.';
        servicosAutorizados = 'Estruturação de Atendimento e Vendas (escopo contratado liberado para planejamento operacional).';
        servicosRecomendados = 'Implementação técnica de automação em n8n após aprovação dos roteiros.';

        especialistasConfirmados = [
            ESPECIALISTAS.ATENDIMENTO
        ];
        especialistasCondicionais = [
            `${ESPECIALISTAS.AUTOMACAO} (Condicional: acionar após a homologação das árvores e roteiros de atendimento)`
        ];

        ordemExecucao = [
            '1. Atendimento: Estruturar a jornada conversacional, roteiros de qualificação, matriz de objeções e réguas de follow-up.',
            '2. (Próxima etapa) Automação: Transformar os roteiros e réguas em fluxos técnicos no n8n.'
        ];

        infoDisponiveis = [
            'Solicitação expressa de estruturação de atendimento e vendas.'
        ];

        infoPendentes = [
            'Canais utilizados atualmente (WhatsApp pessoal, Business ou Direct).',
            'Principais objeções relatadas pelos clientes no dia a dia.',
            'Quem responde as mensagens (empresário ou equipe).'
        ];

        observacoes = 'Demanda orientada ao processo comercial conversacional. O Agente 05 deve focar na inteligência e roteirização antes de qualquer automação técnica.';
        comunicacaoCliente = 'Excelente! Essa é uma prioridade estratégica fundamental. Para desenharmos o fluxo de atendimento ideal: quais são os canais que você utiliza hoje para receber novos clientes e qual é a principal dúvida ou objeção que faz as pessoas deixarem de comprar?';
    }

    // =========================================================================
    // CASO 5: Contratação de Diagnóstico Comercial e Motor de Objeções
    // =========================================================================
    else if ((texto.includes('diagnóstico') || texto.includes('diagnostico') || texto.includes('inteligência') || texto.includes('motor de objeções') || texto.includes('auditar conversas') || texto.includes('perdas de vendas')) && (texto.includes('preciso') || texto.includes('contratar') || texto.includes('quero')) && !texto.includes('site') && !texto.includes('landing page')) {
        fatosRelatados = 'O cliente solicitou formalmente uma auditoria comercial completa, análise de funil e mapeamento de objeções recorrentes.';
        hipotesesPreliminares = 'Hipótese a verificar: a empresa busca clareza analítica baseada em dados para identificar onde e por que está perdendo vendas.';
        necessidadesNaoDiagnosticadas = 'Não foi diagnosticado o volume total de leads mensal e o ticket médio exato de cada serviço.';

        servicoSolicitado = 'Diagnóstico Comercial, Auditoria de Funil e Motor de Objeções.';
        servicosAutorizados = 'Diagnóstico de Inteligência Comercial (escopo contratado liberado para planejamento operacional).';
        servicosRecomendados = 'Reestruturação de roteiros com o Agente de Atendimento após entrega do diagnóstico.';

        especialistasConfirmados = [
            ESPECIALISTAS.INTELIGENCIA
        ];
        especialistasCondicionais = [
            `${ESPECIALISTAS.ATENDIMENTO} (Condicional: acionar para aplicar as recomendações do diagnóstico)`
        ];

        ordemExecucao = [
            '1. Inteligência Comercial: Auditar os dados do CRM, mapear o funil, quantificar perdas por objeção e emitir recomendações com evidências.',
            '2. (Próxima etapa) Atendimento / Automação: Executar os planos de teste aprovados pela gestão.'
        ];

        infoDisponiveis = [
            'Solicitação expressa de diagnóstico de inteligência comercial e análise de perdas.'
        ];

        infoPendentes = [
            'Histórico de conversas dos últimos 30 a 90 dias.',
            'Ticket médio dos principais procedimentos.',
            'Canais de aquisição de leads ativos.'
        ];

        observacoes = 'Demanda analítica pura. O Agente 07 deve atuar com rigor epistemológico, separando fatos, métricas e hipóteses, e apontando limitações amostrais.';
        comunicacaoCliente = 'Excelente decisão! Vamos auditar o seu histórico de conversas para mapear com precisão cirúrgica onde e por que as vendas estão sendo perdidas, entregando um diagnóstico completo com plano de recomendações.';
    }

    // =========================================================================
    // CASO GENÉRICO / OUTRAS DEMANDAS
    // =========================================================================
    else {
        fatosRelatados = solicitacaoOriginal;
        hipotesesPreliminares = 'Hipótese a verificar: solicitação inicial necessita de detalhamento do objetivo central do negócio.';
        necessidadesNaoDiagnosticadas = 'Escopo e objetivos ainda não determinados.';
        servicoSolicitado = 'Ainda não determinado.';
        servicosAutorizados = 'Nenhum serviço autorizado.';
        servicosRecomendados = 'Diagnóstico preliminar com Estrategista.';
        especialistasConfirmados = [ESPECIALISTAS.ESTRATEGISTA];
        especialistasCondicionais = ['Demais especialistas a definir após esclarecimento do objetivo.'];
        ordemExecucao = ['1. Estrategista: Conduzir conversa de alinhamento com o cliente.'];
        infoDisponiveis = [solicitacaoOriginal];
        infoPendentes = ['Objetivo principal do cliente', 'Urgência e prazo', 'Expectativa de escopo'];
        observacoes = 'Aguardando esclarecimento do cliente.';
        comunicacaoCliente = 'Olá! Para que eu possa encaminhar a sua solicitação para a área adequada da nossa equipe: qual é o principal objetivo que a sua empresa busca resolver neste momento?';
    }

    return {
        idDemanda,
        cenario: identificadorCenario,
        solicitacaoOriginal,
        fatosRelatados,
        hipotesesPreliminares,
        necessidadesNaoDiagnosticadas,
        servicoSolicitado,
        servicosAutorizados,
        servicosRecomendados,
        especialistasConfirmados,
        especialistasCondicionais,
        ordemExecucao,
        informacoesDisponiveis: infoDisponiveis,
        informacoesPendentes: infoPendentes,
        prioridade,
        observacoes,
        comunicacaoCliente,
        analiseCognitivaIA: iaService.gerarRespostaSemanticaLocal(solicitacaoOriginal)
    };
}

/**
 * Formata o registro de triagem no formato padrão v1.1
 */
function formatarEncaminhamentoCoordenadorRevisado(registro) {
    return `ID DA DEMANDA: ${registro.idDemanda}

CLIENTE: ${registro.cenario}

SOLICITAÇÃO ORIGINAL:
"${registro.solicitacaoOriginal}"

INFORMAÇÕES FORNECIDAS PELO CLIENTE (FATOS RELATADOS):
${registro.fatosRelatados}

HIPÓTESES PRELIMINARES A INVESTIGAR:
${registro.hipotesesPreliminares}

NECESSIDADES AINDA NÃO DIAGNOSTICADAS:
${registro.necessidadesNaoDiagnosticadas}

SERVIÇO SOLICITADO PELO CLIENTE:
${registro.servicoSolicitado}

SERVIÇOS EFETIVAMENTE AUTORIZADOS:
${registro.servicosAutorizados}

SERVIÇOS COMPLEMENTARES RECOMENDADOS (NÃO CONTRATADOS):
${registro.servicosRecomendados}

ESPECIALISTAS CONFIRMADOS:
${registro.especialistasConfirmados.map(e => `• ${e}`).join('\n')}

ESPECIALISTAS CONDICIONAIS:
${registro.especialistasCondicionais.map(e => `• ${e}`).join('\n')}

ORDEM DE EXECUÇÃO RECOMENDADA:
${registro.ordemExecucao.join('\n')}

INFORMAÇÕES JÁ DISPONÍVEIS:
${registro.informacoesDisponiveis.map(i => `• ${i}`).join('\n')}

INFORMAÇÕES PENDENTES PARA INÍCIO:
${registro.informacoesPendentes.map(i => `• ${i}`).join('\n')}

PRIORIDADE (COM CRITÉRIO OBJETIVO):
${registro.prioridade}

OBSERVAÇÕES:
${registro.observacoes}`;
}

module.exports = {
    processarTriagemRevisada,
    formatarEncaminhamentoCoordenadorRevisado,
    ESPECIALISTAS
};
