/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * MÓDULO OFICIAL DE BANCO DE DADOS RELACIONAL & SUPABASE/POSTGRESQL
 * Integridade Referencial, Transações ACID, Isolamento Multi-Tenant e Auditoria
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let pg = null;
try {
    pg = require('pg');
} catch (e) {}

const CONFIG = require('./config_ambiente');

const CAMINHO_DADOS_RELACIONAIS = path.join(__dirname, 'dados_persistencia', 'vide_relacional_db.json');
const CAMINHO_LOG_TRANSACIONAIS = path.join(__dirname, 'dados_persistencia', 'vide_transacoes.log');

class BancoDadosRelacionalVIDE {
    constructor() {
        this.tabelas = {
            clientes: new Map(),
            agentes: new Map(),
            projetos: new Map(),
            tarefas: new Map(),
            entregas: new Map(),
            eventos_historico: [],
            crm_leads: new Map(),
            auditoria_admin: [],
            usuarios_sistema: new Map(),
            arquivos_armazenamento: new Map()
        };
        this.transacaoAtiva = false;
        this.snapshotTransacao = null;
        this.inicializado = false;
        this.modoRemoto = false;
        this.pgPool = null;

        if (CONFIG.DATABASE_URL && pg) {
            try {
                this.pgPool = new pg.Pool({
                    connectionString: CONFIG.DATABASE_URL,
                    ssl: CONFIG.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
                });
                this.modoRemoto = true;
                this.aplicarSchemaSeNecessario().then(() => {
                    this.hidratarDoPostgres();
                }).catch(err => {
                    console.warn('[VIDE_DB] Aviso ao sincronizar inicialização do PostgreSQL:', err.message);
                });
            } catch (e) {
                console.warn('[VIDE_DB] Falha ao instanciar Pool PostgreSQL remoto. Usando fallback local:', e.message);
            }
        }

        this.inicializar();
    }

    /**
     * Aplica o DDL oficial de tabelas no PostgreSQL remoto de forma idempotente (IF NOT EXISTS)
     */
    async aplicarSchemaSeNecessario() {
        if (!this.pgPool) return;
        try {
            const caminhoSql = path.join(__dirname, 'schema_postgresql.sql');
            if (fs.existsSync(caminhoSql)) {
                const sql = fs.readFileSync(caminhoSql, 'utf-8');
                await this.pgPool.query(sql);
                console.log('[VIDE_DB] Schema relacional oficial aplicado com sucesso no PostgreSQL remoto.');
            }
        } catch (e) {
            console.warn('[VIDE_DB] Aviso ao aplicar schema no PostgreSQL remoto:', e.message);
        }
    }

    /**
     * Reidrata o estado das tabelas em memória e cache local a partir do PostgreSQL
     * Garante que containers efêmeros recuperem todo o histórico e projetos pós-restart
     */
    async hidratarDoPostgres() {
        if (!this.pgPool) return;
        try {
            // 1. Clientes
            const rCli = await this.pgPool.query('SELECT * FROM clientes');
            for (const row of rCli.rows) {
                this.tabelas.clientes.set(row.id, {
                    id: row.id,
                    nome: row.nome,
                    documento: row.documento,
                    email: row.email,
                    telefone: row.telefone,
                    segmento: row.segmento || 'Geral',
                    ticket_medio: parseFloat(row.ticket_medio) || 0,
                    criado_em: row.criado_em ? new Date(row.criado_em).toISOString() : new Date().toISOString(),
                    atualizado_em: row.atualizado_em ? new Date(row.atualizado_em).toISOString() : new Date().toISOString()
                });
            }

            // 2. Projetos
            const rProj = await this.pgPool.query('SELECT * FROM projetos');
            for (const row of rProj.rows) {
                let servicos = [];
                try {
                    servicos = typeof row.servicos_autorizados === 'string' ? JSON.parse(row.servicos_autorizados) : (row.servicos_autorizados || []);
                } catch (_) {}

                this.tabelas.projetos.set(row.id, {
                    id: row.id,
                    cliente_id: row.cliente_id,
                    id_demanda_origem: row.id_demanda_origem,
                    solicitacao_original: row.solicitacao_original,
                    situacao_projeto: row.situacao_projeto,
                    autorizacao_status: row.autorizacao_status,
                    servicos_autorizados: servicos,
                    data_autorizacao: row.data_autorizacao ? new Date(row.data_autorizacao).toISOString() : null,
                    observacao_autorizacao: row.observacao_autorizacao,
                    prioridade: row.prioridade || 'NORMAL',
                    criado_em: row.criado_em ? new Date(row.criado_em).toISOString() : new Date().toISOString(),
                    atualizado_em: row.atualizado_em ? new Date(row.atualizado_em).toISOString() : new Date().toISOString()
                });
            }

            // 3. Tarefas
            const rTar = await this.pgPool.query('SELECT * FROM tarefas');
            for (const row of rTar.rows) {
                let dependencias = [];
                let criterios = [];
                try {
                    dependencias = typeof row.dependencias === 'string' ? JSON.parse(row.dependencias) : (row.dependencias || []);
                    criterios = typeof row.criterios_aceite === 'string' ? JSON.parse(row.criterios_aceite) : (row.criterios_aceite || []);
                } catch (_) {}

                this.tabelas.tarefas.set(row.id, {
                    id: row.id,
                    id_tarefa: row.id,
                    projeto_id: row.projeto_id,
                    agente_id: row.agente_id,
                    especialista: row.especialista,
                    titulo: row.titulo,
                    descricao: row.descricao,
                    dependencias: dependencias,
                    criterios_aceite: criterios,
                    estado: row.estado,
                    criado_em: row.criado_em ? new Date(row.criado_em).toISOString() : new Date().toISOString(),
                    atualizado_em: row.atualizado_em ? new Date(row.atualizado_em).toISOString() : new Date().toISOString()
                });
            }

            // 4. Entregas
            const rEnt = await this.pgPool.query('SELECT * FROM entregas');
            for (const row of rEnt.rows) {
                let manifesto = {};
                let arquivos = [];
                try {
                    manifesto = typeof row.manifesto === 'string' ? JSON.parse(row.manifesto) : (row.manifesto || {});
                    arquivos = typeof row.arquivos === 'string' ? JSON.parse(row.arquivos) : (row.arquivos || []);
                } catch (_) {}

                this.tabelas.entregas.set(row.id, {
                    id: row.id,
                    tarefa_id: row.tarefa_id,
                    projeto_id: row.projeto_id,
                    diretorio_fisico: row.diretorio_fisico,
                    arquivos: arquivos,
                    dados: manifesto,
                    aprovado_pelo_coordenador: !!row.aprovado_pelo_coordenador,
                    parecer_coordenador: row.parecer_coordenador,
                    submetido_em: row.submetido_em ? new Date(row.submetido_em).toISOString() : new Date().toISOString()
                });
            }

            // 5. Eventos Histórico
            const rEvt = await this.pgPool.query('SELECT * FROM eventos_historico ORDER BY id ASC');
            this.tabelas.eventos_historico = rEvt.rows.map(row => {
                let detalhes = null;
                try {
                    detalhes = typeof row.detalhes === 'string' ? JSON.parse(row.detalhes) : row.detalhes;
                } catch (_) {}
                return {
                    id: row.id,
                    projeto_id: row.projeto_id,
                    tarefa_id: row.tarefa_id,
                    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
                    autor: row.autor,
                    tipo_evento: row.tipo_evento,
                    estado_anterior: row.estado_anterior,
                    novo_estado: row.novo_estado,
                    nota: row.nota,
                    detalhes: detalhes
                };
            });

            // 6. CRM Leads
            const rLeads = await this.pgPool.query('SELECT * FROM crm_leads');
            for (const row of rLeads.rows) {
                let msgs = [];
                let cad = [];
                try {
                    msgs = typeof row.mensagens === 'string' ? JSON.parse(row.mensagens) : (row.mensagens || []);
                    cad = typeof row.cadencias_ativas === 'string' ? JSON.parse(row.cadencias_ativas) : (row.cadencias_ativas || []);
                } catch (_) {}

                this.tabelas.crm_leads.set(row.id, {
                    id: row.id,
                    cliente_id: row.cliente_id,
                    nome: row.nome,
                    telefone: row.telefone,
                    canal_origem: row.canal_origem,
                    etapa_funil: row.etapa_funil,
                    status_atendimento: row.status_atendimento,
                    opt_out: !!row.opt_out,
                    valor_estimado: parseFloat(row.valor_estimado) || 0,
                    mensagens: msgs,
                    cadencias_ativas: cad,
                    criado_em: row.criado_em ? new Date(row.criado_em).toISOString() : new Date().toISOString(),
                    atualizado_em: row.atualizado_em ? new Date(row.atualizado_em).toISOString() : new Date().toISOString()
                });
            }

            // 7. Arquivos de Armazenamento (Storage Durável)
            const rArqs = await this.pgPool.query('SELECT * FROM arquivos_armazenamento');
            for (const row of rArqs.rows) {
                this.tabelas.arquivos_armazenamento.set(row.id, {
                    id: row.id,
                    projeto_id: row.projeto_id,
                    especialista: row.especialista,
                    nome_arquivo: row.nome_arquivo,
                    caminho_relativo: row.caminho_relativo,
                    mimetype: row.mimetype,
                    conteudo: row.conteudo,
                    tamanho_bytes: row.tamanho_bytes,
                    criado_em: row.criado_em ? new Date(row.criado_em).toISOString() : new Date().toISOString(),
                    atualizado_em: row.atualizado_em ? new Date(row.atualizado_em).toISOString() : new Date().toISOString()
                });

                // Auto-reconstituição do arquivo no cache do disco após novo deploy
                try {
                    const pastaFisica = path.join(__dirname, 'entregas_clientes', row.projeto_id, row.especialista);
                    const arqFisico = path.join(pastaFisica, row.nome_arquivo);
                    const pastaDestino = path.dirname(arqFisico);
                    if (!fs.existsSync(pastaDestino)) fs.mkdirSync(pastaDestino, { recursive: true });
                    if (!fs.existsSync(arqFisico) && row.conteudo) {
                        fs.writeFileSync(arqFisico, row.conteudo, 'utf-8');
                    }
                } catch (_) {}
            }

            this.persistir();
            console.log(`[VIDE_DB] Hidratação PostgreSQL concluída: ${rProj.rowCount} projetos, ${rTar.rowCount} tarefas, ${rCli.rowCount} clientes, ${rLeads.rowCount} leads, ${rArqs.rowCount} arquivos sincronizados.`);
        } catch (e) {
            console.warn('[VIDE_DB] Aviso ao hidratar dados do PostgreSQL:', e.message);
        }
    }

    /**
     * Testa a conexão real com o banco de dados PostgreSQL remoto (Supabase)
     */
    async testarConexaoRemota() {
        if (!this.pgPool) {
            return {
                sucesso: false,
                modo: 'LOCAL_OFFLINE',
                erro: 'DATABASE_URL não configurada no .env. Executando em emulação local com salvaguarda em disco.'
            };
        }
        try {
            const res = await this.pgPool.query('SELECT NOW() AS agora, version() AS versao');
            return {
                sucesso: true,
                modo: 'POSTGRESQL_REMOTO_ATIVO',
                timestamp_servidor: res.rows[0].agora,
                versao_postgresql: res.rows[0].versao
            };
        } catch (err) {
            return {
                sucesso: false,
                modo: 'ERRO_CONEXAO_REMOTA',
                erro: err.message
            };
        }
    }

    inicializar() {
        if (this.inicializado) return;

        // Garante existência da pasta de persistência
        const pastaPersistencia = path.dirname(CAMINHO_DADOS_RELACIONAIS);
        if (!fs.existsSync(pastaPersistencia)) {
            fs.mkdirSync(pastaPersistencia, { recursive: true });
        }

        // Carrega do disco se existir
        if (fs.existsSync(CAMINHO_DADOS_RELACIONAIS)) {
            try {
                const dados = JSON.parse(fs.readFileSync(CAMINHO_DADOS_RELACIONAIS, 'utf-8'));
                this.deserializar(dados);
            } catch (e) {
                console.error('[ERRO_DB] Falha ao carregar banco relacional do disco. Inicializando estrutura limpa:', e.message);
                this.carregarAgentesPadrao();
            }
        } else {
            this.carregarAgentesPadrao();
            this.persistir();
        }

        this.inicializado = true;
    }

    carregarAgentesPadrao() {
        const agentes = [
            { id: 'agente_01_triagem', nome: 'Agente 01 — Triagem', papel: 'Triagem e Classificação de Escopo', tipo_inteligencia: 'REGRAS_E_LLM', versao: '1.1', status: 'ATIVO' },
            { id: 'agente_02_coordenador', nome: 'Agente 02 — Coordenador Geral', papel: 'Coordenação, Grafo e Auditoria', tipo_inteligencia: 'REGRAS_E_LLM', versao: '1.1', status: 'ATIVO' },
            { id: 'agente_03_desenvolvedor', nome: 'Agente 03 — Desenvolvedor Full-Stack', papel: 'Desenvolvimento Web e Landing Pages', tipo_inteligencia: 'REGRAS_E_LLM', versao: '1.0', status: 'ATIVO' },
            { id: 'agente_04_branding_design', nome: 'Agente 04 — Branding e Design', papel: 'Identidade Visual e Tokens', tipo_inteligencia: 'REGRAS_E_LLM', versao: '1.0', status: 'ATIVO' },
            { id: 'agente_05_atendimento', nome: 'Agente 05 — Atendimento e Vendas', papel: 'Roteiros e Matriz de Objeções', tipo_inteligencia: 'REGRAS_E_LLM', versao: '1.0', status: 'ATIVO' },
            { id: 'agente_06_automacao', nome: 'Agente 06 — Automação e Integrações', papel: 'n8n Workflows e CRM Runtime', tipo_inteligencia: 'REGRAS_E_LLM', versao: '1.0', status: 'ATIVO' },
            { id: 'agente_07_inteligencia_comercial', nome: 'Agente 07 — Inteligência Comercial', papel: 'Auditoria de Funil e Objeções', tipo_inteligencia: 'REGRAS_E_LLM', versao: '1.0', status: 'ATIVO' }
        ];
        agentes.forEach(a => this.tabelas.agentes.set(a.id, a));
    }

    // =========================================================================
    // TRANSAÇÕES ACID COM ROLLBACK
    // =========================================================================
    iniciarTransacao() {
        if (this.transacaoAtiva) throw new Error('[TRANSACAO_ERRO] Já existe uma transação em andamento.');
        this.transacaoAtiva = true;
        this.snapshotTransacao = this.serializar();
        this.registrarLog('BEGIN_TRANSACTION');
    }

    commit() {
        if (!this.transacaoAtiva) throw new Error('[TRANSACAO_ERRO] Nenhuma transação ativa para efetivar.');
        this.transacaoAtiva = false;
        this.snapshotTransacao = null;
        this.registrarLog('COMMIT_TRANSACTION');
        this.persistir();
    }

    rollback() {
        if (!this.transacaoAtiva) return;
        this.deserializar(this.snapshotTransacao);
        this.transacaoAtiva = false;
        this.snapshotTransacao = null;
        this.registrarLog('ROLLBACK_TRANSACTION');
    }

    async executarEmTransacao(fn) {
        this.iniciarTransacao();
        try {
            const resultado = await fn(this);
            this.commit();
            return resultado;
        } catch (erro) {
            this.rollback();
            throw erro;
        }
    }

    // =========================================================================
    // OPERAÇÕES: CLIENTES (TENANT ROOT)
    // =========================================================================
    inserirOuAtualizarCliente(dados) {
        if (!dados.id) dados.id = 'CLI-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        if (!dados.nome) throw new Error('[VALIDACAO_ERRO] Nome do cliente é obrigatório.');

        const existente = this.tabelas.clientes.get(dados.id) || {};
        const cliente = {
            id: dados.id,
            nome: dados.nome,
            documento: dados.documento || existente.documento || null,
            email: dados.email || existente.email || null,
            telefone: dados.telefone || existente.telefone || null,
            segmento: dados.segmento || existente.segmento || 'Geral',
            ticket_medio: dados.ticket_medio || existente.ticket_medio || 0,
            criado_em: existente.criado_em || new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        };

        this.tabelas.clientes.set(cliente.id, cliente);
        if (!this.transacaoAtiva) this.persistir();

        if (this.pgPool) {
            this.pgPool.query(`
                INSERT INTO clientes (id, nome, documento, email, telefone, segmento, ticket_medio, criado_em, atualizado_em)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (id) DO UPDATE SET
                    nome = EXCLUDED.nome,
                    documento = EXCLUDED.documento,
                    email = EXCLUDED.email,
                    telefone = EXCLUDED.telefone,
                    segmento = EXCLUDED.segmento,
                    ticket_medio = EXCLUDED.ticket_medio,
                    atualizado_em = EXCLUDED.atualizado_em
            `, [cliente.id, cliente.nome, cliente.documento, cliente.email, cliente.telefone, cliente.segmento, cliente.ticket_medio, cliente.criado_em, cliente.atualizado_em])
            .catch(err => console.warn('[VIDE_DB_PG] Falha assíncrona ao sincronizar cliente:', err.message));
        }

        return cliente;
    }

    inserirCliente(dados) {
        const id = dados.id || dados.id_cliente;
        const nome = dados.nome || dados.nome_empresa || dados.responsavel;
        const cli = this.inserirOuAtualizarCliente({ id, nome, ...dados });
        return { sucesso: true, cliente: cli };
    }

    obterCliente(id) {
        return this.tabelas.clientes.get(id) || null;
    }

    listarClientes() {
        return Array.from(this.tabelas.clientes.values());
    }

    // =========================================================================
    // OPERAÇÕES: PROJETOS COM VALIDAÇÃO DE CHAVE ESTRANGEIRA
    // =========================================================================
    inserirOuAtualizarProjeto(dados) {
        if (!dados.id) throw new Error('[VALIDACAO_ERRO] ID do projeto é obrigatório.');
        if (!dados.cliente_id) throw new Error('[FK_ERRO] cliente_id é obrigatório para relacionar o projeto.');

        // Validação de Integridade Referencial (FK)
        if (!this.tabelas.clientes.has(dados.cliente_id)) {
            // Auto-criação graciosa do cliente a partir do nome se informado
            const nomeCliente = dados.cliente_nome || dados.cliente || dados.cliente_id;
            this.inserirOuAtualizarCliente({ id: dados.cliente_id, nome: nomeCliente });
        }

        const existente = this.tabelas.projetos.get(dados.id) || {};
        const projeto = {
            id: dados.id,
            cliente_id: dados.cliente_id,
            id_demanda_origem: dados.id_demanda_origem || existente.id_demanda_origem || null,
            solicitacao_original: dados.solicitacao_original || existente.solicitacao_original || '',
            situacao_projeto: dados.situacao_projeto || existente.situacao_projeto || 'AGUARDANDO_AUTORIZACAO_COMERCIAL',
            autorizacao_status: dados.autorizacao_status || (dados.autorizacao_comercial ? dados.autorizacao_comercial.status : null) || existente.autorizacao_status || 'PENDENTE',
            servicos_autorizados: dados.servicos_autorizados || (dados.autorizacao_comercial ? dados.autorizacao_comercial.servicos_autorizados : null) || existente.servicos_autorizados || [],
            data_autorizacao: dados.data_autorizacao || (dados.autorizacao_comercial ? dados.autorizacao_comercial.data_autorizacao : null) || existente.data_autorizacao || null,
            observacao_autorizacao: dados.observacao_autorizacao || (dados.autorizacao_comercial ? dados.autorizacao_comercial.observacao : null) || existente.observacao_autorizacao || null,
            prioridade: dados.prioridade || (dados.cronograma ? dados.cronograma.prioridade : null) || existente.prioridade || 'NORMAL',
            criado_em: existente.criado_em || new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        };

        this.tabelas.projetos.set(projeto.id, projeto);
        if (!this.transacaoAtiva) this.persistir();

        if (this.pgPool) {
            this.pgPool.query(`
                INSERT INTO projetos (id, cliente_id, id_demanda_origem, solicitacao_original, situacao_projeto, autorizacao_status, servicos_autorizados, data_autorizacao, observacao_autorizacao, prioridade, criado_em, atualizado_em)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (id) DO UPDATE SET
                    situacao_projeto = EXCLUDED.situacao_projeto,
                    autorizacao_status = EXCLUDED.autorizacao_status,
                    servicos_autorizados = EXCLUDED.servicos_autorizados,
                    data_autorizacao = EXCLUDED.data_autorizacao,
                    observacao_autorizacao = EXCLUDED.observacao_autorizacao,
                    prioridade = EXCLUDED.prioridade,
                    atualizado_em = EXCLUDED.atualizado_em
            `, [
                projeto.id,
                projeto.cliente_id,
                projeto.id_demanda_origem,
                projeto.solicitacao_original,
                projeto.situacao_projeto,
                projeto.autorizacao_status,
                JSON.stringify(projeto.servicos_autorizados || []),
                projeto.data_autorizacao,
                projeto.observacao_autorizacao,
                projeto.prioridade,
                projeto.criado_em,
                projeto.atualizado_em
            ]).catch(err => console.warn('[VIDE_DB_PG] Falha assíncrona ao sincronizar projeto:', err.message));
        }

        return projeto;
    }

    obterProjeto(id) {
        const p = this.tabelas.projetos.get(id);
        if (!p) return null;

        // Carrega relacionamentos para manter compatibilidade com interface VIDE
        const cliente = this.tabelas.clientes.get(p.cliente_id);
        const tarefas = this.listarTarefasPorProjeto(p.id);
        const eventos = this.listarEventosPorProjeto(p.id);

        return {
            id_projeto: p.id,
            id_demanda_origem: p.id_demanda_origem,
            cliente_id: p.cliente_id,
            cliente: cliente ? cliente.nome : p.cliente_id,
            solicitacao_original: p.solicitacao_original,
            situacao_projeto: p.situacao_projeto,
            autorizacao_comercial: {
                status: p.autorizacao_status,
                servicos_autorizados: p.servicos_autorizados,
                data_autorizacao: p.data_autorizacao,
                observacao: p.observacao_autorizacao
            },
            cronograma: {
                prioridade: p.prioridade,
                criado_em: p.criado_em,
                atualizado_em: p.atualizado_em
            },
            grafo_tarefas: tarefas,
            historico_operacional: eventos
        };
    }

    listarProjetos(filtroClienteId = null) {
        const lista = [];
        for (const [id, p] of this.tabelas.projetos) {
            if (filtroClienteId && p.cliente_id !== filtroClienteId) continue;
            const cliente = this.tabelas.clientes.get(p.cliente_id);
            const totalTarefas = this.listarTarefasPorProjeto(p.id).length;
            lista.push({
                id_projeto: p.id,
                id_demanda_origem: p.id_demanda_origem,
                cliente_id: p.cliente_id,
                cliente: cliente ? cliente.nome : p.cliente_id,
                situacao_projeto: p.situacao_projeto,
                total_tarefas: totalTarefas,
                autorizado: p.autorizacao_status === 'AUTORIZADO',
                atualizado_em: p.atualizado_em
            });
        }
        return lista;
    }

    // =========================================================================
    // OPERAÇÕES: TAREFAS
    // =========================================================================
    inserirOuAtualizarTarefa(dados) {
        if (!dados.id && !dados.id_tarefa) throw new Error('[VALIDACAO_ERRO] ID da tarefa é obrigatório.');
        const idTarefa = dados.id || dados.id_tarefa;
        const idProjeto = dados.projeto_id || dados.idProjeto;

        if (!idProjeto || !this.tabelas.projetos.has(idProjeto)) {
            throw new Error(`[FK_ERRO] projeto_id [${idProjeto}] inválido ou inexistente.`);
        }

        const especialista = dados.especialista || 'Geral';
        const agenteId = dados.agente_id || this.mapearAgenteId(especialista);

        const existente = this.tabelas.tarefas.get(idTarefa) || {};
        const tarefa = {
            id: idTarefa,
            id_tarefa: idTarefa,
            projeto_id: idProjeto,
            agente_id: agenteId,
            especialista: especialista,
            titulo: dados.titulo || existente.titulo || '',
            descricao: dados.descricao || existente.descricao || '',
            dependencias: dados.dependencias || existente.dependencias || [],
            criterios_aceite: dados.criterios_aceite || existente.criterios_aceite || [],
            estado: dados.estado || existente.estado || 'BLOQUEADA_POR_AUTORIZACAO',
            criado_em: existente.criado_em || new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        };

        this.tabelas.tarefas.set(idTarefa, tarefa);
        if (!this.transacaoAtiva) this.persistir();

        if (this.pgPool) {
            this.pgPool.query(`
                INSERT INTO tarefas (id, projeto_id, agente_id, especialista, titulo, descricao, dependencias, criterios_aceite, estado, criado_em, atualizado_em)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (id) DO UPDATE SET
                    titulo = EXCLUDED.titulo,
                    descricao = EXCLUDED.descricao,
                    dependencias = EXCLUDED.dependencias,
                    criterios_aceite = EXCLUDED.criterios_aceite,
                    estado = EXCLUDED.estado,
                    atualizado_em = EXCLUDED.atualizado_em
            `, [
                tarefa.id,
                tarefa.projeto_id,
                tarefa.agente_id,
                tarefa.especialista,
                tarefa.titulo,
                tarefa.descricao,
                JSON.stringify(tarefa.dependencias || []),
                JSON.stringify(tarefa.criterios_aceite || []),
                tarefa.estado,
                tarefa.criado_em,
                tarefa.atualizado_em
            ]).catch(err => console.warn('[VIDE_DB_PG] Falha assíncrona ao sincronizar tarefa:', err.message));
        }

        return tarefa;
    }

    listarTarefasPorProjeto(idProjeto) {
        const tarefas = [];
        for (const [_, t] of this.tabelas.tarefas) {
            if (t.projeto_id === idProjeto) {
                const entrega = this.obterEntregaPorTarefa(t.id);
                tarefas.push({
                    id_tarefa: t.id,
                    especialista: t.especialista,
                    titulo: t.titulo,
                    descricao: t.descricao,
                    dependencias: t.dependencias,
                    criterios_aceite: t.criterios_aceite,
                    estado: t.estado,
                    entrega: entrega ? entrega.dados : null,
                    historico_auditoria: this.listarEventosPorTarefa(t.id)
                });
            }
        }
        return tarefas;
    }

    mapearAgenteId(especialista) {
        const esp = (especialista || '').toLowerCase();
        if (esp.includes('triagem')) return 'agente_01_triagem';
        if (esp.includes('coord')) return 'agente_02_coordenador';
        if (esp.includes('desenv') || esp.includes('dev')) return 'agente_03_desenvolvedor';
        if (esp.includes('brand') || esp.includes('design')) return 'agente_04_branding_design';
        if (esp.includes('atend') || esp.includes('venda')) return 'agente_05_atendimento';
        if (esp.includes('auto') || esp.includes('n8n')) return 'agente_06_automacao';
        if (esp.includes('intel') || esp.includes('comerc')) return 'agente_07_inteligencia_comercial';
        return 'agente_02_coordenador';
    }

    // =========================================================================
    // OPERAÇÕES: ENTREGAS
    // =========================================================================
    registrarEntrega(dados) {
        const idEntrega = dados.id || 'ENT-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        const idTarefa = dados.tarefa_id || dados.idTarefa;
        const idProjeto = dados.projeto_id || dados.idProjeto;

        if (!idTarefa || !this.tabelas.tarefas.has(idTarefa)) {
            throw new Error(`[FK_ERRO] tarefa_id [${idTarefa}] não existe.`);
        }

        const entrega = {
            id: idEntrega,
            tarefa_id: idTarefa,
            projeto_id: idProjeto,
            diretorio_fisico: dados.diretorio_fisico || null,
            arquivos: dados.arquivos || [],
            dados: dados.entregaSubmetida || dados.dados || {},
            aprovado_pelo_coordenador: dados.aprovado === true,
            parecer_coordenador: dados.parecer || null,
            submetido_em: new Date().toISOString()
        };

        this.tabelas.entregas.set(idEntrega, entrega);
        if (!this.transacaoAtiva) this.persistir();

        if (this.pgPool) {
            this.pgPool.query(`
                INSERT INTO entregas (id, tarefa_id, projeto_id, diretorio_fisico, arquivos, manifesto, aprovado_pelo_coordenador, parecer_coordenador, submetido_em)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (id) DO UPDATE SET
                    arquivos = EXCLUDED.arquivos,
                    manifesto = EXCLUDED.manifesto,
                    aprovado_pelo_coordenador = EXCLUDED.aprovado_pelo_coordenador,
                    parecer_coordenador = EXCLUDED.parecer_coordenador,
                    auditado_em = CURRENT_TIMESTAMP
            `, [
                entrega.id,
                entrega.tarefa_id,
                entrega.projeto_id,
                entrega.diretorio_fisico,
                JSON.stringify(entrega.arquivos || []),
                JSON.stringify(entrega.dados || {}),
                entrega.aprovado_pelo_coordenador,
                entrega.parecer_coordenador,
                entrega.submetido_em
            ]).catch(err => console.warn('[VIDE_DB_PG] Falha assíncrona ao sincronizar entrega:', err.message));
        }

        return entrega;
    }

    obterEntregaPorTarefa(idTarefa) {
        for (const [_, ent] of this.tabelas.entregas) {
            if (ent.tarefa_id === idTarefa) return ent;
        }
        return null;
    }

    // =========================================================================
    // OPERAÇÕES: EVENTOS HISTÓRICOS & AUDITORIA ADMIN
    // =========================================================================
    registrarEvento({ idProjeto, idTarefa = null, autor, tipoEvento, estadoAnterior = null, novoEstado = null, nota = null, detalhes = null }) {
        const evento = {
            id: this.tabelas.eventos_historico.length + 1,
            projeto_id: idProjeto,
            tarefa_id: idTarefa,
            timestamp: new Date().toISOString(),
            autor: autor || 'Sistema',
            tipo_evento: tipoEvento || 'ATUALIZACAO',
            estado_anterior: estadoAnterior,
            novo_estado: novoEstado,
            nota: nota,
            detalhes: detalhes
        };

        this.tabelas.eventos_historico.push(evento);
        if (!this.transacaoAtiva) this.persistir();

        if (this.pgPool) {
            this.pgPool.query(`
                INSERT INTO eventos_historico (projeto_id, tarefa_id, timestamp, autor, tipo_evento, estado_anterior, novo_estado, nota, detalhes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                evento.projeto_id,
                evento.tarefa_id,
                evento.timestamp,
                evento.autor,
                evento.tipo_evento,
                evento.estado_anterior,
                evento.novo_estado,
                evento.nota,
                JSON.stringify(evento.detalhes || null)
            ]).catch(err => console.warn('[VIDE_DB_PG] Falha assíncrona ao sincronizar evento:', err.message));
        }

        return evento;
    }

    listarEventosPorProjeto(idProjeto) {
        return this.tabelas.eventos_historico.filter(e => e.projeto_id === idProjeto);
    }

    listarEventosPorTarefa(idTarefa) {
        return this.tabelas.eventos_historico.filter(e => e.tarefa_id === idTarefa);
    }

    registrarAuditoriaAdmin({ usuario, ip = '127.0.0.1', acao, entidade, entidadeId = null, dadosAnteriores = null, dadosNovos = null, sucesso = true }) {
        const registro = {
            id: this.tabelas.auditoria_admin.length + 1,
            timestamp: new Date().toISOString(),
            usuario: usuario || 'Anonimo',
            ip: ip,
            acao: acao,
            entidade: entidade,
            entidade_id: entidadeId,
            dados_anteriores: dadosAnteriores,
            dados_novos: dadosNovos,
            sucesso: sucesso
        };
        this.tabelas.auditoria_admin.push(registro);
        if (!this.transacaoAtiva) this.persistir();
        return registro;
    }

    // =========================================================================
    // OPERAÇÕES: CRM LEADS COM SEGREGAÇÃO MULTI-TENANT
    // =========================================================================
    inserirOuAtualizarLead(dados) {
        if (!dados.telefone) throw new Error('[VALIDACAO_ERRO] Telefone do lead é obrigatório.');
        if (!dados.cliente_id) throw new Error('[FK_ERRO] cliente_id é obrigatório para segregação de leads.');

        const idLead = dados.id || 'LEAD-' + crypto.createHash('md5').update(dados.telefone).digest('hex').substring(0, 8).toUpperCase();
        const existente = this.tabelas.crm_leads.get(idLead) || {};

        const lead = {
            id: idLead,
            cliente_id: dados.cliente_id,
            nome: dados.nome || existente.nome || 'Lead WhatsApp',
            telefone: dados.telefone,
            canal_origem: dados.canal_origem || existente.canal_origem || 'WhatsApp Inbound',
            etapa_funil: dados.etapa_funil || existente.etapa_funil || 'CONTATO_INICIAL',
            status_atendimento: dados.status_atendimento || existente.status_atendimento || 'NOVO',
            opt_out: dados.opt_out !== undefined ? dados.opt_out : (existente.opt_out || false),
            valor_estimado: dados.valor_estimado || existente.valor_estimado || 0,
            mensagens: dados.mensagens || existente.mensagens || [],
            cadencias_ativas: dados.cadencias_ativas || existente.cadencias_ativas || [],
            criado_em: existente.criado_em || new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        };

        this.tabelas.crm_leads.set(idLead, lead);
        if (!this.transacaoAtiva) this.persistir();

        if (this.pgPool) {
            this.pgPool.query(`
                INSERT INTO crm_leads (id, cliente_id, nome, telefone, canal_origem, etapa_funil, status_atendimento, opt_out, valor_estimado, mensagens, cadencias_ativas, criado_em, atualizado_em)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                ON CONFLICT (id) DO UPDATE SET
                    nome = EXCLUDED.nome,
                    canal_origem = EXCLUDED.canal_origem,
                    etapa_funil = EXCLUDED.etapa_funil,
                    status_atendimento = EXCLUDED.status_atendimento,
                    opt_out = EXCLUDED.opt_out,
                    valor_estimado = EXCLUDED.valor_estimado,
                    mensagens = EXCLUDED.mensagens,
                    cadencias_ativas = EXCLUDED.cadencias_ativas,
                    atualizado_em = EXCLUDED.atualizado_em
            `, [
                lead.id,
                lead.cliente_id,
                lead.nome,
                lead.telefone,
                lead.canal_origem,
                lead.etapa_funil,
                lead.status_atendimento,
                lead.opt_out,
                lead.valor_estimado,
                JSON.stringify(lead.mensagens || []),
                JSON.stringify(lead.cadencias_ativas || []),
                lead.criado_em,
                lead.atualizado_em
            ]).catch(err => console.warn('[VIDE_DB_PG] Falha assíncrona ao sincronizar lead:', err.message));
        }

        return lead;
    }

    obterLead(idLead, clienteId = null) {
        const lead = this.tabelas.crm_leads.get(idLead);
        if (!lead) return null;
        if (clienteId && lead.cliente_id !== clienteId) {
            throw new Error('[SEGURANCA_TENANT] Acesso negado: lead pertence a outro cliente.');
        }
        return lead;
    }

    listarLeads(clienteId = null) {
        const leads = [];
        for (const [_, lead] of this.tabelas.crm_leads) {
            if (clienteId && lead.cliente_id !== clienteId) continue;
            leads.push(lead);
        }
        return leads;
    }

    // =========================================================================
    // OPERAÇÕES: ARMAZENAMENTO DURÁVEL DE ARQUIVOS (STORAGE POSTGRESQL)
    // =========================================================================
    async salvarArquivoStorage({ idProjeto, especialista, nomeArquivo, caminhoRelativo, conteudo, mimetype }) {
        const id = `${idProjeto}/${especialista}/${nomeArquivo}`.replace(/\\/g, '/');
        const caminhoRel = (caminhoRelativo || id).replace(/\\/g, '/');
        const tamanhoBytes = Buffer.byteLength(conteudo || '', 'utf-8');
        const registro = {
            id,
            projeto_id: idProjeto,
            especialista,
            nome_arquivo: nomeArquivo,
            caminho_relativo: caminhoRel,
            mimetype: mimetype || 'text/plain',
            conteudo,
            tamanho_bytes: tamanhoBytes,
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        };
        this.tabelas.arquivos_armazenamento.set(id, registro);

        if (this.pgPool) {
            try {
                await this.pgPool.query(`
                    INSERT INTO arquivos_armazenamento (id, projeto_id, especialista, nome_arquivo, caminho_relativo, mimetype, conteudo, tamanho_bytes, criado_em, atualizado_em)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (id) DO UPDATE SET
                        conteudo = EXCLUDED.conteudo,
                        tamanho_bytes = EXCLUDED.tamanho_bytes,
                        mimetype = EXCLUDED.mimetype,
                        atualizado_em = CURRENT_TIMESTAMP
                `, [id, idProjeto, especialista, nomeArquivo, caminhoRel, mimetype || 'text/plain', conteudo, tamanhoBytes]);
                return { sucesso: true, id, persistencia: 'POSTGRESQL' };
            } catch (e) {
                console.warn('[VIDE_DB_PG] Falha ao salvar arquivo no PostgreSQL:', e.message);
                return { sucesso: false, erro: e.message };
            }
        }
        return { sucesso: true, id, persistencia: 'LOCAL_DISCO' };
    }

    async obterArquivoStorage(idProjeto, especialista, nomeArquivo) {
        const id = `${idProjeto}/${especialista}/${nomeArquivo}`.replace(/\\/g, '/');
        if (this.tabelas.arquivos_armazenamento.has(id)) {
            return this.tabelas.arquivos_armazenamento.get(id);
        }
        if (this.pgPool) {
            try {
                const res = await this.pgPool.query('SELECT * FROM arquivos_armazenamento WHERE id = $1', [id]);
                if (res.rows.length > 0) {
                    this.tabelas.arquivos_armazenamento.set(id, res.rows[0]);
                    return res.rows[0];
                }
            } catch (e) {
                console.warn('[VIDE_DB_PG] Falha ao consultar arquivo no PostgreSQL:', e.message);
            }
        }
        return null;
    }

    async listarArquivosStorage(idProjeto) {
        if (this.pgPool) {
            try {
                const res = await this.pgPool.query('SELECT id, projeto_id, especialista, nome_arquivo, caminho_relativo, mimetype, tamanho_bytes, criado_em, atualizado_em FROM arquivos_armazenamento WHERE projeto_id = $1', [idProjeto]);
                return res.rows;
            } catch (e) {
                console.warn('[VIDE_DB_PG] Falha ao listar arquivos no PostgreSQL:', e.message);
            }
        }
        return [];
    }

    // =========================================================================
    // SERIALIZAÇÃO & PERSISTÊNCIA ATÔMICA
    // =========================================================================
    serializar() {
        return {
            versao: '2.0-RELACIONAL',
            exportado_em: new Date().toISOString(),
            clientes: Array.from(this.tabelas.clientes.values()),
            agentes: Array.from(this.tabelas.agentes.values()),
            projetos: Array.from(this.tabelas.projetos.values()),
            tarefas: Array.from(this.tabelas.tarefas.values()),
            entregas: Array.from(this.tabelas.entregas.values()),
            eventos_historico: this.tabelas.eventos_historico,
            crm_leads: Array.from(this.tabelas.crm_leads.values()),
            auditoria_admin: this.tabelas.auditoria_admin,
            usuarios_sistema: Array.from(this.tabelas.usuarios_sistema.values())
        };
    }

    deserializar(dados) {
        this.tabelas.clientes.clear();
        this.tabelas.agentes.clear();
        this.tabelas.projetos.clear();
        this.tabelas.tarefas.clear();
        this.tabelas.entregas.clear();
        this.tabelas.eventos_historico = [];
        this.tabelas.crm_leads.clear();
        this.tabelas.auditoria_admin = [];
        this.tabelas.usuarios_sistema.clear();

        (dados.clientes || []).forEach(c => this.tabelas.clientes.set(c.id, c));
        (dados.agentes || []).forEach(a => this.tabelas.agentes.set(a.id, a));
        (dados.projetos || []).forEach(p => this.tabelas.projetos.set(p.id, p));
        (dados.tarefas || []).forEach(t => this.tabelas.tarefas.set(t.id, t));
        (dados.entregas || []).forEach(e => this.tabelas.entregas.set(e.id, e));
        this.tabelas.eventos_historico = dados.eventos_historico || [];
        (dados.crm_leads || []).forEach(l => this.tabelas.crm_leads.set(l.id, l));
        this.tabelas.auditoria_admin = dados.auditoria_admin || [];
        (dados.usuarios_sistema || []).forEach(u => this.tabelas.usuarios_sistema.set(u.id, u));
    }

    persistir() {
        try {
            const tempFile = `${CAMINHO_DADOS_RELACIONAIS}.${process.pid}.${Date.now()}_${Math.random().toString(36).substring(2, 6)}.tmp`;
            const dadosStr = JSON.stringify(this.serializar(), null, 2);
            fs.writeFileSync(tempFile, dadosStr, 'utf-8');
            try {
                fs.renameSync(tempFile, CAMINHO_DADOS_RELACIONAIS);
            } catch (errRename) {
                // Fallback resiliente para Windows caso o arquivo de destino esteja momentaneamente sob lock de leitura
                fs.writeFileSync(CAMINHO_DADOS_RELACIONAIS, dadosStr, 'utf-8');
                try { fs.unlinkSync(tempFile); } catch (_) {}
            }
        } catch (e) {
            console.error('[ERRO_PERSISTENCIA] Falha ao persistir banco relacional:', e.message);
        }
    }

    registrarLog(mensagem) {
        try {
            const linha = `[${new Date().toISOString()}] ${mensagem}\n`;
            fs.appendFileSync(CAMINHO_LOG_TRANSACIONAIS, linha, 'utf-8');
        } catch (e) {}
    }
}

// Instância singleton do banco oficial da VIDE
const db = new BancoDadosRelacionalVIDE();

module.exports = {
    BancoDadosRelacionalVIDE,
    db
};
