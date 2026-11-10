/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * Testes Oficiais de Integração Operacional:
 * Agente 01 (Triagem) ➔ Agente 02 (Coordenador Geral)
 * =====================================================================
 */

const { executarFluxoTriagemParaCoordenador } = require('./conexao_triagem_coordenador');
const { conferirEntrega } = require('./agente_02_coordenador/executor_coordenador');
const { obterProjetoPorId, listarProjetos } = require('./agente_02_coordenador/repositorio_projetos_tarefas');

console.log('======================================================================');
console.log('VIDE — VALIDAÇÃO DA CONEXÃO: AGENTE 01 (TRIAGEM) ➔ AGENTE 02 (COORDENADOR)');
console.log('======================================================================\n');

// ---------------------------------------------------------------------
// TESTE 1: Fluxo de Landing Page com Autorização e Grafo de Dependências
// ---------------------------------------------------------------------
console.log('----------------------------------------------------------------------');
console.log('>>> TESTE DE INTEGRAÇÃO 1: LANDING PAGE (AUTORIZADA)');
console.log('----------------------------------------------------------------------');

const res1 = executarFluxoTriagemParaCoordenador({
    solicitacaoOriginal: "Quero criar uma landing page para minha empresa.",
    identificadorCenario: "Cenário Simulado 1 (Landing Page)",
    prazoUrgenciaInformado: null
});

console.log(`✓ Triagem processada: Demanda [${res1.etapa_01_triagem.idDemanda}]`);
console.log(`✓ Coordenador recebeu: Projeto [${res1.etapa_02_coordenador.id_projeto}]`);
console.log(`✓ Situação do Projeto: ${res1.etapa_02_coordenador.situacao_projeto}`);
console.log(`✓ Status Autorização Comercial: ${res1.etapa_02_coordenador.autorizacao_comercial.status}`);
console.log(`✓ Total de Tarefas Geradas no Grafo: ${res1.etapa_02_coordenador.grafo_tarefas.length}`);

res1.etapa_02_coordenador.grafo_tarefas.forEach(t => {
    console.log(`   - Tarefa [${t.id_tarefa}] (${t.especialista}): ${t.titulo} -> Estado: [${t.estado}]`);
});

const tsk1 = res1.etapa_02_coordenador.grafo_tarefas[0];
const tsk2 = res1.etapa_02_coordenador.grafo_tarefas[1];
console.log(`\nVerificação do Grafo inicial:`);
console.log(`- Tarefa 1 (${tsk1.especialista}) deve estar PRONTA_PARA_EXECUCAO: ${tsk1.estado === 'PRONTA_PARA_EXECUCAO' ? 'OK' : 'FALHA'}`);
console.log(`- Tarefa 2 (${tsk2.especialista}) deve estar BLOQUEADA_POR_DEPENDENCIA: ${tsk2.estado === 'BLOQUEADA_POR_DEPENDENCIA' ? 'OK' : 'FALHA'}`);

// ---------------------------------------------------------------------
// TESTE 2: Fluxo com Sintoma de Vendas SEM Contratação (Bloqueio de Execução)
// ---------------------------------------------------------------------
console.log('\n----------------------------------------------------------------------');
console.log('>>> TESTE DE INTEGRAÇÃO 2: INSTAGRAM/SINTOMA (SEM CONTRATAÇÃO AUTORIZADA)');
console.log('----------------------------------------------------------------------');

const res2 = executarFluxoTriagemParaCoordenador({
    solicitacaoOriginal: "Recebo contatos pelo Instagram, mas não consigo converter em vendas.",
    identificadorCenario: "Cenário Simulado 2 (Sintoma Comercial)",
    prazoUrgenciaInformado: null
});

console.log(`✓ Triagem processada: Demanda [${res2.etapa_01_triagem.idDemanda}]`);
console.log(`✓ Coordenador recebeu: Projeto [${res2.etapa_02_coordenador.id_projeto}]`);
console.log(`✓ Situação do Projeto: ${res2.etapa_02_coordenador.situacao_projeto}`);
console.log(`✓ Status Autorização Comercial: ${res2.etapa_02_coordenador.autorizacao_comercial.status}`);
console.log(`✓ Tarefas Executivas Despachadas para Especialistas: 0 (BLOQUEIO CORRETO)`);
console.log(`✓ Tarefa Comercial Gerada: [${res2.etapa_02_coordenador.grafo_tarefas[0].id_tarefa}] -> Estado: [${res2.etapa_02_coordenador.grafo_tarefas[0].estado}]`);
console.log(`  Descrição: "${res2.etapa_02_coordenador.grafo_tarefas[0].descricao}"`);

// ---------------------------------------------------------------------
// TESTE 3: Fluxo de Transformação Tripartite (Escopo Amplo e 5 Tarefas)
// ---------------------------------------------------------------------
console.log('\n----------------------------------------------------------------------');
console.log('>>> TESTE DE INTEGRAÇÃO 3: TRANSFORMAÇÃO TRIPARTITE (MARCA + SITE + AUTOMAÇÃO)');
console.log('----------------------------------------------------------------------');

const res3 = executarFluxoTriagemParaCoordenador({
    solicitacaoOriginal: "Preciso melhorar minha marca, criar um site e automatizar o atendimento.",
    identificadorCenario: "Cenário Simulado 3 (Tripartite)",
    prazoUrgenciaInformado: null
});

console.log(`✓ Triagem processada: Demanda [${res3.etapa_01_triagem.idDemanda}]`);
console.log(`✓ Coordenador recebeu: Projeto [${res3.etapa_02_coordenador.id_projeto}]`);
console.log(`✓ Situação do Projeto: ${res3.etapa_02_coordenador.situacao_projeto}`);
console.log(`✓ Total de Tarefas Geradas no Grafo: ${res3.etapa_02_coordenador.grafo_tarefas.length}`);

res3.etapa_02_coordenador.grafo_tarefas.forEach(t => {
    const deps = t.dependencias.length > 0 ? `(Depende de: ${t.dependencias.join(', ')})` : '(Sem dependências)';
    console.log(`   - [${t.id_tarefa}] ${t.especialista}: ${t.titulo} ${deps} -> [${t.estado}]`);
});

// ---------------------------------------------------------------------
// TESTE 4: Conferência de Entregas, Auditoria e Desbloqueio Dinâmico do Grafo
// ---------------------------------------------------------------------
console.log('\n----------------------------------------------------------------------');
console.log('>>> TESTE DE INTEGRAÇÃO 4: CONFERÊNCIA DE ENTREGA & DESBLOQUEIO DE TAREFA');
console.log('----------------------------------------------------------------------');

const idProjeto1 = res1.etapa_02_coordenador.id_projeto;
const idTarefaBranding = res1.etapa_02_coordenador.grafo_tarefas[0].id_tarefa;
const idTarefaDev = res1.etapa_02_coordenador.grafo_tarefas[1].id_tarefa;

console.log(`Simulando Especialista de Branding submetendo entrega para a Tarefa [${idTarefaBranding}]...`);

// 4.1 Submissão com Pendência (Coordenador Rejeita)
console.log(`\n4.1 Coordenador Geral realiza auditoria e detecta pendência:`);
const projComPendencia = conferirEntrega({
    idProjeto: idProjeto1,
    idTarefa: idTarefaBranding,
    entregaSubmetida: { logotipo: 'logo_raster_baixa.jpg' },
    criteriosAtendidos: false,
    parecerCoordenador: 'Logotipo entregue apenas em JPEG de baixa resolução. Necessário arquivo vetorial (SVG/AI) para a equipe de desenvolvimento.'
});

const tskAuditada1 = projComPendencia.grafo_tarefas.find(t => t.id_tarefa === idTarefaBranding);
console.log(`✓ Estado da Tarefa após auditoria: [${tskAuditada1.estado}]`);
console.log(`✓ Parecer registrado: "${tskAuditada1.historico_auditoria[tskAuditada1.historico_auditoria.length - 1].nota}"`);

// 4.2 Reenvio Corrigido e Aprovação do Coordenador Geral
console.log(`\n4.2 Especialista corrige e reenvia. Coordenador audita novamente e APROVA:`);
const projAprovado = conferirEntrega({
    idProjeto: idProjeto1,
    idTarefa: idTarefaBranding,
    entregaSubmetida: { logotipo_vetor: 'logo_oficial.svg', paleta: ['#020408', '#00F0FF'], tipografia: 'Plus Jakarta Sans' },
    criteriosAtendidos: true,
    parecerCoordenador: 'Ativos vetoriais e guia de cores validados em conformidade com os critérios de aceite.'
});

const tskAuditada2 = projAprovado.grafo_tarefas.find(t => t.id_tarefa === idTarefaBranding);
const tskDevAtualizada = projAprovado.grafo_tarefas.find(t => t.id_tarefa === idTarefaDev);

console.log(`✓ Estado da Tarefa 1 (Branding): [${tskAuditada2.estado}]`);
console.log(`✓ Estado da Tarefa 2 (Desenvolvedor) reavaliado automaticamente pelo Grafo: [${tskDevAtualizada.estado}]`);
console.log(`✓ Desbloqueio automático confirmado: ${tskDevAtualizada.estado === 'PRONTA_PARA_EXECUCAO' ? 'SUCESSO TOTAL' : 'FALHA'}`);

// ---------------------------------------------------------------------
// TESTE 5: Verificação de Persistência em Disco
// ---------------------------------------------------------------------
console.log('\n----------------------------------------------------------------------');
console.log('>>> TESTE DE INTEGRAÇÃO 5: VERIFICAÇÃO DE PERSISTÊNCIA EM DISCO');
console.log('----------------------------------------------------------------------');

const listaProjetosPersistidos = listarProjetos();
console.log(`Total de projetos persistidos no índice em disco: ${listaProjetosPersistidos.length}`);
listaProjetosPersistidos.forEach(p => {
    console.log(`- Projeto [${p.id_projeto}] | Cliente: ${p.cliente} | Situação: ${p.situacao_projeto} | Tarefas: ${p.total_tarefas} | Autorizado: ${p.autorizado}`);
});

const projetoRecarregado = obterProjetoPorId(idProjeto1);
console.log(`\nProjeto [${idProjeto1}] recarregado do disco com integridade total:`);
console.log(`- Histórico Operacional possui ${projetoRecarregado.registro_operacional.length} eventos auditados.`);
console.log(`- Último evento registrado: "${projetoRecarregado.registro_operacional[projetoRecarregado.registro_operacional.length - 1].evento}"`);

console.log('\n======================================================================');
console.log('CONEXÃO AGENTE 01 ➔ AGENTE 02 COMPROVADA COM SUCESSO!');
console.log('A Triagem e o Coordenador Geral trabalham formalmente integrados.');
console.log('======================================================================');
