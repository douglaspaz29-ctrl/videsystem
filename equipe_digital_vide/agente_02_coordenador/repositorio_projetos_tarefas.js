/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * Camada de Persistência Oficial dos Projetos e Tarefas do Coordenador Geral
 * Garante armazenamento persistente em disco, controle de estados,
 * grafo de dependências e histórico de auditoria.
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db } = require('../banco_dados');

const DIRETORIO_PERSISTENCIA = path.join(__dirname, '..', 'dados_persistencia');
const DIRETORIO_PROJETOS = path.join(DIRETORIO_PERSISTENCIA, 'projetos');
const ARQUIVO_INDICE = path.join(DIRETORIO_PERSISTENCIA, 'indice_projetos.json');

// Garante que os diretórios existam
function inicializarEstrutura() {
    if (!fs.existsSync(DIRETORIO_PERSISTENCIA)) {
        fs.mkdirSync(DIRETORIO_PERSISTENCIA, { recursive: true });
    }
    if (!fs.existsSync(DIRETORIO_PROJETOS)) {
        fs.mkdirSync(DIRETORIO_PROJETOS, { recursive: true });
    }
    if (!fs.existsSync(ARQUIVO_INDICE)) {
        fs.writeFileSync(ARQUIVO_INDICE, JSON.stringify({ projetos: [], atualizado_em: new Date().toISOString() }, null, 2), 'utf-8');
    }
}

inicializarEstrutura();

/**
 * Salva ou atualiza um projeto completo no armazenamento persistente
 * @param {Object} projeto 
 * @returns {Object} Projeto persistido
 */
function salvarProjeto(projeto) {
    inicializarEstrutura();
    if (!projeto.cronograma) projeto.cronograma = {};
    projeto.cronograma.atualizado_em = new Date().toISOString();

    const caminhoArquivo = path.join(DIRETORIO_PROJETOS, `${projeto.id_projeto}.json`);
    fs.writeFileSync(caminhoArquivo, JSON.stringify(projeto, null, 2), 'utf-8');

    // Sincroniza com o Banco de Dados Relacional Oficial (PostgreSQL/Supabase Adapter)
    try {
        const nomeCliente = projeto.cliente || 'Cliente Sem Nome';
        const idCliente = projeto.cliente_id || ('CLI-' + crypto.createHash('md5').update(nomeCliente).digest('hex').substring(0, 8).toUpperCase());
        projeto.cliente_id = idCliente;

        db.inserirOuAtualizarCliente({ id: idCliente, nome: nomeCliente });
        db.inserirOuAtualizarProjeto({
            id: projeto.id_projeto || projeto.id,
            cliente_id: idCliente,
            id_demanda_origem: projeto.id_demanda_origem,
            solicitacao_original: projeto.solicitacao_original,
            situacao_projeto: projeto.situacao_projeto,
            autorizacao_status: projeto.autorizacao_comercial ? projeto.autorizacao_comercial.status : 'PENDENTE',
            servicos_autorizados: projeto.autorizacao_comercial ? (projeto.autorizacao_comercial.servicos_autorizados || projeto.autorizacao_comercial.frentes_comerciais) : [],
            data_autorizacao: projeto.autorizacao_comercial ? projeto.autorizacao_comercial.data_autorizacao : null,
            observacao_autorizacao: projeto.autorizacao_comercial ? projeto.autorizacao_comercial.observacao : null,
            prioridade: (projeto.cronograma && projeto.cronograma.prioridade) || 'NORMAL',
            frentes_comerciais: projeto.frentes_comerciais || (projeto.autorizacao_comercial ? projeto.autorizacao_comercial.frentes_comerciais : []),
            escopo_autorizado: projeto.escopo_autorizado || (projeto.autorizacao_comercial ? projeto.autorizacao_comercial.escopo_autorizado : null),
            entregaveis: projeto.entregaveis || (projeto.autorizacao_comercial ? projeto.autorizacao_comercial.entregaveis : []),
            limites_trabalho: projeto.limites_trabalho || (projeto.autorizacao_comercial ? projeto.autorizacao_comercial.limites_trabalho : null),
            responsavel_aprovacao: projeto.responsavel_aprovacao || (projeto.autorizacao_comercial ? projeto.autorizacao_comercial.responsavel_aprovacao : null),
            natureza_projeto: projeto.natureza_projeto || 'SIMULADO'
        });

        if (projeto.grafo_tarefas && Array.isArray(projeto.grafo_tarefas)) {
            projeto.grafo_tarefas.forEach(t => {
                db.inserirOuAtualizarTarefa({
                    id_tarefa: t.id_tarefa || t.id,
                    id: t.id_tarefa || t.id,
                    projeto_id: projeto.id_projeto || projeto.id,
                    agente_id: t.agente_id,
                    especialista: t.especialista,
                    titulo: t.titulo || t.titulo_tarefa,
                    descricao: t.descricao || t.objetivo,
                    objetivo: t.objetivo || t.descricao,
                    entradas_necessarias: t.entradas_necessarias || [],
                    dependencias: t.dependencias || [],
                    resultado_esperado: t.resultado_esperado,
                    criterio_conclusao: t.criterio_conclusao || (t.criterios_aceite ? t.criterios_aceite.join('; ') : null),
                    criterios_aceite: t.criterios_aceite || [],
                    evidencias_execucao: t.evidencias_execucao || [],
                    historico_alteracoes: t.historico_alteracoes || t.historico_auditoria || [],
                    bloqueio_motivo: t.bloqueio_motivo,
                    apontamentos_correcao: t.apontamentos_correcao,
                    estado: t.estado
                });
            });
        }
    } catch (dbErr) {
        console.error('[AVISO_DB] Erro de sincronização relacional:', dbErr.message);
    }

    // Atualiza o índice geral de projetos
    const indice = JSON.parse(fs.readFileSync(ARQUIVO_INDICE, 'utf-8'));
    const pos = indice.projetos.findIndex(p => p.id_projeto === projeto.id_projeto);
    const resumo = {
        id_projeto: projeto.id_projeto,
        id_demanda_origem: projeto.id_demanda_origem,
        cliente_id: projeto.cliente_id,
        cliente: projeto.cliente,
        situacao_projeto: projeto.situacao_projeto,
        total_tarefas: projeto.grafo_tarefas ? projeto.grafo_tarefas.length : 0,
        autorizado: projeto.autorizacao_comercial ? projeto.autorizacao_comercial.status === 'AUTORIZADO' : false,
        atualizado_em: projeto.cronograma.atualizado_em
    };

    if (pos >= 0) {
        indice.projetos[pos] = resumo;
    } else {
        indice.projetos.push(resumo);
    }
    indice.atualizado_em = new Date().toISOString();
    fs.writeFileSync(ARQUIVO_INDICE, JSON.stringify(indice, null, 2), 'utf-8');

    return projeto;
}

/**
 * Carrega um projeto persistido pelo ID com cache em disco e fallback para PostgreSQL durável
 * @param {string} idProjeto 
 * @returns {Object|null}
 */
function obterProjetoPorId(idProjeto) {
    inicializarEstrutura();
    const caminhoArquivo = path.join(DIRETORIO_PROJETOS, `${idProjeto}.json`);
    if (fs.existsSync(caminhoArquivo)) {
        try {
            return JSON.parse(fs.readFileSync(caminhoArquivo, 'utf-8'));
        } catch (_) {}
    }

    // Cache miss no disco (ex: novo container efêmero após deploy): reidrata do banco relacional
    const projDb = db.obterProjeto(idProjeto);
    if (projDb) {
        try {
            fs.writeFileSync(caminhoArquivo, JSON.stringify(projDb, null, 2), 'utf-8');
        } catch (_) {}
        return projDb;
    }
    return null;
}

/**
 * Lista todos os projetos registrados no índice ou filtrados por cliente, reidratando do PostgreSQL se necessário
 * @param {string} [filtroClienteId]
 * @returns {Array<Object>}
 */
function listarProjetos(filtroClienteId = null) {
    if (filtroClienteId) {
        return db.listarProjetos(filtroClienteId);
    }
    inicializarEstrutura();
    let lista = [];
    if (fs.existsSync(ARQUIVO_INDICE)) {
        try {
            const indice = JSON.parse(fs.readFileSync(ARQUIVO_INDICE, 'utf-8'));
            lista = indice.projetos || [];
        } catch (_) {}
    }

    // Se o índice em disco estiver vazio (restart de container), reidrata a partir do banco de dados relacional
    if (lista.length === 0) {
        const listaDb = db.listarProjetos();
        if (listaDb && listaDb.length > 0) {
            lista = listaDb;
            try {
                fs.writeFileSync(ARQUIVO_INDICE, JSON.stringify({ projetos: lista, atualizado_em: new Date().toISOString() }, null, 2), 'utf-8');
            } catch (_) {}
        }
    }
    return lista;
}

/**
 * Registra um evento no log operacional persistente do projeto
 * @param {string} idProjeto 
 * @param {string} evento 
 * @param {Object} [detalhes]
 */
function registrarEvento(idProjeto, evento, detalhes = {}) {
    const projeto = obterProjetoPorId(idProjeto);
    if (!projeto) return null;

    if (!projeto.registro_operacional) {
        projeto.registro_operacional = [];
    }

    projeto.registro_operacional.push({
        timestamp: new Date().toISOString(),
        evento,
        detalhes
    });

    return salvarProjeto(projeto);
}

/**
 * Atualiza o estado de uma tarefa com validação de dependências e auditoria
 * @param {Object} params
 * @param {string} params.idProjeto
 * @param {string} params.idTarefa
 * @param {string} params.novoEstado
 * @param {string} [params.notaAuditoria]
 * @param {string} [params.autor]
 * @returns {Object} Projeto atualizado
 */
function atualizarEstadoTarefa({ idProjeto, idTarefa, novoEstado, notaAuditoria = '', autor = 'Coordenador Geral' }) {
    const projeto = obterProjetoPorId(idProjeto);
    if (!projeto) throw new Error(`Projeto ${idProjeto} não encontrado.`);

    const tarefa = projeto.grafo_tarefas.find(t => t.id_tarefa === idTarefa);
    if (!tarefa) throw new Error(`Tarefa ${idTarefa} não encontrada no projeto ${idProjeto}.`);

    const estadoAnterior = tarefa.estado;
    tarefa.estado = novoEstado;
    tarefa.estado_tarefa = novoEstado;

    if (!tarefa.historico_auditoria) {
        tarefa.historico_auditoria = [];
    }

    tarefa.historico_auditoria.push({
        timestamp: new Date().toISOString(),
        autor,
        estado_anterior: estadoAnterior,
        novo_estado: novoEstado,
        nota: notaAuditoria
    });

    // Se a tarefa foi APROVADA ou CONCLUIDO, recalcula o grafo para liberar tarefas dependentes
    if (novoEstado === 'APROVADA' || novoEstado === 'CONCLUIDO') {
        recalcularGrafoDependencias(projeto);
    }

    // Verifica se todas as tarefas do projeto foram concluídas
    verificarConclusaoProjeto(projeto);

    if (!projeto.registro_operacional) {
        projeto.registro_operacional = [];
    }
    projeto.registro_operacional.push({
        timestamp: new Date().toISOString(),
        evento: `Tarefa [${idTarefa}] transicionou de [${estadoAnterior}] para [${novoEstado}]`,
        detalhes: {
            id_tarefa: idTarefa,
            estado_anterior: estadoAnterior,
            novo_estado: novoEstado,
            nota: notaAuditoria
        }
    });
    projeto.historico_operacional = projeto.registro_operacional;

    return salvarProjeto(projeto);
}

/**
 * Recalcula o grafo: tarefas que dependiam de tarefas aprovadas/concluídas passam a EM_EXECUCAO ou PRONTA_PARA_EXECUCAO
 * @param {Object} projeto 
 */
function recalcularGrafoDependencias(projeto) {
    if (!projeto.grafo_tarefas) return;

    projeto.grafo_tarefas.forEach(tarefa => {
        // Se a tarefa está bloqueada por dependência
        if (tarefa.estado === 'BLOQUEADA_POR_DEPENDENCIA' || tarefa.estado === 'BLOQUEADO') {
            const todasPredecessorasAprovadas = (tarefa.dependencias || []).every(depId => {
                const dep = projeto.grafo_tarefas.find(t => (t.id_tarefa === depId || t.id === depId));
                return dep && (dep.estado === 'APROVADA' || dep.estado === 'CONCLUIDO');
            });

            if (todasPredecessorasAprovadas) {
                const estadoAnterior = tarefa.estado;
                const proximoEstado = tarefa.estado === 'BLOQUEADO' ? 'EM_EXECUCAO' : 'PRONTA_PARA_EXECUCAO';
                tarefa.estado = proximoEstado;
                tarefa.estado_tarefa = proximoEstado;
                tarefa.bloqueio_motivo = null;

                if (!tarefa.historico_alteracoes) tarefa.historico_alteracoes = [];
                tarefa.historico_alteracoes.push({
                    timestamp: new Date().toISOString(),
                    autor: 'Sistema de Grafo DAG (Coordenador)',
                    estado_anterior: estadoAnterior,
                    novo_estado: proximoEstado,
                    nota: 'Todas as tarefas predecessoras foram aprovadas. Liberada para início do especialista.'
                });
                tarefa.historico_auditoria = tarefa.historico_alteracoes;
            }
        }
    });
}

/**
 * Verifica se todas as tarefas foram aprovadas/concluídas para marcar o projeto como concluído
 * @param {Object} projeto 
 */
function verificarConclusaoProjeto(projeto) {
    if (!projeto.grafo_tarefas || projeto.grafo_tarefas.length === 0) return;

    const todasConcluidas = projeto.grafo_tarefas.every(t => t.estado === 'APROVADA' || t.estado === 'CONCLUIDO');
    if (todasConcluidas && projeto.situacao_projeto !== 'CONCLUIDO') {
        projeto.situacao_projeto = 'CONCLUIDO';
        if (!projeto.registro_operacional) projeto.registro_operacional = [];
        projeto.registro_operacional.push({
            timestamp: new Date().toISOString(),
            evento: `Projeto [${projeto.id_projeto || projeto.id}] concluído com sucesso. Todas as entregas homologadas.`,
            detalhes: {
                total_tarefas: projeto.grafo_tarefas.length,
                situacao: 'CONCLUIDO'
            }
        });
        projeto.historico_operacional = projeto.registro_operacional;
    }
}

module.exports = {
    salvarProjeto,
    obterProjetoPorId,
    listarProjetos,
    atualizarEstadoTarefa,
    recalcularGrafoDependencias,
    verificarConclusaoProjeto,
    registrarEvento,
    DIRETORIO_PROJETOS
};
