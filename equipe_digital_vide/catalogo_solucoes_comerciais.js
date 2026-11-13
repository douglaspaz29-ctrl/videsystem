/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * CATÁLOGO OFICIAL DE SOLUÇÕES COMERCIAIS
 * Versão 1.0 — Estruturação Inicial
 * Diretoria Executiva: Douglas Paz
 * =====================================================================
 */

const POSICIONAMENTO_COMERCIAL = {
    empresa: "VIDE — Sistemas de Crescimento Comercial",
    proposito: "A VIDE desenvolve sistemas digitais para pequenos negócios, combinando presença digital, automação e inteligência comercial.",
    missao_operacional: "Identificar problemas na operação, estruturar soluções e ajudar empresas a aproveitar melhor as oportunidades que já possuem.",
    publico_alvo: "Pequenos e médios negócios (PMEs) com necessidade de profissionalização comercial e eficiência operacional."
};

const SOLUCOES_COMERCIAIS = {
    PRESENCA_DIGITAL: {
        codigo: "VIDE_PRESENCA_DIGITAL",
        nome: "VIDE Presença Digital",
        subtitulo: "Sites e Landing Pages",
        pilares_relacionados: ["Branding e Design", "Desenvolvimento Full-Stack"],
        problema_que_resolve: "Negócios que não possuem uma presença digital profissional ou não conseguem transformar o interesse dos visitantes em contatos e oportunidades comerciais.",
        o_que_oferece: "Criação de sites institucionais e landing pages planejados para apresentar o negócio, comunicar seu valor e orientar o visitante para uma ação.",
        entregaveis: [
            "Planejamento da estrutura e navegação",
            "Organização do conteúdo e da comunicação",
            "Design da interface (UI)",
            "Desenvolvimento responsivo para computadores e celulares",
            "Formulários e botões de contato",
            "Integração com canais comerciais, quando prevista no escopo",
            "Publicação e testes"
        ],
        resultado_esperado: "Uma presença digital profissional, organizada e orientada à conversão.",
        precificacao_regra: {
            tipo: "REFERENCIA_PRELIMINAR",
            valor_base: 1500.00,
            moeda: "BRL",
            descricao: "Landing page a partir de R$ 1.500, sujeita à definição de escopo e viabilidade técnica."
        }
    },

    AUTOMACAO_COMERCIAL: {
        codigo: "VIDE_AUTOMACAO_COMERCIAL",
        nome: "VIDE Automação Comercial",
        subtitulo: "Atendimento e Processos",
        pilares_relacionados: ["Atendimento e Vendas", "Automação e Integrações"],
        problema_que_resolve: "Negócios que perdem oportunidades por demora no atendimento, falta de acompanhamento, tarefas repetitivas ou ausência de organização dos contatos comerciais.",
        o_que_oferece: "Estruturação e implementação de fluxos automatizados para organizar etapas do atendimento e do relacionamento comercial.",
        entregaveis: [
            "Mapeamento do processo atual",
            "Identificação de tarefas que podem ser automatizadas",
            "Desenho dos fluxos de atendimento",
            "Configuração das automações",
            "Integração entre ferramentas e canais, conforme viabilidade",
            "Testes dos fluxos",
            "Documentação e orientação para utilização"
        ],
        resultado_esperado: "Processos comerciais mais organizados, com menos tarefas manuais e melhor acompanhamento das oportunidades.",
        precificacao_regra: {
            tipo: "SOB_DIMENSIONAMENTO",
            valor_base: null,
            moeda: "BRL",
            descricao: "Sem preço fixo antecipado. Requer diagnóstico dos níveis de complexidade, ferramentas envolvidas e critérios de dimensionamento."
        }
    },

    INTELIGENCIA_COMERCIAL: {
        codigo: "VIDE_INTELIGENCIA_COMERCIAL",
        nome: "VIDE Inteligência Comercial",
        subtitulo: "Dashboard e Análise de Oportunidades",
        pilares_relacionados: ["Inteligência Comercial", "Estratégia Comercial"],
        problema_que_resolve: "Negócios que não conseguem visualizar claramente o que acontece entre o primeiro contato, o atendimento, a proposta e a venda.",
        o_que_oferece: "Estruturação de dados comerciais em painéis e análises que ajudam o negócio a compreender seu desempenho e identificar oportunidades de melhoria.",
        entregaveis: [
            "Levantamento das informações comerciais disponíveis",
            "Definição dos indicadores relevantes",
            "Organização das fontes de dados",
            "Construção do dashboard",
            "Indicadores de desempenho e conversão",
            "Identificação de pontos de perda e oportunidades",
            "Orientação para interpretação dos dados"
        ],
        resultado_esperado: "Maior visibilidade sobre a operação comercial e melhores condições para tomar decisões fundamentadas.",
        precificacao_regra: {
            tipo: "SOB_DIMENSIONAMENTO",
            valor_base: null,
            moeda: "BRL",
            descricao: "Sem preço fixo antecipado. Requer mapeamento de fontes de dados, volume de registros e requisitos analíticos."
        }
    },

    SISTEMA_INTEGRADO: {
        codigo: "VIDE_SISTEMA_INTEGRADO",
        nome: "VIDE Sistema Integrado",
        subtitulo: "Presença Digital + Automação + Inteligência Comercial",
        pilares_relacionados: [
            "Branding e Design", 
            "Desenvolvimento Full-Stack", 
            "Atendimento e Vendas", 
            "Automação e Integrações", 
            "Inteligência Comercial"
        ],
        problema_que_resolve: "Negócios que sofrem com dispersão de ferramentas, desalinhamento entre marketing e vendas, perda massiva de leads no funil e falta total de visibilidade integrada.",
        o_que_oferece: "Solução que combina as três frentes (Presença Digital, Automação Comercial e Inteligência Comercial) em uma estrutura conectada.",
        objetivo_central: "Organizar o caminho entre a descoberta do negócio, o primeiro contato, o atendimento, a conversão e a análise dos resultados.",
        composicao: "Composição modular definida conforme o diagnóstico e as necessidades específicas de cada empresa.",
        entregaveis: [
            "Diagnóstico estratégico inicial e planejamento do ecossistema",
            "Presença digital estruturada (Landing Page ou Site Institucional de alta conversão)",
            "Fluxos automatizados de atendimento e triagem (n8n, Webhooks, WhatsApp)",
            "Roteiros padronizados de conversão e matriz de combate a objeções",
            "Dashboard de inteligência comercial com indicadores de conversão e perda",
            "Homologação integrada e treinamento de equipe"
        ],
        resultado_esperado: "Ecossistema comercial coeso, eliminando gargalos operacionais e maximizando o aproveitamento de oportunidades.",
        precificacao_regra: {
            tipo: "SOB_DIMENSIONAMENTO",
            valor_base: null,
            moeda: "BRL",
            descricao: "Sem preço fixo preliminar. Composição orçada sob medida após diagnóstico dos módulos contratados e complexidade técnica."
        }
    }
};

const DIRETRIZES_COMERCIAIS = [
    "As três soluções (Presença Digital, Automação Comercial e Inteligência Comercial) podem ser contratadas separadamente.",
    "A integração entre elas é opcional e depende estritamente da necessidade e da maturidade do cliente.",
    "Cada contratação terá escopo, entregáveis, prazo e investimento formalizados em proposta técnica.",
    "Funcionalidades, integrações e custos de ferramentas de terceiros (domínios, APIs, licenças) serão formalmente avaliados antes da proposta.",
    "Nenhum projeto será iniciado sem aprovação comercial formal expressa da Diretoria e do Cliente."
];

const DIRETRIZES_PRECIFICACAO = {
    referencia_landing_page: "A partir de R$ 1.500, sujeita à definição de escopo e viabilidade técnica.",
    regra_automacao_dashboard_integrado: "Não estabelecer preços fixos para automação, dashboard ou sistema integrado antes de definir os níveis de complexidade e os critérios de dimensionamento.",
    proibicao_precificacao_precipitada: "Nenhum agente de IA (Triagem, Atendimento ou Coordenador) pode prometer valores fechados para automações ou dashboards sem estudo de viabilidade prévio."
};

/**
 * Classifica o texto de uma solicitação no catálogo de soluções da VIDE
 * @param {string} textoSolicitacao
 * @returns {Object} Solução do catálogo mais adequada e justificativa
 */
function classificarNoCatalogo(textoSolicitacao = '') {
    const texto = (textoSolicitacao || '').toLowerCase();

    const temPresenca = texto.includes('site') || texto.includes('landing page') || texto.includes('landing') || texto.includes('portal') || texto.includes('web') || texto.includes('marca');
    const temAutomacao = texto.includes('automatiz') || texto.includes('atendimento') || texto.includes('fluxo') || texto.includes('processo') || texto.includes('whatsapp') || texto.includes('roteiro');
    const temInteligencia = texto.includes('dashboard') || texto.includes('inteligência') || texto.includes('inteligencia') || texto.includes('análise') || texto.includes('analise') || texto.includes('indicador') || texto.includes('perda') || texto.includes('diagnóstico') || texto.includes('diagnostico');

    // 1. Sistema Integrado (Combinação de 2 ou 3 frentes principais)
    if ((temPresenca && temAutomacao) || (temPresenca && temInteligencia) || (temAutomacao && temInteligencia && temPresenca) || texto.includes('integrado') || texto.includes('completo')) {
        return {
            solucao: SOLUCOES_COMERCIAIS.SISTEMA_INTEGRADO,
            categoria: "VIDE Sistema Integrado",
            justificativa: "A demanda combina múltiplas frentes (Presença Digital, Automação e/ou Inteligência), requerendo arquitetura integrada."
        };
    }

    // 2. Presença Digital isolada
    if (temPresenca && !temAutomacao && !temInteligencia) {
        return {
            solucao: SOLUCOES_COMERCIAIS.PRESENCA_DIGITAL,
            categoria: "VIDE Presença Digital",
            justificativa: "Demanda focada na criação de ativos digitais institucionais e páginas de conversão (Sites e Landing Pages)."
        };
    }

    // 3. Automação Comercial isolada
    if (temAutomacao && !temPresenca && !temInteligencia) {
        return {
            solucao: SOLUCOES_COMERCIAIS.AUTOMACAO_COMERCIAL,
            categoria: "VIDE Automação Comercial",
            justificativa: "Demanda voltada à otimização de tempo, organização de contatos e eliminação de tarefas manuais no atendimento."
        };
    }

    // 4. Inteligência Comercial isolada
    if (temInteligencia && !temPresenca && !temAutomacao) {
        return {
            solucao: SOLUCOES_COMERCIAIS.INTELIGENCIA_COMERCIAL,
            categoria: "VIDE Inteligência Comercial",
            justificativa: "Demanda analítica para visualização de funil, mapeamento de perdas e apoio a decisões estratégicas."
        };
    }

    // Padrão: Diagnóstico preliminar para enquadramento
    return {
        solucao: SOLUCOES_COMERCIAIS.PRESENCA_DIGITAL,
        categoria: "Aguardando Diagnóstico de Enquadramento",
        justificativa: "Demanda inicial necessita de diagnóstico de escopo para enquadramento em um dos três pilares ou sistema integrado."
    };
}

/**
 * Retorna o catálogo comercial completo e formatado
 */
function obterCatalogoCompleto() {
    return {
        posicionamento: POSICIONAMENTO_COMERCIAL,
        solucoes: SOLUCOES_COMERCIAIS,
        diretrizes_comerciais: DIRETRIZES_COMERCIAIS,
        diretrizes_precificacao: DIRETRIZES_PRECIFICACAO,
        versao: "1.0",
        data_atualizacao: "2026-11-13"
    };
}

/**
 * Gera texto formatado do catálogo para exibição em terminais e respostas da IA
 */
function formatarCatalogoEmTexto() {
    let txt = `📚 **VIDE — CATÁLOGO DE SOLUÇÕES COMERCIAIS (Versão 1.0)**\n\n`;
    txt += `*${POSICIONAMENTO_COMERCIAL.proposito}*\n\n`;

    Object.values(SOLUCOES_COMERCIAIS).forEach((sol, idx) => {
        txt += `### ${idx + 1}. ${sol.nome} (${sol.subtitulo})\n`;
        txt += `• **Problema:** ${sol.problema_que_resolve}\n`;
        txt += `• **O que oferece:** ${sol.o_que_oferece}\n`;
        txt += `• **Entregáveis:** ${sol.entregaveis.join('; ')}.\n`;
        txt += `• **Resultado esperado:** ${sol.resultado_esperado}\n`;
        txt += `• **Referência de Preço:** ${sol.precificacao_regra.descricao}\n\n`;
    });

    txt += `**Diretrizes Comerciais:**\n`;
    DIRETRIZES_COMERCIAIS.forEach(d => {
        txt += `• ${d}\n`;
    });

    return txt;
}

module.exports = {
    POSICIONAMENTO_COMERCIAL,
    SOLUCOES_COMERCIAIS,
    DIRETRIZES_COMERCIAIS,
    DIRETRIZES_PRECIFICACAO,
    classificarNoCatalogo,
    obterCatalogoCompleto,
    formatarCatalogoEmTexto
};
