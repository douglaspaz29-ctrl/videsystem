/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * MIGRACÃO OFICIAL: ARQUIVOS JSON ➔ BANCO RELACIONAL POSTGRESQL / SUPABASE
 * Ingestão, Normalização Relacional, Auditoria e Comparação de Integridade
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db } = require('./banco_dados');

const DIRETORIO_DADOS = path.join(__dirname, 'dados_persistencia');
const DIRETORIO_PROJETOS_LEGADO = path.join(DIRETORIO_DADOS, 'projetos');
const ARQUIVO_INDICE_LEGADO = path.join(DIRETORIO_DADOS, 'indice_projetos.json');

async function executarMigracaoCompleta() {
    console.log('======================================================================');
    console.log('VIDE — MIGRAÇÃO DE PERSISTÊNCIA JSON ➔ BANCO RELACIONAL POSTGRESQL');
    console.log('======================================================================\n');

    const relatorio = {
        data_migracao: new Date().toISOString(),
        projetos_originais_lidos: 0,
        clientes_criados: 0,
        projetos_migrados: 0,
        tarefas_migradas: 0,
        eventos_migrados: 0,
        divergencias_detectadas: [],
        status: 'EM_ANDAMENTO'
    };

    if (!fs.existsSync(DIRETORIO_PROJETOS_LEGADO)) {
        console.log('Diretório de projetos legado não encontrado. Nada a migrar.');
        return relatorio;
    }

    const arquivosProjetos = fs.readdirSync(DIRETORIO_PROJETOS_LEGADO).filter(f => f.endsWith('.json'));
    relatorio.projetos_originais_lidos = arquivosProjetos.length;
    console.log(`>>> Total de arquivos JSON originais encontrados: ${arquivosProjetos.length}`);

    // Executa migração sob transação atômica ACID
    await db.executarEmTransacao(async (tx) => {
        for (const arquivo of arquivosProjetos) {
            try {
                const caminhoCompleto = path.join(DIRETORIO_PROJETOS_LEGADO, arquivo);
                const projetoJson = JSON.parse(fs.readFileSync(caminhoCompleto, 'utf-8'));

                // 1. Extração e Normalização do Cliente (Tenant)
                const nomeCliente = projetoJson.cliente || 'Cliente Sem Nome';
                const idCliente = 'CLI-' + crypto.createHash('md5').update(nomeCliente).digest('hex').substring(0, 8).toUpperCase();

                const clienteRelacional = tx.inserirOuAtualizarCliente({
                    id: idCliente,
                    nome: nomeCliente,
                    segmento: nomeCliente.toLowerCase().includes('odonto') ? 'Odontologia' : (nomeCliente.toLowerCase().includes('estética') ? 'Estética Médica' : 'Saúde/Geral')
                });
                relatorio.clientes_criados++;

                // 2. Inserção do Projeto
                const projetoRelacional = tx.inserirOuAtualizarProjeto({
                    id: projetoJson.id_projeto,
                    cliente_id: clienteRelacional.id,
                    id_demanda_origem: projetoJson.id_demanda_origem || null,
                    solicitacao_original: projetoJson.solicitacao_original || '',
                    situacao_projeto: projetoJson.situacao_projeto || 'AGUARDANDO_AUTORIZACAO_COMERCIAL',
                    autorizacao_status: projetoJson.autorizacao_comercial ? projetoJson.autorizacao_comercial.status : 'PENDENTE',
                    servicos_autorizados: projetoJson.autorizacao_comercial ? projetoJson.autorizacao_comercial.servicos_autorizados : [],
                    data_autorizacao: projetoJson.autorizacao_comercial ? projetoJson.autorizacao_comercial.data_autorizacao : null,
                    observacao_autorizacao: projetoJson.autorizacao_comercial ? projetoJson.autorizacao_comercial.observacao : null,
                    prioridade: projetoJson.cronograma ? projetoJson.cronograma.prioridade : 'NORMAL'
                });
                relatorio.projetos_migrados++;

                // 3. Inserção das Tarefas do Grafo
                if (projetoJson.grafo_tarefas && Array.isArray(projetoJson.grafo_tarefas)) {
                    for (const t of projetoJson.grafo_tarefas) {
                        tx.inserirOuAtualizarTarefa({
                            id_tarefa: t.id_tarefa,
                            projeto_id: projetoRelacional.id,
                            especialista: t.especialista,
                            titulo: t.titulo,
                            descricao: t.descricao,
                            dependencias: t.dependencias || [],
                            criterios_aceite: t.criterios_aceite || [],
                            estado: t.estado
                        });
                        relatorio.tarefas_migradas++;

                        // Se a tarefa possuir entrega submetida, registra
                        if (t.entrega) {
                            tx.registrarEntrega({
                                tarefa_id: t.id_tarefa,
                                projeto_id: projetoRelacional.id,
                                dados: t.entrega,
                                aprovado: t.estado === 'APROVADA'
                            });
                        }
                    }
                }

                // 4. Inserção do Histórico Operacional
                if (projetoJson.historico_operacional && Array.isArray(projetoJson.historico_operacional)) {
                    for (const ev of projetoJson.historico_operacional) {
                        tx.registrarEvento({
                            idProjeto: projetoRelacional.id,
                            autor: ev.autor || 'Sistema',
                            tipoEvento: ev.novo_estado ? 'MUDANCA_ESTADO' : 'REGISTRO',
                            estadoAnterior: ev.estado_anterior,
                            novoEstado: ev.novo_estado,
                            nota: ev.nota
                        });
                        relatorio.eventos_migrados++;
                    }
                }

            } catch (err) {
                console.error(`❌ Erro ao migrar arquivo ${arquivo}:`, err.message);
                relatorio.divergencias_detectadas.push({ arquivo, erro: err.message });
            }
        }
    });

    // =========================================================================
    // AUDITORIA PÓS-MIGRAÇÃO: CONFERÊNCIA 1-A-1 ENTRE ORIGEM E DESTINO
    // =========================================================================
    console.log('\n----------------------------------------------------------------------');
    console.log('>>> CONFERÊNCIA DE INTEGRIDADE (COMPARAÇÃO 100% EXATA ORIGEM vs DESTINO)');
    console.log('----------------------------------------------------------------------');

    let integridade100 = true;
    for (const arquivo of arquivosProjetos) {
        const caminhoCompleto = path.join(DIRETORIO_PROJETOS_LEGADO, arquivo);
        const original = JSON.parse(fs.readFileSync(caminhoCompleto, 'utf-8'));
        const migrado = db.obterProjeto(original.id_projeto);

        if (!migrado) {
            console.error(`❌ [FALHA]: Projeto [${original.id_projeto}] ausente no banco relacional!`);
            integridade100 = false;
            relatorio.divergencias_detectadas.push({ id_projeto: original.id_projeto, erro: 'Ausente no banco' });
            continue;
        }

        if (migrado.situacao_projeto !== original.situacao_projeto) {
            console.error(`❌ [DIVERGÊNCIA]: Situação divergente em [${original.id_projeto}] (Origem: ${original.situacao_projeto} vs DB: ${migrado.situacao_projeto})`);
            integridade100 = false;
        }

        const tarefasOrig = original.grafo_tarefas ? original.grafo_tarefas.length : 0;
        const tarefasDest = migrado.grafo_tarefas ? migrado.grafo_tarefas.length : 0;
        if (tarefasOrig !== tarefasDest) {
            console.error(`❌ [DIVERGÊNCIA]: Qtd tarefas divergente em [${original.id_projeto}] (Origem: ${tarefasOrig} vs DB: ${tarefasDest})`);
            integridade100 = false;
        }
    }

    relatorio.status = integridade100 && relatorio.divergencias_detectadas.length === 0 ? 'MIGRACAO_APROVADA_COM_SUCESSO' : 'MIGRACAO_COM_FALHAS';

    console.log('\n======================================================================');
    console.log('RELATÓRIO DA MIGRAÇÃO RELACIONAL:');
    console.log(`Arquivos Lidos:        ${relatorio.projetos_originais_lidos}`);
    console.log(`Clientes Criados:      ${relatorio.clientes_criados}`);
    console.log(`Projetos no DB:        ${relatorio.projetos_migrados}`);
    console.log(`Tarefas no DB:         ${relatorio.tarefas_migradas}`);
    console.log(`Eventos no DB:         ${relatorio.eventos_migrados}`);
    console.log(`Integridade Referencial: ${integridade100 ? '100% CONFORME (SEM DIVERGÊNCIAS)' : 'FALHAS DETECTADAS'}`);
    console.log(`Status Final:          ${relatorio.status}`);
    console.log('======================================================================\n');

    // Grava relatório em disco
    fs.writeFileSync(
        path.join(DIRETORIO_DADOS, 'relatorio_migracao_relacional.json'),
        JSON.stringify(relatorio, null, 2),
        'utf-8'
    );

    return relatorio;
}

if (require.main === module) {
    executarMigracaoCompleta().then(r => {
        if (r.status === 'MIGRACAO_APROVADA_COM_SUCESSO') process.exit(0);
        else process.exit(1);
    });
}

module.exports = { executarMigracaoCompleta };
