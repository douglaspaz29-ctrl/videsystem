/**
 * =====================================================================
 * VIDE — TESTE DO CATÁLOGO DE SOLUÇÕES COMERCIAIS (v1.0)
 * Validação de Estrutura, Enquadramento de Demandas e Diretrizes
 * =====================================================================
 */

const assert = require('assert');
const {
    POSICIONAMENTO_COMERCIAL,
    SOLUCOES_COMERCIAIS,
    DIRETRIZES_COMERCIAIS,
    DIRETRIZES_PRECIFICACAO,
    classificarNoCatalogo,
    obterCatalogoCompleto,
    formatarCatalogoEmTexto
} = require('./catalogo_solucoes_comerciais');
const { processarTriagemRevisada } = require('./agente_01_triagem/executor_triagem');
const { receberRegistroTriagem, interpretarComandoDiretora } = require('./agente_02_coordenador/executor_coordenador');

console.log('=== INICIANDO VALIDAÇÃO DO CATÁLOGO DE SOLUÇÕES COMERCIAIS ===\n');

// 1. Validar Estrutura do Posicionamento e Soluções
console.log('1. Validando Estrutura Oficial...');
assert.ok(POSICIONAMENTO_COMERCIAL.proposito.includes('pequenos negócios'));
assert.strictEqual(Object.keys(SOLUCOES_COMERCIAIS).length, 4);
assert.ok(SOLUCOES_COMERCIAIS.PRESENCA_DIGITAL);
assert.ok(SOLUCOES_COMERCIAIS.AUTOMACAO_COMERCIAL);
assert.ok(SOLUCOES_COMERCIAIS.INTELIGENCIA_COMERCIAL);
assert.ok(SOLUCOES_COMERCIAIS.SISTEMA_INTEGRADO);
console.log('   ✓ 4 soluções oficiais estruturadas com sucesso.');

// 2. Validar Diretrizes de Precificação
console.log('2. Validando Diretrizes de Precificação...');
assert.strictEqual(SOLUCOES_COMERCIAIS.PRESENCA_DIGITAL.precificacao_regra.valor_base, 1500.00);
assert.strictEqual(SOLUCOES_COMERCIAIS.AUTOMACAO_COMERCIAL.precificacao_regra.valor_base, null);
assert.strictEqual(SOLUCOES_COMERCIAIS.INTELIGENCIA_COMERCIAL.precificacao_regra.valor_base, null);
assert.strictEqual(SOLUCOES_COMERCIAIS.SISTEMA_INTEGRADO.precificacao_regra.valor_base, null);
assert.ok(DIRETRIZES_PRECIFICACAO.regra_automacao_dashboard_integrado.includes('Não estabelecer preços fixos'));
console.log('   ✓ Regras de precificação e dimensionamento validadas.');

// 3. Validar Classificação de Demandas
console.log('3. Validando Classificação de Demandas...');
const c1 = classificarNoCatalogo('Preciso de uma landing page para minha clínica de estética.');
assert.strictEqual(c1.solucao.codigo, 'VIDE_PRESENCA_DIGITAL');

const c2 = classificarNoCatalogo('Quero automatizar o atendimento dos contatos do WhatsApp comercial.');
assert.strictEqual(c2.solucao.codigo, 'VIDE_AUTOMACAO_COMERCIAL');

const c3 = classificarNoCatalogo('Preciso de um dashboard para analisar por que estamos perdendo oportunidades.');
assert.strictEqual(c3.solucao.codigo, 'VIDE_INTELIGENCIA_COMERCIAL');

const c4 = classificarNoCatalogo('Quero criar um site novo, automatizar o atendimento e acompanhar em um dashboard.');
assert.strictEqual(c4.solucao.codigo, 'VIDE_SISTEMA_INTEGRADO');
console.log('   ✓ Enquadramento dos 4 cenários no catálogo validado com 100% de precisão.');

// 4. Validar Integração com a Triagem (Agente 01)
console.log('4. Validando Integração com a Triagem Comercial (Agente 01)...');
const triagem = processarTriagemRevisada({
    solicitacaoOriginal: 'Quero criar uma landing page para minha empresa.',
    identificadorCenario: 'PME Odonto',
    prazoUrgenciaInformado: '30 dias'
});
assert.ok(triagem.catalogo_solucoes);
assert.strictEqual(triagem.catalogo_solucoes.solucao.codigo, 'VIDE_PRESENCA_DIGITAL');
assert.strictEqual(triagem.enquadramento_catalogo, 'VIDE Presença Digital');
console.log('   ✓ Triagem enquadrou a demanda no catálogo com sucesso.');

// 5. Validar Integração com o Coordenador Geral (Agente 02)
console.log('5. Validando Integração com o Coordenador Geral (Agente 02)...');
const prj = receberRegistroTriagem(triagem);
assert.ok(prj.solucao_catalogo);
assert.strictEqual(prj.solucao_catalogo.solucao.codigo, 'VIDE_PRESENCA_DIGITAL');

// Comando de Terminal para consulta de catálogo
const cmdRes = interpretarComandoDiretora('catalogo de solucoes');
assert.strictEqual(cmdRes.sucesso, true);
assert.ok(cmdRes.resposta.includes('VIDE — CATÁLOGO DE SOLUÇÕES COMERCIAIS'));
assert.ok(cmdRes.resposta.includes('VIDE Presença Digital'));
assert.ok(cmdRes.resposta.includes('VIDE Automação Comercial'));
assert.ok(cmdRes.resposta.includes('VIDE Inteligência Comercial'));
assert.ok(cmdRes.resposta.includes('VIDE Sistema Integrado'));
console.log('   ✓ Comando "catalogo" no terminal do Coordenador operacional.');

console.log('\n=== TODOS OS TESTES DO CATÁLOGO DE SOLUÇÕES PASSARAM COM SUCESSO (100%) ===');
