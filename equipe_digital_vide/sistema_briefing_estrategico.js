/**
 * =====================================================================
 * VIDE — Sistemas de Crescimento Comercial & Engenharia Digital
 * SISTEMA DE BRIEFING E ESTRATÉGIA DA SOLUÇÃO (ETAPA ESTRATÉGICA MANDATÓRIA)
 * =====================================================================
 * Regra Comercial Inviolável: A estratégia deve orientar a execução técnica
 * sem jamais substituir unilateralmente o serviço contratado.
 * Oportunidades complementares devem ser apresentadas separadamente.
 * =====================================================================
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// 1. ESTRUTURAS DE BRIEFINGS ESPECIALIZADOS POR SERVIÇO
const ESTRUTURAS_BRIEFING = {
    SITES_LANDING_PAGES: {
        id: 'SITES_LANDING_PAGES',
        nome: 'Sites & Landing Pages de Alta Conversão',
        especialista_responsavel: 'Rafael Duarte (Engenheiro Web)',
        agente_id: 'agente_03_desenvolvedor',
        cor_accent: '#38BDF8',
        perguntas: [
            {
                id: 'publico_alvo',
                pergunta: 'Quem é o público-alvo prioritário e qual é a principal dor que faz o cliente buscar sua solução?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Donos de oficinas mecânicas e frotistas buscando peças com entrega rápida.'
            },
            {
                id: 'proposta_valor',
                pergunta: 'Qual é a proposta de valor central e a promessa principal da página?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Peças originais com garantia de 1 ano e cotação em até 15 minutos pelo WhatsApp.'
            },
            {
                id: 'acao_conversao',
                pergunta: 'Qual é a ação de conversão primária desejada (CTA Principal)?',
                tipo: 'selecao',
                opcoes: ['Chamar no WhatsApp Comercial', 'Preencher Formulário de Cotação', 'Compra Direta / Checkout', 'Agendamento de Demonstração'],
                obrigatoria: true
            },
            {
                id: 'diferenciais_competitivos',
                pergunta: 'Quais são os 3 principais diferenciais em relação aos concorrentes diretos?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Estoque próprio a pronta entrega, frete grátis regional e atendimento técnico especializado.'
            },
            {
                id: 'identidade_referencias',
                pergunta: 'Existem referências visuais, logotipo vetorial ou manual de marca já definidos?',
                tipo: 'texto',
                obrigatoria: false,
                exemplo: 'Sim, manual em anexo com paleta azul/preto, estilo minimalista e limpo.'
            }
        ]
    },

    BRANDING_IDENTIDADE_VISUAL: {
        id: 'BRANDING_IDENTIDADE_VISUAL',
        nome: 'Branding & Identidade Visual Executiva',
        especialista_responsavel: 'Helena Prado (Diretora de Arte)',
        agente_id: 'agente_04_branding_design',
        cor_accent: '#EC4899',
        perguntas: [
            {
                id: 'posicionamento_marca',
                pergunta: 'Qual é o posicionamento desejado da marca no mercado (Popular, Acessível, Premium, Luxo, Inovador)?',
                tipo: 'selecao',
                opcoes: ['Premium Executivo', 'Inovador & Tecnológico', 'Tradicional & Confiável', 'Acessível de Alta Demanda'],
                obrigatoria: true
            },
            {
                id: 'tom_de_voz',
                pergunta: 'Qual tom de voz e personalidade a marca deve transmitir aos clientes?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Autoridade técnica, clareza, dinamismo e acolhimento consultivo.'
            },
            {
                id: 'emocoes_cores',
                pergunta: 'Quais sensações e paletas cromáticas devem predominar?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Confiança e precisão (azul marinho profundo e ciano elétrico) com suporte em grafite e branco.'
            },
            {
                id: 'aplicacoes_prioritarias',
                pergunta: 'Quais são as principais aplicações imediatas (Interfaces digitais, Redes sociais, Embalagens, Papelaria)?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Site institucional, catálogo digital em PDF, foto de perfil e templates de WhatsApp.'
            }
        ]
    },

    DESIGN_GRAFICO: {
        id: 'DESIGN_GRAFICO',
        nome: 'Design Gráfico & Ativos Comerciais',
        especialista_responsavel: 'Helena Prado (Diretora de Arte)',
        agente_id: 'agente_04_branding_design',
        cor_accent: '#F43F5E',
        perguntas: [
            {
                id: 'pecas_solicitadas',
                pergunta: 'Quais peças gráficas específicas foram contratadas e seus formatos técnicos?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Banners para anúncios Meta (1080x1080 e 1080x1920) e carrossel de 5 lâminas.'
            },
            {
                id: 'mensagem_chave',
                pergunta: 'Qual mensagem, título ou oferta promocional deve ser destacada visualmente?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Condição especial de inauguração: 15% OFF na primeira compra corporativa.'
            },
            {
                id: 'diretrizes_estilo',
                pergunta: 'Existem restrições de tipografia, imagens obrigatórias ou elementos que não devem ser usados?',
                tipo: 'texto',
                obrigatoria: false
            }
        ]
    },

    MARKETING_CAMPANHAS: {
        id: 'MARKETING_CAMPANHAS',
        nome: 'Marketing, Tráfego & Campanhas de Aquisição',
        especialista_responsavel: 'Matheus Barreto (Growth & Inteligência 7D)',
        agente_id: 'agente_07_inteligencia_comercial',
        cor_accent: '#8B5CF6',
        perguntas: [
            {
                id: 'canais_aquisicao',
                pergunta: 'Quais canais de tráfego foram contratados para ativação imediata?',
                tipo: 'selecao',
                opcoes: ['Meta Ads (Instagram/Facebook)', 'Google Ads (Pesquisa/Performance Max)', 'Estratégia Multicanal', 'Campanha de Reengajamento WhatsApp'],
                obrigatoria: true
            },
            {
                id: 'meta_numerica',
                pergunta: 'Qual é a meta quantitativa prioritária (Volume de leads, Custo por Lead / CPA máximo, Retorno ROAS)?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Gerar no mínimo 40 leads qualificados por semana com CPA abaixo de R$ 25,00.'
            },
            {
                id: 'oferta_gancho',
                pergunta: 'Qual gancho comercial ou oferta de entrada será utilizada nos anúncios?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Diagnóstico gratuito de manutenção preventiva ou consulta rápida de catálogo.'
            },
            {
                id: 'orcamento_mensal',
                pergunta: 'Qual o orçamento de mídia aprovado pelo cliente para o primeiro período?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'R$ 1.500,00 mensais dedicados a tráfego pago.'
            }
        ]
    },

    VENDAS_PROCESSOS_COMERCIAIS: {
        id: 'VENDAS_PROCESSOS_COMERCIAIS',
        nome: 'Vendas, Conversão WhatsApp & Roteiros Comerciais',
        especialista_responsavel: 'Camila Silveira (Atendimento & Conversão)',
        agente_id: 'agente_05_atendimento',
        cor_accent: '#10B981',
        perguntas: [
            {
                id: 'gargalo_atendimento',
                pergunta: 'Onde os clientes mais se perdem hoje no WhatsApp (demora no primeiro contato, perda no orçamento, falta de follow-up)?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Demora no envio da cotação formal e ausência de follow-up após 24 horas de silêncio.'
            },
            {
                id: 'quatro_objecoes',
                pergunta: 'Quais são as 4 objeções mais comuns que os clientes apresentam antes de fechar?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: '1. "Achei caro", 2. "Vou ver com meu sócio", 3. "O prazo está longo", 4. "Já tenho outro fornecedor".'
            },
            {
                id: 'qualificacao_lead',
                pergunta: 'Quais critérios diferenciam um cliente com potencial real de compra de um mero curioso?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Volume de compras mensal, urgência na entrega e CNPJ ativo no segmento automotivo.'
            },
            {
                id: 'regua_followup',
                pergunta: 'Qual cadência de acompanhamento deve ser adotada (24h, 48h, 7 dias)?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Mensagem de valor em 24h, oferta de flexibilização em 48h e reativação em 7 dias.'
            }
        ]
    },

    AUTOMACOES_INTEGRACOES: {
        id: 'AUTOMACOES_INTEGRACOES',
        nome: 'Automações n8n & Integrações de Sistemas',
        especialista_responsavel: 'Thiago Meireles (Engenheiro de Automação)',
        agente_id: 'agente_06_automacao',
        cor_accent: '#F59E0B',
        perguntas: [
            {
                id: 'sistemas_conectados',
                pergunta: 'Quais ferramentas e softwares precisam ser integrados tecnicamente?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Landing page (formulário HTML), WhatsApp Business API e CRM Kommo / Pipedrive.'
            },
            {
                id: 'gatilho_fluxo',
                pergunta: 'Qual evento exato dispara o fluxo automatizado?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Submissão do formulário no site ou envio de mensagem de primeiro contato no WhatsApp.'
            },
            {
                id: 'deduplicacao_dados',
                pergunta: 'Como lidar com contatos repetidos ou leads já existentes na base?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Buscar por telefone/email; se existir, registrar nova nota na oportunidade em vez de duplicar.'
            },
            {
                id: 'notificacao_vendedores',
                pergunta: 'Quem deve ser notificado e por qual canal (Grupo de WhatsApp da equipe, E-mail, Notificação CRM)?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Alerta instantâneo no grupo de vendedores do WhatsApp com link direto para o lead.'
            }
        ]
    },

    INTELIGENCIA_COMERCIAL_7D: {
        id: 'INTELIGENCIA_COMERCIAL_7D',
        nome: 'Inteligência Comercial, Diagnóstico 7D & Análise Causal',
        especialista_responsavel: 'Matheus Barreto (Growth & Inteligência 7D)',
        agente_id: 'agente_07_inteligencia_comercial',
        cor_accent: '#6366F1',
        perguntas: [
            {
                id: 'dimensao_critica',
                pergunta: 'Qual dimensão do Motor 7D aparenta ser o maior gargalo no momento (Atração, Qualificação, Fechamento, Retenção, Margem)?',
                tipo: 'selecao',
                opcoes: ['Taxa de Conversão de Fechamento', 'Custo de Aquisição (CAC / Anúncios)', 'Retenção e Recorrência (LTV)', 'Tempo de Resposta do Atendimento', 'Precificação e Margem Bruta'],
                obrigatoria: true
            },
            {
                id: 'dados_disponiveis',
                pergunta: 'Quais fontes de dados estão disponíveis para ingestão (Planilhas de vendas, Relatórios de anúncios, Exportação de CRM)?',
                tipo: 'texto',
                obrigatoria: true,
                exemplo: 'Planilha histórica dos últimos 90 dias com 450 vendas e relatórios de tráfego pago.'
            },
            {
                id: 'hipotese_causa_raiz',
                pergunta: 'Qual é a suspeita principal do cliente sobre a causa da queda de vendas?',
                tipo: 'texto',
                obrigatoria: false,
                exemplo: 'Suspeitam que o preço está alto, mas há forte desengajamento após a cotação inicial.'
            }
        ]
    }
};

/**
 * 2. IDENTIFICADOR DE ESPECIALIDADE DO SERVIÇO
 * Mapeia o serviço solicitado para a estrutura de briefing correspondente
 */
function identificarEspecialidadeServico(servicoOuFrente = '') {
    const s = (servicoOuFrente || '').toLowerCase();

    if (s.includes('site') || s.includes('landing') || s.includes('página') || s.includes('web') || s.includes('presenca')) {
        return ESTRUTURAS_BRIEFING.SITES_LANDING_PAGES;
    }
    if (s.includes('branding') || s.includes('identidade') || s.includes('logo') || s.includes('marca')) {
        return ESTRUTURAS_BRIEFING.BRANDING_IDENTIDADE_VISUAL;
    }
    if (s.includes('grafic') || s.includes('banner') || s.includes('arte') || s.includes('post') || s.includes('design')) {
        return ESTRUTURAS_BRIEFING.DESIGN_GRAFICO;
    }
    if (s.includes('market') || s.includes('campanha') || s.includes('anuncio') || s.includes('trafego') || s.includes('meta')) {
        return ESTRUTURAS_BRIEFING.MARKETING_CAMPANHAS;
    }
    if (s.includes('atend') || s.includes('venda') || s.includes('whatsapp') || s.includes('roteiro') || s.includes('script') || s.includes('sistema')) {
        return ESTRUTURAS_BRIEFING.VENDAS_PROCESSOS_COMERCIAIS;
    }
    if (s.includes('auto') || s.includes('integra') || s.includes('n8n') || s.includes('fluxo') || s.includes('crm')) {
        return ESTRUTURAS_BRIEFING.AUTOMACOES_INTEGRACOES;
    }
    if (s.includes('intel') || s.includes('diag') || s.includes('7d') || s.includes('miv') || s.includes('otimizacao')) {
        return ESTRUTURAS_BRIEFING.INTELIGENCIA_COMERCIAL_7D;
    }

    // Default: Presença e Landing Page
    return ESTRUTURAS_BRIEFING.SITES_LANDING_PAGES;
}

/**
 * 3. MOTOR DE PROCESSAMENTO DO BRIEFING & ESTRATÉGIA
 */
class SistemaBriefingEstrategico {

    /**
     * Inicia a etapa de entendimento e briefing para uma nova demanda
     * @param {Object} params
     * @param {string} params.demandaOriginal
     * @param {string} params.servicoContratado
     * @param {string} params.cliente
     * @param {string} [params.contextoNegocio]
     * @returns {Object} Pacote inicial de briefing
     */
    iniciarBriefingDemanda(params) {
        const servico = params.servicoContratado || params.servico || 'Presença & Conversão Comercial';
        const estrutura = identificarEspecialidadeServico(servico);

        return {
            etapa_atual: 'BRIEFING_PROGRESSIVO',
            servico_contratado_fiel: servico,
            especialidade_id: estrutura.id,
            especialidade_nome: estrutura.nome,
            especialista_responsavel: estrutura.especialista_responsavel,
            perguntas_pendentes: estrutura.perguntas.map(p => ({
                id: p.id,
                pergunta: p.pergunta,
                tipo: p.tipo,
                opcoes: p.opcoes || null,
                obrigatoria: p.obrigatoria,
                exemplo: p.exemplo || null
            })),
            respostas_coletadas: {},
            documento_estrategico: null,
            status: 'AGUARDANDO_RESPOSTAS'
        };
    }

    /**
     * Processa respostas fornecidas e sintetiza o Documento Estratégico da Solução
     * @param {Object} params
     * @param {string} params.idProjeto
     * @param {string} params.cliente
     * @param {string} params.solicitacaoOriginal
     * @param {string} params.servicoContratado
     * @param {Object} params.respostasBriefing
     * @param {string} [params.contextoExtra]
     * @returns {Object} Documento Estratégico Persistente
     */
    sintetizarDocumentoEstrategico(params) {
        const {
            idProjeto,
            cliente,
            solicitacaoOriginal,
            servicoContratado,
            respostasBriefing = {},
            contextoExtra = ''
        } = params;

        const estrutura = identificarEspecialidadeServico(servicoContratado);

        // 1. Entendimento do Contexto
        const publico = respostasBriefing.publico_alvo || respostasBriefing.posicionamento_marca || 'Empresas, clientes finais e tomadores de decisão qualificados no nicho de atuação.';
        const propostaValor = respostasBriefing.proposta_valor || respostasBriefing.tom_de_voz || 'Solução comercial de alto padrão com resposta ágil e posicionamento confiável.';
        const cta = respostasBriefing.acao_conversao || 'Atendimento consultivo e fechamento imediato via WhatsApp.';
        const diferenciais = respostasBriefing.diferenciais_competitivos || respostasBriefing.emocoes_cores || 'Qualidade executiva superior, suporte técnico dedicado e prazos de resposta acelerados.';

        // 2. Diagnóstico Comercial das Dores
        const problemaIdentificado = respostasBriefing.gargalo_atendimento || respostasBriefing.dimensao_critica || 
            `A empresa ${cliente} possui demanda ativa e produto competitivo, porém carece de um ponto de conversão formal e estruturado para o serviço [${servicoContratado}]. A ausência de ativos estratégicos gera dispersão de leads e perda de negócios qualificados.`;

        // 3. Estratégia da Solução (FOCADA NO SERVIÇO CONTRATADO)
        const estrategiaRecomendada = 
            `Desenvolver a solução contratada de [${servicoContratado}] com rigorosa fidelidade ao escopo, aplicando engenharia de conversão voltada para o perfil [${publico}]. A execução integrará proposta de valor cristalina (${propostaValor}), garantindo que todo tráfego de entrada seja canalizado com fricção zero para ${cta}.`;

        // 4. Direcionamento Específico por Agente Especialista
        const direcionamentoEspecialistas = [
            {
                agente: 'Gabriel Rocha',
                papel: 'Coordenador Geral & Estrategista',
                instrucao: `Monitorar os marcos de entrega de [${servicoContratado}], coordenar o alinhamento entre os especialistas e manter Douglas informado com relatórios de status em cada etapa.`
            },
            {
                agente: 'Rafael Duarte',
                papel: 'Engenheiro & Desenvolvedor Web',
                instrucao: `Programar a interface digital de [${servicoContratado}] com semântica moderna, velocidade Lighthouse > 90, carregamento mobile instantâneo e integração segura com os canais de atendimento.`
            },
            {
                agente: 'Helena Prado',
                papel: 'Diretora de Arte & Brand Designer',
                instrucao: `Garantir acabamento visual de alto padrão para [${servicoContratado}], harmonia estética com a identidade da marca, contraste legível e design system refinado.`
            },
            {
                agente: 'Camila Silveira',
                papel: 'Atendimento & Conversão WhatsApp',
                instrucao: `Elaborar os scripts de acolhimento e matriz de 4 objeções para conduzir os clientes gerados pela solução de [${servicoContratado}] até o fechamento com cortesia e agilidade.`
            },
            {
                agente: 'Thiago Meireles',
                papel: 'Engenheiro de Automações & Processos',
                instrucao: `Configurar os gatilhos técnicos e conectores no n8n para que qualquer lead gerado por [${servicoContratado}] seja persistido e notificado imediatamente à equipe.`
            },
            {
                agente: 'Matheus Barreto',
                papel: 'Inteligência Comercial & Growth 7D',
                instrucao: `Auditar as métricas de entrega, validar taxas de conversão da solução entregue e correlacionar os resultados com as 7 dimensões de crescimento comercial.`
            }
        ];

        // 5. Escopo Formal e Entregáveis Contratados (Imutáveis sem aprovação comercial)
        const escopoContratado = [
            `Ativo técnico principal: ${servicoContratado} customizado e homologado`,
            `Documentação de direcionamento estratégico e guidelines de uso`,
            `Garantia de conformidade técnica e verificação de critérios de conclusão`,
            `Dossiê executivo de entrega com histórico e evidências preservadas`
        ];

        // 6. Critérios de Sucesso e Qualidade (Métricas de Aceite)
        const criteriosSucesso = [
            'Fidelidade estrita à demanda contratada sem desvio de escopo',
            'Tempo de resposta e usabilidade homologados em desktop e dispositivos móveis',
            'Aprovação formal registrada pelo Diretor Executivo Douglas Paz antes do encerramento'
        ];

        // 7. REGRA OBRIGATÓRIA: OPORTUNIDADES COMPLEMENTARES IDENTIFICADAS (SEPARADAS!)
        // Os agentes identificam oportunidades mas NUNCA misturam com o escopo contratado
        const oportunidadesComplementares = [
            {
                titulo: 'Mídia & Ativação de Tráfego Pago Segmentado',
                especialista_sugerido: 'Matheus Barreto (Growth 7D)',
                justificativa: 'Com a solução contratada no ar, uma campanha direcionada de Meta/Google Ads acelerará o retorno sobre o investimento nos primeiros 30 dias.',
                impacto_estimado: 'Aumento de 35% a 60% no volume de leads qualificados semanais.',
                status_comercial: 'OPORTUNIDADE_COMPLEMENTAR_SEPARADA (Requer autorização comercial adicional da Diretoria)'
            },
            {
                titulo: 'Fluxo Automatizado de Nutrição de Leads no WhatsApp',
                especialista_sugerido: 'Thiago Meireles (Automação)',
                justificativa: 'Implementação de régua automatizada de follow-up para reengajar cotações não respondidas em 48h e 7 dias.',
                impacto_estimado: 'Recuperação estimada de 15% a 22% dos leads frios.',
                status_comercial: 'OPORTUNIDADE_COMPLEMENTAR_SEPARADA (Requer autorização comercial adicional da Diretoria)'
            }
        ];

        const documento = {
            id_documento: `DOC-ESTRATEGICO-${idProjeto || crypto.randomBytes(3).toString('hex').toUpperCase()}`,
            versao: '1.0',
            criado_em: new Date().toISOString(),
            status_aprovacao: 'AGUARDANDO_APROVACAO_DIRETORIA',
            aprovado_por: null,
            data_aprovacao: null,

            // Regra inviolável
            garantia_fidelidade_contratada: {
                fidelidade_estrita_ativa: true,
                servico_contratado_imutavel: servicoContratado,
                demanda_original: solicitacaoOriginal,
                nota: 'A estratégia orienta a execução técnica do serviço contratado. Nenhuma substituição de escopo é permitida sem autorização expressa.'
            },

            // Seções Obrigatórias
            'secao_01_demanda_e_servico_contratado': {
                cliente: cliente,
                servico_contratado: servicoContratado,
                demanda_declarada: solicitacaoOriginal,
                especialidade_tecnica: estrutura.nome
            },

            'secao_02_contexto_negocio_e_nicho': {
                nicho_atuacao: cliente,
                publico_alvo_declarado: publico,
                contexto_adicional: contextoExtra || 'Operação comercial visando expansão de autoridade e fechamento de clientes qualificados.'
            },

            'secao_03_diagnostico_e_dores': {
                problema_central: problemaIdentificado,
                sintomas_observados: 'Leads não capturados formalmente e fricção no processo de contato inicial.',
                impacto_no_negocio: 'Perda de receita recorrente para concorrentes com maior presença e agilidade de conversão.'
            },

            'secao_04_publico_alvo_e_icp': {
                perfil_ideal: publico,
                comportamento_compra: 'Decisão orientada a confiança técnica, clareza de preços e resposta em tempo real no WhatsApp.'
            },

            'secao_05_objetivos_mensuraveis': {
                macro_objetivo: `Consolidar a entrega de [${servicoContratado}] gerando tração comercial tangível para ${cliente}.`,
                micro_objetivos: [
                    'Disponibilizar ativo digital profissional em até 7 dias úteis',
                    'Reduzir tempo de qualificação de novos interessados',
                    'Assegurar 100% de conformidade com os critérios de aceite executivos'
                ]
            },

            'secao_06_estrategia_solucao_recomendada': {
                diretriz_mestra: estrategiaRecomendada,
                proposta_valor: propostaValor,
                chamada_para_acao_principal: cta,
                diferenciais_destacados: diferenciais
            },

            'secao_07_direcionamento_especifico_execucao': direcionamentoEspecialistas,

            'secao_08_escopo_formal_e_entregaveis': escopoContratado,

            'secao_09_criterios_sucesso_e_qualidade': criteriosSucesso,

            'secao_10_oportunidades_complementares_identificadas': oportunidadesComplementares
        };

        return documento;
    }

    /**
     * Valida formalmente a fidelidade do plano de execução à contratação original
     * Impede qualquer tentativa de substituição unilateral do escopo pelos agentes
     * @param {string} servicoContratado 
     * @param {Object} documentoEstrategico 
     * @returns {Object} { valido: boolean, motivo?: string }
     */
    validarFidelidadeContratacao(servicoContratado, documentoEstrategico) {
        if (!documentoEstrategico || !documentoEstrategico.garantia_fidelidade_contratada) {
            return {
                valido: false,
                motivo: 'Documento estratégico inválido ou ausência do selo de garantia de fidelidade contratada.'
            };
        }

        const servicoDoc = documentoEstrategico.garantia_fidelidade_contratada.servico_contratado_imutavel;
        if (!servicoDoc || servicoDoc.trim().toLowerCase() !== servicoContratado.trim().toLowerCase()) {
            return {
                valido: false,
                motivo: `[VIOLACAO_FIDELIDADE] O serviço contratado [${servicoContratado}] diverge do serviço registrado no documento [${servicoDoc}]. A estratégia não pode alterar a contratação.`
            };
        }

        return { valido: true };
    }
}

const sistemaBriefingEstrategico = new SistemaBriefingEstrategico();

module.exports = {
    ESTRUTURAS_BRIEFING,
    identificarEspecialidadeServico,
    sistemaBriefingEstrategico,
    SistemaBriefingEstrategico
};
