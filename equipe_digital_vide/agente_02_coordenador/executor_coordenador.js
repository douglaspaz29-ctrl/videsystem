/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * AGENTE 02: COORDENADOR GERAL (EXECUTOR OPERACIONAL)
 * Implementação das 5 funções centrais do Coordenador Geral da VIDE
 * =====================================================================
 */

const crypto = require('crypto');
const {
    salvarProjeto,
    obterProjetoPorId,
    atualizarEstadoTarefa,
    registrarEvento
} = require('./repositorio_projetos_tarefas');
const { iaService } = require('../ia_service');
const { servicoWebhooksSaida } = require('../servico_webhooks_saida');

/**
 * 1. FUNÇÃO 1 & 2: Receber Registro da Triagem e Verificar Autorização Comercial
 * @param {Object} registroTriagem - Registro gerado pelo Agente 01
 * @param {Object} [opcoes] - Opções de autorização manual/comercial
 * @returns {Object} Projeto persistido e estruturado
 */
function receberRegistroTriagem(registroTriagem, opcoes = {}) {
    const anoAtual = new Date().getFullYear();
    const idProjeto = `PRJ-${anoAtual}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Determina o status de autorização comercial com base no registro de triagem
    let statusAutorizacao = 'PENDENTE';
    let servicosAutorizados = [];

    // Se a triagem informou explicitamente que nenhum serviço foi autorizado ou contratado:
    const textoAutorizados = (registroTriagem.servicosAutorizados || '').toLowerCase();
    const semAutorizacao = textoAutorizados.includes('nenhum serviço') || 
                           textoAutorizados.includes('não autorizado') ||
                           textoAutorizados.includes('sujeito a alinhamento de proposta') ||
                           opcoes.forcarPendente === true;

    if (semAutorizacao) {
        statusAutorizacao = 'PENDENTE';
        servicosAutorizados = [];
    } else {
        // Serviços autorizados para execução
        statusAutorizacao = 'AUTORIZADO';
        servicosAutorizados = [registroTriagem.servicosAutorizados];
    }

    const situacaoProjetoInicial = statusAutorizacao === 'AUTORIZADO' ? 'EM_EXECUCAO' : 'AGUARDANDO_AUTORIZACAO_COMERCIAL';

    const projeto = {
        id_projeto: idProjeto,
        id_demanda_origem: registroTriagem.idDemanda,
        cliente: registroTriagem.cenario || registroTriagem.cliente,
        solicitacao_original: registroTriagem.solicitacaoOriginal,
        situacao_projeto: situacaoProjetoInicial,
        autorizacao_comercial: {
            status: statusAutorizacao,
            servicos_autorizados: servicosAutorizados,
            data_autorizacao: statusAutorizacao === 'AUTORIZADO' ? new Date().toISOString() : null,
            observacao: statusAutorizacao === 'PENDENTE' 
                ? 'Nenhum especialista executor acionado. Demanda aguarda formalização e proposta comercial.'
                : 'Escopo contratado e liberado para planejamento operacional.'
        },
        cronograma: {
            prioridade: registroTriagem.prioridade,
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        },
        grafo_tarefas: [],
        registro_operacional: [
            {
                timestamp: new Date().toISOString(),
                evento: `Projeto [${idProjeto}] registrado pelo Coordenador Geral a partir da Demanda [${registroTriagem.idDemanda}].`,
                situacao: situacaoProjetoInicial
            }
        ]
    };

    // 2. FUNÇÃO 3 & 4: Se autorizado, gerar tarefas específicas e organizar grafo de dependências
    if (statusAutorizacao === 'AUTORIZADO') {
        projeto.grafo_tarefas = gerarPlanoTarefas(registroTriagem, idProjeto);
        organizarDependenciasIniciais(projeto);
    } else {
        // Bloqueio rigoroso: Não gerar tarefas executivas para trabalho não contratado!
        projeto.grafo_tarefas = [
            {
                id_tarefa: `TSK-${idProjeto}-COMERCIAL`,
                especialista: 'Estrategista / Gestão Comercial',
                id_especialista_responsavel: 'COMERCIAL',
                titulo: 'Apresentar Proposta de Diagnóstico Comercial ao Cliente',
                titulo_tarefa: 'Apresentar Proposta de Diagnóstico Comercial ao Cliente',
                descricao: 'Elaborar escopo de Diagnóstico Comercial / Motor de Objeções e apresentar proposta ao cliente. A equipe executora NÃO deve ser mobilizada antes do aceite comercial.',
                dependencias: [],
                criterios_aceite: [
                    'Proposta comercial de diagnóstico enviada ao cliente',
                    'Aceite formal do cliente registrado para liberação de execução'
                ],
                estado: 'BLOQUEADA_POR_AUTORIZACAO',
                estado_tarefa: 'BLOQUEADA_POR_AUTORIZACAO',
                historico_auditoria: [
                    {
                        timestamp: new Date().toISOString(),
                        autor: 'Coordenador Geral',
                        estado_anterior: null,
                        novo_estado: 'BLOQUEADA_POR_AUTORIZACAO',
                        nota: 'Tarefa bloqueada: cliente relatou sintoma mas ainda não autorizou contratação de serviço.'
                    }
                ]
            }
        ];
    }

    const salvo = salvarProjeto(projeto);
    salvo.sucesso = true;
    try {
        servicoWebhooksSaida.dispararEvento('lead_recebido', {
            id_projeto: idProjeto,
            id_demanda: registroTriagem.idDemanda,
            cliente: registroTriagem.cenario,
            situacao: situacaoProjetoInicial,
            prioridade: registroTriagem.prioridade
        });
    } catch (_) {}
    return salvo;
}

/**
 * 3. FUNÇÃO 3: Criar tarefas específicas com escopo atômico, insumos e critérios de aceite
 * @param {Object} registroTriagem 
 * @param {string} idProjeto 
 * @returns {Array<Object>} Lista de tarefas
 */
function gerarPlanoTarefas(registroTriagem, idProjeto) {
    const tarefas = [];
    const texto = registroTriagem.solicitacaoOriginal.toLowerCase();

    // =========================================================================
    // CENÁRIO: DESENVOLVIMENTO DE LANDING PAGE OU MARCA + LANDING PAGE / SITE
    // =========================================================================
    if ((texto.includes('landing page') || (texto.includes('marca') && texto.includes('site'))) && !texto.includes('atendimento') && !texto.includes('automatizar')) {
        // Tarefa 1 (Condicional): Validação de Ativos de Marca
        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-01`,
            especialista: 'Branding e Design',
            titulo: 'Validação e Adaptação dos Ativos de Identidade Visual',
            descricao: 'Verificar se o cliente possui logotipo vetorial, paleta cromática e tipografia definida. Se possuir, preparar pacote de ativos para o desenvolvedor. Se não possuir, criar guia visual mínimo.',
            dependencias: [],
            criterios_aceite: [
                'Logotipo em alta resolução/vetor disponibilizado',
                'Paleta de cores e tipografia de suporte especificadas',
                'Guia de aplicação visual aprovado pelo Coordenador Geral'
            ],
            estado: 'PRONTA_PARA_EXECUCAO',
            historico_auditoria: []
        });

        // Tarefa 2: Desenvolvimento da Landing Page (Depende de TSK-01)
        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-02`,
            especialista: 'Desenvolvedor',
            titulo: 'Construção, Programação e Publicação da Landing Page',
            descricao: 'Programar a landing page responsiva, ultrarrápida, orientada à conversão e com integração direta para o WhatsApp/Formulário do cliente conforme ativos de marca validados.',
            dependencias: [`TSK-${idProjeto}-01`],
            criterios_aceite: [
                'Código limpo sem dependências desnecessárias',
                'Pontuação de performance no Lighthouse acima de 90',
                'Responsividade perfeita em desktop, tablet e mobile',
                'Botões de ação e links testados e funcionais'
            ],
            estado: 'BLOQUEADA_POR_DEPENDENCIA',
            historico_auditoria: []
        });
    }

    // =========================================================================
    // CENÁRIO: TRANSFORMAÇÃO INTEGRADA (MARCA/BRANDING + SITE/LANDING + ATENDIMENTO + AUTOMAÇÃO)
    // =========================================================================
    else if (
        ((texto.includes('marca') || texto.includes('identidade visual') || texto.includes('branding')) && 
         (texto.includes('site') || texto.includes('landing page') || texto.includes('landing') || texto.includes('portal') || texto.includes('web')) && 
         (texto.includes('automatizar') || texto.includes('automação') || texto.includes('atendimento') || texto.includes('captação') || texto.includes('captacao'))) ||
        (registroTriagem.classificacao_demanda === 'TRIPARTITE') ||
        (registroTriagem.especialistasConfirmados && registroTriagem.especialistasConfirmados.includes('Desenvolvedor') && 
         (registroTriagem.especialistasConfirmados.includes('Branding e Design') || registroTriagem.especialistasConfirmados.includes('Atendimento')))
    ) {
        // Tarefa 1: Planejamento Estratégico e Escopo Integrado
        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-01`,
            especialista: 'Estrategista',
            titulo: 'Alinhamento Estratégico e Arquitetura do Escopo Tripartite',
            descricao: 'Definir o posicionamento da empresa, proposta de valor, jornada do cliente e cronograma de dependências para orientar Branding, Dev e Automação.',
            dependencias: [],
            criterios_aceite: [
                'Documento de direcionamento estratégico aprovado',
                'Mapa de requisitos da marca e do site formalizado'
            ],
            estado: 'PRONTA_PARA_EXECUCAO',
            historico_auditoria: []
        });

        // Tarefa 2: Rebranding / Identidade Visual (Depende de TSK-01)
        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-02`,
            especialista: 'Branding e Design',
            titulo: 'Desenvolvimento e Aprimoramento da Identidade Visual',
            descricao: 'Criar ou modernizar a identidade visual da marca: símbolo, logotipo, paleta de cores, tipografia e guia de aplicação da marca.',
            dependencias: [`TSK-${idProjeto}-01`],
            criterios_aceite: [
                'Manual de identidade visual consolidado em PDF',
                'Pacote de ativos gráficos exportado para a equipe de desenvolvimento'
            ],
            estado: 'BLOQUEADA_POR_DEPENDENCIA',
            historico_auditoria: []
        });

        // Tarefa 3: Desenvolvimento Web do Site (Depende de TSK-02)
        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-03`,
            especialista: 'Desenvolvedor',
            titulo: 'Construção e Implementação Técnica do Site Institucional',
            descricao: 'Programar o site institucional aplicando com rigor a nova identidade visual desenvolvida pelo Branding.',
            dependencias: [`TSK-${idProjeto}-02`],
            criterios_aceite: [
                'Interface desenvolvida seguindo os ativos de branding aprovados',
                'Performance, SEO básico e responsividade mobile homologados'
            ],
            estado: 'BLOQUEADA_POR_DEPENDENCIA',
            historico_auditoria: []
        });

        // Tarefa 4: Desenho dos Fluxos de Atendimento (Depende de TSK-01)
        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-04`,
            especialista: 'Atendimento',
            titulo: 'Estruturação das Regras e Roteiros de Atendimento',
            descricao: 'Desenhar as árvores de decisão, roteiros de resposta rápida, qualificação de leads e réguas de follow-up que serão automatizadas.',
            dependencias: [`TSK-${idProjeto}-01`],
            criterios_aceite: [
                'Roteiros de mensagens validados para cada etapa da conversa',
                'Critérios de triagem e passagem de bastão para humanos definidos'
            ],
            estado: 'BLOQUEADA_POR_DEPENDENCIA',
            historico_auditoria: []
        });

        // Tarefa 5: Implementação das Automações no n8n (Depende de TSK-03 e TSK-04)
        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-05`,
            especialista: 'Automação',
            titulo: 'Configuração dos Fluxos Técnicos de Automação e Integrações',
            descricao: 'Implementar os fluxos no n8n conectando os formulários do site e WhatsApp comercial ao CRM, acionando as réguas aprovadas pelo Atendimento.',
            dependencias: [`TSK-${idProjeto}-03`, `TSK-${idProjeto}-04`],
            criterios_aceite: [
                'Fluxo n8n testado com disparo de webhook em menos de 10 segundos',
                'Sincronização com o CRM e disparo de notificações validadas'
            ],
            estado: 'BLOQUEADA_POR_DEPENDENCIA',
            historico_auditoria: []
        });

        // Tarefa 6 (Se contratada): Inteligência Comercial e Retroalimentação (Depende de TSK-05)
        if (texto.includes('inteligência') || texto.includes('inteligencia') || texto.includes('dashboard') || texto.includes('diagnóstico') || texto.includes('diagnostico') || texto.includes('perdas') || texto.includes('transformação') || texto.includes('transformacao') || texto.includes('completa') || (registroTriagem.especialistasConfirmados && registroTriagem.especialistasConfirmados.includes('Inteligência Comercial'))) {
            tarefas.push({
                id_tarefa: `TSK-${idProjeto}-06`,
                especialista: 'Inteligência Comercial',
                titulo: 'Auditoria de Funil, Motor de Objeções e Plano de Retroalimentação',
                descricao: 'Auditar as conversas e leads persistidos no CRM, mapear vazamentos do funil, classificar as 4 categorias de objeção e formular recomendações retroalimentadoras.',
                dependencias: [`TSK-${idProjeto}-05`],
                criterios_aceite: [
                    'Cálculo de taxas de conversão e perdas do funil',
                    'Motor de Objeções estruturado com cálculo de receita em risco',
                    'Recomendações fundamentadas com separação de dados e hipóteses',
                    'Dashboard executivo em HTML gerado',
                    'Manifesto unificado de entrega'
                ],
                estado: 'BLOQUEADA_POR_DEPENDENCIA',
                historico_auditoria: []
            });
        }
    }

    // =========================================================================
    // CENÁRIO: DIAGNÓSTICO COMERCIAL E INTELIGÊNCIA DE VENDAS
    // =========================================================================
    else if ((registroTriagem.especialistasConfirmados && registroTriagem.especialistasConfirmados.includes('Inteligência Comercial')) ||
             ((texto.includes('diagnóstico') || texto.includes('diagnostico') || texto.includes('inteligência') || texto.includes('motor de objeções')) && !texto.includes('site') && !texto.includes('landing page'))) {
        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-01`,
            especialista: 'Inteligência Comercial',
            titulo: 'Auditoria de Funil, Diagnóstico de Perdas e Motor de Objeções',
            descricao: 'Auditar os registros comerciais, calcular taxas de retenção e evasão, mapear as 4 macro-categorias de objeções e formular recomendações retroalimentadoras fundamentadas em dados.',
            dependencias: [],
            criterios_aceite: [
                'Cálculo de taxas de conversão e perdas do funil',
                'Motor de Objeções estruturado com cálculo de receita em risco',
                'Recomendações fundamentadas com separação de dados e hipóteses',
                'Dashboard interativo em HTML gerado',
                'Manifesto unificado de entrega'
            ],
            estado: 'PRONTA_PARA_EXECUCAO',
            historico_auditoria: []
        });
    }

    // =========================================================================
    // CENÁRIO: ESTRUTURAÇÃO DE ATENDIMENTO E RECUPERAÇÃO DE VENDAS
    // =========================================================================
    else if ((texto.includes('atendimento') || texto.includes('roteiros de venda') || texto.includes('conversão') || texto.includes('vendas')) && !texto.includes('site') && !texto.includes('landing page')) {
        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-01`,
            especialista: 'Atendimento',
            titulo: 'Estruturação da Jornada, Roteiros de Qualificação e Recuperação de Objeções',
            descricao: 'Desenhar a árvore de decisão conversacional, roteiros de qualificação de leads, matriz das 4 macro-categorias de objeções e réguas de follow-up temporal.',
            dependencias: [],
            criterios_aceite: [
                'Jornada de atendimento mapeada de ponta a ponta com árvore de decisão',
                'Matriz de objeções contemplando preço, confiança, tempo e concorrente',
                'Régua de follow-up estruturada para recuperação de leads que pararam de responder',
                'Regras claras de transbordo para atendimento humano',
                'Especificação técnica clara para o futuro agente de automação',
                'Simulador interativo em HTML gerado e funcional'
            ],
            estado: 'PRONTA_PARA_EXECUCAO',
            historico_auditoria: []
        });

        if (texto.includes('automatizar') || texto.includes('automação') || texto.includes('n8n') || texto.includes('integra')) {
            tarefas.push({
                id_tarefa: `TSK-${idProjeto}-02`,
                especialista: 'Automação',
                titulo: 'Implementação dos Fluxos Técnicos no n8n e Réguas de Recuperação',
                descricao: 'Construir os workflows no n8n, configurar webhooks, persistência no CRM, lógica de deduplicação e interrupção automática de cadência em caso de resposta.',
                dependencias: [`TSK-${idProjeto}-01`],
                criterios_aceite: [
                    'Workflow n8n gerado e compatível com as regras do Agente 05',
                    'Mecanismo de deduplicação e controle de idempotência validado',
                    'Interrupção imediata de cadência programada ao receber resposta do cliente',
                    'Persistência e atualização de estados de leads no CRM',
                    'Tratamento de erros e monitoramento operacional disponível'
                ],
                estado: 'BLOQUEADA_POR_DEPENDENCIA',
                historico_auditoria: []
            });
        }
    }

    // Fallback Geral Integrado: Se nenhuma palavra-chave restringiu o escopo,
    // ativa a esteira integrada completa VIDE (Branding + Dev + Atendimento + Automação + Inteligência)
    if (tarefas.length === 0) {
        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-01`,
            especialista: 'Estrategista',
            titulo: 'Alinhamento Estratégico e Arquitetura do Escopo Tripartite',
            descricao: 'Definir o posicionamento da empresa, proposta de valor, jornada do cliente e cronograma de dependências para orientar Branding, Dev e Automação.',
            dependencias: [],
            criterios_aceite: [
                'Documento de direcionamento estratégico aprovado',
                'Mapa de requisitos da marca e do site formalizado'
            ],
            estado: 'PRONTA_PARA_EXECUCAO',
            historico_auditoria: []
        });

        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-02`,
            especialista: 'Branding e Design',
            titulo: 'Design System, Identidade Visual e Ativos Gráficos',
            descricao: 'Criar os design tokens, paleta cromática, tipografia, logotipo vetorial SVG e guidelines para a presença digital.',
            dependencias: [`TSK-${idProjeto}-01`],
            criterios_aceite: [
                'Design tokens estruturados em JSON',
                'Logotipo vetorial SVG entregue',
                'Guia de aplicação visual aprovado'
            ],
            estado: 'BLOQUEADA_POR_DEPENDENCIA',
            historico_auditoria: []
        });

        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-03`,
            especialista: 'Desenvolvedor',
            titulo: 'Construção, Programação e Publicação da Landing Page',
            descricao: 'Programar a landing page responsiva, ultrarrápida, orientada à conversão e com integração direta para o WhatsApp/Formulário.',
            dependencias: [`TSK-${idProjeto}-02`],
            criterios_aceite: [
                'Código limpo sem dependências desnecessárias',
                'Pontuação de performance no Lighthouse acima de 90',
                'Responsividade perfeita em desktop, tablet e mobile'
            ],
            estado: 'BLOQUEADA_POR_DEPENDENCIA',
            historico_auditoria: []
        });

        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-04`,
            especialista: 'Atendimento',
            titulo: 'Estruturação das Regras e Roteiros de Atendimento',
            descricao: 'Desenhar as árvores de decisão, roteiros de resposta rápida, qualificação de leads e réguas de follow-up que serão automatizadas.',
            dependencias: [`TSK-${idProjeto}-01`],
            criterios_aceite: [
                'Roteiros de mensagens validados para cada etapa da conversa',
                'Critérios de triagem e passagem de bastão para humanos definidos'
            ],
            estado: 'BLOQUEADA_POR_DEPENDENCIA',
            historico_auditoria: []
        });

        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-05`,
            especialista: 'Automação',
            titulo: 'Configuração dos Fluxos Técnicos de Automação e Integrações',
            descricao: 'Implementar os fluxos no n8n conectando os formulários do site e WhatsApp comercial ao CRM, acionando as réguas aprovadas pelo Atendimento.',
            dependencias: [`TSK-${idProjeto}-03`, `TSK-${idProjeto}-04`],
            criterios_aceite: [
                'Fluxo n8n testado com disparo de webhook em menos de 10 segundos',
                'Sincronização com o CRM e disparo de notificações validadas'
            ],
            estado: 'BLOQUEADA_POR_DEPENDENCIA',
            historico_auditoria: []
        });

        tarefas.push({
            id_tarefa: `TSK-${idProjeto}-06`,
            especialista: 'Inteligência Comercial',
            titulo: 'Auditoria de Funil, Motor de Objeções e Plano de Retroalimentação',
            descricao: 'Auditar as conversas e leads persistidos no CRM, mapear vazamentos do funil, classificar as 4 categorias de objeção e formular recomendações retroalimentadoras.',
            dependencias: [`TSK-${idProjeto}-05`],
            criterios_aceite: [
                'Cálculo de taxas de conversão e perdas do funil',
                'Motor de Objeções estruturado com cálculo de receita em risco',
                'Dashboard executivo em HTML gerado',
                'Manifesto unificado de entrega'
            ],
            estado: 'BLOQUEADA_POR_DEPENDENCIA',
            historico_auditoria: []
        });
    }

    // Normalização canônica para compatibilidade bidirecional com todas as suítes de teste e telemetria
    tarefas.forEach(t => {
        t.estado_tarefa = t.estado;
        t.titulo_tarefa = t.titulo;
        if (!t.id_especialista_responsavel) {
            const esp = (t.especialista || '').toLowerCase();
            if (esp.includes('branding')) t.id_especialista_responsavel = 'BRANDING';
            else if (esp.includes('desenvolv')) t.id_especialista_responsavel = 'DESENVOLVEDOR';
            else if (esp.includes('atend')) t.id_especialista_responsavel = 'ATENDIMENTO';
            else if (esp.includes('auto')) t.id_especialista_responsavel = 'AUTOMACAO';
            else if (esp.includes('intel')) t.id_especialista_responsavel = 'INTELIGENCIA';
            else if (esp.includes('comercial')) t.id_especialista_responsavel = 'COMERCIAL';
            else t.id_especialista_responsavel = 'ESTRATEGISTA';
        }
    });

    return tarefas;
}

/**
 * 4. FUNÇÃO 4: Organizar dependências iniciais e liberar tarefas independentes
 * @param {Object} projeto 
 */
function organizarDependenciasIniciais(projeto) {
    if (!projeto.grafo_tarefas) return;

    projeto.grafo_tarefas.forEach(tarefa => {
        if (!tarefa.dependencias || tarefa.dependencias.length === 0) {
            tarefa.estado = 'PRONTA_PARA_EXECUCAO';
            tarefa.estado_tarefa = 'PRONTA_PARA_EXECUCAO';
            tarefa.historico_auditoria.push({
                timestamp: new Date().toISOString(),
                autor: 'Coordenador Geral',
                estado_anterior: null,
                novo_estado: 'PRONTA_PARA_EXECUCAO',
                nota: 'Tarefa independente. Liberada para execução imediata do especialista.'
            });
        } else {
            tarefa.estado = 'BLOQUEADA_POR_DEPENDENCIA';
            tarefa.estado_tarefa = 'BLOQUEADA_POR_DEPENDENCIA';
            tarefa.historico_auditoria.push({
                timestamp: new Date().toISOString(),
                autor: 'Coordenador Geral',
                estado_anterior: null,
                novo_estado: 'BLOQUEADA_POR_DEPENDENCIA',
                nota: `Aguardando conclusão e aprovação de: ${tarefa.dependencias.join(', ')}`
            });
        }
    });
}

/**
 * 5. FUNÇÃO 5: Conferir Entregas dos Especialistas e Identificar Pendências
 * @param {Object} params
 * @param {string} params.idProjeto
 * @param {string} params.idTarefa
 * @param {Object} params.entregaSubmetida
 * @param {boolean} params.criteriosAtendidos
 * @param {string} params.parecerCoordenador
 * @returns {Object} Projeto com tarefa auditada
 */
function conferirEntrega(param1, param2, param3, param4, param5) {
    let idProjeto, idTarefa, entregaSubmetida, criteriosAtendidos, parecerCoordenador;
    if (typeof param1 === 'object' && param1 !== null) {
        idProjeto = param1.idProjeto || param1.id_projeto;
        idTarefa = param1.idTarefa || param1.id_tarefa;
        entregaSubmetida = param1.entregaSubmetida || param1.entrega || param1.dadosEntrega;
        criteriosAtendidos = param1.criteriosAtendidos !== undefined ? param1.criteriosAtendidos : true;
        parecerCoordenador = param1.parecerCoordenador || param1.parecer || 'Entrega homologada com sucesso pelo Coordenador Geral.';
    } else {
        idProjeto = param1;
        idTarefa = param2;
        entregaSubmetida = param3;
        criteriosAtendidos = param4 !== undefined ? param4 : true;
        parecerCoordenador = param5 || 'Entrega homologada com sucesso pelo Coordenador Geral.';
    }

    const projeto = obterProjetoPorId(idProjeto);
    if (!projeto) throw new Error(`Projeto ${idProjeto} não encontrado.`);

    const tarefa = projeto.grafo_tarefas.find(t => t.id_tarefa === idTarefa);
    if (!tarefa) throw new Error(`Tarefa ${idTarefa} não encontrada.`);

    tarefa.entrega = {
        data_submissao: new Date().toISOString(),
        conteudo: entregaSubmetida,
        origem_inteligencia: iaService.obterStatusProvedor()
    };

    const novoEstado = criteriosAtendidos ? 'APROVADA' : 'PENDENCIA_IDENTIFICADA';
    const prefixo = criteriosAtendidos ? '[APROVADO PELO COORDENADOR]' : '[PENDÊNCIA IDENTIFICADA]';

    const projAtualizado = atualizarEstadoTarefa({
        idProjeto,
        idTarefa,
        novoEstado,
        notaAuditoria: `${prefixo} ${parecerCoordenador}`,
        autor: 'Coordenador Geral'
    });

    try {
        servicoWebhooksSaida.dispararEvento('tarefa_concluida', {
            id_projeto: idProjeto,
            id_tarefa: idTarefa,
            especialista: tarefa.especialista || tarefa.id_especialista_responsavel,
            titulo: tarefa.titulo || tarefa.titulo_tarefa,
            novo_estado: novoEstado,
            criterios_atendidos: criteriosAtendidos
        });
    } catch (_) {}

    projAtualizado.sucesso = true;
    projAtualizado.estado_final = novoEstado;
    projAtualizado.parecer = parecerCoordenador;
    return projAtualizado;
}

/**
 * 6. FUNÇÃO 6: Autorizar Projeto Comercialmente (Disparado pela Gestão / Diretora)
 * Desbloqueia o projeto e gera imediatamente o grafo de tarefas executivas para os especialistas
 * @param {string} idProjeto 
 * @param {string} [servicoAutorizadoNome] 
 * @param {string} [obs]
 * @returns {Object} Projeto atualizado e pronto para execução
 */
function autorizarProjetoComercialmente(idProjeto, servicoAutorizadoNome = 'Diagnóstico Comercial & Estruturação de Atendimento', obs = '') {
    const projeto = obterProjetoPorId(idProjeto);
    if (!projeto) throw new Error(`Projeto ${idProjeto} não encontrado.`);

    const nomeServico = typeof servicoAutorizadoNome === 'string' ? servicoAutorizadoNome : 'Escopo Comercial Homologado';
    const autorizadoPor = nomeServico.includes('DOUGLAS') ? nomeServico : 'Diretoria VIDE';

    projeto.autorizacao_comercial.status = 'AUTORIZADO';
    projeto.autorizacao_comercial.servicos_autorizados = [nomeServico];
    projeto.autorizacao_comercial.data_autorizacao = new Date().toISOString();
    projeto.autorizacao_comercial.autorizado_por = autorizadoPor;
    projeto.autorizacao_comercial.observacao = obs || 'Autorização comercial concedida pela Diretoria VIDE. Tarefas executivas liberadas.';
    projeto.situacao_projeto = 'EM_EXECUCAO';

    // Gera tarefas especializadas para a demanda
    const registroSimulado = {
        solicitacaoOriginal: projeto.solicitacao_original,
        servicosAutorizados: servicoAutorizadoNome
    };

    // Se a demanda era sobre vendas/Instagram, gera o plano do Motor de Objeções + Atendimento
    if (projeto.solicitacao_original.toLowerCase().includes('instagram') || projeto.solicitacao_original.toLowerCase().includes('vendas')) {
        projeto.grafo_tarefas = [
            {
                id_tarefa: `TSK-${idProjeto}-01`,
                especialista: 'Estrategista',
                titulo: 'Diagnóstico da Jornada e Ponto de Fuga no Instagram/WhatsApp',
                descricao: 'Mapear a jornada completa dos leads atraídos pelo Instagram até o momento do silêncio ou desistência no WhatsApp.',
                dependencias: [],
                criterios_aceite: [
                    'Mapeamento dos pontos de atrito entregue em relatório',
                    'Alinhamento dos gargalos prioritários com a gestão'
                ],
                estado: 'PRONTA_PARA_EXECUCAO',
                historico_auditoria: [
                    {
                        timestamp: new Date().toISOString(),
                        autor: 'Coordenador Geral',
                        novo_estado: 'PRONTA_PARA_EXECUCAO',
                        nota: 'Projeto autorizado comercialmente. Tarefa liberada para o Estrategista.'
                    }
                ]
            },
            {
                id_tarefa: `TSK-${idProjeto}-02`,
                especialista: 'Inteligência Comercial',
                titulo: 'Auditoria de Conversas e Mapeamento de Objeções (Motor de Objeções)',
                descricao: 'Auditar o histórico de conversas reais para categorizar as objeções recorrentes (Preço, Concorrente, Indecisão) e calcular as perdas financeiras.',
                dependencias: [`TSK-${idProjeto}-01`],
                criterios_aceite: [
                    'Classificação de pelo menos 10 conversas reais do cliente',
                    'Identificação da causa raiz do silêncio dos leads'
                ],
                estado: 'BLOQUEADA_POR_DEPENDENCIA',
                historico_auditoria: []
            },
            {
                id_tarefa: `TSK-${idProjeto}-03`,
                especialista: 'Atendimento',
                titulo: 'Reestruturação dos Roteiros de Vendas e Réguas de Follow-up',
                descricao: 'Criar os novos scripts de resposta rápida, ancoragem de autoridade antes do preço e réguas de 24h e 72h para recuperação de leads frios.',
                dependencias: [`TSK-${idProjeto}-02`],
                criterios_aceite: [
                    'Scripts validados e formatados para cópia rápida no WhatsApp',
                    'Régua de acompanhamento em 24h e 72h configurada'
                ],
                estado: 'BLOQUEADA_POR_DEPENDENCIA',
                historico_auditoria: []
            }
        ];
    } else {
        projeto.grafo_tarefas = gerarPlanoTarefas(registroSimulado, idProjeto);
        organizarDependenciasIniciais(projeto);
    }

    if (!projeto.registro_operacional) {
        projeto.registro_operacional = [];
    }
    projeto.registro_operacional.push({
        timestamp: new Date().toISOString(),
        evento: 'Projeto autorizado comercialmente pela Diretoria. Grafo de tarefas ativado.',
        detalhes: {
            autor: 'Diretoria VIDE',
            total_tarefas: projeto.grafo_tarefas.length
        }
    });
    projeto.historico_operacional = projeto.registro_operacional;

    const salvo = salvarProjeto(projeto);
    salvo.sucesso = true;
    try {
        servicoWebhooksSaida.dispararEvento('projeto_autorizado', {
            id_projeto: idProjeto,
            autorizado_por: autorizadoPor,
            servico: nomeServico,
            total_tarefas: projeto.grafo_tarefas.length
        });
    } catch (_) {}
    return salvo;
}

/**
 * 7. FUNÇÃO 7: Interpretador de Comandos em Linguagem Natural da Diretora (Natalia)
 * Permite que a fundadora converse com o Coordenador no Console de Gestão
 * @param {string} comandoTexto 
 * @returns {Object} Resposta estruturada do Coordenador Geral com ações executadas
 */
function interpretarComandoDiretora(comandoTexto) {
    const { listarProjetos } = require('./repositorio_projetos_tarefas');
    const cmd = comandoTexto.toLowerCase().trim();
    const todosProjetos = listarProjetos();

    // 1. "Quais projetos estão em andamento?"
    if (cmd.includes('andamento') || cmd.includes('ativos') || cmd.includes('quais projetos')) {
        const emAndamento = todosProjetos
            .map(p => obterProjetoPorId(p.id_projeto))
            .filter(p => p && p.situacao_projeto === 'EM_EXECUCAO');

        if (emAndamento.length === 0) {
            return {
                sucesso: true,
                resposta: 'No momento não há projetos com execução técnica ativa. Há projetos aguardando autorização comercial ou homologação.',
                dados: []
            };
        }

        let resumo = `Atualmente temos **${emAndamento.length} projeto(s) em andamento** na esteira de produção:\n\n`;
        emAndamento.forEach(p => {
            const prontas = (p.grafo_tarefas || []).filter(t => t.estado === 'PRONTA_PARA_EXECUCAO').length;
            const bloqueadas = (p.grafo_tarefas || []).filter(t => t.estado === 'BLOQUEADA_POR_DEPENDENCIA').length;
            const aprovadas = (p.grafo_tarefas || []).filter(t => t.estado === 'APROVADA').length;
            resumo += `• **[${p.id_projeto}] ${p.cliente}**\n`;
            resumo += `  - Solicitação: "${p.solicitacao_original}"\n`;
            resumo += `  - Tarefas: ${p.grafo_tarefas ? p.grafo_tarefas.length : 0} | Prontas para Execução: ${prontas} | Bloqueadas: ${bloqueadas} | Aprovadas: ${aprovadas}\n\n`;
        });

        return {
            sucesso: true,
            resposta: resumo,
            dados: emAndamento
        };
    }

    // 2. "O que está pendente de aprovação?"
    if (cmd.includes('pendente') || cmd.includes('pendência') || cmd.includes('pendencias') || cmd.includes('aprovação')) {
        const pendentesComerciais = todosProjetos
            .map(p => obterProjetoPorId(p.id_projeto))
            .filter(p => p && p.situacao_projeto === 'AGUARDANDO_AUTORIZACAO_COMERCIAL');

        const tarefasComPendencia = [];
        todosProjetos.forEach(pRef => {
            const p = obterProjetoPorId(pRef.id_projeto);
            if (p && p.grafo_tarefas) {
                p.grafo_tarefas.forEach(t => {
                    if (t.estado === 'PENDENCIA_IDENTIFICADA' || t.estado === 'AGUARDANDO_REVISAO_COORDENADOR') {
                        tarefasComPendencia.push({ projeto: p.id_projeto, cliente: p.cliente, tarefa: t });
                    }
                });
            }
        });

        let resposta = `**Relatório de Pendências da Operação:**\n\n`;
        resposta += `1. **Projetos Aguardando Autorização Comercial da Diretoria:** ${pendentesComerciais.length}\n`;
        pendentesComerciais.forEach(p => {
            resposta += `   - [${p.id_projeto}] ${p.cliente}: "${p.solicitacao_original}"\n`;
        });

        resposta += `\n2. **Tarefas Técnicas com Pendência de Correção:** ${tarefasComPendencia.length}\n`;
        tarefasComPendencia.forEach(item => {
            resposta += `   - [${item.tarefa.id_tarefa}] em ${item.projeto} (${item.tarefa.especialista}): ${item.tarefa.titulo}\n`;
        });

        if (pendentesComerciais.length === 0 && tarefasComPendencia.length === 0) {
            resposta = 'Não há pendências críticas no momento. Todas as autorizações e tarefas estão em dia.';
        }

        return {
            sucesso: true,
            resposta,
            dados: { pendentesComerciais, tarefasComPendencia }
        };
    }

    // 3. "Inicie as tarefas autorizadas do projeto [ID]", "Aprovar projeto [ID]" ou "Executar esteira [ID]"
    const matchAprovar = cmd.match(/(?:inicie|aprovar|autorizar|liberar|executar|rodar|esteira)\s+(?:as\s+tarefas\s+)?(?:a\s+esteira\s+)?(?:do\s+)?(?:projeto\s+)?(prj-[\w-]+)/i);
    if (matchAprovar) {
        const idAlvo = matchAprovar[1].toUpperCase();
        try {
            const projetoAtualizado = autorizarProjetoComercialmente(idAlvo);
            return {
                sucesso: true,
                resposta: `✅ **Projeto [${idAlvo}] autorizado com sucesso pela Diretoria!**\n\nO Coordenador Geral ativou o grafo operacional com **${projetoAtualizado.grafo_tarefas.length} tarefas especializadas**. A equipe executora foi formalmente mobilizada e as tarefas independentes já estão com status **PRONTA_PARA_EXECUCAO**.`,
                dados: projetoAtualizado,
                idProjetoParaExecucao: idAlvo
            };
        } catch (e) {
            return {
                sucesso: false,
                resposta: `Erro ao autorizar projeto [${idAlvo}]: ${e.message}`,
                erro: e.message
            };
        }
    }

    // 3.1 "Demanda: <texto>" ou "Lead: <texto>" — Ingestão via console
    const matchDemanda = cmd.match(/^(?:demanda|lead|triagem|novo|nova\s+demanda)[:\s]+(.+)/i);
    if (matchDemanda) {
        try {
            const { processarTriagemRevisada } = require('../agente_01_triagem/executor_triagem');
            const registroTriagem = processarTriagemRevisada({
                solicitacaoOriginal: matchDemanda[1],
                identificadorCenario: 'Diretoria Executiva (Cockpit)',
                prazoUrgenciaInformado: 'Alinhado pela Diretoria'
            });
            const novoProjeto = receberRegistroTriagem(registroTriagem);
            return {
                sucesso: true,
                resposta: `📥 **Demanda acolhida e classificada com sucesso pela Triagem Comercial (Agente 01)!**\n\n` +
                    `• **ID da Demanda:** ${registroTriagem.idDemanda}\n` +
                    `• **Classificação:** ${registroTriagem.servicoSolicitado}\n` +
                    `• **Projeto Criado:** [${novoProjeto.id_projeto}]\n` +
                    `• **Situação:** ${novoProjeto.situacao_projeto} *(Bloqueio comercial estrito mantido até autorização)*\n\n` +
                    `Para autorizar e disparar os especialistas autonomamente, digite: **aprovar ${novoProjeto.id_projeto}**`,
                dados: { triagem: registroTriagem, projeto: novoProjeto },
                novoProjetoId: novoProjeto.id_projeto
            };
        } catch (eDemanda) {
            return {
                sucesso: false,
                resposta: `Erro ao processar demanda: ${eDemanda.message}`,
                erro: eDemanda.message
            };
        }
    }

    // 4. "Apresente um relatório de todos os projetos" ou "Relatório geral"
    if (cmd.includes('relatório') || cmd.includes('relatorio') || cmd.includes('resumo geral') || cmd.includes('todos os projetos')) {
        let totalTarefas = 0;
        let totalAutorizados = 0;
        let totalPendentes = 0;

        todosProjetos.forEach(pRef => {
            const p = obterProjetoPorId(pRef.id_projeto);
            if (p) {
                totalTarefas += (p.grafo_tarefas || []).length;
                if (p.autorizacao_comercial && p.autorizacao_comercial.status === 'AUTORIZADO') totalAutorizados++;
                else totalPendentes++;
            }
        });

        const relatorio = `📊 **Relatório Executivo da Operação Digital VIDE:**\n\n` +
            `• **Total de Projetos Registrados:** ${todosProjetos.length}\n` +
            `• **Projetos em Execução Autorizada:** ${totalAutorizados}\n` +
            `• **Projetos em Fase Comercial / Aguardando:** ${totalPendentes}\n` +
            `• **Volume Total de Tarefas no Grafo:** ${totalTarefas}\n` +
            `• **Status do Coordenador Geral:** Operacional // Monitoramento Ativo em Tempo Real.`;

        return {
            sucesso: true,
            resposta: relatorio,
            dados: todosProjetos
        };
    }

    // Resposta padrão caso o comando não seja reconhecido
    return {
        sucesso: true,
        resposta: `Comando recebido: "${comandoTexto}".\n\nVocê pode me instruir a qualquer momento com comandos como:\n` +
            `• *"Quais projetos estão em andamento?"*\n` +
            `• *"O que está pendente de aprovação?"*\n` +
            `• *"Inicie as tarefas autorizadas do projeto [ID]"*\n` +
            `• *"Apresente um relatório de todos os projetos"*`
    };
}

module.exports = {
    receberRegistroTriagem,
    gerarPlanoTarefas,
    organizarDependenciasIniciais,
    conferirEntrega,
    autorizarProjetoComercialmente,
    interpretarComandoDiretora
};
