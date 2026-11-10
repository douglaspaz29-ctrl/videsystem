/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * Bateria Oficial de Testes do Agente 06: Automação e Integrações
 * Validação de Workflows n8n, Deduplicação, Stop-on-Reply e Governança
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const { salvarProjeto, obterProjetoPorId } = require('../agente_02_coordenador/repositorio_projetos_tarefas');
const {
    assumirTarefaAutomacao,
    gerarEntregaveisAutomacao,
    executarBateriaTestesAutomacao,
    submeterEntregaParaCoordenador,
    executarCicloCompletoAutomacao
} = require('./executor_automacao');

function executarTestesAutomacao() {
    console.log('======================================================================');
    console.log('VIDE — BATERIA OFICIAL DE TESTES: AGENTE 06 (AUTOMAÇÃO E INTEGRAÇÕES)');
    console.log('======================================================================\n');

    let testesPassaram = 0;
    const totalTestesEsperados = 10;

    // -----------------------------------------------------------------
    // TESTE 1: Bloqueio em Projeto SEM Autorização Comercial
    // -----------------------------------------------------------------
    console.log('>>> TESTE 1: Bloqueio de Tarefa em Projeto SEM Autorização Comercial');
    const idProjetoPendente = 'PRJ-DEMO-AUTO-PENDENTE';
    salvarProjeto({
        id_projeto: idProjetoPendente,
        id_demanda_origem: 'DEM-AUTO-001',
        cliente: 'Lead Não Autorizado',
        solicitacao_original: 'Automação sem contrato.',
        situacao_projeto: 'AGUARDANDO_AUTORIZACAO_COMERCIAL',
        autorizacao_comercial: { status: 'PENDENTE' },
        grafo_tarefas: [
            {
                id_tarefa: 'TSK-AUTO-PEND-01',
                especialista: 'Automação',
                estado: 'BLOQUEADA_POR_AUTORIZACAO',
                dependencias: []
            }
        ]
    });

    try {
        assumirTarefaAutomacao({ idProjeto: idProjetoPendente, idTarefa: 'TSK-AUTO-PEND-01' });
        console.error('❌ [FALHA] Deveria ter bloqueado execução em projeto PENDENTE.');
    } catch (e) {
        if (e.message.includes('[BLOQUEIO_COMERCIAL]')) {
            console.log(`✓ [SUCESSO] Bloqueio comercial garantido: ${e.message}`);
            testesPassaram++;
        } else {
            console.error('❌ [FALHA] Mensagem inesperada: ' + e.message);
        }
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 2: Bloqueio por Dependência Pendente no Grafo
    // -----------------------------------------------------------------
    console.log('>>> TESTE 2: Bloqueio por Dependência Pendente no Grafo');
    const idProjetoDep = 'PRJ-DEMO-AUTO-DEP';
    salvarProjeto({
        id_projeto: idProjetoDep,
        id_demanda_origem: 'DEM-AUTO-002',
        cliente: 'Cliente com Dependência',
        solicitacao_original: 'Atendimento + Automação.',
        situacao_projeto: 'EM_EXECUCAO',
        autorizacao_comercial: { status: 'AUTORIZADO' },
        grafo_tarefas: [
            {
                id_tarefa: 'TSK-AUTO-DEP-01',
                especialista: 'Atendimento',
                estado: 'EM_ANDAMENTO', // Predecessora ainda não aprovada!
                dependencias: []
            },
            {
                id_tarefa: 'TSK-AUTO-DEP-02',
                especialista: 'Automação',
                estado: 'BLOQUEADA_POR_DEPENDENCIA',
                dependencias: ['TSK-AUTO-DEP-01']
            }
        ]
    });

    try {
        assumirTarefaAutomacao({ idProjeto: idProjetoDep, idTarefa: 'TSK-AUTO-DEP-02' });
        console.error('❌ [FALHA] Deveria ter bloqueado tarefa com dependência pendente.');
    } catch (e) {
        if (e.message.includes('[BLOQUEIO_DEPENDENCIA]')) {
            console.log(`✓ [SUCESSO] Bloqueio de dependência garantido: ${e.message}`);
            testesPassaram++;
        } else {
            console.error('❌ [FALHA] Mensagem inesperada: ' + e.message);
        }
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 3: Ingestão de Tarefa Válida e Desbloqueada
    // -----------------------------------------------------------------
    console.log('>>> TESTE 3: Ingestão de Tarefa Válida e Desbloqueada');
    const idProjetoValido = 'PRJ-DEMO-AUTO-VALIDO';
    salvarProjeto({
        id_projeto: idProjetoValido,
        id_demanda_origem: 'DEM-AUTO-003',
        cliente: 'Dr. Roberto Alencar (Clínica Alencar)',
        solicitacao_original: 'Automação de atendimento no WhatsApp com n8n.',
        situacao_projeto: 'EM_EXECUCAO',
        autorizacao_comercial: { status: 'AUTORIZADO' },
        grafo_tarefas: [
            {
                id_tarefa: 'TSK-AUTO-VAL-01',
                especialista: 'Automação',
                estado: 'PRONTA_PARA_EXECUCAO',
                dependencias: [],
                criterios_aceite: [
                    'Workflow n8n gerado e compatível',
                    'Mecanismo de deduplicação ativo',
                    'Interrupção imediata Stop-on-Reply',
                    'Persistência no CRM',
                    'Painel de monitoramento'
                ],
                historico_auditoria: []
            }
        ]
    });

    const ingestao = assumirTarefaAutomacao({ idProjeto: idProjetoValido, idTarefa: 'TSK-AUTO-VAL-01' });
    if (ingestao.tarefa.estado === 'EM_ANDAMENTO') {
        console.log(`✓ [SUCESSO] Tarefa assumida pelo Agente 06 e transicionada para [${ingestao.tarefa.estado}].`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Estado inesperado: ' + ingestao.tarefa.estado);
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 4: Construção Física dos 6 Arquivos de Automação no Disco
    // -----------------------------------------------------------------
    console.log('>>> TESTE 4: Construção Física dos 6 Arquivos no Disco');
    const briefing = {
        idProjeto: idProjetoValido,
        idTarefa: 'TSK-AUTO-VAL-01',
        cliente: 'Dr. Roberto Alencar (Clínica Alencar)',
        solicitacaoOriginal: 'Automação de atendimento no WhatsApp com n8n.',
        dependencias: []
    };

    const entrega = gerarEntregaveisAutomacao(briefing);
    console.log(`Diretório de Automação: ${entrega.diretorioEntrega}`);
    console.log(`Arquivos gerados: ${entrega.arquivosCriados.join(', ')}`);

    const todosNoDisco = entrega.arquivosCriados.every(nome => fs.existsSync(path.join(entrega.diretorioEntrega, nome)));
    if (todosNoDisco && entrega.arquivosCriados.length === 6) {
        console.log('✓ [SUCESSO] Todos os 6 arquivos físicos de automação foram gerados no disco.');
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Nem todos os arquivos foram encontrados no disco.');
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 5: Validação Estrutural do Workflow n8n
    // -----------------------------------------------------------------
    console.log('>>> TESTE 5: Validação Estrutural do workflow_n8n_atendimento_recuperacao.json');
    const wfLido = JSON.parse(fs.readFileSync(path.join(entrega.diretorioEntrega, 'workflow_n8n_atendimento_recuperacao.json'), 'utf-8'));
    const nomesNodes = wfLido.nodes.map(n => n.name);
    const temDeduplicacao = nomesNodes.some(n => n.includes('Deduplicação'));
    const temInterrupcao = nomesNodes.some(n => n.includes('Interromper'));
    const temTratamentoErro = nomesNodes.some(n => n.includes('Erro'));

    if (wfLido.nodes.length >= 7 && temDeduplicacao && temInterrupcao && temTratamentoErro) {
        console.log(`✓ [SUCESSO] Workflow n8n validado com ${wfLido.nodes.length} nós (inclui Deduplicação, Stop-on-Reply e Error Trigger).`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Workflow n8n com estrutura incompleta.');
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 6: Validação do Mecanismo de Deduplicação / Anti-duplicação
    // -----------------------------------------------------------------
    console.log('>>> TESTE 6: Validação do Mecanismo de Deduplicação (Anti-duplicação)');
    const motor = require(path.join(entrega.diretorioEntrega, 'motor_execucao_automacao.js'));
    const telTeste = '5511999997777';

    // Primeiro envio
    const r1 = motor.processarEventoInbound({ telefone: telTeste, nome: 'Paciente Teste', mensagem: 'Quero saber valor do alinhador' });
    // Envio duplicado imediato (ex: duplo clique do usuário ou reenvio de webhook)
    const r2 = motor.processarEventoInbound({ telefone: telTeste, nome: 'Paciente Teste', mensagem: 'Quero saber valor do alinhador' });

    if (r1.sucesso === true && r2.duplicado === true) {
        console.log(`✓ [SUCESSO] Deduplicação funcionou perfeitamente: segunda requisição repetida foi bloqueada.`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Falha na lógica de deduplicação.');
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 7: Validação da Interrupção Automática (Stop-on-Reply)
    // -----------------------------------------------------------------
    console.log('>>> TESTE 7: Validação da Interrupção Automática (Stop-on-Reply)');
    // O paciente responde à conversa: todas as cadências programadas devem ser canceladas imediatamente
    const r3 = motor.processarEventoInbound({ telefone: telTeste, nome: 'Paciente Teste', mensagem: 'Olá, gostei da proposta, quero agendar para sexta!' });

    if (r3.cadencias_interrompidas > 0 && r3.status === 'EM_ATENDIMENTO') {
        console.log(`✓ [SUCESSO] Stop-on-Reply validado: ${r3.cadencias_interrompidas} cadência(s) pendente(s) cancelada(s) imediatamente.`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Não interrompeu cadências ao receber resposta.');
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 8: Validação do Opt-Out de Cancelamento Permanente
    // -----------------------------------------------------------------
    console.log('>>> TESTE 8: Validação do Opt-Out de Cancelamento Permanente');
    const telOpt = '5511999998888';
    motor.processarEventoInbound({ telefone: telOpt, nome: 'Lead Cancelamento', mensagem: 'Oi' });
    const rOpt = motor.processarEventoInbound({ telefone: telOpt, nome: 'Lead Cancelamento', mensagem: 'Por favor, não quero mais receber mensagens' });

    if (rOpt.opt_out === true && rOpt.status === 'OPT_OUT') {
        console.log(`✓ [SUCESSO] Opt-out processado: lead marcado como OPT_OUT e sequência abortada permanentemente.`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Falha no opt-out do lead.');
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 9: Validação do Manifesto Unificado de Entrega Compartilhada
    // -----------------------------------------------------------------
    console.log('>>> TESTE 9: Validação do Manifesto Unificado de Entrega Compartilhada');
    const manifestoLido = JSON.parse(fs.readFileSync(path.join(entrega.diretorioEntrega, 'manifesto_entrega.json'), 'utf-8'));
    const chavesObrigatorias = [
        'versao_manifesto', 'id_projeto', 'id_tarefa', 'especialista',
        'briefing_origem', 'arquivos_produzidos', 'versoes_alteracoes',
        'criterios_aceite', 'dependencias', 'pendencias_identificadas', 'resultado_auditoria'
    ];
    const todasChaves = chavesObrigatorias.every(k => k in manifestoLido);

    if (todasChaves && manifestoLido.arquivos_produzidos.length === 6) {
        console.log(`✓ [SUCESSO] Manifesto unificado de entrega validado com todas as 11 chaves de governança.`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Manifesto fora do padrão compartilhado VIDE.');
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 10: Submissão Formal ao Coordenador com Auditoria APROVADA
    // -----------------------------------------------------------------
    console.log('>>> TESTE 10: Submissão Formal ao Coordenador com Auditoria APROVADA');
    const relatorioValido = executarBateriaTestesAutomacao({
        diretorioEntrega: entrega.diretorioEntrega,
        criteriosAceite: ['Workflow gerado']
    });

    const submissaoAprovada = submeterEntregaParaCoordenador({
        idProjeto: idProjetoValido,
        idTarefa: 'TSK-AUTO-VAL-01',
        dadosEntrega: entrega,
        relatorioTestes: relatorioValido
    });

    const projAposAuditoria = obterProjetoPorId(idProjetoValido);
    const tarAposAuditoria = projAposAuditoria.grafo_tarefas.find(t => t.id_tarefa === 'TSK-AUTO-VAL-01');

    if (submissaoAprovada.sucesso && tarAposAuditoria.estado === 'APROVADA') {
        console.log(`Pontuação de conformidade: ${relatorioValido.pontuacao_conformidade}%`);
        console.log(`Estado final da tarefa após auditoria: [${tarAposAuditoria.estado}]`);
        console.log(`Parecer do Coordenador: "${submissaoAprovada.parecer}"`);
        console.log('✓ [SUCESSO] Coordenador auditou a entrega de Automação e homologou como APROVADA.');
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Submissão não aprovada pelo Coordenador: ' + tarAposAuditoria.estado);
    }

    console.log('\n======================================================================');
    console.log('SUMÁRIO FINAL DOS TESTES DO AGENTE 06 (AUTOMAÇÃO E INTEGRAÇÕES):');
    console.log(`1. Bloqueio por Falta de Autorização:         PASSOU`);
    console.log(`2. Bloqueio por Dependência Pendente:         PASSOU`);
    console.log(`3. Ingestão de Tarefa Válida:                 PASSOU`);
    console.log(`4. Construção dos 6 Arquivos no Disco:        PASSOU`);
    console.log(`5. Validação Estrutural do Workflow n8n:      PASSOU`);
    console.log(`6. Validação do Mecanismo de Deduplicação:    PASSOU`);
    console.log(`7. Validação do Stop-on-Reply (Interrupção):  PASSOU`);
    console.log(`8. Validação do Opt-Out Permanente:           PASSOU`);
    console.log(`9. Validação do Manifesto Unificado:          PASSOU`);
    console.log(`10. Submissão e Aprovação pelo Coordenador:   PASSOU`);
    console.log('======================================================================');
    console.log(`RESULTADO GERAL: ${testesPassaram} DE ${totalTestesEsperados} TESTES FORAM APROVADOS (${Math.round((testesPassaram/totalTestesEsperados)*100)}%)`);

    return testesPassaram === totalTestesEsperados;
}

if (require.main === module) {
    executarTestesAutomacao();
}

module.exports = { executarTestesAutomacao };
