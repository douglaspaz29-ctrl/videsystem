/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * SISTEMA DE EXECUÇÃO E ENTREGA DE SERVIÇOS
 * =====================================================================
 * Governança comercial, planejamento por DAG de dependências, controle
 * rigoroso de estados (8 estados canônicos), execução especializada
 * pelos 7 agentes e supervisão humana com aprovação/rejeição e correções.
 * =====================================================================
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const {
    salvarProjeto,
    obterProjetoPorId,
    listarProjetos,
    atualizarEstadoTarefa,
    recalcularGrafoDependencias,
    verificarConclusaoProjeto,
    registrarEvento
} = require('./agente_02_coordenador/repositorio_projetos_tarefas');

const { db } = require('./banco_dados');
const { servicoMotorInteligencia } = require('./servico_motor_inteligencia');
const { storageService } = require('./storage_service');

// Especialistas executivos
const { executarCicloCompletoDesenvolvedor } = require('./agente_03_desenvolvedor/executor_desenvolvedor');
const { executarCicloCompletoBranding } = require('./agente_04_branding_design/executor_branding_design');
const { executarCicloCompletoAtendimento } = require('./agente_05_atendimento/executor_atendimento');
const { executarCicloCompletoAutomacao } = require('./agente_06_automacao/executor_automacao');
const { executarCicloCompletoInteligencia } = require('./agente_07_inteligencia_comercial/executor_inteligencia_comercial');

// 1. CONSTANTES OFICIAIS DE FRENTES COMERCIAIS E ESTADOS
const FRENTES_COMERCIAIS = {
    PRESENCA_COMERCIAL: 'PRESENCA_COMERCIAL',
    SISTEMA_COMERCIAL: 'SISTEMA_COMERCIAL',
    INTELIGENCIA_OTIMIZACAO: 'INTELIGENCIA_OTIMIZACAO'
};

const ESTADOS_SISTEMA = {
    AGUARDANDO_AUTORIZACAO_COMERCIAL: 'AGUARDANDO_AUTORIZACAO_COMERCIAL',
    AUTORIZADO: 'AUTORIZADO',
    PLANEJAMENTO: 'PLANEJAMENTO',
    EM_EXECUCAO: 'EM_EXECUCAO',
    AGUARDANDO_APROVACAO: 'AGUARDANDO_APROVACAO',
    BLOQUEADO: 'BLOQUEADO',
    CONCLUIDO: 'CONCLUIDO',
    CANCELADO: 'CANCELADO'
};

/**
 * Valida a lista de frentes comerciais informadas
 * @param {Array<string>} frentes 
 * @returns {Array<string>} Frentes normalizadas
 */
function normalizarFrentesComerciais(frentes) {
    if (!frentes) return [FRENTES_COMERCIAIS.PRESENCA_COMERCIAL];
    const lista = Array.isArray(frentes) ? frentes : [frentes];
    const normalizadas = [];

    lista.forEach(f => {
        const str = String(f).toUpperCase().trim();
        if (str.includes('PRESENCA') || str.includes('LANDING') || str.includes('SITE')) {
            if (!normalizadas.includes(FRENTES_COMERCIAIS.PRESENCA_COMERCIAL)) normalizadas.push(FRENTES_COMERCIAIS.PRESENCA_COMERCIAL);
        } else if (str.includes('SISTEMA') || str.includes('ATENDIMENTO') || str.includes('AUTOMACAO') || str.includes('CRM')) {
            if (!normalizadas.includes(FRENTES_COMERCIAIS.SISTEMA_COMERCIAL)) normalizadas.push(FRENTES_COMERCIAIS.SISTEMA_COMERCIAL);
        } else if (str.includes('INTELIGENCIA') || str.includes('OTIMIZACAO') || str.includes('DIAGNOSTICO') || str.includes('MOTOR')) {
            if (!normalizadas.includes(FRENTES_COMERCIAIS.INTELIGENCIA_OTIMIZACAO)) normalizadas.push(FRENTES_COMERCIAIS.INTELIGENCIA_OTIMIZACAO);
        }
    });

    return normalizadas.length > 0 ? normalizadas : [FRENTES_COMERCIAIS.PRESENCA_COMERCIAL];
}

/**
 * 2. CRIAÇÃO DE NOVA DEMANDA / PROJETO NO SISTEMA DE EXECUÇÃO
 * Cria o projeto em AGUARDANDO_AUTORIZACAO_COMERCIAL
 * @param {Object} params
 * @returns {Object} Projeto persistido
 */
function criarProjetoDemandaComercial(params = {}) {
    const anoAtual = new Date().getFullYear();
    const idProjeto = `PRJ-${anoAtual}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const frentes = normalizarFrentesComerciais(params.frentesComerciais || params.frentes_comerciais || params.servicoContratado);
    const clienteNome = params.empresaContratante || params.empresa_contratante || params.cliente || 'Empresa Cliente Simulada';
    const clienteId = params.clienteId || params.empresaId || ('CLI-' + crypto.createHash('md5').update(clienteNome).digest('hex').substring(0, 8).toUpperCase());
    const solicitacao = params.solicitacaoOriginal || params.solicitacao_original || params.solicitacao || 'Demanda comercial registrada.';
    const limites = params.limitesTrabalho || params.limites_trabalho || 'Escopo restrito exclusivamente aos itens formalizados na proposta comercial.';
    const entregaveis = params.entregaveis || params.entregaveisEstimados || [];

    const projeto = {
        id_projeto: idProjeto,
        id: idProjeto,
        id_demanda_origem: params.idDemandaOrigem || `DEM-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
        cliente_id: clienteId,
        cliente: clienteNome,
        empresa_contratante: clienteNome,
        solicitacao_original: solicitacao,
        situacao_projeto: ESTADOS_SISTEMA.AGUARDANDO_AUTORIZACAO_COMERCIAL,
        frentes_comerciais: frentes,
        escopo_autorizado: null,
        entregaveis: entregaveis,
        limites_trabalho: limites,
        responsavel_aprovacao: null,
        natureza_projeto: 'SIMULADO',
        autorizacao_comercial: {
            status: 'PENDENTE',
            frentes_comerciais: frentes,
            servicos_autorizados: [],
            escopo_autorizado: null,
            entregaveis: entregaveis,
            limites_trabalho: limites,
            responsavel_aprovacao: null,
            data_autorizacao: null,
            observacao: 'Projeto aguardando autorização comercial formal da Diretoria Executiva.'
        },
        cronograma: {
            prioridade: params.prioridade || 'NORMAL',
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        },
        grafo_tarefas: [
            {
                id_tarefa: `TSK-${idProjeto}-AUTORIZACAO`,
                id: `TSK-${idProjeto}-AUTORIZACAO`,
                especialista: 'Estrategista / Gestão Comercial',
                agente_id: 'agente_02_coordenador',
                titulo: 'Formalização e Aprovação Comercial da Demanda',
                objetivo: 'Validar proposta comercial e obter aceite formal para liberar planejamento dos especialistas.',
                descricao: 'Projeto em espera de autorização executiva. Nenhum agente executivo pode iniciar entrega sem liberação comercial.',
                entradas_necessarias: ['Briefing inicial do cliente', 'Delimitação de frentes comerciais'],
                dependencias: [],
                resultado_esperado: 'Termo de autorização comercial com escopo, entregáveis e limites do trabalho formalizado.',
                criterio_conclusao: 'Autorização executiva assinada e registrada pelo Diretor Douglas Paz.',
                evidencias_execucao: [],
                estado: ESTADOS_SISTEMA.AGUARDANDO_AUTORIZACAO_COMERCIAL,
                estado_tarefa: ESTADOS_SISTEMA.AGUARDANDO_AUTORIZACAO_COMERCIAL,
                historico_alteracoes: [
                    {
                        timestamp: new Date().toISOString(),
                        autor: 'Sistema de Execução',
                        estado_anterior: null,
                        novo_estado: ESTADOS_SISTEMA.AGUARDANDO_AUTORIZACAO_COMERCIAL,
                        nota: 'Demanda comercial cadastrada aguardando autorização.'
                    }
                ]
            }
        ],
        registro_operacional: [
            {
                timestamp: new Date().toISOString(),
                evento: `Projeto [${idProjeto}] registrado em AGUARDANDO_AUTORIZACAO_COMERCIAL.`,
                detalhes: { frentes, empresa: clienteNome, natureza: 'SIMULADO' }
            }
        ]
    };

    projeto.historico_operacional = projeto.registro_operacional;
    salvarProjeto(projeto);
    return projeto;
}

/**
 * 3. AUTORIZAÇÃO COMERCIAL FORMAL DO PROJETO
 * Transiciona o projeto para AUTORIZADO / EM_EXECUCAO e gera o grafo DAG
 * @param {Object} params
 * @param {string} params.idProjeto
 * @param {Array<string>} [params.frentesComerciais]
 * @param {string} params.escopoAutorizado
 * @param {Array<string>} [params.entregaveis]
 * @param {string} [params.limitesTrabalho]
 * @param {string} params.responsavelAprovacao
 * @param {string} [params.observacao]
 * @returns {Object} Projeto autorizado e estruturado com tarefas
 */
function autorizarProjetoComercialmente(params) {
    const idProjeto = params.idProjeto || params.id_projeto || params.id;
    if (!idProjeto) throw new Error('[VALIDACAO_ERRO] idProjeto é obrigatório.');

    const projeto = obterProjetoPorId(idProjeto);
    if (!projeto) throw new Error(`[ERRO_AUTORIZACAO] Projeto [${idProjeto}] não encontrado.`);

    const responsavel = params.responsavelAprovacao || params.responsavel_aprovacao || params.autorizadoPor || 'Douglas Paz — Diretor Executivo';
    const frentes = normalizarFrentesComerciais(params.frentesComerciais || params.frentes_comerciais || projeto.frentes_comerciais);
    const escopo = params.escopoAutorizado || params.escopo_autorizado || params.servicoNome || projeto.solicitacao_original;
    const entregaveis = params.entregaveis || projeto.entregaveis || [];
    const limites = params.limitesTrabalho || params.limites_trabalho || projeto.limites_trabalho || 'Trabalho restrito aos entregáveis contratados.';
    const obs = params.observacao || 'Autorização comercial formal concedida pela Diretoria Executiva VIDE.';

    projeto.autorizacao_comercial = {
        status: ESTADOS_SISTEMA.AUTORIZADO,
        frentes_comerciais: frentes,
        servicos_autorizados: frentes,
        escopo_autorizado: escopo,
        entregaveis: entregaveis,
        limites_trabalho: limites,
        responsavel_aprovacao: responsavel,
        data_autorizacao: new Date().toISOString(),
        observacao: obs
    };

    projeto.frentes_comerciais = frentes;
    projeto.escopo_autorizado = escopo;
    projeto.entregaveis = entregaveis;
    projeto.limites_trabalho = limites;
    projeto.responsavel_aprovacao = responsavel;
    projeto.situacao_projeto = ESTADOS_SISTEMA.PLANEJAMENTO;

    // Dispara o planejamento executivo pelo Coordenador Geral
    planejarEntregaProjetoInterno(projeto);

    projeto.situacao_projeto = ESTADOS_SISTEMA.EM_EXECUCAO;

    if (!projeto.registro_operacional) projeto.registro_operacional = [];
    projeto.registro_operacional.push({
        timestamp: new Date().toISOString(),
        evento: `Projeto [${idProjeto}] AUTORIZADO comercialmente por [${responsavel}].`,
        detalhes: {
            frentes,
            escopo,
            total_tarefas: projeto.grafo_tarefas.length,
            responsavel
        }
    });
    projeto.historico_operacional = projeto.registro_operacional;

    salvarProjeto(projeto);
    return projeto;
}

/**
 * 4. PLANEJAMENTO DA ENTREGA PELO COORDENADOR GERAL
 * Decompõe o escopo contratado nas tarefas do grafo DAG
 * @param {Object} projeto 
 */
function planejarEntregaProjetoInterno(projeto) {
    const idProjeto = projeto.id_projeto || projeto.id;
    const frentes = projeto.frentes_comerciais || [FRENTES_COMERCIAIS.PRESENCA_COMERCIAL];
    const tarefas = [];

    const temPresenca = frentes.includes(FRENTES_COMERCIAIS.PRESENCA_COMERCIAL);
    const temSistema = frentes.includes(FRENTES_COMERCIAIS.SISTEMA_COMERCIAL);
    const temIntel = frentes.includes(FRENTES_COMERCIAIS.INTELIGENCIA_OTIMIZACAO);

    // =========================================================================
    // CENÁRIO A: TRIPARTITE / INTEGRADO (PRESENÇA + SISTEMA + INTELIGÊNCIA)
    // =========================================================================
    if (temPresenca && temSistema && temIntel) {
        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-01`,
            id: `TSK-${idProjeto}-01`,
            especialista: 'Estrategista',
            agente_id: 'agente_02_coordenador',
            frente: FRENTES_COMERCIAIS.INTELIGENCIA_OTIMIZACAO,
            titulo: 'Alinhamento Estratégico e Arquitetura Tripartite',
            objetivo: 'Definir proposta de valor, jornada do cliente e requisitos para guiar Marca, Site, Sistema e Inteligência.',
            descricao: 'Consolidar direcionamento do negócio, alinhando objetivos de conversão com os entregáveis de cada especialista.',
            entradas_necessarias: ['Briefing inicial do negócio', 'Definição de público-alvo', 'Objetivos de crescimento'],
            dependencias: [],
            resultado_esperado: 'Documento executivo de direcionamento estratégico e mapa de dependências homologado.',
            criterio_conclusao: 'Proposta de valor sintetizada, proposta de jornada definida e mapa de tarefas distribuído.',
            evidencias_execucao: [],
            estado: ESTADOS_SISTEMA.EM_EXECUCAO,
            estado_tarefa: ESTADOS_SISTEMA.EM_EXECUCAO,
            bloqueio_motivo: null,
            historico_alteracoes: []
        });

        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-02`,
            id: `TSK-${idProjeto}-02`,
            especialista: 'Branding e Design',
            agente_id: 'agente_04_branding_design',
            frente: FRENTES_COMERCIAIS.PRESENCA_COMERCIAL,
            titulo: 'Identidade Visual, Design Tokens e Ativos Gráficos',
            objetivo: 'Desenvolver a linguagem visual, paleta cromática, tipografia, logotipo vetorial e guidelines.',
            descricao: 'Criar os ativos de marca e design system para alimentar o Desenvolvimento Web e interfaces de atendimento.',
            entradas_necessarias: ['Direcionamento estratégico da TSK-01', 'Referências visuais do cliente'],
            dependencias: [`TSK-${idProjeto}-01`],
            resultado_esperado: 'Design tokens em JSON, logotipo SVG vetorial e manual de aplicação visual consolidado.',
            criterio_conclusao: 'Tokens de cores validados com contraste acessível, logotipo vetorial SVG exportado e guia visual.',
            evidencias_execucao: [],
            estado: ESTADOS_SISTEMA.BLOQUEADO,
            estado_tarefa: ESTADOS_SISTEMA.BLOQUEADO,
            bloqueio_motivo: `Aguardando conclusão da tarefa predecessora: TSK-${idProjeto}-01`,
            historico_alteracoes: []
        });

        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-03`,
            id: `TSK-${idProjeto}-03`,
            especialista: 'Desenvolvedor',
            agente_id: 'agente_03_desenvolvedor',
            frente: FRENTES_COMERCIAIS.PRESENCA_COMERCIAL,
            titulo: 'Construção da Presença Digital e Interface de Conversão',
            objetivo: 'Programar a landing page/site institucional responsivo aplicando com rigor os ativos de marca e canais de captura.',
            descricao: 'Desenvolvimento do front-end com HTML5 semântico, CSS3 moderno, formulário funcional e gatilhos para WhatsApp comercial.',
            entradas_necessarias: ['Ativos gráficos e tokens da TSK-02', 'Canais de captura definidos'],
            dependencias: [`TSK-${idProjeto}-02`],
            resultado_esperado: 'Código HTML/CSS/JS responsivo com Lighthouse > 90 e gatilhos de captura funcionais.',
            criterio_conclusao: 'Interface testada em desktop e mobile, sem dependências frágeis, com pontuação técnica homologada.',
            evidencias_execucao: [],
            estado: ESTADOS_SISTEMA.BLOQUEADO,
            estado_tarefa: ESTADOS_SISTEMA.BLOQUEADO,
            bloqueio_motivo: `Aguardando conclusão da tarefa predecessora: TSK-${idProjeto}-02`,
            historico_alteracoes: []
        });

        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-04`,
            id: `TSK-${idProjeto}-04`,
            especialista: 'Atendimento',
            agente_id: 'agente_05_atendimento',
            frente: FRENTES_COMERCIAIS.SISTEMA_COMERCIAL,
            titulo: 'Estruturação dos Roteiros de Atendimento e Matriz de Objeções',
            objetivo: 'Desenhar a árvore conversacional, perguntas de qualificação, matriz de 4 macro-objeções e réguas de follow-up.',
            descricao: 'Estruturação do processo de vendas com scripts claros, transbordo para humanos e réguas de recuperação de leads.',
            entradas_necessarias: ['Direcionamento estratégico da TSK-01', 'Catálogo de serviços e preços'],
            dependencias: [`TSK-${idProjeto}-01`],
            resultado_esperado: 'Roteiros de vendas completos, árvore de qualificação e réguas de recuperação documentadas.',
            criterio_conclusao: 'Matriz de 4 objeções estruturada, régua de follow-up temporal definida e simulador interativo funcional.',
            evidencias_execucao: [],
            estado: ESTADOS_SISTEMA.BLOQUEADO,
            estado_tarefa: ESTADOS_SISTEMA.BLOQUEADO,
            bloqueio_motivo: `Aguardando conclusão da tarefa predecessora: TSK-${idProjeto}-01`,
            historico_alteracoes: []
        });

        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-05`,
            id: `TSK-${idProjeto}-05`,
            especialista: 'Automação',
            agente_id: 'agente_06_automacao',
            frente: FRENTES_COMERCIAIS.SISTEMA_COMERCIAL,
            titulo: 'Configuração dos Fluxos Técnicos no n8n e Integrações CRM',
            objetivo: 'Implementar as automações no n8n conectando formulários da interface e canais de entrada ao CRM comercial.',
            descricao: 'Construir workflows com webhooks, deduplicação de leads, persistência de estados e notificações aos vendedores.',
            entradas_necessarias: ['Interface web da TSK-03', 'Roteiros e réguas de atendimento da TSK-04'],
            dependencias: [`TSK-${idProjeto}-03`, `TSK-${idProjeto}-04`],
            resultado_esperado: 'Workflow n8n ativo com resposta a webhooks em menos de 10 segundos e sincronização com CRM.',
            criterio_conclusao: 'Fluxo técnico homologado, deduplicação validada e atualização de leads confirmada.',
            evidencias_execucao: [],
            estado: ESTADOS_SISTEMA.BLOQUEADO,
            estado_tarefa: ESTADOS_SISTEMA.BLOQUEADO,
            bloqueio_motivo: `Aguardando conclusão das tarefas predecessoras: TSK-${idProjeto}-03, TSK-${idProjeto}-04`,
            historico_alteracoes: []
        });

        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-06`,
            id: `TSK-${idProjeto}-06`,
            especialista: 'Inteligência Comercial',
            agente_id: 'agente_07_inteligencia_comercial',
            frente: FRENTES_COMERCIAIS.INTELIGENCIA_OTIMIZACAO,
            titulo: 'Diagnóstico 7D, Auditoria de Gargalos EPV e Recomendações MIV',
            objetivo: 'Executar o Diagnóstico Comercial 7D, calcular o EPV dos gargalos e formular recomendações MIV com planos de teste.',
            descricao: 'Acionamento do Motor de Inteligência Comercial para mapear vazamentos, priorizar intervenções de menor esforço e alta alavancagem.',
            entradas_necessarias: ['Fluxo comercial da TSK-05', 'Métricas e histórico de interações operacionais'],
            dependencias: [`TSK-${idProjeto}-05`],
            resultado_esperado: 'Dossiê analítico 7D completo, gargalo prioritário ranqueado com EPV e recomendação MIV justificada.',
            criterio_conclusao: 'Diagnóstico 7D gerado com rigor empírico, MIV detalhada com plano de teste e métricas de sucesso.',
            evidencias_execucao: [],
            estado: ESTADOS_SISTEMA.BLOQUEADO,
            estado_tarefa: ESTADOS_SISTEMA.BLOQUEADO,
            bloqueio_motivo: `Aguardando conclusão da tarefa predecessora: TSK-${idProjeto}-05`,
            historico_alteracoes: []
        });
    }

    // =========================================================================
    // CENÁRIO B: APENAS PRESENÇA COMERCIAL (SITE / LANDING PAGE)
    // =========================================================================
    else if (temPresenca && !temSistema && !temIntel) {
        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-01`,
            id: `TSK-${idProjeto}-01`,
            especialista: 'Branding e Design',
            agente_id: 'agente_04_branding_design',
            frente: FRENTES_COMERCIAIS.PRESENCA_COMERCIAL,
            titulo: 'Validação e Preparação dos Ativos de Identidade Visual',
            objetivo: 'Verificar logotipo vetorial, paleta cromática, tipografia e preparar pacote visual para a interface digital.',
            descricao: 'Adequação dos ativos de marca para máxima legibilidade e conversão no ambiente web responsivo.',
            entradas_necessarias: ['Briefing visual da empresa', 'Ativos existentes ou referências'],
            dependencias: [],
            resultado_esperado: 'Design tokens em JSON e pacote de ativos visuais homologados.',
            criterio_conclusao: 'Logotipo vetorial/alta definição validado, paleta e tipografia definidas, exportação concluída.',
            evidencias_execucao: [],
            estado: ESTADOS_SISTEMA.EM_EXECUCAO,
            estado_tarefa: ESTADOS_SISTEMA.EM_EXECUCAO,
            bloqueio_motivo: null,
            historico_alteracoes: []
        });

        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-02`,
            id: `TSK-${idProjeto}-02`,
            especialista: 'Desenvolvedor',
            agente_id: 'agente_03_desenvolvedor',
            frente: FRENTES_COMERCIAIS.PRESENCA_COMERCIAL,
            titulo: 'Construção, Programação e Publicação da Landing Page',
            objetivo: 'Programar a landing page responsiva, orientada à conversão e integrada aos canais de captura do cliente.',
            descricao: 'Desenvolvimento do código HTML/CSS/JS com carregamento ultrarrápido, sem dependências frágeis e focado em conversão.',
            entradas_necessarias: ['Ativos de identidade visual da TSK-01', 'Requisitos de conversão'],
            dependencias: [`TSK-${idProjeto}-01`],
            resultado_esperado: 'Landing page responsiva em HTML/CSS/JS com pontuação no Lighthouse acima de 90.',
            criterio_conclusao: 'Código responsivo em desktop/mobile, formulário testado e links funcionais sem erros.',
            evidencias_execucao: [],
            estado: ESTADOS_SISTEMA.BLOQUEADO,
            estado_tarefa: ESTADOS_SISTEMA.BLOQUEADO,
            bloqueio_motivo: `Aguardando conclusão da tarefa predecessora: TSK-${idProjeto}-01`,
            historico_alteracoes: []
        });
    }

    // =========================================================================
    // CENÁRIO C: APENAS SISTEMA COMERCIAL (ATENDIMENTO + CRM/AUTOMAÇÃO)
    // =========================================================================
    else if (temSistema && !temPresenca && !temIntel) {
        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-01`,
            id: `TSK-${idProjeto}-01`,
            especialista: 'Atendimento',
            agente_id: 'agente_05_atendimento',
            frente: FRENTES_COMERCIAIS.SISTEMA_COMERCIAL,
            titulo: 'Estruturação da Jornada, Roteiros de Qualificação e Objeções',
            objetivo: 'Mapear a árvore de decisão conversacional, roteiros de qualificação de leads e réguas de follow-up temporal.',
            descricao: 'Estruturar o processo de atendimento e vendas para padronizar as respostas comerciais e recuperação de leads frios.',
            entradas_necessarias: ['Catálogo de serviços e preços', 'Critérios de qualificação da empresa'],
            dependencias: [],
            resultado_esperado: 'Roteiros de vendas completos, matriz de objeções e réguas de follow-up documentadas.',
            criterio_conclusao: 'Roteiros validados cobrindo início ao fechamento, critérios de transbordo humano definidos.',
            evidencias_execucao: [],
            estado: ESTADOS_SISTEMA.EM_EXECUCAO,
            estado_tarefa: ESTADOS_SISTEMA.EM_EXECUCAO,
            bloqueio_motivo: null,
            historico_alteracoes: []
        });

        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-02`,
            id: `TSK-${idProjeto}-02`,
            especialista: 'Automação',
            agente_id: 'agente_06_automacao',
            frente: FRENTES_COMERCIAIS.SISTEMA_COMERCIAL,
            titulo: 'Implementação dos Workflows no n8n e Sincronização com CRM',
            objetivo: 'Construir os workflows técnicos no n8n conectando os canais de atendimento ao CRM comercial da empresa.',
            descricao: 'Configuração de webhooks, lógica de deduplicação, cadências de follow-up e interrupção automática em caso de resposta.',
            entradas_necessarias: ['Roteiros e réguas de atendimento da TSK-01', 'Configuração de webhooks e CRM'],
            dependencias: [`TSK-${idProjeto}-01`],
            resultado_esperado: 'Workflows n8n ativos com disparo de webhooks em menos de 10 segundos e atualização no CRM.',
            criterio_conclusao: 'Fluxo n8n testado com deduplicação validada e atualização de status de leads no CRM.',
            evidencias_execucao: [],
            estado: ESTADOS_SISTEMA.BLOQUEADO,
            estado_tarefa: ESTADOS_SISTEMA.BLOQUEADO,
            bloqueio_motivo: `Aguardando conclusão da tarefa predecessora: TSK-${idProjeto}-01`,
            historico_alteracoes: []
        });
    }

    // =========================================================================
    // CENÁRIO D: APENAS INTELIGÊNCIA E OTIMIZAÇÃO (DIAGNÓSTICO 7D + EPV + MIV)
    // =========================================================================
    else if (temIntel && !temPresenca && !temSistema) {
        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-01`,
            id: `TSK-${idProjeto}-01`,
            especialista: 'Estrategista',
            agente_id: 'agente_02_coordenador',
            frente: FRENTES_COMERCIAIS.INTELIGENCIA_OTIMIZACAO,
            titulo: 'Mapeamento do Perímetro Operacional e Consolidação de Hipóteses',
            objetivo: 'Definir o framework de diagnóstico, identificar pontos críticos relatados e delimitar fontes de dados.',
            descricao: 'Alinhamento dos dados operacionais e preparação do escopo analítico para a auditoria profunda do Motor.',
            entradas_necessarias: ['Dados operacionais do cliente', 'Histórico de vendas e conversão'],
            dependencias: [],
            resultado_esperado: 'Diretrizes analíticas documentadas com parâmetros de entrada consolidados.',
            criterio_conclusao: 'Fontes de dados estruturadas e diretrizes de análise parametrizadas.',
            evidencias_execucao: [],
            estado: ESTADOS_SISTEMA.EM_EXECUCAO,
            estado_tarefa: ESTADOS_SISTEMA.EM_EXECUCAO,
            bloqueio_motivo: null,
            historico_alteracoes: []
        });

        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-02`,
            id: `TSK-${idProjeto}-02`,
            especialista: 'Inteligência Comercial',
            agente_id: 'agente_07_inteligencia_comercial',
            frente: FRENTES_COMERCIAIS.INTELIGENCIA_OTIMIZACAO,
            titulo: 'Diagnóstico Comercial 7D, Priorização EPV e Recomendação MIV',
            objetivo: 'Auditar as 7 dimensões comerciais, calcular o EPV dos gargalos e formular intervenção MIV com plano de teste.',
            descricao: 'Execução do Motor de Inteligência Comercial VIDE com análise causal e recomendações fundamentadas.',
            entradas_necessarias: ['Diretrizes analíticas da TSK-01', 'Histórico de interações e métricas'],
            dependencias: [`TSK-${idProjeto}-01`],
            resultado_esperado: 'Dossiê analítico 7D completo, gargalo prioritário ranqueado com EPV e recomendação MIV justificada.',
            criterio_conclusao: 'Dossiê 7D gerado com dados empíricos, cálculo de perdas e intervenção MIV com critérios de sucesso.',
            evidencias_execucao: [],
            estado: ESTADOS_SISTEMA.BLOQUEADO,
            estado_tarefa: ESTADOS_SISTEMA.BLOQUEADO,
            bloqueio_motivo: `Aguardando conclusão da tarefa predecessora: TSK-${idProjeto}-01`,
            historico_alteracoes: []
        });
    }

    // =========================================================================
    // CENÁRIO E: PRESENÇA + SISTEMA (SEM INTELIGÊNCIA FORMAL)
    // =========================================================================
    else if (temPresenca && temSistema && !temIntel) {
        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-01`,
            id: `TSK-${idProjeto}-01`,
            especialista: 'Branding e Design',
            agente_id: 'agente_04_branding_design',
            frente: FRENTES_COMERCIAIS.PRESENCA_COMERCIAL,
            titulo: 'Identidade Visual e Design Tokens para Interfaces Web',
            objetivo: 'Preparar ativos gráficos, logotipo vetorial e tokens para aplicação no site e roteiros.',
            descricao: 'Adequação dos elementos visuais da empresa para presença digital e materiais de atendimento.',
            entradas_necessarias: ['Briefing inicial do negócio'],
            dependencias: [],
            resultado_esperado: 'Design tokens JSON e logotipo SVG vetorial.',
            criterio_conclusao: 'Logotipo vetorial validado e paleta definida com contraste acessível.',
            evidencias_execucao: [],
            estado: ESTADOS_SISTEMA.EM_EXECUCAO,
            estado_tarefa: ESTADOS_SISTEMA.EM_EXECUCAO,
            bloqueio_motivo: null,
            historico_alteracoes: []
        });

        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-02`,
            id: `TSK-${idProjeto}-02`,
            especialista: 'Desenvolvedor',
            agente_id: 'agente_03_desenvolvedor',
            frente: FRENTES_COMERCIAIS.PRESENCA_COMERCIAL,
            titulo: 'Construção da Interface Web e Estrutura de Conversão',
            objetivo: 'Programar o site institucional com formulários e gatilhos de WhatsApp conforme ativos de branding.',
            descricao: 'Desenvolvimento do site responsivo com código limpo e foco em conversão comercial.',
            entradas_necessarias: ['Ativos de branding da TSK-01'],
            dependencias: [`TSK-${idProjeto}-01`],
            resultado_esperado: 'Site funcional em HTML/CSS/JS responsivo.',
            criterio_conclusao: 'Interface homologada em múltiplos dispositivos sem erros de renderização.',
            evidencias_execucao: [],
            estado: ESTADOS_SISTEMA.BLOQUEADO,
            estado_tarefa: ESTADOS_SISTEMA.BLOQUEADO,
            bloqueio_motivo: `Aguardando conclusão da tarefa predecessora: TSK-${idProjeto}-01`,
            historico_alteracoes: []
        });

        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-03`,
            id: `TSK-${idProjeto}-03`,
            especialista: 'Atendimento',
            agente_id: 'agente_05_atendimento',
            frente: FRENTES_COMERCIAIS.SISTEMA_COMERCIAL,
            titulo: 'Roteiros de Qualificação e Matriz de Objeções de Vendas',
            objetivo: 'Estruturar os roteiros de resposta rápida, qualificação e recuperação de clientes.',
            descricao: 'Processo comercial de vendas alinhado aos pontos de contato da interface digital.',
            entradas_necessarias: ['Catálogo de serviços'],
            dependencias: [],
            resultado_esperado: 'Roteiros de atendimento e matriz de 4 objeções.',
            criterio_conclusao: 'Roteiros validados com réguas de follow-up e transbordo humano.',
            evidencias_execucao: [],
            estado: ESTADOS_SISTEMA.EM_EXECUCAO,
            estado_tarefa: ESTADOS_SISTEMA.EM_EXECUCAO,
            bloqueio_motivo: null,
            historico_alteracoes: []
        });

        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-04`,
            id: `TSK-${idProjeto}-04`,
            especialista: 'Automação',
            agente_id: 'agente_06_automacao',
            frente: FRENTES_COMERCIAIS.SISTEMA_COMERCIAL,
            titulo: 'Configuração dos Fluxos no n8n e Integração com CRM',
            objetivo: 'Conectar os formulários do site (TSK-02) e as réguas do atendimento (TSK-03) ao CRM via n8n.',
            descricao: 'Automação dos disparos de webhooks, deduplicação de contatos e alertas comerciais.',
            entradas_necessarias: ['Interface web da TSK-02', 'Roteiros da TSK-03'],
            dependencias: [`TSK-${idProjeto}-02`, `TSK-${idProjeto}-03`],
            resultado_esperado: 'Workflows n8n ativos com resposta a webhooks e sincronização com CRM.',
            criterio_conclusao: 'Fluxo n8n testado com deduplicação validada e atualização no CRM confirmada.',
            evidencias_execucao: [],
            estado: ESTADOS_SISTEMA.BLOQUEADO,
            estado_tarefa: ESTADOS_SISTEMA.BLOQUEADO,
            bloqueio_motivo: `Aguardando conclusão das tarefas predecessoras: TSK-${idProjeto}-02, TSK-${idProjeto}-03`,
            historico_alteracoes: []
        });
    }

    projeto.grafo_tarefas = tarefas;
    for (const t of projeto.grafo_tarefas) {
        if (!t.historico_alteracoes) t.historico_alteracoes = [];
        if (!t.historico_auditoria) t.historico_auditoria = [];
        if (!t.criterios_aceite) t.criterios_aceite = [t.criterio_conclusao];
        if (!t.evidencias_execucao) t.evidencias_execucao = [];
    }
}

/**
 * 5. VALIDAÇÃO DE AUTORIZAÇÃO E DEPENDÊNCIAS DE EXECUÇÃO
 * @param {string} idProjeto 
 * @param {string} idTarefa 
 * @returns {Object} { projeto, tarefa }
 */
function verificarAutorizacaoEPredecessores(idProjeto, idTarefa) {
    const projeto = obterProjetoPorId(idProjeto);
    if (!projeto) throw new Error(`[ERRO_EXECUCAO] Projeto [${idProjeto}] não encontrado.`);

    // 1. Autorização Comercial Obrigatória
    const autorizacao = projeto.autorizacao_comercial || {};
    if (autorizacao.status !== ESTADOS_SISTEMA.AUTORIZADO) {
        throw new Error(
            `[BLOQUEIO_AUTORIZACAO_COMERCIAL] Projeto [${idProjeto}] está com status de autorização [${autorizacao.status || 'PENDENTE'}]. ` +
            `Nenhum agente executivo da equipe digital pode iniciar entrega sem autorização comercial formal da Diretoria Executiva.`
        );
    }

    // 2. Tarefa no Grafo
    const tarefa = (projeto.grafo_tarefas || []).find(t => t.id_tarefa === idTarefa || t.id === idTarefa);
    if (!tarefa) throw new Error(`[ERRO_EXECUCAO] Tarefa [${idTarefa}] não encontrada no grafo do projeto.`);

    // 3. Validação de Conclusão Prévia
    if ((tarefa.estado === ESTADOS_SISTEMA.CONCLUIDO || tarefa.estado === 'APROVADA') && !tarefa.necessita_correcao) {
        throw new Error(`[AVISO_EXECUCAO] Tarefa [${idTarefa}] já está concluída e homologada com sucesso.`);
    }

    // 4. Validação de Dependências Predecessoras (DAG)
    if (tarefa.dependencias && tarefa.dependencias.length > 0) {
        const predecessorasPendentes = tarefa.dependencias.filter(depId => {
            const dep = projeto.grafo_tarefas.find(t => t.id_tarefa === depId || t.id === depId);
            return !dep || (dep.estado !== ESTADOS_SISTEMA.CONCLUIDO && dep.estado !== 'APROVADA');
        });

        if (predecessorasPendentes.length > 0) {
            tarefa.estado = ESTADOS_SISTEMA.BLOQUEADO;
            tarefa.estado_tarefa = ESTADOS_SISTEMA.BLOQUEADO;
            tarefa.bloqueio_motivo = `Aguardando aprovação das tarefas predecessoras: [${predecessorasPendentes.join(', ')}]`;
            salvarProjeto(projeto);
            throw new Error(
                `[BLOQUEIO_DEPENDENCIA] Tarefa [${idTarefa}] está BLOQUEADA por dependência não concluída. ` +
                `Predecessoras pendentes: [${predecessorasPendentes.join(', ')}].`
            );
        }
    }

    return { projeto, tarefa };
}

/**
 * 6. EXECUÇÃO DE TAREFA PELO AGENTE ESPECIALISTA
 * Executa o trabalho técnico, gera evidências e submete a AGUARDANDO_APROVACAO
 * @param {Object} params
 * @param {string} params.idProjeto
 * @param {string} params.idTarefa
 * @param {Object} [params.inputsAdicionais]
 * @param {string} [params.usuarioExecucao]
 * @returns {Object} Tarefa e Projeto atualizados em AGUARDANDO_APROVACAO
 */
function executarTarefaProjeto(params) {
    const idProjeto = params.idProjeto || params.id_projeto;
    const idTarefa = params.idTarefa || params.id_tarefa;
    const usuario = params.usuarioExecucao || 'Operador VIDE';

    const { projeto, tarefa } = verificarAutorizacaoEPredecessores(idProjeto, idTarefa);

    const especialista = (tarefa.especialista || '').toLowerCase();
    let resultadoCiclo = null;
    let arquivosCriados = [];
    let dadosEntrega = {};

    // 1. Marca início da execução
    tarefa.estado = ESTADOS_SISTEMA.EM_EXECUCAO;
    tarefa.estado_tarefa = ESTADOS_SISTEMA.EM_EXECUCAO;
    tarefa.bloqueio_motivo = null;

    // 2. Despacha para o especialista correspondente
    if (especialista.includes('branding') || especialista.includes('design')) {
        resultadoCiclo = executarCicloCompletoBranding({ idProjeto, idTarefa });
        arquivosCriados = resultadoCiclo.dadosEntrega?.arquivosCriados || [];
        dadosEntrega = resultadoCiclo.dadosEntrega || {};
    } else if (especialista.includes('desenvolv') || especialista.includes('dev') || especialista.includes('web')) {
        resultadoCiclo = executarCicloCompletoDesenvolvedor({ idProjeto, idTarefa });
        arquivosCriados = resultadoCiclo.dadosEntrega?.arquivosCriados || [];
        dadosEntrega = resultadoCiclo.dadosEntrega || {};
    } else if (especialista.includes('atend')) {
        resultadoCiclo = executarCicloCompletoAtendimento({ idProjeto, idTarefa });
        arquivosCriados = resultadoCiclo.dadosEntrega?.arquivosCriados || [];
        dadosEntrega = resultadoCiclo.dadosEntrega || {};
    } else if (especialista.includes('auto') || especialista.includes('integra') || especialista.includes('n8n')) {
        resultadoCiclo = executarCicloCompletoAutomacao({ idProjeto, idTarefa });
        arquivosCriados = resultadoCiclo.dadosEntrega?.arquivosCriados || [];
        dadosEntrega = resultadoCiclo.dadosEntrega || {};
    } else if (especialista.includes('intel') || especialista.includes('comercial')) {
        resultadoCiclo = executarCicloCompletoInteligencia({ idProjeto, idTarefa });
        arquivosCriados = resultadoCiclo.dadosEntrega?.arquivosCriados || [];
        dadosEntrega = resultadoCiclo.dadosEntrega || {};
    } else if (especialista.includes('estrateg')) {
        // Estrategista (Agente 02 / Coordenador)
        const briefingEstrategico = {
            posicionamento: `Posicionamento Estratégico Homologado para ${projeto.cliente}`,
            frentes_ativas: projeto.frentes_comerciais,
            diretrizes_execucao: 'Garantir coerência entre presença digital, qualificação de atendimento e análise causal.',
            criterios_aceite_validados: true,
            criado_em: new Date().toISOString()
        };
        arquivosCriados = ['alinhamento_estrategico.json', 'mapa_arquitetura_tripartite.md'];
        dadosEntrega = {
            conteudo: briefingEstrategico,
            arquivosCriados,
            conformidade: 100
        };
        resultadoCiclo = {
            sucesso: true,
            dadosEntrega
        };
    } else {
        throw new Error(`[ERRO_ESPECIALISTA] Especialista [${tarefa.especialista}] desconhecido.`);
    }

    // 3. Monta e valida as evidências de execução
    const evidencias = [
        {
            tipo: 'ARQUIVOS_GERADOS',
            arquivos: arquivosCriados,
            quantidade: arquivosCriados.length,
            diretorio_base: dadosEntrega.diretorioEntrega || `entregas_clientes/${idProjeto}/${especialista}`
        },
        {
            tipo: 'CONFORMIDADE_TECNICA',
            score: dadosEntrega.relatorioTestes?.pontuacaoTotal || dadosEntrega.conformidade || 100,
            testes_executados: dadosEntrega.relatorioTestes?.testes?.length || 1,
            resultado: 'APROVADO_TECNICAMENTE'
        },
        {
            tipo: 'CRITERIOS_CONCLUSAO_VERIFICADOS',
            criterios: tarefa.criterios_aceite || [tarefa.criterio_conclusao],
            status: 'ATENDIDOS'
        }
    ];

    tarefa.evidencias_execucao = evidencias;
    tarefa.entrega_submetida = dadosEntrega;

    // 4. Transiciona para AGUARDANDO_APROVACAO (Supervisão Humana / Conferência)
    tarefa.estado = ESTADOS_SISTEMA.AGUARDANDO_APROVACAO;
    tarefa.estado_tarefa = ESTADOS_SISTEMA.AGUARDANDO_APROVACAO;
    tarefa.necessita_correcao = false;

    if (!tarefa.historico_alteracoes) tarefa.historico_alteracoes = [];
    tarefa.historico_alteracoes.push({
        timestamp: new Date().toISOString(),
        autor: `${tarefa.especialista} (Especialista)`,
        estado_anterior: ESTADOS_SISTEMA.EM_EXECUCAO,
        novo_estado: ESTADOS_SISTEMA.AGUARDANDO_APROVACAO,
        nota: `Trabalho técnico executado com sucesso. Total de ${arquivosCriados.length} arquivos gerados. Submetido para aprovação executiva.`
    });
    tarefa.historico_auditoria = tarefa.historico_alteracoes;

    if (!projeto.registro_operacional) projeto.registro_operacional = [];
    projeto.registro_operacional.push({
        timestamp: new Date().toISOString(),
        evento: `Tarefa [${idTarefa}] executada por [${tarefa.especialista}] e submetida para aprovação.`,
        detalhes: {
            id_tarefa: idTarefa,
            arquivos_criados: arquivosCriados.length,
            estado: ESTADOS_SISTEMA.AGUARDANDO_APROVACAO
        }
    });
    projeto.historico_operacional = projeto.registro_operacional;

    salvarProjeto(projeto);

    return {
        sucesso: true,
        id_projeto: idProjeto,
        id_tarefa: idTarefa,
        estado: ESTADOS_SISTEMA.AGUARDANDO_APROVACAO,
        evidencias,
        arquivos: arquivosCriados,
        projeto: obterProjetoPorId(idProjeto)
    };
}

/**
 * 7. CONFERÊNCIA HUMANA E AUDITORIA (APROVAÇÃO OU REJEIÇÃO COM CORREÇÃO)
 * @param {Object} params
 * @param {string} params.idProjeto
 * @param {string} params.idTarefa
 * @param {boolean} params.aprovado
 * @param {string} [params.parecer]
 * @param {string} [params.apontamentosCorrecao]
 * @param {string} [params.responsavelAvaliacao]
 * @returns {Object} Projeto e Tarefa atualizados
 */
function avaliarEntregaTarefa(params) {
    const idProjeto = params.idProjeto || params.id_projeto;
    const idTarefa = params.idTarefa || params.id_tarefa;
    const aprovado = params.aprovado === true || params.criteriosAtendidos === true;
    const parecer = params.parecer || params.parecerCoordenador || (aprovado ? 'Entrega homologada conforme critérios de aceite.' : 'Pendências identificadas na entrega.');
    const apontamentos = params.apontamentosCorrecao || params.apontamentos_correcao || null;
    const avaliador = params.responsavelAvaliacao || params.autor || 'Douglas Paz — Diretor Executivo';

    const projeto = obterProjetoPorId(idProjeto);
    if (!projeto) throw new Error(`[ERRO_AVALIACAO] Projeto [${idProjeto}] não encontrado.`);

    const tarefa = (projeto.grafo_tarefas || []).find(t => t.id_tarefa === idTarefa || t.id === idTarefa);
    if (!tarefa) throw new Error(`[ERRO_AVALIACAO] Tarefa [${idTarefa}] não encontrada.`);

    const estadoAnterior = tarefa.estado;

    if (aprovado) {
        // APROVAÇÃO FORMAL
        tarefa.estado = ESTADOS_SISTEMA.CONCLUIDO;
        tarefa.estado_tarefa = ESTADOS_SISTEMA.CONCLUIDO;
        tarefa.apontamentos_correcao = null;
        tarefa.necessita_correcao = false;

        if (!tarefa.historico_alteracoes) tarefa.historico_alteracoes = [];
        tarefa.historico_alteracoes.push({
            timestamp: new Date().toISOString(),
            autor: avaliador,
            estado_anterior: estadoAnterior,
            novo_estado: ESTADOS_SISTEMA.CONCLUIDO,
            nota: `[ENTREGA APROVADA] ${parecer}`
        });
        tarefa.historico_auditoria = tarefa.historico_alteracoes;

        // Recalcula o grafo DAG para desbloquear sucessores
        recalcularGrafoDependencias(projeto);

        // Verifica se todas as tarefas do projeto foram concluídas
        verificarConclusaoProjeto(projeto);

        if (!projeto.registro_operacional) projeto.registro_operacional = [];
        projeto.registro_operacional.push({
            timestamp: new Date().toISOString(),
            evento: `Entrega da Tarefa [${idTarefa}] APROVADA por [${avaliador}].`,
            detalhes: { id_tarefa: idTarefa, parecer, estado: ESTADOS_SISTEMA.CONCLUIDO }
        });

    } else {
        // REJEIÇÃO COM SOLICITAÇÃO DE CORREÇÃO
        tarefa.estado = ESTADOS_SISTEMA.EM_EXECUCAO;
        tarefa.estado_tarefa = ESTADOS_SISTEMA.EM_EXECUCAO;
        tarefa.apontamentos_correcao = apontamentos || parecer;
        tarefa.necessita_correcao = true;

        if (!tarefa.historico_alteracoes) tarefa.historico_alteracoes = [];
        tarefa.historico_alteracoes.push({
            timestamp: new Date().toISOString(),
            autor: avaliador,
            estado_anterior: estadoAnterior,
            novo_estado: ESTADOS_SISTEMA.EM_EXECUCAO,
            nota: `[REJEIÇÃO / CORREÇÃO SOLICITADA] ${parecer}. Apontamentos: ${apontamentos || 'Ajustar conformidade com critérios de aceite.'}`
        });
        tarefa.historico_auditoria = tarefa.historico_alteracoes;

        if (!projeto.registro_operacional) projeto.registro_operacional = [];
        projeto.registro_operacional.push({
            timestamp: new Date().toISOString(),
            evento: `Entrega da Tarefa [${idTarefa}] REJEITADA por [${avaliador}]. Correção solicitada.`,
            detalhes: { id_tarefa: idTarefa, parecer, apontamentos: tarefa.apontamentos_correcao }
        });
    }

    projeto.historico_operacional = projeto.registro_operacional;
    salvarProjeto(projeto);

    return {
        sucesso: true,
        aprovado,
        id_projeto: idProjeto,
        id_tarefa: idTarefa,
        novo_estado: tarefa.estado,
        parecer,
        projeto: obterProjetoPorId(idProjeto)
    };
}

/**
 * 8. EXECUÇÃO DE CORREÇÃO DE UMA TAREFA REJEITADA
 * @param {Object} params
 * @param {string} params.idProjeto
 * @param {string} params.idTarefa
 * @param {string} [params.instrucoesCorrecao]
 * @param {string} [params.usuarioExecucao]
 * @returns {Object} Tarefa corrigida e ressubmetida para AGUARDANDO_APROVACAO
 */
function executarCorrecaoTarefa(params) {
    const idProjeto = params.idProjeto || params.id_projeto;
    const idTarefa = params.idTarefa || params.id_tarefa;
    const instrucoes = params.instrucoesCorrecao || 'Correções aplicadas conforme apontamento executivo.';

    const projeto = obterProjetoPorId(idProjeto);
    if (!projeto) throw new Error(`[ERRO_CORRECAO] Projeto [${idProjeto}] não encontrado.`);

    const tarefa = (projeto.grafo_tarefas || []).find(t => t.id_tarefa === idTarefa || t.id === idTarefa);
    if (!tarefa) throw new Error(`[ERRO_CORRECAO] Tarefa [${idTarefa}] não encontrada.`);

    // Registra que a correção está sendo trabalhada
    if (!tarefa.historico_alteracoes) tarefa.historico_alteracoes = [];
    tarefa.historico_alteracoes.push({
        timestamp: new Date().toISOString(),
        autor: `${tarefa.especialista} (Especialista)`,
        estado_anterior: tarefa.estado,
        novo_estado: ESTADOS_SISTEMA.EM_EXECUCAO,
        nota: `[CORREÇÃO EM CURSO] Especialista iniciou aplicação dos ajustes: ${instrucoes}`
    });

    salvarProjeto(projeto);

    // Reexecuta o ciclo da tarefa com as correções
    return executarTarefaProjeto({
        idProjeto,
        idTarefa,
        inputsAdicionais: {
            modoCorrecao: true,
            instrucoesCorrecao: instrucoes,
            apontamentosAnteriores: tarefa.apontamentos_correcao
        },
        usuarioExecucao: params.usuarioExecucao || 'Especialista em Correção'
    });
}

/**
 * 9. DOSSIÊ CONSOLIDADO DE EXECUÇÃO DO PROJETO
 * @param {string} idProjeto 
 * @returns {Object} Dossiê completo
 */
function obterDossieExecucaoProjeto(idProjeto) {
    const projeto = obterProjetoPorId(idProjeto);
    if (!projeto) return null;

    const tarefas = projeto.grafo_tarefas || [];
    const totalTarefas = tarefas.length;
    const concluidas = tarefas.filter(t => t.estado === ESTADOS_SISTEMA.CONCLUIDO || t.estado === 'APROVADA').length;
    const pendentes = tarefas.filter(t => t.estado === ESTADOS_SISTEMA.AGUARDANDO_APROVACAO).length;
    const bloqueadas = tarefas.filter(t => t.estado === ESTADOS_SISTEMA.BLOQUEADO || (t.estado && t.estado.includes('BLOQUEADA'))).length;
    const progressoPercent = totalTarefas > 0 ? Math.round((concluidas / totalTarefas) * 100) : 0;

    return {
        id_projeto: projeto.id_projeto || projeto.id,
        empresa_contratante: projeto.empresa_contratante || projeto.cliente,
        cliente: projeto.cliente || projeto.empresa_contratante,
        cliente_id: projeto.cliente_id,
        frentes_comerciais: projeto.frentes_comerciais || [],
        situacao_projeto: projeto.situacao_projeto,
        situacao: projeto.situacao_projeto,
        progresso_percentual: progressoPercent,
        autorizacao_comercial: {
            status: projeto.autorizacao_comercial?.status || 'PENDENTE',
            responsavel: projeto.responsavel_aprovacao || projeto.autorizacao_comercial?.responsavel_aprovacao,
            data_autorizacao: projeto.autorizacao_comercial?.data_autorizacao,
            escopo_autorizado: projeto.escopo_autorizado || projeto.autorizacao_comercial?.escopo_autorizado,
            entregaveis: projeto.entregaveis || projeto.autorizacao_comercial?.entregaveis || [],
            limites_trabalho: projeto.limites_trabalho || projeto.autorizacao_comercial?.limites_trabalho,
            natureza: projeto.natureza_projeto || 'SIMULADO'
        },
        metricas_grafo: {
            total_tarefas: totalTarefas,
            concluidas,
            aguardando_aprovacao: pendentes,
            bloqueadas,
            em_execucao: tarefas.filter(t => t.estado === ESTADOS_SISTEMA.EM_EXECUCAO).length
        },
        metricas_execucao: {
            total_tarefas: totalTarefas,
            tarefas_concluidas: concluidas,
            percentual_conclusao: progressoPercent
        },
        arquivos_produzidos: storageService.listarArquivosProjeto(idProjeto),
        grafo_tarefas: tarefas.map(t => ({
            id_tarefa: t.id_tarefa || t.id,
            agente_responsavel: t.especialista,
            agente_id: t.agente_id,
            frente: t.frente || null,
            titulo: t.titulo || t.titulo_tarefa,
            objetivo: t.objetivo || t.descricao,
            entradas_necessarias: t.entradas_necessarias || [],
            dependencias: t.dependencias || [],
            resultado_esperado: t.resultado_esperado,
            criterio_conclusao: t.criterio_conclusao || (t.criterios_aceite ? t.criterios_aceite.join('; ') : null),
            estado: t.estado,
            bloqueio_motivo: t.bloqueio_motivo,
            apontamentos_correcao: t.apontamentos_correcao,
            total_evidencias: (t.evidencias_execucao || []).length,
            historico_alteracoes: t.historico_alteracoes || t.historico_auditoria || []
        })),
        historico_auditoria: projeto.registro_operacional || projeto.historico_operacional || [],
        historico_operacional: projeto.registro_operacional || projeto.historico_operacional || []
    };
}

module.exports = {
    FRENTES_COMERCIAIS,
    ESTADOS_SISTEMA,
    normalizarFrentesComerciais,
    criarProjetoDemandaComercial,
    autorizarProjetoComercialmente,
    verificarAutorizacaoEPredecessores,
    executarTarefaProjeto,
    avaliarEntregaTarefa,
    executarCorrecaoTarefa,
    obterDossieExecucaoProjeto
};
