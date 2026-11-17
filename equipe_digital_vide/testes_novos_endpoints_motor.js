/**
 * =====================================================================
 * VIDE — TESTE DOS NOVOS ENDPOINTS REST DO MOTOR DE INTELIGÊNCIA
 * - POST /api/motor/investigacao-causal
 * - POST /api/motor/aprendizado/avaliar
 * - GET /api/motor/aprendizados/:empresaId
 * =====================================================================
 */

process.env.JWT_SECRET = 'vide_test_jwt_secret_super_seguro_2026';
const http = require('http');
const https = require('https');
const path = require('path');
const { fork } = require('child_process');
const { ServicoMotorInteligenciaVIDE } = require('./servico_motor_inteligencia');
const { seguranca } = require('./seguranca');

const connStr = process.env.DATABASE_URL || 'postgresql://vide_admin:0CaD0pCC9KRjdM1Ts69BcPkm0ylqvjZi@dpg-dbrabbei0phs73f98ve0-a.oregon-postgres.render.com:5432/vide_homologacao';
const API_KEY = 'rnd_eGL4bVF9eFQQNUBWpOU0vVJy86JN';
const DB_ID = 'dpg-dbrabbei0phs73f98ve0-a';

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

function fazerRequisicao({ porta, metodo, caminho, headers = {}, body = null }) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: '127.0.0.1',
            port: porta,
            path: caminho,
            method: metodo,
            headers: {
                ...headers,
                ...(body ? { 'Content-Type': 'application/json' } : {})
            }
        }, (res) => {
            let dados = '';
            res.on('data', c => dados += c);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(dados) });
                } catch (_) {
                    resolve({ status: res.statusCode, body: dados });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function rodarTestesNovosEndpoints() {
    console.log('========================================================================');
    console.log('VIDE — TESTES DOS NOVOS ENDPOINTS REST (INVESTIGAÇÃO & APRENDIZADO)');
    console.log('========================================================================\n');

    const ip = await obterIpAtual();
    await configurarAllowList([{ cidrBlock: ip + '/32', description: 'Teste Novos Endpoints' }]);
    console.log(`✓ IP ${ip} autorizado no Render.`);

    const PORTA_TESTE = 5092;
    const servidorProcesso = fork(path.join(__dirname, '..', 'servidor_local.js'), [], {
        env: {
            ...process.env,
            PORT: PORTA_TESTE.toString(),
            NODE_ENV: 'test',
            DATABASE_URL: connStr
        },
        silent: true
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log(`✓ Servidor de teste ativo na porta ${PORTA_TESTE}.`);

    const motor = new ServicoMotorInteligenciaVIDE();
    const tokenDiretoria = seguranca.gerarTokenSessao({ sub: 'douglas', papel: 'DIRETOR', nome: 'Douglas Paz' });
    const tokenInvasor = seguranca.gerarTokenSessao({ sub: 'invasor', papel: 'CLIENTE', clienteId: '00000000-0000-0000-0000-000000000001' });

    let empresa = null;

    try {
        empresa = await motor.cadastrarEmpresa({
            nomeFantasia: 'Empresa Teste Endpoints',
            segmento: 'Serviços'
        });
        console.log(`✓ Empresa teste criada: ${empresa.id}`);

        // 1. Investigação Causal sem token -> 401
        const r1 = await fazerRequisicao({
            porta: PORTA_TESTE,
            metodo: 'POST',
            caminho: '/api/motor/investigacao-causal',
            body: { empresaId: empresa.id, enunciadoHipotese: 'Teste' }
        });
        console.log(`✓ [1.1] Investigação causal sem token: HTTP ${r1.status} (Esperado: 401)`);
        if (r1.status !== 401) throw new Error('Deveria ser 401');

        // 2. Investigação Causal com cross-tenant -> 403
        const r2 = await fazerRequisicao({
            porta: PORTA_TESTE,
            metodo: 'POST',
            caminho: '/api/motor/investigacao-causal',
            headers: { 'Authorization': 'Bearer ' + tokenInvasor },
            body: { empresaId: empresa.id, enunciadoHipotese: 'Tentativa de violação' }
        });
        console.log(`✓ [1.2] Investigação causal cross-tenant: HTTP ${r2.status} (Esperado: 403)`);
        if (r2.status !== 403) throw new Error('Deveria ser 403');

        // 3. Investigação Causal com Diretoria -> 201
        const r3 = await fazerRequisicao({
            porta: PORTA_TESTE,
            metodo: 'POST',
            caminho: '/api/motor/investigacao-causal',
            headers: { 'Authorization': 'Bearer ' + tokenDiretoria },
            body: {
                empresaId: empresa.id,
                enunciadoHipotese: 'Envio prematuro de proposta reduz percepção de autoridade.',
                causaRaizProvavel: 'Ausência de roteiro consultivo prévio.',
                nivelConfianca: 0.85,
                tipoInvestigacao: 'HIPOTESE_CAUSAL'
            }
        });
        console.log(`✓ [1.3] Investigação causal autorizada: HTTP ${r3.status} (Esperado: 201), ID: ${r3.body.investigacao?.hipoteseId}`);
        if (r3.status !== 201 || !r3.body.investigacao?.hipoteseId) throw new Error('Deveria ser 201 com hipoteseId');

        // Cadastra um gargalo e MIV para avaliar o aprendizado
        const gargalo = await motor.cadastrarGargaloEPV({
            empresaId: empresa.id,
            dimensao: 'CONVERSAO',
            titulo: 'Gargalo Teste Endpoints',
            descricao: 'Descricao',
            recorrencia: 0.8,
            abrangencia: 0.8,
            severidade: 0.8,
            esforco: 2
        });
        const miv = await motor.formularRecomendacaoMIV({
            empresaId: empresa.id,
            gargaloId: gargalo.gargaloId,
            tituloMiv: 'MIV Teste Endpoints',
            acaoProposta: 'Acao',
            justificativaMiv: 'Justificativa'
        });

        // 4. Avaliar Aprendizado sem token -> 401
        const r4 = await fazerRequisicao({
            porta: PORTA_TESTE,
            metodo: 'POST',
            caminho: '/api/motor/aprendizado/avaliar',
            body: { empresaId: empresa.id, mivId: miv.recomendacaoId, statusAprendizado: 'SUCESSO_CONFIRMADO', resultadoObservado: 'Teste' }
        });
        console.log(`✓ [2.1] Avaliar aprendizado sem token: HTTP ${r4.status} (Esperado: 401)`);
        if (r4.status !== 401) throw new Error('Deveria ser 401');

        // 5. Avaliar Aprendizado com Diretoria -> 201
        const r5 = await fazerRequisicao({
            porta: PORTA_TESTE,
            metodo: 'POST',
            caminho: '/api/motor/aprendizado/avaliar',
            headers: { 'Authorization': 'Bearer ' + tokenDiretoria },
            body: {
                empresaId: empresa.id,
                mivId: miv.recomendacaoId,
                indicadorBaseline: 25.0,
                indicadorPos: 50.0,
                unidadeMedida: '%',
                resultadoObservado: 'A conversão dobrou em 14 dias.',
                statusAprendizado: 'SUCESSO_CONFIRMADO',
                gapEsperadoVsRealizado: 'Dentro da meta de 50%.',
                aprendizadosConsolidados: 'Roteiro de 3 etapas validação concluída.'
            }
        });
        console.log(`✓ [2.2] Avaliar aprendizado autorizado: HTTP ${r5.status} (Esperado: 201), ID: ${r5.body.aprendizado?.id}`);
        if (r5.status !== 201 || !r5.body.aprendizado?.id) throw new Error('Deveria ser 201 com aprendizado id');

        // 6. Listar Aprendizados cross-tenant -> 403
        const r6 = await fazerRequisicao({
            porta: PORTA_TESTE,
            metodo: 'GET',
            caminho: `/api/motor/aprendizados/${empresa.id}`,
            headers: { 'Authorization': 'Bearer ' + tokenInvasor }
        });
        console.log(`✓ [3.1] Listar aprendizados cross-tenant: HTTP ${r6.status} (Esperado: 403)`);
        if (r6.status !== 403) throw new Error('Deveria ser 403');

        // 7. Listar Aprendizados com Diretoria -> 200
        const r7 = await fazerRequisicao({
            porta: PORTA_TESTE,
            metodo: 'GET',
            caminho: `/api/motor/aprendizados/${empresa.id}`,
            headers: { 'Authorization': 'Bearer ' + tokenDiretoria }
        });
        console.log(`✓ [3.2] Listar aprendizados autorizado: HTTP ${r7.status} (Esperado: 200), Total: ${r7.body.total}`);
        if (r7.status !== 200 || r7.body.total !== 1) throw new Error('Deveria ser 200 com total 1');

        console.log('\n========================================================================');
        console.log('TODOS OS NOVOS ENDPOINTS REST FORAM HOMOLOGADOS COM SUCESSO (100%)!');
        console.log('========================================================================');

    } finally {
        if (empresa) {
            try {
                await motor.comTenant(empresa.id, async (client) => {
                    await client.query('DELETE FROM aprendizados_miv WHERE empresa_id = $1;', [empresa.id]);
                    await client.query('DELETE FROM recomendacoes_miv WHERE empresa_id = $1;', [empresa.id]);
                    await client.query('DELETE FROM gargalos_comerciais WHERE empresa_id = $1;', [empresa.id]);
                    await client.query('DELETE FROM hipoteses_causais WHERE empresa_id = $1;', [empresa.id]);
                    await client.query('DELETE FROM padroes_comportamentais WHERE empresa_id = $1;', [empresa.id]);
                    await client.query('DELETE FROM empresas_motor WHERE id = $1;', [empresa.id]);
                });
            } catch (_) {}
        }
        if (servidorProcesso) {
            servidorProcesso.kill();
            console.log('✓ Servidor local de teste encerrado.');
        }
        await motor.pool.end();
        await configurarAllowList([]);
        console.log('✓ Perímetro de segurança restaurado (ipAllowList: []).');
    }
}

rodarTestesNovosEndpoints().catch(e => {
    console.error('❌ Falha:', e);
    process.exit(1);
});
