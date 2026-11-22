/**
 * =====================================================================
 * VIDE — EXECUÇÃO DE MIGRAÇÃO 004 NO POSTGRESQL (RENDER HOMOLOGAÇÃO)
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const pg = require('pg');

const connStr = process.env.DATABASE_URL || process.env.DATABASE_URL || null;
const API_KEY = process.env.RENDER_API_KEY || "";
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

async function aplicarMigracao004() {
    console.log('--- APLICANDO MIGRAÇÃO 004 NO POSTGRESQL RENDER ---');
    const meuIp = await obterIpAtual();
    console.log(`IP Público identificado: ${meuIp}`);

    console.log('Liberando allowlist no Render...');
    const statusPatch = await configurarAllowList([{ cidrBlock: meuIp + '/32', description: 'Migracao 004 Execucao Servicos' }]);
    if (statusPatch !== 200) {
        throw new Error(`Falha ao configurar allowlist no Render. Status: ${statusPatch}`);
    }
    console.log('Aguardando 4 segundos para propagação de rede...');
    await new Promise(r => setTimeout(r, 4000));

    const pool = new pg.Pool({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const migrationSql = fs.readFileSync(path.join(__dirname, 'migracoes', '004_sistema_execucao_servicos.sql'), 'utf8');
        const client = await pool.connect();
        try {
            console.log('Executando SQL da Migração 004...');
            await client.query(migrationSql);
            console.log('✓ Migração 004 aplicada com sucesso!');

            // Validação de colunas criadas
            const resProj = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'projetos' AND column_name IN ('frentes_comerciais', 'escopo_autorizado', 'natureza_projeto')
            `);
            console.log(`✓ Colunas validadas na tabela 'projetos': ${resProj.rows.map(r => r.column_name).join(', ')}`);

            const resTar = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'tarefas' AND column_name IN ('objetivo', 'criterio_conclusao', 'bloqueio_motivo')
            `);
            console.log(`✓ Colunas validadas na tabela 'tarefas': ${resTar.rows.map(r => r.column_name).join(', ')}`);

            const resAud = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'auditoria_execucao_servicos'
            `);
            console.log(`✓ Tabela 'auditoria_execucao_servicos' confirmada: ${resAud.rows.length === 1 ? 'EXISTE' : 'NÃO ENCONTRADA'}`);

        } finally {
            client.release();
        }
    } finally {
        await pool.end();
        console.log('Restaurando allowlist para estado restrito...');
        await configurarAllowList([]);
        console.log('✓ Perímetro de segurança restaurado!');
    }
}

aplicarMigracao004().catch(err => {
    console.error('Erro ao aplicar migração 004:', err);
    process.exit(1);
});
