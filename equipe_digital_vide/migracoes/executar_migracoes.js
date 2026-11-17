const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pg = require('C:/Users/Natalia/Downloads/VIDE/SISTEMA_VIDE_OFICIAL/node_modules/pg');

const connStr = process.env.DATABASE_URL || 'postgresql://vide_admin:0CaD0pCC9KRjdM1Ts69BcPkm0ylqvjZi@dpg-dbrabbei0phs73f98ve0-a.oregon-postgres.render.com:5432/vide_homologacao';

async function executarMigracoes() {
    console.log('========================================================================');
    console.log('VIDE — SISTEMA DE MIGRAÇÕES VERSIONADAS DO BANCO DE DADOS');
    console.log('Ambiente: Homologação PostgreSQL 16 (Render)');
    console.log('========================================================================\n');

    const client = new pg.Client({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✓ Conectado ao PostgreSQL 16.');

        // 1. Criar tabela de controle de migração se não existir
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                versao VARCHAR(64) PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                checksum VARCHAR(64) NOT NULL,
                executado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✓ Tabela schema_migrations verificada/inicializada.');

        // 2. Verificar migrações aplicadas
        const resMigradas = await client.query('SELECT versao FROM schema_migrations;');
        const migracoesAplicadas = new Set(resMigradas.rows.map(r => r.versao));

        // 3. Carregar arquivos de migração
        const dirMigracoes = __dirname;
        const arquivos = fs.readdirSync(dirMigracoes)
            .filter(f => f.endsWith('.sql') && !f.includes('reversao'))
            .sort();

        console.log(`✓ Arquivos de migração encontrados: ${arquivos.length}`);

        for (const arquivo of arquivos) {
            const versao = path.basename(arquivo, '.sql');
            if (migracoesAplicadas.has(versao)) {
                console.log(`  - [PULADA] ${versao}: já aplicada anteriormente.`);
                continue;
            }

            console.log(`\n--- APLICANDO MIGRAÇÃO: ${versao} ---`);
            const sqlContent = fs.readFileSync(path.join(dirMigracoes, arquivo), 'utf-8');
            const checksum = crypto.createHash('sha256').update(sqlContent).digest('hex');

            await client.query('BEGIN;');
            try {
                await client.query(sqlContent);
                await client.query(`
                    INSERT INTO schema_migrations (versao, nome, checksum)
                    VALUES ($1, $2, $3);
                `, [versao, arquivo, checksum]);
                await client.query('COMMIT;');
                console.log(`✓ SUCESSO: Migração ${versao} aplicada e registrada na transação com checksum ${checksum.slice(0, 12)}...`);
            } catch (errMig) {
                await client.query('ROLLBACK;');
                console.error(`❌ FALHA CRÍTICA na migração ${versao}:`, errMig);
                throw errMig;
            }
        }

        console.log('\n========================================================================');
        console.log('TODAS AS MIGRAÇÕES FORAM EXECUTADAS COM SUCESSO!');
        console.log('========================================================================\n');

    } catch (err) {
        console.error('Erro geral no runner de migrações:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

if (require.main === module) {
    executarMigracoes();
}

module.exports = { executarMigracoes };
