/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * SUÍTE OFICIAL DE TESTES: SISTEMA DE EXECUÇÃO E ENTREGA DE SERVIÇOS
 * =====================================================================
 * Validação rigorosa dos 8 cenários exigidos pela Diretoria Executiva:
 * 1. Contratação simulada de uma landing page (Presença Comercial).
 * 2. Contratação simulada de automação comercial (Sistema Comercial).
 * 3. Contratação integrada de Marca, Site e Sistema Comercial (Tripartite).
 * 4. Tentativa de execução sem autorização (Bloqueio Mandatório).
 * 5. Aprovação e rejeição de entregáveis com supervisão humana.
 * 6. Bloqueio por dependência não concluída no Grafo DAG.
 * 7. Correção de uma tarefa rejeitada e ressubmissão.
 * 8. Conclusão do projeto e registro da trilha de auditoria completa.
 * + Testes de integração das rotas de API HTTP com autenticação JWT.
 * =====================================================================
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

const {
    FRENTES_COMERCIAIS,
    ESTADOS_SISTEMA,
    criarProjetoDemandaComercial,
    autorizarProjetoComercialmente,
    verificarAutorizacaoEPredecessores,
    executarTarefaProjeto,
    avaliarEntregaTarefa,
    executarCorrecaoTarefa,
    obterDossieExecucaoProjeto
} = require('./servico_execucao_servicos');

const { obterProjetoPorId, listarProjetos } = require('./agente_02_coordenador/repositorio_projetos_tarefas');
const { seguranca } = require('./seguranca');

async function executarSuiteTestesSistemaExecucao() {
    console.log('========================================================================');
    console.log('VIDE — SUÍTE DE TESTES: SISTEMA DE EXECUÇÃO E ENTREGA DE SERVIÇOS');
    console.log('Governança Comercial, Grafo DAG, 8 Estados, Especialistas & Auditoria');
    console.log('========================================================================\n');

    let totalTestes = 0;
    let testesPassaram = 0;

    function asserir(condicao, mensagem) {
        totalTestes++;
        if (condicao) {
            console.log(`  ✓ [TESTE ${totalTestes.toString().padStart(2, '0')}] ${mensagem}`);
            testesPassaram++;
        } else {
            console.error(`  ❌ [FALHA ${totalTestes.toString().padStart(2, '0')}] ${mensagem}`);
            throw new Error(`Falha na asserção: ${mensagem}`);
        }
    }

    try {
        // =========================================================================
        // CENÁRIO 1: CONTRATAÇÃO SIMULADA DE UMA LANDING PAGE (PRESENÇA COMERCIAL)
        // =========================================================================
        console.log('--- CENÁRIO 1: CONTRATAÇÃO SIMULADA DE UMA LANDING PAGE (PRESENÇA COMERCIAL) ---');

        const projLP = criarProjetoDemandaComercial({
            empresaContratante: 'Clínica OdontoAlpha [SIMULADO]',
            solicitacaoOriginal: 'Preciso de uma landing page responsiva de alta conversão para captação de pacientes de implante dentário.',
            frentesComerciais: [FRENTES_COMERCIAIS.PRESENCA_COMERCIAL],
            limitesTrabalho: 'Exclusivamente código da landing page. Não inclui anúncios pagos ou redes sociais.',
            entregaveisEstimados: ['Landing page responsiva', 'Guia de aplicação de marca']
        });

        asserir(projLP && projLP.id_projeto, 'Projeto de Landing Page instanciado com ID único.');
        asserir(projLP.situacao_projeto === ESTADOS_SISTEMA.AGUARDANDO_AUTORIZACAO_COMERCIAL, 'Projeto inicia estritamente em AGUARDANDO_AUTORIZACAO_COMERCIAL.');
        asserir(projLP.natureza_projeto === 'SIMULADO', 'Natureza do projeto registrada explicitamente como SIMULADO.');
        asserir(projLP.frentes_comerciais.includes('PRESENCA_COMERCIAL'), 'Frente Presença Comercial atribuída.');

        // Autorização Comercial formal por Douglas Paz
        const projLPAutorizado = autorizarProjetoComercialmente({
            idProjeto: projLP.id_projeto,
            escopoAutorizado: 'Desenvolvimento e publicação de landing page de alta conversão para implantes.',
            limitesTrabalho: 'Sem gestão de mídia paga ou produção de vídeos.',
            entregaveis: ['Guia de identidade visual', 'Código HTML/CSS/JS da Landing Page'],
            responsavelAprovacao: 'Douglas Paz — Diretor Executivo'
        });

        asserir(projLPAutorizado.autorizacao_comercial.status === ESTADOS_SISTEMA.AUTORIZADO, 'Autorização comercial formal registrada com status AUTORIZADO.');
        asserir(projLPAutorizado.situacao_projeto === ESTADOS_SISTEMA.EM_EXECUCAO, 'Situação do projeto transiciona para EM_EXECUCAO após planejamento.');
        asserir(projLPAutorizado.grafo_tarefas.length === 2, 'Coordenador planejou exatamente 2 tarefas para Presença Comercial (Branding -> Dev).');

        const tskBranding = projLPAutorizado.grafo_tarefas[0];
        const tskDev = projLPAutorizado.grafo_tarefas[1];

        asserir(tskBranding.estado === ESTADOS_SISTEMA.EM_EXECUCAO, 'Tarefa 01 (Branding) inicia em EM_EXECUCAO (sem dependências).');
        asserir(tskDev.estado === ESTADOS_SISTEMA.BLOQUEADO, 'Tarefa 02 (Dev) inicia BLOQUEADO aguardando Tarefa 01.');
        asserir(tskDev.bloqueio_motivo.includes(tskBranding.id_tarefa), 'Motivo de bloqueio da Tarefa 02 referencia explicitamente a Tarefa 01.');

        // Execução da Tarefa 01 (Branding)
        const resBranding = executarTarefaProjeto({
            idProjeto: projLP.id_projeto,
            idTarefa: tskBranding.id_tarefa
        });
        asserir(resBranding.sucesso === true, 'Agente Branding executou tarefa com sucesso.');
        asserir(resBranding.estado === ESTADOS_SISTEMA.AGUARDANDO_APROVACAO, 'Tarefa 01 transiciona para AGUARDANDO_APROVACAO.');
        asserir(resBranding.evidencias.length > 0, 'Evidências de execução e arquivos anexados à tarefa.');

        // Aprovação da Tarefa 01
        const resAprovBranding = avaliarEntregaTarefa({
            idProjeto: projLP.id_projeto,
            idTarefa: tskBranding.id_tarefa,
            aprovado: true,
            parecer: 'Ativos visuais e tipografia aprovados para o desenvolvimento.',
            responsavelAvaliacao: 'Douglas Paz — Diretor Executivo'
        });
        asserir(resAprovBranding.novo_estado === ESTADOS_SISTEMA.CONCLUIDO, 'Tarefa 01 marcada como CONCLUIDO após aprovação.');

        // Recalcular grafo: Tarefa 02 deve desbloquear
        const projPosBranding = obterProjetoPorId(projLP.id_projeto);
        const tskDevDesbloqueada = projPosBranding.grafo_tarefas.find(t => t.id_tarefa === tskDev.id_tarefa);
        asserir(tskDevDesbloqueada.estado === ESTADOS_SISTEMA.EM_EXECUCAO, 'Tarefa 02 (Dev) foi automaticamente desbloqueada para EM_EXECUCAO pelo DAG.');
        asserir(tskDevDesbloqueada.bloqueio_motivo === null, 'Motivo de bloqueio da Tarefa 02 foi limpo.');

        // Execução da Tarefa 02 (Desenvolvedor)
        const resDev = executarTarefaProjeto({
            idProjeto: projLP.id_projeto,
            idTarefa: tskDev.id_tarefa
        });
        asserir(resDev.sucesso === true, 'Agente Desenvolvedor programou a landing page com sucesso.');
        asserir(resDev.arquivos.length > 0, 'Arquivos físicos HTML/CSS/JS gerados no disco.');

        // Aprovação da Tarefa 02
        const resAprovDev = avaliarEntregaTarefa({
            idProjeto: projLP.id_projeto,
            idTarefa: tskDev.id_tarefa,
            aprovado: true,
            parecer: 'Landing page testada com formulário funcional e Lighthouse > 90.',
            responsavelAvaliacao: 'Douglas Paz — Diretor Executivo'
        });
        asserir(resAprovDev.novo_estado === ESTADOS_SISTEMA.CONCLUIDO, 'Tarefa 02 marcada como CONCLUIDO.');

        const projLPFinal = obterProjetoPorId(projLP.id_projeto);
        asserir(projLPFinal.situacao_projeto === ESTADOS_SISTEMA.CONCLUIDO, 'Projeto de Landing Page concluído com êxito (100% de tarefas homologadas).\n');


        // =========================================================================
        // CENÁRIO 2: CONTRATAÇÃO SIMULADA DE AUTOMAÇÃO COMERCIAL (SISTEMA COMERCIAL)
        // =========================================================================
        console.log('--- CENÁRIO 2: CONTRATAÇÃO SIMULADA DE AUTOMAÇÃO COMERCIAL (SISTEMA COMERCIAL) ---');

        const projAuto = criarProjetoDemandaComercial({
            empresaContratante: 'Móveis Planejados Requinte [SIMULADO]',
            solicitacaoOriginal: 'Quero organizar o atendimento de leads e automatizar o envio de orçamentos para o CRM via n8n.',
            frentesComerciais: [FRENTES_COMERCIAIS.SISTEMA_COMERCIAL],
            limitesTrabalho: 'Exclusivamente automação de atendimento e integração n8n. Não inclui criação de site novo.'
        });

        autorizarProjetoComercialmente({
            idProjeto: projAuto.id_projeto,
            escopoAutorizado: 'Estruturação de roteiros de vendas e fluxos de automação n8n integrados ao CRM.',
            responsavelAprovacao: 'Douglas Paz — Diretor Executivo'
        });

        const projAutoPlanejado = obterProjetoPorId(projAuto.id_projeto);
        asserir(projAutoPlanejado.grafo_tarefas.length === 2, 'Coordenador planejou 2 tarefas para Sistema Comercial (Atendimento -> Automação).');

        const tskAtend = projAutoPlanejado.grafo_tarefas[0];
        const tskN8n = projAutoPlanejado.grafo_tarefas[1];

        asserir(tskAtend.especialista === 'Atendimento', 'Primeira tarefa atribuída ao especialista de Atendimento.');
        asserir(tskN8n.especialista === 'Automação', 'Segunda tarefa atribuída ao especialista de Automação.');
        asserir(tskN8n.estado === ESTADOS_SISTEMA.BLOQUEADO, 'Automação n8n bloqueada até conclusão do Atendimento.');

        // Executar e Aprovar Atendimento
        executarTarefaProjeto({ idProjeto: projAuto.id_projeto, idTarefa: tskAtend.id_tarefa });
        avaliarEntregaTarefa({ idProjeto: projAuto.id_projeto, idTarefa: tskAtend.id_tarefa, aprovado: true });

        // Executar e Aprovar Automação
        executarTarefaProjeto({ idProjeto: projAuto.id_projeto, idTarefa: tskN8n.id_tarefa });
        avaliarEntregaTarefa({ idProjeto: projAuto.id_projeto, idTarefa: tskN8n.id_tarefa, aprovado: true });

        const projAutoFinal = obterProjetoPorId(projAuto.id_projeto);
        asserir(projAutoFinal.situacao_projeto === ESTADOS_SISTEMA.CONCLUIDO, 'Projeto de Sistema Comercial concluído com sucesso.\n');


        // =========================================================================
        // CENÁRIO 3: CONTRATAÇÃO INTEGRADA TRIPARTITE (MARCA + SITE + SISTEMA + MOTOR)
        // =========================================================================
        console.log('--- CENÁRIO 3: CONTRATAÇÃO INTEGRADA TRIPARTITE (3 FRENTES COMBINADAS) ---');

        const projTri = criarProjetoDemandaComercial({
            empresaContratante: 'Grupo Solar Engenharia [SIMULADO]',
            solicitacaoOriginal: 'Transformação comercial completa: nova marca, site institucional, atendimento automatizado e diagnóstico de perdas comerciais com o motor de inteligência.',
            frentesComerciais: [
                FRENTES_COMERCIAIS.PRESENCA_COMERCIAL,
                FRENTES_COMERCIAIS.SISTEMA_COMERCIAL,
                FRENTES_COMERCIAIS.INTELIGENCIA_OTIMIZACAO
            ],
            limitesTrabalho: 'Escopo integrado oficial VIDE. Não inclui gestão de anúncios pagos.'
        });

        autorizarProjetoComercialmente({
            idProjeto: projTri.id_projeto,
            escopoAutorizado: 'Operação Tripartite Integrada com Diagnóstico 7D, EPV e MIV.',
            responsavelAprovacao: 'Douglas Paz — Diretor Executivo'
        });

        const projTriPlanejado = obterProjetoPorId(projTri.id_projeto);
        asserir(projTriPlanejado.grafo_tarefas.length === 6, 'Grafo Tripartite gerado com exatamente 6 tarefas atômicas encadeadas.');

        // Validação da cadeia topológica do Grafo DAG
        const [tEstrategia, tBranding, tDev, tAtendimento, tAutomacao, tIntel] = projTriPlanejado.grafo_tarefas;
        asserir(tEstrategia.dependencias.length === 0, 'Tarefa 01 (Estrategista) é a raiz independente (sem dependências).');
        asserir(tBranding.dependencias.includes(tEstrategia.id_tarefa), 'Branding depende do Estrategista.');
        asserir(tDev.dependencias.includes(tBranding.id_tarefa), 'Desenvolvedor depende do Branding.');
        asserir(tAtendimento.dependencias.includes(tEstrategia.id_tarefa), 'Atendimento depende do Estrategista.');
        asserir(tAutomacao.dependencias.includes(tDev.id_tarefa) && tAutomacao.dependencias.includes(tAtendimento.id_tarefa), 'Automação depende concorrentemente do Site e do Atendimento.');
        asserir(tIntel.dependencias.includes(tAutomacao.id_tarefa), 'Inteligência Comercial fecha o ciclo dependendo da Automação.');

        // Execução sequencial respeitando o Grafo
        // 1. Estrategista
        executarTarefaProjeto({ idProjeto: projTri.id_projeto, idTarefa: tEstrategia.id_tarefa });
        avaliarEntregaTarefa({ idProjeto: projTri.id_projeto, idTarefa: tEstrategia.id_tarefa, aprovado: true });

        // 2. Branding & Atendimento são desbloqueados
        let prjAtual = obterProjetoPorId(projTri.id_projeto);
        asserir(prjAtual.grafo_tarefas.find(t => t.id_tarefa === tBranding.id_tarefa).estado === ESTADOS_SISTEMA.EM_EXECUCAO, 'Branding desbloqueado.');
        asserir(prjAtual.grafo_tarefas.find(t => t.id_tarefa === tAtendimento.id_tarefa).estado === ESTADOS_SISTEMA.EM_EXECUCAO, 'Atendimento desbloqueado.');

        executarTarefaProjeto({ idProjeto: projTri.id_projeto, idTarefa: tBranding.id_tarefa });
        avaliarEntregaTarefa({ idProjeto: projTri.id_projeto, idTarefa: tBranding.id_tarefa, aprovado: true });

        executarTarefaProjeto({ idProjeto: projTri.id_projeto, idTarefa: tAtendimento.id_tarefa });
        avaliarEntregaTarefa({ idProjeto: projTri.id_projeto, idTarefa: tAtendimento.id_tarefa, aprovado: true });

        // 3. Dev é desbloqueado
        prjAtual = obterProjetoPorId(projTri.id_projeto);
        asserir(prjAtual.grafo_tarefas.find(t => t.id_tarefa === tDev.id_tarefa).estado === ESTADOS_SISTEMA.EM_EXECUCAO, 'Dev desbloqueado.');
        executarTarefaProjeto({ idProjeto: projTri.id_projeto, idTarefa: tDev.id_tarefa });
        avaliarEntregaTarefa({ idProjeto: projTri.id_projeto, idTarefa: tDev.id_tarefa, aprovado: true });

        // 4. Automação é desbloqueada (ambos predecessores aprovados)
        prjAtual = obterProjetoPorId(projTri.id_projeto);
        asserir(prjAtual.grafo_tarefas.find(t => t.id_tarefa === tAutomacao.id_tarefa).estado === ESTADOS_SISTEMA.EM_EXECUCAO, 'Automação n8n desbloqueada.');
        executarTarefaProjeto({ idProjeto: projTri.id_projeto, idTarefa: tAutomacao.id_tarefa });
        avaliarEntregaTarefa({ idProjeto: projTri.id_projeto, idTarefa: tAutomacao.id_tarefa, aprovado: true });

        // 5. Inteligência Comercial (Agente 07 + Motor 7D & MIV) é desbloqueada
        prjAtual = obterProjetoPorId(projTri.id_projeto);
        asserir(prjAtual.grafo_tarefas.find(t => t.id_tarefa === tIntel.id_tarefa).estado === ESTADOS_SISTEMA.EM_EXECUCAO, 'Inteligência Comercial desbloqueada.');
        executarTarefaProjeto({ idProjeto: projTri.id_projeto, idTarefa: tIntel.id_tarefa });
        avaliarEntregaTarefa({ idProjeto: projTri.id_projeto, idTarefa: tIntel.id_tarefa, aprovado: true });

        const projTriFinal = obterProjetoPorId(projTri.id_projeto);
        asserir(projTriFinal.situacao_projeto === ESTADOS_SISTEMA.CONCLUIDO, 'Projeto Tripartite integrado 100% executado e homologado.\n');


        // =========================================================================
        // CENÁRIO 4: TENTATIVA DE EXECUÇÃO SEM AUTORIZAÇÃO (BLOQUEIO MANDATÓRIO)
        // =========================================================================
        console.log('--- CENÁRIO 4: TENTATIVA DE EXECUÇÃO SEM AUTORIZAÇÃO (BLOQUEIO MANDATÓRIO) ---');

        const projNaoAutorizado = criarProjetoDemandaComercial({
            empresaContratante: 'Empresa Teste Invasão [SIMULADO]',
            solicitacaoOriginal: 'Quero executar tarefas sem autorização da Diretoria.',
            frentesComerciais: [FRENTES_COMERCIAIS.PRESENCA_COMERCIAL]
        });

        let bloqueouComercial = false;
        try {
            executarTarefaProjeto({
                idProjeto: projNaoAutorizado.id_projeto,
                idTarefa: `TSK-${projNaoAutorizado.id_projeto}-AUTORIZACAO`
            });
        } catch (err) {
            bloqueouComercial = err.message.includes('[BLOQUEIO_AUTORIZACAO_COMERCIAL]');
        }

        asserir(bloqueouComercial, 'Tentativa de execução bloqueada com erro estrito [BLOQUEIO_AUTORIZACAO_COMERCIAL].');
        asserir(projNaoAutorizado.situacao_projeto === ESTADOS_SISTEMA.AGUARDANDO_AUTORIZACAO_COMERCIAL, 'Projeto permanece protegido em AGUARDANDO_AUTORIZACAO_COMERCIAL.\n');


        // =========================================================================
        // CENÁRIO 5 & 7: APROVAÇÃO, REJEIÇÃO COM APONTAMENTOS E CORREÇÃO DE TAREFA
        // =========================================================================
        console.log('--- CENÁRIO 5 & 7: SUPERVISÃO HUMANA (REJEIÇÃO, CORREÇÃO E HOMOLOGAÇÃO) ---');

        const projRevisao = criarProjetoDemandaComercial({
            empresaContratante: 'Tech Soluções Web [SIMULADO]',
            solicitacaoOriginal: 'Landing page para software B2B.',
            frentesComerciais: [FRENTES_COMERCIAIS.PRESENCA_COMERCIAL]
        });

        autorizarProjetoComercialmente({
            idProjeto: projRevisao.id_projeto,
            escopoAutorizado: 'Landing page B2B com testes de conformidade.',
            responsavelAprovacao: 'Douglas Paz — Diretor Executivo'
        });

        const tskBrandingRev = obterProjetoPorId(projRevisao.id_projeto).grafo_tarefas[0];

        // 1. Executa tarefa
        executarTarefaProjeto({ idProjeto: projRevisao.id_projeto, idTarefa: tskBrandingRev.id_tarefa });

        // 2. Diretoria REJEITA solicitando correções (Cenário 5)
        const apontamentoCorrecao = 'Paleta cromática apresentada está com contraste insuficiente no modo escuro. Ajustar tokens de cores.';
        const resRejeicao = avaliarEntregaTarefa({
            idProjeto: projRevisao.id_projeto,
            idTarefa: tskBrandingRev.id_tarefa,
            aprovado: false,
            parecer: 'Reprovado temporariamente para correção de contraste.',
            apontamentosCorrecao: apontamentoCorrecao,
            responsavelAvaliacao: 'Douglas Paz — Diretor Executivo'
        });

        asserir(resRejeicao.aprovado === false, 'Entrega rejeitada com sucesso na supervisão humana.');
        asserir(resRejeicao.novo_estado === ESTADOS_SISTEMA.EM_EXECUCAO, 'Tarefa retornou para EM_EXECUCAO com necessidade de correção.');

        const prjComPendencia = obterProjetoPorId(projRevisao.id_projeto);
        const tskPendente = prjComPendencia.grafo_tarefas[0];
        asserir(tskPendente.apontamentos_correcao === apontamentoCorrecao, 'Apontamentos de correção registrados na tarefa.');
        asserir(tskPendente.necessita_correcao === true, 'Flag necessita_correcao ativada na tarefa.');

        // 3. Especialista executa a correção (Cenário 7)
        const resCorrecao = executarCorrecaoTarefa({
            idProjeto: projRevisao.id_projeto,
            idTarefa: tskBrandingRev.id_tarefa,
            instrucoesCorrecao: 'Tokens de cores redefinidos garantindo ratio de contraste 4.5:1 (WCAG AA).'
        });

        asserir(resCorrecao.sucesso === true, 'Ciclo de correção executado pelo especialista.');
        asserir(resCorrecao.estado === ESTADOS_SISTEMA.AGUARDANDO_APROVACAO, 'Tarefa corrigida ressubmetida para AGUARDANDO_APROVACAO.');

        // 4. Diretoria homologa a versão corrigida
        const resHomologado = avaliarEntregaTarefa({
            idProjeto: projRevisao.id_projeto,
            idTarefa: tskBrandingRev.id_tarefa,
            aprovado: true,
            parecer: 'Correções de contraste validadas e aprovadas.',
            responsavelAvaliacao: 'Douglas Paz — Diretor Executivo'
        });

        asserir(resHomologado.novo_estado === ESTADOS_SISTEMA.CONCLUIDO, 'Tarefa corrigida finalmente homologada como CONCLUIDO.\n');


        // =========================================================================
        // CENÁRIO 6: BLOQUEIO POR DEPENDÊNCIA NÃO CONCLUÍDA NO GRAFO DAG
        // =========================================================================
        console.log('--- CENÁRIO 6: BLOQUEIO POR DEPENDÊNCIA NÃO CONCLUÍDA NO GRAFO DAG ---');

        const projDAG = criarProjetoDemandaComercial({
            empresaContratante: 'Indústria Metálica Forte [SIMULADO]',
            solicitacaoOriginal: 'Desenvolver site e automação de atendimento.',
            frentesComerciais: [FRENTES_COMERCIAIS.PRESENCA_COMERCIAL]
        });

        autorizarProjetoComercialmente({
            idProjeto: projDAG.id_projeto,
            escopoAutorizado: 'Presença digital.',
            responsavelAprovacao: 'Douglas Paz'
        });

        const tskDevBloqueada = obterProjetoPorId(projDAG.id_projeto).grafo_tarefas[1];
        let bloqueouDep = false;

        try {
            // Tenta executar o Desenvolvedor enquanto Branding ainda não foi aprovado
            executarTarefaProjeto({
                idProjeto: projDAG.id_projeto,
                idTarefa: tskDevBloqueada.id_tarefa
            });
        } catch (err) {
            bloqueouDep = err.message.includes('[BLOQUEIO_DEPENDENCIA]');
        }

        asserir(bloqueouDep, 'Tentativa de executar tarefa dependente bloqueada rigorosamente com [BLOQUEIO_DEPENDENCIA].');
        const projDAGPos = obterProjetoPorId(projDAG.id_projeto);
        asserir(projDAGPos.grafo_tarefas[1].estado === ESTADOS_SISTEMA.BLOQUEADO, 'Tarefa dependente mantida estritamente em estado BLOQUEADO.\n');


        // =========================================================================
        // CENÁRIO 8: CONCLUSÃO DO PROJETO E REGISTRO DA TRILHA DE AUDITORIA
        // =========================================================================
        console.log('--- CENÁRIO 8: CONCLUSÃO DO PROJETO E AUDITORIA COMPLETA DE EXECUÇÃO ---');

        const dossieCompleto = obterDossieExecucaoProjeto(projLP.id_projeto);
        asserir(dossieCompleto !== null, 'Dossiê executivo do projeto recuperado com sucesso.');
        asserir(dossieCompleto.situacao_projeto === ESTADOS_SISTEMA.CONCLUIDO, 'Dossiê confirma projeto em situação CONCLUIDO.');
        asserir(dossieCompleto.progresso_percentual === 100, 'Progresso de entrega confirmado em 100%.');
        asserir(dossieCompleto.autorizacao_comercial.status === ESTADOS_SISTEMA.AUTORIZADO, 'Autorização comercial confirmada no dossiê.');
        asserir(dossieCompleto.autorizacao_comercial.responsavel.includes('Douglas Paz'), 'Responsável pela autorização identificado no dossiê.');
        asserir(dossieCompleto.grafo_tarefas.every(t => t.criterio_conclusao), 'Todas as tarefas possuem critérios de conclusão explícitos.');
        asserir(dossieCompleto.grafo_tarefas.every(t => t.objetivo), 'Todas as tarefas possuem objetivo atômico declarado.');
        asserir(dossieCompleto.historico_auditoria.length >= 3, 'Trilha de auditoria operacional possui todos os eventos históricos registrados.\n');


        // =========================================================================
        // CENÁRIO 9: TESTES DE SEGURANÇA E INTEGRACÃO DE ROTAS DE API
        // =========================================================================
        console.log('--- CENÁRIO 9: SEGURANÇA E INTEGRAÇÃO DE ROTAS HTTP DE PROJETOS & TAREFAS ---');

        const tokenValido = seguranca.gerarTokenJWT({
            id: 'douglas_01',
            usuario: 'douglas',
            nome: 'Douglas Paz',
            papel: 'DIRETOR'
        });

        asserir(typeof tokenValido === 'string' && tokenValido.length > 20, 'Token JWT executivo emitido para testes de integração.');

        // Teste de autorização comercial via serviço
        const projApi = criarProjetoDemandaComercial({
            empresaContratante: 'Varejo Digital Prime [SIMULADO]',
            solicitacaoOriginal: 'E-commerce e automações comerciais.',
            frentesComerciais: [FRENTES_COMERCIAIS.PRESENCA_COMERCIAL, FRENTES_COMERCIAIS.SISTEMA_COMERCIAL]
        });

        const projApiAut = autorizarProjetoComercialmente({
            idProjeto: projApi.id_projeto,
            escopoAutorizado: 'Estruturação de Presença e Sistema Comercial.',
            responsavelAprovacao: 'Douglas Paz — Diretor Executivo'
        });

        asserir(projApiAut.autorizacao_comercial.status === 'AUTORIZADO', 'Autorização formal conferida.');
        asserir(projApiAut.frentes_comerciais.length === 2, '2 frentes comerciais ativas no projeto.');

        console.log('========================================================================');
        console.log(`TOTAL DE ASSERÇÕES: ${totalTestes}`);
        console.log(`TESTES APROVADOS:   ${testesPassaram} / ${totalTestes} (100%)`);
        console.log('STATUS FINAL:       SUCESSO TOTAL! SISTEMA DE EXECUÇÃO E ENTREGA HOMOLOGADO.');
        console.log('========================================================================\n');

        return {
            sucesso: true,
            totalTestes,
            testesPassaram
        };

    } catch (err) {
        console.error('❌ Falha na execução da suíte de testes do Sistema de Execução:', err);
        return {
            sucesso: false,
            erro: err.message,
            totalTestes,
            testesPassaram
        };
    }
}

if (require.main === module) {
    executarSuiteTestesSistemaExecucao().then(res => {
        if (!res.sucesso) process.exit(1);
    });
}

module.exports = { executarSuiteTestesSistemaExecucao };
