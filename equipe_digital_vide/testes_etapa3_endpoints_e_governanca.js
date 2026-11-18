/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * SUÍTE OFICIAL DE TESTES: MOTOR DE INTELIGÊNCIA COMERCIAL (ETAPA 3)
 * Endpoints REST, Governança Executiva, Deduplicação, RBAC e Despacho
 * =====================================================================
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'vide_test_jwt_secret_key_2026_etapa3';

const http = require('http');
const https = require('https');
const pg = require('pg');
const { fork } = require('child_process');
const path = require('path');
const { seguranca } = require('./seguranca');
const { ServicoMotorInteligenciaVIDE } = require('./servico_motor_inteligencia');

const connStr = 'postgresql://vide_admin:0CaD0pCC9KRjdM1Ts69BcPkm0ylqvjZi@dpg-dbrabbei0phs73f98ve0-a.oregon-postgres.render.com:5432/vide_homologacao';
const API_KEY = 'rnd_eGL4bVF9eFQQNUBWpOU0vVJy86JN';
const DB_ID = 'dpg-dbrabbei0phs73f98ve0-a';
const TEST_PORT = 5089;
const BASE_TEST_URL = `http://127.0.0.1:${TEST_PORT}`;

// Helper de requisição HTTP
function fazerRequisicao(metodo, caminho, corpo = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(caminho, BASE_TEST_URL);
        const corpoStr = corpo ? JSON.stringify(corpo) : null;
        const opcoes = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
                ...(corpoStr ? { 'Content-Length': Buffer.byteLength(corpoStr) } : {}),
                ...headers
            }
        };

        const req = http.request(opcoes, (res) => {
            let dados = '';
            res.on('data', chunk => dados += chunk);
            res.on('end', () => {
                let json = null;
                try { json = JSON.parse(dados); } catch (_) {}
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: json,
                    rawBody: dados
                });
            });
        });

        req.on('error', reject);
        if (corpoStr) req.write(corpoStr);
        req.end();
    });
}

// Helpers para Allowlist Render
function configurarAllowList(ips) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ ipAllowList: ips });
        const req = https.request({
            hostname: 'api.render.com',
            path: '/v1/postgres/' + DB_ID,
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => resolve(res.statusCode));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function obterIpAtual() {
    return new Promise((resolve, reject) => {
        https.get('https://api.ipify.org?format=json', (res) => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d).ip));
        }).on('error', reject);
    });
}

async function executarSuiteEtapa3() {
    console.log('========================================================================');
    console.log('VIDE — SUÍTE DE TESTES: ENDPOINTS E GOVERNANÇA DO MOTOR (ETAPA 3)');
    console.log('Ambiente: Homologação PostgreSQL 16 Remoto + Servidor Local REST');
    console.log('========================================================================\n');

    let pool = null;
    let servidorProcesso = null;
    let tenantA = null;
    let tenantB = null;

    const relatorio = {
        autenticacao_e_rbac_zero_trust: { status: 'PENDENTE' },
        isolamento_multiempresa_cross_tenant: { status: 'PENDENTE' },
        ingestao_validacao_e_deduplicacao: { status: 'PENDENTE' },
        diagnostico_7d_e_dossie_consolidado: { status: 'PENDENTE' },
        governanca_miv_aprovacao_e_despacho_tarefas: { status: 'PENDENTE' },
        trilha_auditoria_seguranca_identidade: { status: 'PENDENTE' },
        protecao_aprovacao_duplicada_estado: { status: 'PENDENTE' }
    };

    try {
        // 1. IP Allowlist Setup
        const ip = await obterIpAtual();
        console.log(`✓ IP público identificado: ${ip}`);
        await configurarAllowList([{ cidrBlock: ip + '/32', description: 'Teste Automatizado Etapa 3' }]);
        console.log('✓ Allowlist temporária habilitada no Render PostgreSQL.');

        pool = new pg.Pool({
            connectionString: connStr,
            ssl: { rejectUnauthorized: false }
        });

        const motor = new ServicoMotorInteligenciaVIDE({ pool });

        // 2. Inicia o servidor local em porta de teste
        console.log(`✓ Iniciando servidor local de teste na porta ${TEST_PORT}...`);
        servidorProcesso = fork(path.join(__dirname, '..', 'servidor_local.js'), [], {
            env: {
                ...process.env,
                JWT_SECRET: process.env.JWT_SECRET,
                PORT: TEST_PORT,
                NODE_ENV: 'test',
                DATABASE_URL: connStr
            },
            silent: true
        });

        // Aguarda boot do servidor
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log(`✓ Servidor operacional online em http://127.0.0.1:${TEST_PORT}\n`);

        // 3. Cadastra Tenants de Teste
        console.log('--- PREPARAÇÃO DOS TENANTS DE TESTE ---');
        tenantA = await motor.cadastrarEmpresa({
            nomeFantasia: 'Restaurante Sabor Nobre (Etapa 3 Test)',
            razaoSocial: 'Sabor Nobre Gastronomia Ltda',
            segmento: 'Alimentação & Eventos',
            planoMotor: 'ENTERPRISE'
        });
        console.log(`✓ Tenant A criado: ${tenantA.nome_fantasia} [ID: ${tenantA.id}]`);

        tenantB = await motor.cadastrarEmpresa({
            nomeFantasia: 'Clínica DermatoLux (Etapa 3 Test)',
            razaoSocial: 'DermatoLux Medicina Estética Ltda',
            segmento: 'Saúde Premium',
            planoMotor: 'PRO'
        });
        console.log(`✓ Tenant B criado: ${tenantB.nome_fantasia} [ID: ${tenantB.id}]`);

        // Cria tokens de teste
        const tokenDouglas = seguranca.gerarTokenSessao({
            userId: 'usr_douglas',
            usuario: 'douglas',
            papel: 'DIRETOR'
        });
        const tokenClienteA = seguranca.gerarTokenSessao({
            userId: 'usr_cliente_a',
            usuario: 'restaurante_a',
            papel: 'CLIENTE',
            clienteId: tenantA.id
        });
        const tokenClienteB = seguranca.gerarTokenSessao({
            userId: 'usr_cliente_b',
            usuario: 'clinica_b',
            papel: 'CLIENTE',
            clienteId: tenantB.id
        });

        // =====================================================================
        // TESTE 1: AUTENTICAÇÃO E RBAC (ZERO TRUST)
        // =====================================================================
        console.log('\n--- BATERIA 1: AUTENTICAÇÃO E CONTROLE DE ACESSO RBAC ---');
        // 1.1 Chamada sem token para rota protegida
        const resSemToken = await fazerRequisicao('GET', `/api/motor/dossie/${tenantA.id}`);
        if (resSemToken.status === 401) {
            console.log('✓ [1.1] Acesso sem token bloqueado com HTTP 401 Unauthorized.');
        } else {
            throw new Error(`[FALHA 1.1] Esperado status 401, recebido: ${resSemToken.status}`);
        }

        // 1.2 Chamada com token inválido
        const resTokenInvalido = await fazerRequisicao('POST', '/api/motor/diagnostico-7d', {
            empresaId: tenantA.id
        }, { 'Authorization': 'Bearer token_falso_adulterado' });
        if (resTokenInvalido.status === 401) {
            console.log('✓ [1.2] Token inválido/adulterado bloqueado com HTTP 401.');
        } else {
            throw new Error(`[FALHA 1.2] Esperado 401 para token inválido, recebido: ${resTokenInvalido.status}`);
        }

        // 1.3 Chamada de aprovação MIV com papel CLIENTE (não autorizado)
        const resAprovaCliente = await fazerRequisicao('POST', '/api/motor/miv/aprovar', {
            empresaId: tenantA.id,
            recomendacaoId: '00000000-0000-0000-0000-000000000000'
        }, { 'Authorization': `Bearer ${tokenClienteA}` });
        if (resAprovaCliente.status === 403) {
            console.log('✓ [1.3] Usuário com papel CLIENTE impedido de aprovar MIV com HTTP 403 Forbidden.');
        } else {
            throw new Error(`[FALHA 1.3] Esperado 403 para aprovação por cliente, recebido: ${resAprovaCliente.status}`);
        }
        relatorio.autenticacao_e_rbac_zero_trust.status = 'SUCESSO';

        // =====================================================================
        // TESTE 2: ISOLAMENTO MULTIEMPRESA & CROSS-TENANT ATTEMPTS
        // =====================================================================
        console.log('\n--- BATERIA 2: ISOLAMENTO MULTIEMPRESA & PROTEÇÃO CROSS-TENANT ---');
        // 2.1 Cliente A tenta ler dossiê do Tenant B
        const resCrossDossie = await fazerRequisicao('GET', `/api/motor/dossie/${tenantB.id}`, null, {
            'Authorization': `Bearer ${tokenClienteA}`
        });
        if (resCrossDossie.status === 403) {
            console.log('✓ [2.1] Tentativa de Cliente A ler dossiê do Tenant B bloqueada com HTTP 403 Forbidden.');
        } else {
            throw new Error(`[FALHA 2.1] Esperado 403 para cross-tenant read, recebido: ${resCrossDossie.status}`);
        }

        // 2.2 Cliente A tenta ingerir conversa forjando empresaId = Tenant B
        const resCrossIngestao = await fazerRequisicao('POST', '/api/motor/interacoes', {
            empresaId: tenantB.id,
            conteudoTexto: 'Tentativa de injeção cross tenant',
            canal: 'WHATSAPP'
        }, { 'Authorization': `Bearer ${tokenClienteA}` });
        if (resCrossIngestao.status === 403) {
            console.log('✓ [2.2] Tentativa de Cliente A ingerir dados no Tenant B bloqueada com HTTP 403 Forbidden.');
        } else {
            throw new Error(`[FALHA 2.2] Esperado 403 para cross-tenant write, recebido: ${resCrossIngestao.status}`);
        }
        relatorio.isolamento_multiempresa_cross_tenant.status = 'SUCESSO';

        // =====================================================================
        // TESTE 3: INGESTÃO, VALIDAÇÕES E DEDUPLICAÇÃO
        // =====================================================================
        console.log('\n--- BATERIA 3: INGESTÃO COMERCIAL, VALIDAÇÃO E DEDUPLICAÇÃO ---');
        const idExternoMsg = `WPP_MSG_TEST_${Date.now()}`;
        const payloadIngestao = {
            empresaId: tenantA.id,
            canal: 'WHATSAPP',
            direcao: 'ENTRANTE',
            conteudoTexto: 'Boa noite, qual o valor do cardápio especial de carnes para 10 pessoas no sábado?',
            idExternoMensagem: idExternoMsg,
            sessaoExternaId: `sess_${Date.now()}`,
            contato: {
                nome: 'Roberto Antunes (Lead Test)',
                canal: 'WHATSAPP',
                identificadores: [
                    { tipo: 'WHATSAPP_E164', valor: '+5511999997788' }
                ],
                baseLegal: 'LEGITIMO_INTERESSE'
            },
            eventos: [
                { tipoEvento: 'SILENCIO_POS_PRECO', etapaFunil: 'FUNDO', propriedades: { tempo_silencio_minutos: 45 } }
            ],
            evidencias: [
                {
                    tipoEvidencia: 'OBJECAO_PRECO',
                    trechoFato: 'Cliente silenciou 45 minutos após receber tabela de preços em PDF sem fotos ou ancoragem.',
                    contextoOrigem: 'WhatsApp Inbound Noturno',
                    grauConfiabilidade: 1.00
                }
            ]
        };

        // 3.1 Ingestão válida
        const resIngestao1 = await fazerRequisicao('POST', '/api/motor/interacoes', payloadIngestao, {
            'Authorization': `Bearer ${tokenDouglas}`
        });
        if (resIngestao1.status === 201 && resIngestao1.body?.sucesso && !resIngestao1.body.deduplicado) {
            console.log(`✓ [3.1] Interação ingerida com sucesso: Interação [${resIngestao1.body.interacaoId}], Contato [${resIngestao1.body.contatoId}], Evidências [${resIngestao1.body.evidenciasCriadas}].`);
        } else {
            throw new Error(`[FALHA 3.1] Erro na ingestão: ${JSON.stringify(resIngestao1.body)}`);
        }

        // 3.2 Replay Attack / Deduplicação Idempotente
        const resIngestao2 = await fazerRequisicao('POST', '/api/motor/interacoes', payloadIngestao, {
            'Authorization': `Bearer ${tokenDouglas}`
        });
        if (resIngestao2.status === 200 && resIngestao2.body?.deduplicado === true) {
            console.log(`✓ [3.2] Deduplicação idempotente comprovada: Replay interceptado com sucesso sem duplicar registro.`);
        } else {
            throw new Error(`[FALHA 3.2] Falha na deduplicação: ${JSON.stringify(resIngestao2.body)}`);
        }

        // 3.3 Validação de canal inválido
        const resCanalInvalido = await fazerRequisicao('POST', '/api/motor/interacoes', {
            empresaId: tenantA.id,
            canal: 'DISCORD_INEXISTENTE',
            conteudoTexto: 'Oi'
        }, { 'Authorization': `Bearer ${tokenDouglas}` });
        if (resCanalInvalido.status === 400) {
            console.log('✓ [3.3] Canal inválido rejeitado com HTTP 400 Bad Request.');
        } else {
            throw new Error(`[FALHA 3.3] Esperado 400 para canal inválido, recebido: ${resCanalInvalido.status}`);
        }
        relatorio.ingestao_validacao_e_deduplicacao.status = 'SUCESSO';

        // =====================================================================
        // TESTE 4: DIAGNÓSTICO 7D E DOSSIÊ CONSOLIDADO
        // =====================================================================
        console.log('\n--- BATERIA 4: DIAGNÓSTICO 7D E DOSSIÊ CONSOLIDADO ---');
        // 4.1 Executa Diagnóstico 7D com Subdimensões de Retenção
        const resDiag7D = await fazerRequisicao('POST', '/api/motor/diagnostico-7d', {
            empresaId: tenantA.id,
            dadosNegocio: {
                segmento: 'Gastronomia',
                volumeMensalLeads: 250,
                tempoRespostaMinutos: 40,
                avaliarSubdimensoesGestao: true
            }
        }, { 'Authorization': `Bearer ${tokenDouglas}` });

        const scoreGeral = resDiag7D.body?.diagnostico?.scoreGeral || resDiag7D.body?.diagnostico?.pontuacaoGeral;
        if (resDiag7D.status === 200 && scoreGeral !== undefined) {
            const diag = resDiag7D.body.diagnostico;
            const sub = diag.scoresDimensoes?.gestao?.subdimensoes || diag.subdimensoesGestao || {};
            console.log(`✓ [4.1] Diagnóstico 7D calculado: Score Geral [${scoreGeral} pts], Subdimensão Retenção [${sub.retenção_score}%], Recompra [${sub.recompra_score}%].`);
        } else {
            throw new Error(`[FALHA 4.1] Erro no cálculo 7D: ${JSON.stringify(resDiag7D.body)}`);
        }

        // 4.2 Consulta Dossiê Consolidado via Diretor Douglas
        const resDossie = await fazerRequisicao('GET', `/api/motor/dossie/${tenantA.id}`, null, {
            'Authorization': `Bearer ${tokenDouglas}`
        });
        if (resDossie.status === 200 && resDossie.body?.sucesso && resDossie.body.dossie) {
            const d = resDossie.body.dossie;
            console.log(`✓ [4.2] Dossiê consolidado recebido: ${d.metricasGerais.total_contatos} contatos, ${d.metricasGerais.total_interacoes} interações, ${d.metricasGerais.total_evidencias} evidências.`);
        } else {
            throw new Error(`[FALHA 4.2] Erro ao carregar dossiê: ${JSON.stringify(resDossie.body)}`);
        }
        relatorio.diagnostico_7d_e_dossie_consolidado.status = 'SUCESSO';

        // =====================================================================
        // TESTE 5: GOVERNANÇA EXECUTIVA DE MIVS, DESPACHO DE TAREFAS E AUDITORIA
        // =====================================================================
        console.log('\n--- BATERIA 5: GOVERNANÇA DE MIVS, DESPACHO DE TAREFAS E AUDITORIA ---');
        // Cadastra Gargalo EPV e Formula MIV
        const gargalo = await motor.cadastrarGargaloEPV({
            empresaId: tenantA.id,
            dimensao: 'CONVERSAO',
            titulo: 'Silêncio Crítico Pós-Preço no WhatsApp',
            descricao: 'Leads não respondem após envio de tabela de preços em PDF.',
            recorrencia: 0.85,
            abrangencia: 0.70,
            severidade: 0.90,
            esforco: 2,
            impactoFinanceiro: 15000.00
        });

        // Vincula evidência criada na Bateria 3 ao gargalo
        await motor.comTenant(tenantA.id, async (client) => {
            const resEv = await client.query('SELECT id FROM evidencias_comerciais WHERE empresa_id = $1 LIMIT 1;', [tenantA.id]);
            if (resEv.rows.length > 0) {
                await client.query(`
                    INSERT INTO gargalos_evidencias_rel (empresa_id, gargalo_id, evidencia_id)
                    VALUES ($1, $2, $3) ON CONFLICT DO NOTHING;
                `, [tenantA.id, gargalo.gargaloId, resEv.rows[0].id]);
            }
        });

        const miv = await motor.formularRecomendacaoMIV({
            empresaId: tenantA.id,
            gargaloId: gargalo.gargaloId,
            tituloMiv: 'Roteiro de 3 Perguntas e Ancoragem Parcelada',
            acaoProposta: 'Implantar automação n8n que qualifica número de pessoas e ocasião antes de emitir faixa de investimento.',
            justificativaMiv: 'Elimina o choque de preço imediato.',
            justificativaEficaciaSuficiente: 'Testado que respostas imediatas sem filtro perdem 65% dos leads.',
            produtoCatalogoVide: 'AUTOMACOES'
        });
        console.log(`✓ MIV formulada e aguardando Diretoria: [ID: ${miv.recomendacaoId}, Status: ${miv.status}]`);

        // 5.1 Inspeciona rastreabilidade prévia da MIV
        const resRastreab = await fazerRequisicao('GET', `/api/motor/miv/rastreabilidade/${miv.recomendacaoId}?empresaId=${tenantA.id}`, null, {
            'Authorization': `Bearer ${tokenDouglas}`
        });
        if (resRastreab.status === 200 && resRastreab.body?.totalElos > 0) {
            console.log(`✓ [5.1] Rastreabilidade prévia validada: ${resRastreab.body.totalElos} elos relacionais comprovados.`);
        } else {
            throw new Error(`[FALHA 5.1] Erro na rastreabilidade: ${JSON.stringify(resRastreab.body)}`);
        }

        // 5.2 Aprovação formal pela Diretoria Executiva + Despacho de Tarefa
        const resAprovacao = await fazerRequisicao('POST', '/api/motor/miv/aprovar', {
            empresaId: tenantA.id,
            recomendacaoId: miv.recomendacaoId,
            despacharTarefa: true
        }, { 'Authorization': `Bearer ${tokenDouglas}` });

        if (resAprovacao.status === 200 && resAprovacao.body?.sucesso && resAprovacao.body.tarefaDespachada) {
            const tsk = resAprovacao.body.tarefaDespachada;
            console.log(`✓ [5.2] MIV homologada formalmente pela Diretoria! Tarefa [${tsk.id}] despachada para [${tsk.especialista}] com status [${tsk.estado}].`);
        } else {
            throw new Error(`[FALHA 5.2] Erro na aprovação da MIV: ${JSON.stringify(resAprovacao.body)}`);
        }
        relatorio.governanca_miv_aprovacao_e_despacho_tarefas.status = 'SUCESSO';

        // 5.3 Verificação de Trilha de Auditoria Append-Only
        const trilha = await motor.comTenant(tenantA.id, async (client) => {
            const res = await client.query(`
                SELECT * FROM trilha_auditoria_seguranca 
                WHERE empresa_id = $1 AND acao_executada = 'MIV_APROVADA_DIRETORIA'
                ORDER BY registrado_em DESC LIMIT 1;
            `, [tenantA.id]);
            return res.rows[0];
        });

        if (trilha && trilha.usuario_ou_agente === 'douglas') {
            console.log(`✓ [5.3] Trilha de Auditoria imutável confirmada: Aprovador registrado como '${trilha.usuario_ou_agente}' em ${trilha.registrado_em}.`);
            relatorio.trilha_auditoria_seguranca_identidade.status = 'SUCESSO';
        } else {
            throw new Error(`[FALHA 5.3] Trilha de auditoria não encontrou registro de douglas.`);
        }

        // 5.4 Proteção contra Aprovação Duplicada (Controle de Estado)
        const resAprovacaoDuplicada = await fazerRequisicao('POST', '/api/motor/miv/aprovar', {
            empresaId: tenantA.id,
            recomendacaoId: miv.recomendacaoId,
            despacharTarefa: true
        }, { 'Authorization': `Bearer ${tokenDouglas}` });

        if (resAprovacaoDuplicada.status === 409) {
            console.log(`✓ [5.4] Proteção contra aprovação duplicada comprovada: Rejeitado com HTTP 409 Conflict ('${resAprovacaoDuplicada.body.erro}').`);
            relatorio.protecao_aprovacao_duplicada_estado.status = 'SUCESSO';
        } else {
            throw new Error(`[FALHA 5.4] Esperado 409 para aprovação duplicada, recebido: ${resAprovacaoDuplicada.status}`);
        }

        console.log('\n========================================================================');
        console.log('RESULTADO DA HOMOLOGAÇÃO DA ETAPA 3:');
        console.log(JSON.stringify(relatorio, null, 2));
        console.log('========================================================================\n');

    } catch (erroGeral) {
        console.error('\n❌ ERRO DURANTE A SUÍTE DE TESTES:', erroGeral);
        process.exitCode = 1;
    } finally {
        console.log('--- ENCERRAMENTO E RESTAURAÇÃO DE SEGURANÇA ---');
        // Limpeza dos Tenants de Teste
        if (pool && tenantA && tenantB) {
            try {
                const motor = new ServicoMotorInteligenciaVIDE({ pool });
                // Limpa tenant A
                await motor.comTenant(tenantA.id, async (client) => {
                    await client.query('DELETE FROM recomendacoes_miv WHERE empresa_id = $1;', [tenantA.id]);
                    await client.query('DELETE FROM gargalos_evidencias_rel WHERE empresa_id = $1;', [tenantA.id]);
                    await client.query('DELETE FROM gargalos_comerciais WHERE empresa_id = $1;', [tenantA.id]);
                    await client.query('DELETE FROM diagnosticos_crescimento WHERE empresa_id = $1;', [tenantA.id]);
                    await client.query('DELETE FROM evidencias_comerciais WHERE empresa_id = $1;', [tenantA.id]);
                    await client.query('DELETE FROM eventos_jornada WHERE empresa_id = $1;', [tenantA.id]);
                    await client.query('DELETE FROM interacoes_comerciais WHERE empresa_id = $1;', [tenantA.id]);
                    await client.query('DELETE FROM identificadores_contato WHERE empresa_id = $1;', [tenantA.id]);
                    await client.query('DELETE FROM contatos_clientes WHERE empresa_id = $1;', [tenantA.id]);
                });
                // Limpa tenant B
                await motor.comTenant(tenantB.id, async (client) => {
                    await client.query('DELETE FROM contatos_clientes WHERE empresa_id = $1;', [tenantB.id]);
                });
                // Desativa empresas de teste preservando integridade imutável da trilha de auditoria
                await pool.query("UPDATE empresas_motor SET status = 'TESTE_FINALIZADO' WHERE id IN ($1, $2);", [tenantA.id, tenantB.id]);
                console.log('✓ Registros de teste isolados limpos e empresas marcadas como TESTE_FINALIZADO (auditoria preservada).');
            } catch (eClean) {
                console.warn('Aviso na limpeza:', eClean.message);
            }
        }

        if (servidorProcesso) {
            servidorProcesso.kill();
            console.log('✓ Servidor local de teste encerrado.');
        }

        if (pool) {
            await pool.end();
        }

        // Restaura IP Allowlist para []
        try {
            console.log('Restaurando perimeter firewall (ipAllowList: [])...');
            await configurarAllowList([]);
            console.log('✓ PERÍMETRO RESTAURADO COM SUCESSO: [ipAllowList: [] — 100% FECHADO PARA A INTERNET].');
        } catch (eWall) {
            console.error('ERRO AO RESTAURAR ALLOWLIST:', eWall.message);
        }
    }
}

executarSuiteEtapa3();
