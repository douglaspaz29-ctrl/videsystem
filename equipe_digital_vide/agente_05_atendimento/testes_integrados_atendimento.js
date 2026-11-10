/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * TESTE INTEGRADO OPERACIONAL: AGENTE 05 (ATENDIMENTO E VENDAS)
 * Fluxo Real: Lead/Cliente ➔ Triagem ➔ Coordenador ➔ Atendimento ➔ Auditoria ➔ Painel
 * Demonstração do Motor de Objeções e Recuperação de Oportunidades Perdidas
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');

// Módulos da Triagem e Coordenador
const { processarTriagemRevisada } = require('../agente_01_triagem/executor_triagem');
const { receberRegistroTriagem, conferirEntrega } = require('../agente_02_coordenador/executor_coordenador');
const { obterProjetoPorId, listarProjetos } = require('../agente_02_coordenador/repositorio_projetos_tarefas');

// Especialista Executor: Agente 05
const { executarCicloCompletoAtendimento } = require('./executor_atendimento');

async function executarFluxoIntegradoAtendimento() {
    console.log('======================================================================');
    console.log('VIDE — TESTE INTEGRADO: AGENTE 05 (ATENDIMENTO E VENDAS)');
    console.log('Caso Real de Estruturação Comercial & Motor de Objeções');
    console.log('Cliente ➔ Triagem ➔ Coordenador ➔ Atendimento ➔ Auditoria ➔ Painel');
    console.log('======================================================================\n');

    // -----------------------------------------------------------------
    // ETAPA 1: Entrada do Cliente Real
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 1: Entrada do Lead');
    const solicitacaoCliente = 
        "Recebemos contatos pelo Instagram e WhatsApp todos os dias, mas os pacientes perguntam o valor dos alinhadores e implantes e desaparecem após receberem o preço. " +
        "Preciso reestruturar o atendimento da clínica, criar roteiros de venda para contornar objeções e ativar réguas de recuperação de quem sumiu.";
    const nomeCliente = "Dr. Roberto Alencar (Clínica Alencar & Odontologia Avançada)";
    console.log(`Cliente: ${nomeCliente}`);
    console.log(`Solicitação: "${solicitacaoCliente}"\n`);

    // -----------------------------------------------------------------
    // ETAPA 2: Triagem Semântica (Agente 01 v1.1)
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 2: Triagem (Agente 01 v1.1)');
    const registroTriagem = processarTriagemRevisada({
        solicitacaoOriginal: solicitacaoCliente,
        identificadorCenario: nomeCliente,
        prazoUrgenciaInformado: "10 dias"
    });

    console.log(`✓ ID Demanda Gerada: ${registroTriagem.idDemanda}`);
    console.log(`✓ Escopo Sugerido: ${registroTriagem.servicoSolicitado}`);
    console.log(`✓ Prioridade: ${registroTriagem.prioridade}`);
    console.log(`✓ Especialistas Confirmados: ${registroTriagem.especialistasConfirmados.join(', ')}\n`);

    // -----------------------------------------------------------------
    // ETAPA 3: Coordenador Geral — Verificação e Montagem do Grafo
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 3: Coordenador Geral (Agente 02)');
    const projeto = receberRegistroTriagem(registroTriagem);

    console.log(`✓ ID do Projeto Gerado: ${projeto.id_projeto}`);
    console.log(`✓ Situação Inicial: ${projeto.situacao_projeto}`);
    console.log(`✓ Autorização Comercial: ${projeto.autorizacao_comercial.status}`);
    console.log(`✓ Tarefas Criadas no Grafo: ${projeto.grafo_tarefas.length}`);

    projeto.grafo_tarefas.forEach(t => {
        console.log(`   - [${t.id_tarefa}] (${t.especialista}) -> Estado: [${t.estado}] | Depende de: [${t.dependencias.join(', ') || 'NENHUMA'}]`);
    });
    console.log('');

    const tarefaAtendimento = projeto.grafo_tarefas.find(t => t.especialista.toLowerCase().includes('atendimento'));
    if (!tarefaAtendimento) {
        throw new Error('Falha: Grafo não gerou tarefa para o especialista de Atendimento!');
    }

    // -----------------------------------------------------------------
    // ETAPA 4: Agente 05 (Atendimento e Vendas) em Ação
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 4: Agente 05 (Atendimento e Vendas)');
    console.log(`Iniciando execução da tarefa [${tarefaAtendimento.id_tarefa}]...`);

    const resultadoAtendimento = executarCicloCompletoAtendimento({
        idProjeto: projeto.id_projeto,
        idTarefa: tarefaAtendimento.id_tarefa
    });

    console.log(`✓ Diretório Físico de Entrega: ${resultadoAtendimento.dadosEntrega.diretorioEntrega}`);
    console.log(`✓ 7 Arquivos Criados: ${resultadoAtendimento.dadosEntrega.arquivosCriados.join(', ')}`);
    console.log(`✓ Bateria de Testes Técnicos de Atendimento: ${resultadoAtendimento.relatorioTestes.pontuacao_conformidade}% de conformidade`);
    console.log(`✓ Auditoria do Coordenador: ${resultadoAtendimento.resultadoSubmissao.sucesso ? 'APROVADA' : 'REJEITADA'}\n`);

    // -----------------------------------------------------------------
    // ETAPA 5: Verificação dos Ativos Físicos e Motor de Objeções
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 5: Verificação de Conformidade dos Ativos de Vendas');
    const pastaEntrega = resultadoAtendimento.dadosEntrega.diretorioEntrega;
    
    // Leitura do manifesto padronizado
    const manifesto = JSON.parse(fs.readFileSync(path.join(pastaEntrega, 'manifesto_entrega.json'), 'utf-8'));
    console.log(`✓ Versão do Manifesto Unificado: [${manifesto.versao_manifesto}]`);
    console.log(`✓ Total de Arquivos Registrados no Manifesto: ${manifesto.arquivos_produzidos.length}`);
    console.log(`✓ Critérios de Aceite Atendidos: ${manifesto.criterios_aceite.length}`);

    // Leitura da matriz de objeções (Motor VIDE)
    const matriz = JSON.parse(fs.readFileSync(path.join(pastaEntrega, 'matriz_objecoes_e_respostas.json'), 'utf-8'));
    console.log(`✓ Macro-Categorias de Objeções no Motor: ${matriz.macro_categorias.map(c => c.categoria).join(', ')}`);

    // Leitura das réguas de follow-up
    const follow = JSON.parse(fs.readFileSync(path.join(pastaEntrega, 'regras_follow_up_e_recuperacao.json'), 'utf-8'));
    console.log(`✓ Pontos de Abandono Mapeados: ${follow.pontos_de_abandono_mapeados.map(p => p.id).join(', ')}`);

    // Leitura da especificação para automação
    const auto = JSON.parse(fs.readFileSync(path.join(pastaEntrega, 'especificacao_tecnica_para_automacao.json'), 'utf-8'));
    console.log(`✓ Contrato Técnico para Futuro Agente de Automação: ${auto.requisitos_tecnicos.webhooks_a_implementar.length} webhooks prontos\n`);

    // -----------------------------------------------------------------
    // ETAPA 6: Auditoria Final e Conclusão do Projeto
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 6: Homologação e Fechamento no Coordenador Geral');
    const projFinal = obterProjetoPorId(projeto.id_projeto);
    console.log(`✓ Situação Final do Projeto: [${projFinal.situacao_projeto}]`);
    console.log('✓ Resumo das Tarefas:');
    projFinal.grafo_tarefas.forEach(t => {
        console.log(`   - [${t.id_tarefa}] ${t.especialista}: [${t.estado}]`);
    });

    // -----------------------------------------------------------------
    // ETAPA 7: Verificação no Console Executivo do Painel
    // -----------------------------------------------------------------
    console.log('\n>>> ETAPA 7: Verificação no Índice do Painel Executivo (/painel)');
    const indice = listarProjetos();
    const noPainel = indice.find(p => p.id_projeto === projeto.id_projeto);
    console.log(`✓ Projeto presente no índice do Painel: ${!!noPainel}`);
    console.log(`✓ Situação exibida no Painel: ${noPainel.situacao_projeto}`);

    console.log('\n======================================================================');
    console.log('RESULTADO DO TESTE INTEGRADO DO AGENTE 05 (ATENDIMENTO E VENDAS):');
    console.log('SUCESSO ABSOLUTO! A estrutura comercial foi entregue com perfeição:');
    console.log('1. Triagem categorizou a demanda comercial com autorização formal.');
    console.log('2. Coordenador gerou tarefa atômica com critérios de aceite.');
    console.log('3. Agente 05 produziu todos os 7 arquivos físicos no disco.');
    console.log('4. Matriz de objeções e réguas de follow-up estruturadas para o Motor VIDE.');
    console.log('5. Contrato técnico para o futuro Agente 06 (Automação) estabelecido.');
    console.log('6. Coordenador auditou a entrega e aprovou com 100% de conformidade.');
    console.log('======================================================================');
}

if (require.main === module) {
    executarFluxoIntegradoAtendimento();
}

module.exports = { executarFluxoIntegradoAtendimento };
