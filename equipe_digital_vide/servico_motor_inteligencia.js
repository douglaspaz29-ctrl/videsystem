/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * MOTOR DE INTELIGÊNCIA COMERCIAL (v2.2) — CAMADA DE SERVIÇO OFICIAL
 * 
 * Capacidades Centrais Integradas:
 * 1. Diagnóstico de Crescimento (7 Dimensões com Retenção & Recompra)
 * 2. Inteligência Comercial Contínua (Evidências, Padrões, Hipóteses)
 * 3. Priorização Matemática EPV (Engenharia de Decisão)
 * 4. Princípio da Menor Intervenção Viável (MIV com Eficácia Suficiente)
 * 5. Isolamento Multiempresa Mandatório (RLS + Chaves Compostas)
 * 
 * Governança Executiva: Douglas Paz (Diretor Executivo)
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const pg = require('pg');
const CONFIG = require('./config_ambiente');
const { classificarNoCatalogo, SOLUCOES_COMERCIAIS } = require('./catalogo_solucoes_comerciais');
const { iaService } = require('./ia_service');

class ServicoMotorInteligenciaVIDE {
    /**
     * @param {Object} [opcoes]
     * @param {pg.Pool} [opcoes.pool] - Pool PostgreSQL opcional (usa default da VIDE se omitido)
     */
    constructor(opcoes = {}) {
        this.pool = opcoes.pool || null;
        this.versaoMetodologia = 'VIDE_7D_V2';
        this.versaoFormulaEPV = 'EPV_V1';

        if (!this.pool) {
            const connStr = process.env.DATABASE_URL || CONFIG.DATABASE_URL || 'postgresql://vide_admin:0CaD0pCC9KRjdM1Ts69BcPkm0ylqvjZi@dpg-dbrabbei0phs73f98ve0-a.oregon-postgres.render.com:5432/vide_homologacao';
            if (connStr) {
                this.pool = new pg.Pool({
                    connectionString: connStr,
                    ssl: connStr.includes('localhost') ? false : { rejectUnauthorized: false }
                });
            }
        }
    }

    /**
     * Executa operação transacional isolada por Tenant (Row-Level Security Defense-in-Depth)
     * Utiliza set_config com is_local = true, garantindo zero vazamento no pool de conexões.
     * @param {string} empresaId - UUID do Tenant cliente
     * @param {Function} operacao - Callback recebendo o client conectado e parametrizado
     * @returns {Promise<any>}
     */
    async comTenant(empresaId, operacao) {
        if (!empresaId) {
            throw new Error('[SEGURANCA_MOTOR] empresa_id obrigatório para execução sob RLS.');
        }
        if (!this.pool) {
            throw new Error('[INFRAESTRUTURA_MOTOR] Pool de banco PostgreSQL não está disponível.');
        }

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN;');
            // Escopo estritamente local à transação (is_local = true)
            await client.query("SELECT set_config('vide.current_empresa_id', $1, true);", [empresaId]);
            const resultado = await operacao(client);
            await client.query('COMMIT;');
            return resultado;
        } catch (erro) {
            await client.query('ROLLBACK;');
            throw erro;
        } finally {
            client.release();
        }
    }

    // =========================================================================
    // 1. GESTÃO DE TENANTS E IDENTIDADES DE CONTATO (MINIMIZAÇÃO LGPD)
    // =========================================================================

    /**
     * Cadastra ou obtém empresa no Motor de Inteligência Comercial
     */
    async cadastrarEmpresa({ nomeFantasia, razaoSocial, segmento, planoMotor = 'PADRAO', clienteLegadoId = null }) {
        if (!this.pool) throw new Error('PostgreSQL Pool indisponível.');
        const res = await this.pool.query(`
            INSERT INTO empresas_motor (nome_fantasia, razao_social, segmento, plano_motor, cliente_legado_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `, [nomeFantasia, razaoSocial || null, segmento || 'Geral', planoMotor, clienteLegadoId]);
        return res.rows[0];
    }

    /**
     * Registra contato canônico por canais verificados (WhatsApp E.164 / Instagram Handle)
     */
    async registrarContatoIdentificado({ empresaId, nome, canalOrigem, baseLegal = 'LEGITIMO_INTERESSE', identificadores = [] }) {
        return await this.comTenant(empresaId, async (client) => {
            // 1. Cria o contato com dados minimizados (LGPD Art. 6º, III)
            const resContato = await client.query(`
                INSERT INTO contatos_clientes (empresa_id, nome_identificado, canal_origem_primario, base_legal_lgpd)
                VALUES ($1, $2, $3, $4)
                RETURNING id, nome_identificado, canal_origem_primario, status_jornada;
            `, [empresaId, nome, canalOrigem, baseLegal]);

            const contatoId = resContato.rows[0].id;

            // 2. Registra os identificadores de canal normalizados
            for (const idf of identificadores) {
                await client.query(`
                    INSERT INTO identificadores_contato (empresa_id, contato_id, tipo_identificador, valor_identificador, verificado)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (empresa_id, tipo_identificador, valor_identificador) DO NOTHING;
                `, [empresaId, contatoId, idf.tipo, idf.valor, idf.verificado !== false]);
            }

            return {
                id: contatoId,
                nome: resContato.rows[0].nome_identificado,
                canal: resContato.rows[0].canal_origem_primario,
                status: resContato.rows[0].status_jornada,
                identificadores
            };
        });
    }

    // =========================================================================
    // 2. CAPACIDADE 2: INTELIGÊNCIA COMERCIAL CONTÍNUA (FLUXO DE INTERAÇÕES)
    // =========================================================================

    /**
     * Registra diálogo/interação e marcos de eventos da jornada comercial
     */
    async registrarInteracaoEEventos({ empresaId, contatoId, canal, direcao, conteudoTexto, sessaoExternaId = null, eventos = [], metadados = {} }) {
        return await this.comTenant(empresaId, async (client) => {
            // 1. Grava a interação
            const resInt = await client.query(`
                INSERT INTO interacoes_comerciais (empresa_id, contato_id, canal, direcao, sessao_externa_id, conteudo_texto, metadados)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, timestamp_interacao;
            `, [empresaId, contatoId, canal, direcao, sessaoExternaId, conteudoTexto, JSON.stringify(metadados)]);

            const interacaoId = resInt.rows[0].id;
            const eventosRegistrados = [];

            // 2. Grava eventos de jornada vinculados
            for (const evt of eventos) {
                const resEvt = await client.query(`
                    INSERT INTO eventos_jornada (empresa_id, contato_id, interacao_id, tipo_evento, etapa_funil, propriedades)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id, tipo_evento, etapa_funil;
                `, [empresaId, contatoId, interacaoId, evt.tipoEvento, evt.etapaFunil || 'MEIO', JSON.stringify(evt.propriedades || {})]);
                eventosRegistrados.push(resEvt.rows[0]);
            }

            return {
                interacaoId,
                timestamp: resInt.rows[0].timestamp_interacao,
                eventos: eventosRegistrados
            };
        });
    }

    /**
     * Isola fatos factuais granulares (Evidências) observados nas conversas
     */
    async isolarEvidencias({ empresaId, contatoId = null, interacaoId = null, eventoId = null, listaEvidencias = [] }) {
        return await this.comTenant(empresaId, async (client) => {
            const idsCriados = [];
            for (const ev of listaEvidencias) {
                const res = await client.query(`
                    INSERT INTO evidencias_comerciais (
                        empresa_id, contato_id, interacao_id, evento_id,
                        tipo_evidencia, trecho_fato, contexto_origem, grau_confiabilidade, registrado_por
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING id;
                `, [
                    empresaId, contatoId, interacaoId, eventoId,
                    ev.tipoEvidencia, ev.trechoFato, ev.contextoOrigem || 'WhatsApp Inbound',
                    ev.grauConfiabilidade || 1.00, ev.registradoPor || 'AGENTE_07_PESQUISADOR'
                ]);
                idsCriados.push(res.rows[0].id);
            }
            return idsCriados;
        });
    }

    /**
     * Minera padrões comportamentais e formula hipóteses causais com base em evidências
     */
    async minerarPadraoEHipoteses({ empresaId, categoria, tituloPadrao, descricaoPadrao, frequencia = 1, evidenciasIds = [], hipotese = null }) {
        return await this.comTenant(empresaId, async (client) => {
            // 1. Padrão Comportamental
            const resPadrao = await client.query(`
                INSERT INTO padroes_comportamentais (empresa_id, categoria_padrao, titulo, descricao_padrao, frequencia_ocorrencia)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id;
            `, [empresaId, categoria, tituloPadrao, descricaoPadrao, frequencia]);
            const padraoId = resPadrao.rows[0].id;

            // 2. Vínculo Relacional: Padrões <-> Evidências
            for (const evId of evidenciasIds) {
                await client.query(`
                    INSERT INTO padroes_evidencias_rel (empresa_id, padrao_id, evidencia_id)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (padrao_id, evidencia_id) DO NOTHING;
                `, [empresaId, padraoId, evId]);
            }

            // 3. Hipótese Causal (se fornecida)
            let hipoteseId = null;
            if (hipotese) {
                const resHip = await client.query(`
                    INSERT INTO hipoteses_causais (empresa_id, padrao_id, enunciado_hipotese, causa_raiz_provavel, nivel_confianca)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id;
                `, [empresaId, padraoId, hipotese.enunciado, hipotese.causaRaiz, hipotese.nivelConfianca || 0.75]);
                hipoteseId = resHip.rows[0].id;

                for (const evId of evidenciasIds) {
                    await client.query(`
                        INSERT INTO hipoteses_evidencias_rel (empresa_id, hipotese_id, evidencia_id)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (hipotese_id, evidencia_id) DO NOTHING;
                    `, [empresaId, hipoteseId, evId]);
                }
            }

            return { padraoId, hipoteseId };
        });
    }

    // =========================================================================
    // 3. CAPACIDADE 1: DIAGNÓSTICO DE CRESCIMENTO (MATRIZ 7D)
    // =========================================================================

    /**
     * Executa o Diagnóstico de Crescimento avaliando as 7 Dimensões do Negócio,
     * incluindo retenção, recompra e relacionamento de clientes existentes (Ajuste 1).
     * @param {Object} params
     * @param {string} params.empresaId
     * @param {Object} params.dadosOperacionais
     */
    async executarDiagnosticoCrescimento7D({ empresaId, dadosOperacionais = {} }) {
        return await this.comTenant(empresaId, async (client) => {
            const {
                // Dimensão 1: Comunicação & Posicionamento
                temPosicionamentoClaro = false,
                temProvaSocialVisual = false,
                temDiferencialExplicito = false,

                // Dimensão 2: Aquisição & Tráfego
                canaisAquisicaoAtivos = 1, // Dependência de canal único
                volumeMensalNovosContatos = 30,
                possuiTrafegoOrganico = false,

                // Dimensão 3: Atendimento & Velocidade
                tempoMedioRespostaMinutos = 120, // Demora reduz nota
                temHorarioEstendido = false,
                temTriagemAcolhedora = false,

                // Dimensão 4: Processo Comercial & Roteiros
                temSondagemAntesDoPreco = false,
                temScriptPadronizado = false,
                registraEtapaFunil = false,

                // Dimensão 5: Conversão & Fechamento
                taxaFechamentoPosProposta = 0.20,
                ofereceOpcoesPagamentoFacilitado = false,
                ancoragemValorAntesDoNumero = false,

                // Dimensão 6: Estrutura Digital & Ferramentas
                possuiLandingPagePropria = false,
                possuiDominioProprio = false,
                catalogoDigitalOrganizado = false,
                automacaoAlertasPedidos = false,

                // Dimensão 7: Gestão, Retenção & Recompra (Ajuste 1 da Diretoria)
                acompanhaMetricasPerda = false,
                possuiPesquisaSatisfacaoNPS = false,
                temReguaRelacionamentoPosVenda = false, // Relacionamento
                taxaRecompraMensalBase = 0.10,         // Recompra
                taxaRetencaoOuPermanencia = 0.50,      // Retenção
                campanhaRecuperacaoInativos = false     // Reativação
            } = dadosOperacionais;

            // -----------------------------------------------------------------
            // CÁLCULO PONDERADO DOS SCORES (0 a 100 pontos por dimensão)
            // -----------------------------------------------------------------

            // D1: Comunicação (peso autoridade e diferencial)
            const scoreComunicacao = Math.min(100, Math.round(
                (temPosicionamentoClaro ? 35 : 10) +
                (temProvaSocialVisual ? 35 : 10) +
                (temDiferencialExplicito ? 30 : 10)
            ));

            // D2: Aquisição (penaliza dependência excessiva de canal único)
            const scoreAquisicao = Math.min(100, Math.round(
                (canaisAquisicaoAtivos >= 3 ? 40 : (canaisAquisicaoAtivos === 2 ? 25 : 10)) +
                (volumeMensalNovosContatos >= 100 ? 35 : (volumeMensalNovosContatos >= 30 ? 20 : 10)) +
                (possuiTrafegoOrganico ? 25 : 5)
            ));

            // D3: Atendimento (velocidade é crítica para conversão imediata)
            let pontosVelocidade = 40;
            if (tempoMedioRespostaMinutos > 240) pontosVelocidade = 5;
            else if (tempoMedioRespostaMinutos > 60) pontosVelocidade = 15;
            else if (tempoMedioRespostaMinutos > 15) pontosVelocidade = 25;
            const scoreAtendimento = Math.min(100, Math.round(
                pontosVelocidade +
                (temTriagemAcolhedora ? 35 : 10) +
                (temHorarioEstendido ? 25 : 10)
            ));

            // D4: Processo Comercial
            const scoreProcesso = Math.min(100, Math.round(
                (temSondagemAntesDoPreco ? 40 : 5) +
                (temScriptPadronizado ? 35 : 10) +
                (registraEtapaFunil ? 25 : 10)
            ));

            // D5: Conversão
            const scoreConversao = Math.min(100, Math.round(
                (taxaFechamentoPosProposta >= 0.35 ? 40 : (taxaFechamentoPosProposta >= 0.20 ? 25 : 10)) +
                (ancoragemValorAntesDoNumero ? 35 : 10) +
                (ofereceOpcoesPagamentoFacilitado ? 25 : 10)
            ));

            // D6: Estrutura Digital
            const scoreEstrutura = Math.min(100, Math.round(
                (possuiLandingPagePropria ? 35 : 5) +
                (possuiDominioProprio ? 25 : 5) +
                (catalogoDigitalOrganizado ? 20 : 10) +
                (automacaoAlertasPedidos ? 20 : 5)
            ));

            // D7: Gestão, Retenção & Recompra (Subdimensões explícitas - Ajuste 1)
            const subdimRetencao = taxaRetencaoOuPermanencia >= 0.75 ? 25 : (taxaRetencaoOuPermanencia >= 0.50 ? 15 : 5);
            const subdimRecompra = taxaRecompraMensalBase >= 0.25 ? 25 : (taxaRecompraMensalBase >= 0.15 ? 15 : 5);
            const subdimRelacionamento = (temReguaRelacionamentoPosVenda ? 15 : 0) + (possuiPesquisaSatisfacaoNPS ? 10 : 0) + (campanhaRecuperacaoInativos ? 10 : 0);
            const subdimMetricas = acompanhaMetricasPerda ? 15 : 5;

            const scoreGestao = Math.min(100, Math.round(subdimRetencao + subdimRecompra + subdimRelacionamento + subdimMetricas));

            const scoresDimensoes = {
                comunicacao: scoreComunicacao,
                aquisicao: scoreAquisicao,
                atendimento: scoreAtendimento,
                processo_comercial: scoreProcesso,
                conversao: scoreConversao,
                estrutura_digital: scoreEstrutura,
                gestao: {
                    score_total: scoreGestao,
                    subdimensoes: {
                        retencao_score: subdimRetencao,
                        recompra_score: subdimRecompra,
                        relacionamento_pos_venda: subdimRelacionamento,
                        visibilidade_metricas: subdimMetricas
                    }
                }
            };

            // Score Geral de Maturidade (Média Ponderada das 7 Dimensões)
            const scoreGeral = Math.round(
                (scoreComunicacao * 0.12 +
                 scoreAquisicao * 0.15 +
                 scoreAtendimento * 0.18 +
                 scoreProcesso * 0.15 +
                 scoreConversao * 0.18 +
                 scoreEstrutura * 0.10 +
                 scoreGestao * 0.12) * 100
            ) / 100;

            const resumoExecutivo = `Diagnóstico de Maturidade Comercial 7D concluído com pontuação geral de ${scoreGeral}/100. Dimensão mais crítica: ${
                Object.entries({
                    'Comunicação': scoreComunicacao,
                    'Aquisição': scoreAquisicao,
                    'Atendimento': scoreAtendimento,
                    'Processo Comercial': scoreProcesso,
                    'Conversão': scoreConversao,
                    'Estrutura Digital': scoreEstrutura,
                    'Gestão/Retenção': scoreGestao
                }).sort((a,b) => a[1] - b[1])[0][0]
            }.`;

            // Grava o Diagnóstico na Tabela diagnosticos_crescimento
            const resDiag = await client.query(`
                INSERT INTO diagnosticos_crescimento (empresa_id, resumo_executivo, score_geral_maturidade, scores_dimensoes, versao_metodologia)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, criado_em;
            `, [empresaId, resumoExecutivo, scoreGeral, JSON.stringify(scoresDimensoes), this.versaoMetodologia]);

            return {
                diagnosticoId: resDiag.rows[0].id,
                criadoEm: resDiag.rows[0].criado_em,
                scoreGeral,
                scoresDimensoes,
                resumoExecutivo,
                versaoMetodologia: this.versaoMetodologia
            };
        });
    }

    // =========================================================================
    // 4. PRIORIZAÇÃO EPV & MENOR INTERVENÇÃO VIÁVEL (MIV)
    // =========================================================================

    /**
     * Cadastra gargalo com cálculo do Score EPV na coluna gerada pelo PostgreSQL.
     * Documenta critérios e registra a versão da fórmula utilizada (Ajuste 2).
     */
    async cadastrarGargaloEPV({
        empresaId,
        diagnosticoId = null,
        dimensao,
        dimensaoAfetada,
        titulo,
        tituloGargalo,
        descricao,
        descricaoGargalo,
        impactoFinanceiro = 0,
        recorrencia,  // 0.0 a 1.0
        abrangencia,  // 0.0 a 1.0
        severidade,   // 0.0 a 1.0
        esforco,      // 1 a 5
        evidenciasIds = []
    }) {
        const dimReal = dimensao || dimensaoAfetada;
        const titReal = titulo || tituloGargalo;
        const descReal = descricao || descricaoGargalo;
        return await this.comTenant(empresaId, async (client) => {
            // Inserção no PostgreSQL que computa nativamente o epv_score STORED
            const resGargalo = await client.query(`
                INSERT INTO gargalos_comerciais (
                    empresa_id, diagnostico_id, dimensao_afetada, titulo_gargalo, descricao_detalhada,
                    impacto_financeiro_estimado, recorrencia_score, abrangencia_score, severidade_score, esforco_estimado
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, epv_score, criado_em;
            `, [empresaId, diagnosticoId, dimReal, titReal, descReal, impactoFinanceiro, recorrencia, abrangencia, severidade, esforco]);

            const gargaloId = resGargalo.rows[0].id;
            const epvCalculado = parseFloat(resGargalo.rows[0].epv_score);

            // Relacionamento relacional de evidências vinculadas
            for (const evId of evidenciasIds) {
                await client.query(`
                    INSERT INTO gargalos_evidencias_rel (empresa_id, gargalo_id, evidencia_id)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (gargalo_id, evidencia_id) DO NOTHING;
                `, [empresaId, gargaloId, evId]);
            }

            return {
                gargaloId,
                epvScore: epvCalculado,
                versaoFormula: this.versaoFormulaEPV,
                variaveis: { recorrencia, abrangencia, severidade, esforco, impactoFinanceiro }
            };
        });
    }

    /**
     * Formula Recomendação de Menor Intervenção Viável (MIV) com Princípio de Eficácia Suficiente (Ajuste 3).
     * Não favorece intervenções de baixo esforço se forem incapazes de solucionar o gargalo.
     */
    async formularRecomendacaoMIV({
        empresaId,
        gargaloId,
        tituloMiv,
        acaoProposta,
        justificativaMiv,
        justificativaEficaciaSuficiente, // Fundamentação de que esta é a menor ação EFICAZ
        produtoCatalogoVide = 'AUTOMACOES'
    }) {
        return await this.comTenant(empresaId, async (client) => {
            // 1. Registra a recomendação sempre em AGUARDANDO_DIRETORIA
            const resMiv = await client.query(`
                INSERT INTO recomendacoes_miv (
                    empresa_id, gargalo_id, titulo_miv, acao_proposta, justificativa_miv,
                    produto_catalogo_vide, status_aprovacao
                )
                VALUES ($1, $2, $3, $4, $5, $6, 'AGUARDANDO_DIRETORIA')
                RETURNING id, status_aprovacao, criado_em;
            `, [
                empresaId, gargaloId, tituloMiv, acaoProposta,
                `${justificativaMiv} | Princípio da Eficácia Suficiente: ${justificativaEficaciaSuficiente}`,
                produtoCatalogoVide
            ]);

            const recomendacaoId = resMiv.rows[0].id;

            // 2. Registra na trilha de auditoria append-only
            await client.query(`
                INSERT INTO trilha_auditoria_seguranca (empresa_id, usuario_ou_agente, acao_executada, entidade_alvo, entidade_id, detalhes_seguranca)
                VALUES ($1, 'MOTOR_INTELIGENCIA', 'MIV_FORMULADA', 'recomendacoes_miv', $2, $3);
            `, [
                empresaId, recomendacaoId,
                JSON.stringify({ gargaloId, produtoCatalogoVide, status: 'AGUARDANDO_DIRETORIA' })
            ]);

            return {
                recomendacaoId,
                status: resMiv.rows[0].status_aprovacao,
                criadoEm: resMiv.rows[0].criado_em
            };
        });
    }

    /**
     * Aprova formalmente recomendação MIV pela Diretoria Executiva
     */
    async aprovarRecomendacaoMIV({ empresaId, recomendacaoId, usuarioAutorizador = 'DIRETORIA_DOUGLAS', tarefaCentralId = null }) {
        return await this.comTenant(empresaId, async (client) => {
            const res = await client.query(`
                UPDATE recomendacoes_miv
                SET status_aprovacao = 'APROVADO',
                    tarefa_central_id = COALESCE($3, tarefa_central_id),
                    atualizado_em = CURRENT_TIMESTAMP
                WHERE empresa_id = $1 AND id = $2
                RETURNING id, status_aprovacao, tarefa_central_id, atualizado_em;
            `, [empresaId, recomendacaoId, tarefaCentralId]);

            if (res.rowCount === 0) {
                throw new Error(`Recomendação ${recomendacaoId} não encontrada para a empresa informada.`);
            }

            // Registra na auditoria imutável
            await client.query(`
                INSERT INTO trilha_auditoria_seguranca (empresa_id, usuario_ou_agente, acao_executada, entidade_alvo, entidade_id, detalhes_seguranca)
                VALUES ($1, $2, 'MIV_APROVADA_DIRETORIA', 'recomendacoes_miv', $3, $4);
            `, [
                empresaId, usuarioAutorizador, recomendacaoId,
                JSON.stringify({ novo_status: 'APROVADO', tarefa_vinculada: tarefaCentralId })
            ]);

            return res.rows[0];
        });
    }

    // =========================================================================
    // 5. RASTREABILIDADE RELACIONAL & DOSSIÊ ANALÍTICO
    // =========================================================================

    /**
     * Executa consulta de rastreabilidade ponta a ponta:
     * Recomendação -> Gargalo -> Diagnóstico -> Hipótese -> Padrão -> Evidência -> Interação -> Contato
     */
    async obterRastreabilidadeRecomendacao({ empresaId, recomendacaoId }) {
        return await this.comTenant(empresaId, async (client) => {
            const query = `
                SELECT 
                    r.id AS recomendacao_id,
                    r.titulo_miv,
                    r.acao_proposta,
                    r.produto_catalogo_vide,
                    r.status_aprovacao,
                    g.id AS gargalo_id,
                    g.dimensao_afetada,
                    g.titulo_gargalo,
                    g.epv_score,
                    g.esforco_estimado,
                    g.impacto_financeiro_estimado,
                    e.id AS evidencia_id,
                    e.tipo_evidencia,
                    e.trecho_fato,
                    e.contexto_origem,
                    i.id AS interacao_id,
                    i.conteudo_texto AS interacao_conteudo,
                    i.canal AS interacao_canal,
                    c.id AS contato_id,
                    c.nome_identificado AS contato_nome,
                    p.titulo AS padrao_titulo,
                    h.enunciado_hipotese,
                    h.causa_raiz_provavel
                FROM recomendacoes_miv r
                JOIN gargalos_comerciais g ON g.empresa_id = r.empresa_id AND g.id = r.gargalo_id
                LEFT JOIN gargalos_evidencias_rel ge ON ge.empresa_id = g.empresa_id AND ge.gargalo_id = g.id
                LEFT JOIN evidencias_comerciais e ON e.empresa_id = ge.empresa_id AND e.id = ge.evidencia_id
                LEFT JOIN interacoes_comerciais i ON i.empresa_id = e.empresa_id AND i.id = e.interacao_id
                LEFT JOIN contatos_clientes c ON c.empresa_id = i.empresa_id AND c.id = i.contato_id
                LEFT JOIN padroes_evidencias_rel pe ON pe.empresa_id = e.empresa_id AND pe.evidencia_id = e.id
                LEFT JOIN padroes_comportamentais p ON p.empresa_id = pe.empresa_id AND p.id = pe.padrao_id
                LEFT JOIN hipoteses_causais h ON h.empresa_id = p.empresa_id AND h.padrao_id = p.id
                WHERE r.empresa_id = $1 AND r.id = $2;
            `;
            const res = await client.query(query, [empresaId, recomendacaoId]);
            return res.rows;
        });
    }

    /**
     * Compila o Dossiê Completo de Inteligência Comercial da Empresa
     */
    async obterDossieConsolidado(empresaId) {
        return await this.comTenant(empresaId, async (client) => {
            // 1. Diagnóstico 7D mais recente
            const resDiag = await client.query(`
                SELECT * FROM diagnosticos_crescimento 
                WHERE empresa_id = $1 
                ORDER BY criado_em DESC LIMIT 1;
            `, [empresaId]);

            // 2. Gargalos ordenados por EPV decrescente
            const resGargalos = await client.query(`
                SELECT * FROM gargalos_comerciais 
                WHERE empresa_id = $1 
                ORDER BY epv_score DESC LIMIT 10;
            `, [empresaId]);

            // 3. Recomendações MIV
            const resMiv = await client.query(`
                SELECT * FROM recomendacoes_miv 
                WHERE empresa_id = $1 
                ORDER BY criado_em DESC;
            `, [empresaId]);

            // 4. Métricas de Interações e Evidências
            const resMetricas = await client.query(`
                SELECT 
                    (SELECT COUNT(*) FROM contatos_clientes WHERE empresa_id = $1) AS total_contatos,
                    (SELECT COUNT(*) FROM interacoes_comerciais WHERE empresa_id = $1) AS total_interacoes,
                    (SELECT COUNT(*) FROM evidencias_comerciais WHERE empresa_id = $1) AS total_evidencias,
                    (SELECT COUNT(*) FROM padroes_comportamentais WHERE empresa_id = $1) AS total_padroes;
            `, [empresaId]);

            return {
                empresaId,
                metricasGerais: resMetricas.rows[0],
                diagnosticoMaisRecente: resDiag.rows[0] || null,
                gargalosPriorizadosEPV: resGargalos.rows,
                recomendacoesMIV: resMiv.rows
            };
        });
    }
}

// Instância singleton padrão
const servicoMotorInteligencia = new ServicoMotorInteligenciaVIDE();

module.exports = {
    ServicoMotorInteligenciaVIDE,
    servicoMotorInteligencia
};
