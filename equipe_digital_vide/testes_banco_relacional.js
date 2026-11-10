/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * BATERIA DE TESTES: BANCO DE DADOS RELACIONAL, TRANSAÇÕES E MULTI-TENANT
 * =====================================================================
 */

const { db } = require('./banco_dados');

async function executarTestesBanco() {
    console.log('======================================================================');
    console.log('VIDE — TESTES UNITÁRIOS DO BANCO DE DADOS RELACIONAL (POSTGRESQL)');
    console.log('Integridade Referencial, Transações ACID, Isolamento e Concorrência');
    console.log('======================================================================\n');

    let total = 0;
    let aprovados = 0;

    function assert(nome, condicao, detalhe) {
        total++;
        if (condicao) {
            aprovados++;
            console.log(`✓ [APROVADO] ${nome}`);
        } else {
            console.error(`❌ [REPROVADO] ${nome}: ${detalhe}`);
        }
    }

    // 1. Inserção de Cliente e Projeto
    console.log('>>> TESTE 1: Inserção de Cliente e Integridade de Projeto');
    const cli1 = db.inserirOuAtualizarCliente({
        id: 'CLI-TESTE-001',
        nome: 'Hospital Integrado São Lucas',
        segmento: 'Saúde Hospitalar',
        ticket_medio: 15000
    });
    assert('1.1 Cliente Inserido', cli1 && cli1.id === 'CLI-TESTE-001', 'Falha ao inserir cliente');

    const proj1 = db.inserirOuAtualizarProjeto({
        id: 'PRJ-TESTE-SQL-01',
        cliente_id: 'CLI-TESTE-001',
        solicitacao_original: 'Desenvolvimento de portal hospitalar e atendimento automatizado.',
        situacao_projeto: 'EM_EXECUCAO',
        autorizacao_status: 'AUTORIZADO'
    });
    assert('1.2 Projeto Relacionado ao Cliente', proj1 && proj1.cliente_id === 'CLI-TESTE-001', 'Falha ao relacionar projeto');

    // 2. Tarefas e Integridade Referencial (FK)
    console.log('\n>>> TESTE 2: Tarefas e Chaves Estrangeiras');
    const tsk1 = db.inserirOuAtualizarTarefa({
        id_tarefa: 'TSK-TESTE-SQL-01',
        projeto_id: 'PRJ-TESTE-SQL-01',
        especialista: 'Desenvolvedor',
        titulo: 'Desenvolvimento do Portal',
        estado: 'PRONTA_PARA_EXECUCAO'
    });
    assert('2.1 Tarefa Inserida com FK Válida', tsk1 && tsk1.projeto_id === 'PRJ-TESTE-SQL-01', 'Falha ao inserir tarefa');

    let bloqueouFk = false;
    try {
        db.inserirOuAtualizarTarefa({
            id_tarefa: 'TSK-INVALIDA',
            projeto_id: 'PRJ-INEXISTENTE-999',
            especialista: 'Desenvolvedor',
            titulo: 'Tarefa Orfã'
        });
    } catch (e) {
        bloqueouFk = e.message.includes('[FK_ERRO]');
    }
    assert('2.2 Bloqueio de Chave Estrangeira Inválida', bloqueouFk, 'Deveria ter impedido tarefa órfã sem projeto');

    // 3. Transações ACID com Rollback Automático
    console.log('\n>>> TESTE 3: Transações ACID e Rollback');
    const idProjTransacao = 'PRJ-TRANSACAO-FAIL';
    let deuErroEsperado = false;

    try {
        await db.executarEmTransacao(async (tx) => {
            tx.inserirOuAtualizarCliente({ id: 'CLI-TRANS-01', nome: 'Cliente Transação' });
            tx.inserirOuAtualizarProjeto({
                id: idProjTransacao,
                cliente_id: 'CLI-TRANS-01',
                solicitacao_original: 'Projeto que falhará no meio'
            });
            // Simula erro no meio da transação
            throw new Error('[SIMULACAO_ERRO] Falha crítica antes de concluir!');
        });
    } catch (e) {
        deuErroEsperado = e.message.includes('[SIMULACAO_ERRO]');
    }

    const projAposRollback = db.obterProjeto(idProjTransacao);
    const rollbackPerfeito = deuErroEsperado && projAposRollback === null;
    assert('3.1 Transação Sofre Rollback Integral em Caso de Falha', rollbackPerfeito, 
        `Projeto existe após rollback: ${!!projAposRollback}`);

    // 4. Isolamento Multi-Tenant por Cliente
    console.log('\n>>> TESTE 4: Isolamento Multi-Tenant por Cliente');
    const cliA = db.inserirOuAtualizarCliente({ id: 'CLI-TENANT-A', nome: 'Clínica A' });
    const cliB = db.inserirOuAtualizarCliente({ id: 'CLI-TENANT-B', nome: 'Clínica B' });

    db.inserirOuAtualizarProjeto({ id: 'PRJ-A-01', cliente_id: cliA.id, solicitacao_original: 'Proj A' });
    db.inserirOuAtualizarProjeto({ id: 'PRJ-B-01', cliente_id: cliB.id, solicitacao_original: 'Proj B' });

    const projsA = db.listarProjetos(cliA.id);
    const projsB = db.listarProjetos(cliB.id);

    const isolamentoOk = projsA.length === 1 && projsA[0].id_projeto === 'PRJ-A-01' &&
                         projsB.length === 1 && projsB[0].id_projeto === 'PRJ-B-01';
    assert('4.1 Isolamento Rigoroso de Dados por Cliente (Multi-Tenant)', isolamentoOk,
        `Projetos A: ${projsA.map(p => p.id_projeto)} | Projetos B: ${projsB.map(p => p.id_projeto)}`);

    // 5. Concorrência Simulada (Múltiplas Operações Simultâneas)
    console.log('\n>>> TESTE 5: Concorrência Simultânea de Múltiplos Projetos');
    const promises = [];
    for (let i = 1; i <= 10; i++) {
        promises.push(new Promise((resolve) => {
            const idC = `CLI-CONC-${i}`;
            const idP = `PRJ-CONC-${i}`;
            db.inserirOuAtualizarCliente({ id: idC, nome: `Cliente Concorrente ${i}` });
            db.inserirOuAtualizarProjeto({ id: idP, cliente_id: idC, solicitacao_original: `Demanda ${i}` });
            db.inserirOuAtualizarTarefa({
                id_tarefa: `TSK-CONC-${i}`,
                projeto_id: idP,
                especialista: 'Desenvolvedor',
                titulo: `Tarefa ${i}`,
                estado: 'PRONTA_PARA_EXECUCAO'
            });
            resolve(idP);
        }));
    }

    const idsCriados = await Promise.all(promises);
    const todosPersistiram = idsCriados.every(id => db.obterProjeto(id) !== null);
    assert('5.1 Concorrência de 10 Projetos Simultâneos sem Perda', todosPersistiram, 
        `Total criados com integridade: ${idsCriados.length}/10`);

    console.log('\n======================================================================');
    console.log(`SUMÁRIO DOS TESTES DE BANCO RELACIONAL:`);
    console.log(`Total: ${total} | Aprovados: ${aprovados} | Taxa: ${Math.round((aprovados / total) * 100)}%`);
    console.log('======================================================================\n');

    return { total, aprovados, sucesso: total === aprovados };
}

if (require.main === module) {
    executarTestesBanco().then(res => {
        if (res.sucesso) process.exit(0);
        else process.exit(1);
    });
}

module.exports = { executarTestesBanco };
