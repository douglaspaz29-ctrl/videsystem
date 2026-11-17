/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * SIMULAÇÃO OPERACIONAL COMPLETA: PRIMEIRO PROJETO (SIMULADO)
 * 
 * Verificação de Prontidão Operacional de Ponta a Ponta:
 * 1. Entrada de Solicitação (Inbound / Webhook)
 * 2. Triagem e Qualificação (Agente 01)
 * 3. Diagnóstico e Estruturação Comercial (Agente 02 + Agente 07)
 * 4. Estruturação do Escopo e Entregáveis
 * 5. Bloqueio Mandatório sem Autorização Comercial
 * 6. Registro da Autorização Comercial Formal (Diretoria Executiva)
 * 7. Planejamento e Decomposição no Grafo DAG de Dependências
 * 8. Execução Especializada (Branding & Atendimento)
 * 9. Inspeção de Entregáveis e Ciclo de Correção Humana (Conferência)
 * 10. Desbloqueio Automático de Dependência pelo Grafo DAG (Desenvolvedor)
 * 11. Execução do Desenvolvedor e Homologação Final
 * 12. Conclusão Automática do Projeto e Dossiê Consolidado
 * 
 * Governança: Douglas Paz (Diretor Executivo da VIDE)
 * Natureza do Cenário: SIMULADO
 * =====================================================================
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { executarFluxoTriagemParaCoordenador } = require('./conexao_triagem_coordenador');
const {
    criarProjetoDemandaComercial,
    autorizarProjetoComercialmente,
    executarTarefaProjeto,
    avaliarEntregaTarefa,
    executarCorrecaoTarefa,
    obterDossieExecucaoProjeto
} = require('./servico_execucao_servicos');

const {
    obterProjetoPorId,
    salvarProjeto,
    listarProjetos
} = require('./agente_02_coordenador/repositorio_projetos_tarefas');

const { storageService } = require('./storage_service');

function executarSimulacaoOperacionalPrimeiroProjeto() {
    console.log('================================================================================');
    console.log('VIDE — SIMULAÇÃO OPERACIONAL COMPLETA: VERIFICAÇÃO DE PRONTIDÃO (1º PROJETO)');
    console.log('================================================================================\n');

    let passosValidados = 0;
    const registrarPasso = (rotulo) => {
        passosValidados++;
        console.log(`  [OK] Passo ${passosValidados.toString().padStart(2, '0')}: ${rotulo}`);
    };

    // -------------------------------------------------------------------------
    // ETAPA 1: ENTRADA DA SOLICITAÇÃO E TRIAGEM (AGENTE 01)
    // -------------------------------------------------------------------------
    console.log('--- 1. ENTRADA DA SOLICITAÇÃO & TRIAGEM (AGENTE 01) ---');
    
    const solicitacaoInbound = 'Quero criar ou aprimorar a marca da minha clínica odontológica e desenvolver uma landing page moderna para atrair pacientes particulares de implantes e alinhadores transparentes.';
    const clienteSimulado = 'Clínica OdontoPrime & Estética Orofacial (SIMULADO)';

    const resultadoTriagem = executarFluxoTriagemParaCoordenador({
        solicitacaoOriginal: solicitacaoInbound,
        identificadorCenario: clienteSimulado,
        prazoUrgenciaInformado: '30 dias úteis',
        opcoes: { forcarPendente: true }
    });

    assert.ok(resultadoTriagem.sucesso);
    assert.ok(resultadoTriagem.triagem.id_demanda.startsWith('DEM-'));
    assert.strictEqual(resultadoTriagem.triagem.cenario, clienteSimulado);
    assert.ok(resultadoTriagem.triagem.especialistasConfirmados.includes('Desenvolvedor') || resultadoTriagem.triagem.especialistasConfirmados.includes('Branding e Design'));
    assert.ok(resultadoTriagem.projeto.id_projeto.startsWith('PRJ-'));
    registrarPasso(`Demanda [${resultadoTriagem.triagem.id_demanda}] recebida e triada pelo Agente 01 com encaminhamento ao Coordenador`);

    const idProjeto = resultadoTriagem.projeto.id_projeto;

    // -------------------------------------------------------------------------
    // ETAPA 2: ESTRUTURAÇÃO INICIAL E ESTADO DE ESPERA COMERCIAL
    // -------------------------------------------------------------------------
    console.log('\n--- 2. ESTRUTURAÇÃO DO PROJETO E ESTADO INICIAL ---');
    
    let projeto = obterProjetoPorId(idProjeto);
    assert.strictEqual(projeto.situacao_projeto, 'AGUARDANDO_AUTORIZACAO_COMERCIAL');
    assert.strictEqual(projeto.autorizacao_comercial.status, 'PENDENTE');
    assert.strictEqual(projeto.natureza_projeto, 'SIMULADO');
    registrarPasso(`Projeto [${idProjeto}] registrado em AGUARDANDO_AUTORIZACAO_COMERCIAL com autorização PENDENTE`);

    // -------------------------------------------------------------------------
    // ETAPA 3: TESTE DE SEGURANÇA — BLOQUEIO MANDATÓRIO SEM AUTORIZAÇÃO
    // -------------------------------------------------------------------------
    console.log('\n--- 3. VERIFICAÇÃO DE SEGURANÇA COMERCIAL (BLOQUEIO DE TAREFA) ---');

    try {
        executarTarefaProjeto({
            idProjeto,
            idTarefa: `TSK-${idProjeto}-01`,
            usuarioExecucao: 'Operador Teste'
        });
        assert.fail('Deveria ter bloqueado execução sem autorização.');
    } catch (e) {
        assert.ok(e.message.includes('[BLOQUEIO_AUTORIZACAO_COMERCIAL]'));
        registrarPasso('Execução de tarefa sumariamente bloqueada por falta de autorização comercial formal (HTTP 403)');
    }

    // -------------------------------------------------------------------------
    // ETAPA 4: AUTORIZAÇÃO COMERCIAL FORMAL DA DIRETORIA
    // -------------------------------------------------------------------------
    console.log('\n--- 4. AUTORIZAÇÃO COMERCIAL FORMAL (DIRETORIA EXECUTIVA) ---');

    const projetoAutorizado = autorizarProjetoComercialmente({
        idProjeto,
        frentesComerciais: ['PRESENCA_COMERCIAL'],
        escopoAutorizado: 'Desenvolvimento de Identidade Visual e Landing Page Responsiva de Alta Conversão.',
        entregaveis: [
            'Manual de Identidade Visual e Design Tokens',
            'Landing Page Responsiva HTML/CSS/JS Publicada'
        ],
        limitesTrabalho: 'Escopo restrito exclusivamente aos ativos visuais e código web. Excluída gestão de tráfego pago.',
        responsavelAprovacao: 'Douglas Paz — Diretor Executivo',
        observacao: 'Autorização comercial formal registrada com base na proposta homologada.'
    });

    assert.strictEqual(projetoAutorizado.situacao_projeto, 'EM_EXECUCAO');
    assert.strictEqual(projetoAutorizado.autorizacao_comercial.status, 'AUTORIZADO');
    assert.strictEqual(projetoAutorizado.autorizacao_comercial.responsavel_aprovacao, 'Douglas Paz — Diretor Executivo');
    assert.strictEqual(projetoAutorizado.grafo_tarefas.length, 2);
    registrarPasso('Projeto autorizado por Douglas Paz e transicionado para EM_EXECUCAO com 2 tarefas no grafo DAG');

    // -------------------------------------------------------------------------
    // ETAPA 5: VERIFICAÇÃO DO GRAFO DAG DE DEPENDÊNCIAS
    // -------------------------------------------------------------------------
    console.log('\n--- 5. VERIFICAÇÃO DO GRAFO DAG DE DEPENDÊNCIAS ---');

    const tarefa01 = projetoAutorizado.grafo_tarefas.find(t => t.id_tarefa === `TSK-${idProjeto}-01`);
    const tarefa02 = projetoAutorizado.grafo_tarefas.find(t => t.id_tarefa === `TSK-${idProjeto}-02`);

    assert.ok(tarefa01, 'Tarefa 01 (Branding) deve existir');
    assert.ok(tarefa02, 'Tarefa 02 (Desenvolvedor) deve existir');

    // Tarefa 01 é raiz (sem dependência) -> EM_EXECUCAO
    assert.strictEqual(tarefa01.estado, 'EM_EXECUCAO');
    assert.strictEqual(tarefa01.dependencias.length, 0);

    // Tarefa 02 depende da Tarefa 01 -> BLOQUEADO
    assert.strictEqual(tarefa02.estado, 'BLOQUEADO');
    assert.ok(tarefa02.dependencias.includes(`TSK-${idProjeto}-01`));
    assert.ok(tarefa02.bloqueio_motivo.includes(`TSK-${idProjeto}-01`));
    registrarPasso('Estrutura DAG validada: Tarefa 01 em EM_EXECUCAO e Tarefa 02 BLOQUEADA por dependência');

    // -------------------------------------------------------------------------
    // ETAPA 6: EXECUÇÃO DA TAREFA 01 (AGENTE 04 — BRANDING E DESIGN)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. EXECUÇÃO DA TAREFA 01 (BRANDING E DESIGN) ---');

    const execucao01 = executarTarefaProjeto({
        idProjeto,
        idTarefa: `TSK-${idProjeto}-01`,
        usuarioExecucao: 'Agente 04 — Branding e Design'
    });

    assert.ok(execucao01.sucesso);
    assert.strictEqual(execucao01.estado, 'AGUARDANDO_APROVACAO');
    assert.ok(execucao01.arquivos.length >= 2);
    registrarPasso(`Agente 04 gerou entregáveis de branding (${execucao01.arquivos.join(', ')}) e submeteu para conferência`);

    // -------------------------------------------------------------------------
    // ETAPA 7: INSPEÇÃO DE ENTREGÁVEIS NO STORAGE PERSISTENTE
    // -------------------------------------------------------------------------
    console.log('\n--- 7. INSPEÇÃO DOS ENTREGÁVEIS NO STORAGE ---');

    const arquivosStorage = storageService.listarArquivosProjeto(idProjeto);
    assert.ok(arquivosStorage.length >= 2);
    assert.ok(arquivosStorage.some(a => a.includes('branding') || a.includes('manual') || a.includes('tokens')));
    registrarPasso(`Storage persistente validado com ${arquivosStorage.length} arquivos físicos gravados no diretório do projeto`);

    // -------------------------------------------------------------------------
    // ETAPA 8: CONFERÊNCIA HUMANA — SOLICITAÇÃO DE CORREÇÃO (EM_CORRECAO)
    // -------------------------------------------------------------------------
    console.log('\n--- 8. CICLO DE CONFERÊNCIA HUMANA — APONTAMENTO DE CORREÇÃO ---');

    const conferenciaRejeicao = avaliarEntregaTarefa({
        idProjeto,
        idTarefa: `TSK-${idProjeto}-01`,
        aprovado: false,
        parecer: 'Necessário elevar o contraste do botão primário para conformidade WCAG AA.',
        apontamentosCorrecao: 'Ajustar token de cor de ação primária para conformidade WCAG AA com saturação mais intensa e fundo contrastante.',
        responsavelAvaliacao: 'Douglas Paz — Diretor Executivo'
    });

    assert.ok(conferenciaRejeicao.sucesso);
    assert.strictEqual(conferenciaRejeicao.novo_estado, 'EM_EXECUCAO');
    const tarefaRejeitada = conferenciaRejeicao.projeto.grafo_tarefas.find(t => t.id_tarefa === `TSK-${idProjeto}-01`);
    assert.ok(tarefaRejeitada.apontamentos_correcao.includes('WCAG AA'));
    assert.strictEqual(tarefaRejeitada.necessita_correcao, true);
    registrarPasso('Conferência executiva solicitou correção: Tarefa 01 transicionou para EM_EXECUCAO com necessita_correcao = true');

    // -------------------------------------------------------------------------
    // ETAPA 9: REEXECUÇÃO E APLICAÇÃO DE CORREÇÕES PELO ESPECIALISTA
    // -------------------------------------------------------------------------
    console.log('\n--- 9. APLICAÇÃO DE CORREÇÃO PELO ESPECIALISTA ---');

    const correcao01 = executarCorrecaoTarefa({
        idProjeto,
        idTarefa: `TSK-${idProjeto}-01`,
        instrucoesCorrecao: 'Tokens visuais recalculados com contraste WCAG AAA validado.',
        usuarioExecucao: 'Agente 04 — Branding e Design'
    });

    assert.ok(correcao01.sucesso);
    assert.strictEqual(correcao01.estado, 'AGUARDANDO_APROVACAO');
    registrarPasso('Agente 04 aplicou correções requeridas e ressubmeteu a Tarefa 01 para AGUARDANDO_APROVACAO');

    // -------------------------------------------------------------------------
    // ETAPA 10: HOMOLOGAÇÃO DA TAREFA 01 E DESBLOQUEIO AUTOMÁTICO DO DAG
    // -------------------------------------------------------------------------
    console.log('\n--- 10. APROVAÇÃO DA TAREFA 01 & DESBLOQUEIO AUTOMÁTICO DO DAG ---');

    const conferenciaAprovacao = avaliarEntregaTarefa({
        idProjeto,
        idTarefa: `TSK-${idProjeto}-01`,
        aprovado: true,
        parecer: 'Ajustes de contraste homologados com excelência. Identidade visual aprovada para produção.',
        responsavelAvaliacao: 'Douglas Paz — Diretor Executivo'
    });

    assert.ok(conferenciaAprovacao.sucesso);
    assert.strictEqual(conferenciaAprovacao.novo_estado, 'CONCLUIDO');

    // O Grafo DAG deve ter desbloqueado automaticamente a Tarefa 02 (Desenvolvedor)!
    const prjPosAprovacao01 = obterProjetoPorId(idProjeto);
    const t02Atualizada = prjPosAprovacao01.grafo_tarefas.find(t => t.id_tarefa === `TSK-${idProjeto}-02`);
    assert.strictEqual(t02Atualizada.estado, 'EM_EXECUCAO');
    assert.strictEqual(t02Atualizada.bloqueio_motivo, null);
    registrarPasso('Tarefa 01 aprovada como CONCLUIDO e Tarefa 02 desbloqueada automaticamente para EM_EXECUCAO pelo DAG');

    // -------------------------------------------------------------------------
    // ETAPA 11: EXECUÇÃO DA TAREFA 02 (AGENTE 03 — DESENVOLVEDOR)
    // -------------------------------------------------------------------------
    console.log('\n--- 11. EXECUÇÃO DA TAREFA 02 (DESENVOLVEDOR) ---');

    const execucao02 = executarTarefaProjeto({
        idProjeto,
        idTarefa: `TSK-${idProjeto}-02`,
        usuarioExecucao: 'Agente 03 — Desenvolvedor'
    });

    assert.ok(execucao02.sucesso);
    assert.strictEqual(execucao02.estado, 'AGUARDANDO_APROVACAO');
    assert.ok(execucao02.arquivos.length >= 2);
    registrarPasso(`Agente 03 construiu a Landing Page (${execucao02.arquivos.join(', ')}) e submeteu para aprovação`);

    // -------------------------------------------------------------------------
    // ETAPA 12: APROVAÇÃO FINAL DA TAREFA 02 E CONCLUSÃO AUTOMÁTICA DO PROJETO
    // -------------------------------------------------------------------------
    console.log('\n--- 12. APROVAÇÃO FINAL E CONCLUSÃO AUTOMÁTICA DO PROJETO ---');

    const conferenciaFinal = avaliarEntregaTarefa({
        idProjeto,
        idTarefa: `TSK-${idProjeto}-02`,
        aprovado: true,
        parecer: 'Landing Page responsiva aprovada na íntegra. Código limpo, sem erros e aderente ao escopo.',
        responsavelAvaliacao: 'Douglas Paz — Diretor Executivo'
    });

    assert.ok(conferenciaFinal.sucesso);
    assert.strictEqual(conferenciaFinal.novo_estado, 'CONCLUIDO');

    // Todas as tarefas concluídas -> Projeto CONCLUIDO
    const prjFinal = obterProjetoPorId(idProjeto);
    assert.strictEqual(prjFinal.situacao_projeto, 'CONCLUIDO');
    registrarPasso('Tarefa 02 aprovada e Projeto transicionado automaticamente para CONCLUIDO (100% de tarefas homologadas)');

    // -------------------------------------------------------------------------
    // ETAPA 13: DOSSIÊ EXECUTIVO CONSOLIDADO E TRILHA DE AUDITORIA
    // -------------------------------------------------------------------------
    console.log('\n--- 13. DOSSIÊ CONSOLIDADO E AUDITORIA COMPLETA ---');

    const dossie = obterDossieExecucaoProjeto(idProjeto);
    assert.ok(dossie);
    assert.strictEqual(dossie.id_projeto, idProjeto);
    assert.strictEqual(dossie.cliente, clienteSimulado);
    assert.strictEqual(dossie.situacao, 'CONCLUIDO');
    assert.strictEqual(dossie.metricas_execucao.total_tarefas, 2);
    assert.strictEqual(dossie.metricas_execucao.tarefas_concluidas, 2);
    assert.strictEqual(dossie.metricas_execucao.percentual_conclusao, 100);
    assert.ok(dossie.arquivos_produzidos.length >= 4);
    assert.ok(dossie.historico_operacional.length >= 4);
    registrarPasso(`Dossiê consolidado com 100% de conclusão, ${dossie.arquivos_produzidos.length} arquivos e trilha de auditoria completa`);

    console.log('\n================================================================================');
    console.log(`SIMULAÇÃO OPERACIONAL CONCLUÍDA COM 100% DE ÊXITO (${passosValidados} PASSOS VALIDADOS)`);
    console.log('O FLUXO COMPLETO ESTÁ OPERACIONAL E HOMOLOGADO TECNICAMENTE');
    console.log('================================================================================\n');

    return {
        sucesso: true,
        passosValidados,
        idProjeto,
        dossie
    };
}

if (require.main === module) {
    try {
        const resultado = executarSimulacaoOperacionalPrimeiroProjeto();
        process.exit(resultado.sucesso ? 0 : 1);
    } catch (e) {
        console.error('\n❌ [FALHA NA SIMULAÇÃO OPERACIONAL]:', e);
        process.exit(1);
    }
}

module.exports = { executarSimulacaoOperacionalPrimeiroProjeto };
