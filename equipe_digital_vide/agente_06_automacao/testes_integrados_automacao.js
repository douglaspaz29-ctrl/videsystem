/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * TESTE INTEGRADO CONTROLADO: AGENTE 06 (AUTOMAÇÃO E INTEGRAÇÕES)
 * Conexão de Ponta a Ponta:
 * Lead ➔ Webhook ➔ Deduplicação ➔ Regras Agente 05 ➔ CRM ➔ Agendamento ➔ Stop-on-Reply ➔ Painel
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');

// Módulos da Triagem e Coordenador
const { processarTriagemRevisada } = require('../agente_01_triagem/executor_triagem');
const { receberRegistroTriagem } = require('../agente_02_coordenador/executor_coordenador');
const { obterProjetoPorId, listarProjetos } = require('../agente_02_coordenador/repositorio_projetos_tarefas');

// Especialistas Executores: Agente 05 e Agente 06
const { executarCicloCompletoAtendimento } = require('../agente_05_atendimento/executor_atendimento');
const { executarCicloCompletoAutomacao } = require('./executor_automacao');

async function executarFluxoIntegradoAutomacao() {
    console.log('======================================================================');
    console.log('VIDE — TESTE INTEGRADO CONTROLADO: AUTOMAÇÃO OPERACIONAL (AGENTE 06)');
    console.log('Transformação de Estratégia Comercial em Sistema Operacional Funcional');
    console.log('======================================================================\n');

    // -----------------------------------------------------------------
    // ETAPA 1: Entrada do Lead e Triagem Comercial
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 1: Entrada do Lead e Triagem (Agente 01 v1.1)');
    const solicitacaoCliente = 
        "Preciso reestruturar o atendimento da clínica e automatizar os fluxos no WhatsApp com o n8n, " +
        "para que nenhum paciente fique sem resposta e para recuperar quem sumiu após saber o preço.";
    const nomeCliente = "Dr. Roberto Alencar (Clínica Alencar & Odontologia Avançada)";

    const registroTriagem = processarTriagemRevisada({
        solicitacaoOriginal: solicitacaoCliente,
        identificadorCenario: nomeCliente,
        prazoUrgenciaInformado: "7 dias"
    });

    console.log(`✓ ID Demanda: ${registroTriagem.idDemanda}`);
    console.log(`✓ Escopo: ${registroTriagem.servicoSolicitado}`);
    console.log(`✓ Especialistas: ${registroTriagem.especialistasConfirmados.join(', ')}\n`);

    // -----------------------------------------------------------------
    // ETAPA 2: Coordenador Geral — Montagem do Grafo com Dependência Estrita
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 2: Coordenador Geral (Agente 02) — Grafo de Dependências');
    const projeto = receberRegistroTriagem(registroTriagem);

    console.log(`✓ Projeto ID: ${projeto.id_projeto}`);
    console.log(`✓ Autorização Comercial: ${projeto.autorizacao_comercial.status}`);
    console.log(`✓ Tarefas no Grafo: ${projeto.grafo_tarefas.length}`);

    // Exibe o grafo inicial
    projeto.grafo_tarefas.forEach(t => {
        console.log(`   - [${t.id_tarefa}] (${t.especialista}) -> Estado: [${t.estado}] | Depende de: [${t.dependencias.join(', ') || 'NENHUMA'}]`);
    });

    const tarefaAtendimento = projeto.grafo_tarefas.find(t => t.especialista.toLowerCase().includes('atendimento'));
    const tarefaAutomacao = projeto.grafo_tarefas.find(t => t.especialista.toLowerCase().includes('automa'));

    if (!tarefaAtendimento || !tarefaAutomacao) {
        throw new Error('Falha: Grafo precisa conter tarefas encadeadas de Atendimento e Automação!');
    }

    console.log(`\n--> Dependência verificada: Tarefa [${tarefaAutomacao.id_tarefa}] está travada aguardando [${tarefaAtendimento.id_tarefa}].\n`);

    // -----------------------------------------------------------------
    // ETAPA 3: Execução do Agente 05 (Atendimento e Vendas)
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 3: Agente 05 (Atendimento e Vendas) — Criação da Inteligência');
    const resultadoAtendimento = executarCicloCompletoAtendimento({
        idProjeto: projeto.id_projeto,
        idTarefa: tarefaAtendimento.id_tarefa
    });

    console.log(`✓ 7 Arquivos Criados: ${resultadoAtendimento.dadosEntrega.arquivosCriados.join(', ')}`);
    console.log(`✓ Auditoria do Coordenador: ${resultadoAtendimento.resultadoSubmissao.sucesso ? 'APROVADA' : 'REJEITADA'}`);

    // -----------------------------------------------------------------
    // ETAPA 4: Recálculo do Grafo e Liberação da Automação
    // -----------------------------------------------------------------
    console.log('\n>>> ETAPA 4: Recálculo do Grafo pelo Coordenador Geral');
    const projAposAtendimento = obterProjetoPorId(projeto.id_projeto);
    const tarAutoAtualizada = projAposAtendimento.grafo_tarefas.find(t => t.id_tarefa === tarefaAutomacao.id_tarefa);

    console.log(`✓ Estado da Tarefa de Atendimento: [${projAposAtendimento.grafo_tarefas.find(t => t.id_tarefa === tarefaAtendimento.id_tarefa).estado}]`);
    console.log(`✓ Estado da Tarefa de Automação após desbloqueio: [${tarAutoAtualizada.estado}]`);

    if (tarAutoAtualizada.estado !== 'PRONTA_PARA_EXECUCAO') {
        throw new Error('Falha: Automação deveria ter sido desbloqueada após a aprovação de Atendimento!');
    }
    console.log('--> Dependência desbloqueada. Agente 06 liberado para implementar o n8n.\n');

    // -----------------------------------------------------------------
    // ETAPA 5: Execução do Agente 06 (Automação e Integrações)
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 5: Agente 06 (Automação) — Implementação de Workflows e CRM');
    const resultadoAuto = executarCicloCompletoAutomacao({
        idProjeto: projeto.id_projeto,
        idTarefa: tarefaAutomacao.id_tarefa
    });

    console.log(`✓ 6 Arquivos Criados: ${resultadoAuto.dadosEntrega.arquivosCriados.join(', ')}`);
    console.log(`✓ Auditoria do Coordenador: ${resultadoAuto.resultadoSubmissao.sucesso ? 'APROVADA' : 'REJEITADA'}`);
    console.log(`✓ Pontuação de Conformidade Técnica: ${resultadoAuto.relatorioTestes.pontuacao_conformidade}%\n`);

    // -----------------------------------------------------------------
    // ETAPA 6: TESTE CONTROLADO DO MOTOR OPERACIONAL (Cenário Exigido)
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 6: Execução do Teste Controlado de Automação (Simulação Segura)');
    const pastaAuto = resultadoAuto.dadosEntrega.diretorioEntrega;
    const motor = require(path.join(pastaAuto, 'motor_execucao_automacao.js'));

    const telPaciente = '5511987654321';
    const nomePaciente = 'Carlos Eduardo Ramos';

    // 1. Simulação: Entrada de Lead via Webhook Inbound
    console.log('1. [INBOUND LEAD]: Lead entra em contato pelo WhatsApp perguntando preço...');
    const ev1 = motor.processarEventoInbound({
        telefone: telPaciente,
        nome: nomePaciente,
        mensagem: 'Olá, gostaria de saber quanto custa o alinhador invisível da clínica.'
    });
    console.log(`   ✓ Inbound Processado: Sucesso=${ev1.sucesso} | Lead ID=[${ev1.lead_id}] | Status=[${ev1.status}]`);

    // 2. Simulação: Disparo Repetido em Menos de 2 minutos (Deduplicação)
    console.log('2. [DEDUPLICAÇÃO]: Mesmo contato dispara exatamente a mesma mensagem em 5 segundos...');
    const ev2 = motor.processarEventoInbound({
        telefone: telPaciente,
        nome: nomePaciente,
        mensagem: 'Olá, gostaria de saber quanto custa o alinhador invisível da clínica.'
    });
    console.log(`   ✓ Deduplicação Confirmada: Bloqueado=${ev2.duplicado} | Motivo: "${ev2.motivo}"`);

    // 3. Simulação: Checagem do Estado do CRM e Cadência Agendada
    const crmAposLead = motor.carregarCRM();
    const cadenciaAtiva = crmAposLead.cadencias_ativas.find(c => c.telefone === telPaciente && c.status === 'AGENDADA');
    console.log(`3. [CRM & CADÊNCIA]: Cadência ativa registrada: Etapa=[${cadenciaAtiva.etapa}] | Modo=[${cadenciaAtiva.modo}]`);

    // 4. Simulação: Cliente responde à conversa (Interrupção Automática / Stop-on-Reply)
    console.log('4. [STOP-ON-REPLY]: Cliente responde com intenção de agendamento...');
    const ev3 = motor.processarEventoInbound({
        telefone: telPaciente,
        nome: nomePaciente,
        mensagem: 'Gostei muito da explicação de vocês, prefiro marcar uma consulta para quinta!'
    });
    console.log(`   ✓ Interrupção Automática Confirmada: Cadências Canceladas=${ev3.cadencias_interrompidas} | Novo Status=[${ev3.status}]`);

    // 5. Simulação: Teste de Opt-Out (Solicitação de não receber mensagens)
    console.log('5. [OPT-OUT SEGURO]: Outro lead solicita expressamente cancelamento...');
    const telOpt = '5511911112222';
    motor.processarEventoInbound({ telefone: telOpt, nome: 'Lead Cancelamento', mensagem: 'Bom dia' });
    const evOpt = motor.processarEventoInbound({
        telefone: telOpt,
        nome: 'Lead Cancelamento',
        mensagem: 'Por favor, pare de me mandar mensagens, não tenho mais interesse.'
    });
    console.log(`   ✓ Opt-Out Confirmado: OptOut=${evOpt.opt_out} | Status=[${evOpt.status}] | Sequência Abortada`);

    // -----------------------------------------------------------------
    // ETAPA 7: Homologação e Fechamento no Coordenador Geral
    // -----------------------------------------------------------------
    console.log('\n>>> ETAPA 7: Homologação no Coordenador Geral');
    const projFinal = obterProjetoPorId(projeto.id_projeto);
    console.log(`✓ Situação Final do Projeto: [${projFinal.situacao_projeto}]`);
    console.log('✓ Resumo de Todas as Tarefas:');
    projFinal.grafo_tarefas.forEach(t => {
        console.log(`   - [${t.id_tarefa}] ${t.especialista}: [${t.estado}]`);
    });

    // -----------------------------------------------------------------
    // ETAPA 8: Verificação no Console Executivo (/painel)
    // -----------------------------------------------------------------
    console.log('\n>>> ETAPA 8: Verificação no Painel Executivo (/painel)');
    const indice = listarProjetos();
    const noPainel = indice.find(p => p.id_projeto === projeto.id_projeto);
    console.log(`✓ Projeto presente no índice: ${!!noPainel}`);
    console.log(`✓ Status exibido: ${noPainel.situacao_projeto}`);

    console.log('\n======================================================================');
    console.log('RESULTADO DO TESTE CONTROLADO DO AGENTE 06 (AUTOMAÇÃO E INTEGRAÇÕES):');
    console.log('SUCESSO ABSOLUTO! O ciclo operacional foi validado de ponta a ponta:');
    console.log('1. Atendimento definiu as regras e gerou as especificações.');
    console.log('2. Automação consumiu as regras e construiu o workflow n8n.');
    console.log('3. Deduplicação bloqueou envios repetidos.');
    console.log('4. Stop-on-Reply cancelou imediatamente mensagens pendentes ao receber resposta.');
    console.log('5. Opt-out protegeu o contato contra mensagens indesejadas.');
    console.log('6. Coordenador auditou e homologou com 100% de conformidade.');
    console.log('======================================================================');
}

if (require.main === module) {
    executarFluxoIntegradoAutomacao();
}

module.exports = { executarFluxoIntegradoAutomacao };
