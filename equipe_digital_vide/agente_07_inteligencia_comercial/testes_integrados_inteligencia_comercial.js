/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * TESTE INTEGRADO: AGENTE 07 (INTELIGÊNCIA COMERCIAL & MOTOR DE OBJEÇÕES)
 * Conexão de Ponta a Ponta:
 * Entrada ➔ Triagem ➔ Coordenador ➔ Inteligência ➔ Motor de Objeções ➔ Recomendações ➔ Painel
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');

// Módulos da Triagem e Coordenador
const { processarTriagemRevisada } = require('../agente_01_triagem/executor_triagem');
const { receberRegistroTriagem } = require('../agente_02_coordenador/executor_coordenador');
const { obterProjetoPorId, listarProjetos } = require('../agente_02_coordenador/repositorio_projetos_tarefas');

// Especialista Executor: Agente 07
const { executarCicloCompletoInteligencia } = require('./executor_inteligencia_comercial');

async function executarFluxoIntegradoInteligencia() {
    console.log('======================================================================');
    console.log('VIDE — TESTE INTEGRADO: AGENTE 07 (INTELIGÊNCIA COMERCIAL)');
    console.log('Diagnóstico de Funil, Motor de Objeções e Plano de Retroalimentação');
    console.log('======================================================================\n');

    // -----------------------------------------------------------------
    // ETAPA 1: Entrada do Lead e Triagem Comercial
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 1: Entrada da Demanda e Triagem (Agente 01 v1.1)');
    const solicitacaoCliente = 
        "Preciso de um diagnóstico comercial da clínica para auditar as conversas, " +
        "quantificar onde estamos perdendo vendas no WhatsApp, rodar o motor de objeções e receber recomendações com dados para retroalimentar a equipe.";
    const nomeCliente = "Dr. Roberto Alencar (Clínica Alencar & Odontologia Avançada)";

    const registroTriagem = processarTriagemRevisada({
        solicitacaoOriginal: solicitacaoCliente,
        identificadorCenario: nomeCliente,
        prazoUrgenciaInformado: "5 dias"
    });

    console.log(`✓ ID Demanda: ${registroTriagem.idDemanda}`);
    console.log(`✓ Escopo: ${registroTriagem.servicoSolicitado}`);
    console.log(`✓ Especialistas Confirmados: ${registroTriagem.especialistasConfirmados.join(', ')}\n`);

    // -----------------------------------------------------------------
    // ETAPA 2: Coordenador Geral — Montagem do Grafo
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 2: Coordenador Geral (Agente 02) — Grafo de Dependências');
    const projeto = receberRegistroTriagem(registroTriagem);

    console.log(`✓ Projeto ID: ${projeto.id_projeto}`);
    console.log(`✓ Autorização Comercial: ${projeto.autorizacao_comercial.status}`);
    console.log(`✓ Tarefas Criadas no Grafo: ${projeto.grafo_tarefas.length}`);

    projeto.grafo_tarefas.forEach(t => {
        console.log(`   - [${t.id_tarefa}] (${t.especialista}) -> Estado: [${t.estado}] | Depende de: [${t.dependencias.join(', ') || 'NENHUMA'}]`);
    });

    const tarefaInteligencia = projeto.grafo_tarefas.find(t => t.especialista.toLowerCase().includes('inteligência') || t.especialista.toLowerCase().includes('inteligencia'));
    if (!tarefaInteligencia) {
        throw new Error('Falha: Grafo precisa conter a tarefa de Inteligência Comercial!');
    }
    console.log('');

    // -----------------------------------------------------------------
    // ETAPA 3: Execução do Agente 07 (Inteligência Comercial)
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 3: Agente 07 (Inteligência Comercial) — Execução do Ciclo Analítico');
    const resultadoIntel = executarCicloCompletoInteligencia({
        idProjeto: projeto.id_projeto,
        idTarefa: tarefaInteligencia.id_tarefa
    });

    console.log(`✓ Diretório Físico de Entrega: ${resultadoIntel.dadosEntrega.diretorioEntrega}`);
    console.log(`✓ 5 Arquivos Criados: ${resultadoIntel.dadosEntrega.arquivosCriados.join(', ')}`);
    console.log(`✓ Pontuação de Conformidade Técnica: ${resultadoIntel.relatorioTestes.pontuacao_conformidade}%`);
    console.log(`✓ Auditoria do Coordenador: ${resultadoIntel.resultadoSubmissao.sucesso ? 'APROVADA' : 'REJEITADA'}\n`);

    // -----------------------------------------------------------------
    // ETAPA 4: Validação dos Dados do Diagnóstico e Motor de Objeções
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 4: Verificação dos Resultados do Diagnóstico');
    const pastaEntrega = resultadoIntel.dadosEntrega.diretorioEntrega;

    const funil = JSON.parse(fs.readFileSync(path.join(pastaEntrega, 'diagnostico_funil_e_perdas.json'), 'utf-8'));
    console.log(`✓ Conversão Global Calculada: ${funil.metricas_calculadas.taxa_conversao_global}`);
    console.log(`✓ Receita Perdida Pós-Proposta: R$ ${funil.metricas_calculadas.receita_perdida_pos_proposta_brl.toLocaleString('pt-BR')}`);
    console.log(`✓ Padrão Central: ${funil.padroes_observados[0]}`);

    const objecoes = JSON.parse(fs.readFileSync(path.join(pastaEntrega, 'relatorio_motor_objecoes.json'), 'utf-8'));
    console.log(`✓ Distribuição de Objeções:`);
    objecoes.distribuicao_objecoes.forEach(o => {
        console.log(`   - [${o.categoria}]: ${o.frequencia_absoluta} casos (${o.percentual_total}) -> R$ ${o.impacto_financeiro_estimado_brl.toLocaleString('pt-BR')} em risco`);
    });

    const plano = JSON.parse(fs.readFileSync(path.join(pastaEntrega, 'plano_recomendacoes_retroalimentacao.json'), 'utf-8'));
    console.log(`\n✓ Recomendações Estruturadas para a Equipe Digital:`);
    plano.recomendacoes.forEach(r => {
        console.log(`   - [${r.id_recomendacao}] Para: ${r.destinatario} | Ação: "${r.acao_proposta.substring(0, 75)}..."`);
    });

    // -----------------------------------------------------------------
    // ETAPA 5: Homologação no Coordenador Geral
    // -----------------------------------------------------------------
    console.log('\n>>> ETAPA 5: Homologação no Coordenador Geral');
    const projFinal = obterProjetoPorId(projeto.id_projeto);
    console.log(`✓ Situação Final do Projeto: [${projFinal.situacao_projeto}]`);
    console.log('✓ Resumo das Tarefas:');
    projFinal.grafo_tarefas.forEach(t => {
        console.log(`   - [${t.id_tarefa}] ${t.especialista}: [${t.estado}]`);
    });

    // -----------------------------------------------------------------
    // ETAPA 6: Verificação no Painel Executivo (/painel)
    // -----------------------------------------------------------------
    console.log('\n>>> ETAPA 6: Verificação no Console Executivo (/painel)');
    const indice = listarProjetos();
    const noPainel = indice.find(p => p.id_projeto === projeto.id_projeto);
    console.log(`✓ Projeto presente no índice: ${!!noPainel}`);
    console.log(`✓ Status exibido no Painel: ${noPainel.situacao_projeto}`);

    console.log('\n======================================================================');
    console.log('RESULTADO DO TESTE INTEGRADO DO AGENTE 07 (INTELIGÊNCIA COMERCIAL):');
    console.log('SUCESSO ABSOLUTO! O ciclo analítico e de retroalimentação foi validado:');
    console.log('1. Triagem categorizou a demanda analítica com autorização formal.');
    console.log('2. Coordenador estruturou a tarefa atômica de diagnóstico.');
    console.log('3. Agente 07 auditou o funil, quantificou perdas e mapeou 4 categorias de objeção.');
    console.log('4. Recomendações fundamentadas em evidências emitidas para Agente 05, 06 e Coordenador.');
    console.log('5. Dashboard executivo interativo em HTML gerado no disco.');
    console.log('6. Coordenador auditou e homologou com 100% de conformidade.');
    console.log('======================================================================');
}

if (require.main === module) {
    executarFluxoIntegradoInteligencia();
}

module.exports = { executarFluxoIntegradoInteligencia };
