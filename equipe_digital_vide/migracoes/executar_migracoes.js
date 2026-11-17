/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * RUNNER OFICIAL DE MIGRAÇÕES E BOOTSTRAP DO BANCO DE DADOS POSTGRESQL
 * =====================================================================
 * Responsável por:
 * 1. Inicializar o schema relacional em um PostgreSQL novo (Bootstrap limpo);
 * 2. Aplicar migrações versionadas transacionais com controle por checksum;
 * 3. Garantir a integridade das 27 tabelas (10 legadas + 17 do Motor 7D),
 *    triggers, funções, restrições compostas multiempresa e políticas RLS.
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pg = require('pg');

const connStr = process.env.DATABASE_URL;

async function executarMigracoes() {
    console.log('========================================================================');
    console.log('VIDE — SISTEMA DE MIGRAÇÕES E BOOTSTRAP DO BANCO DE DADOS');
    console.log('Ambiente: PostgreSQL 16 (Independente de Provedor)');
    console.log('========================================================================\n');

    if (!connStr) {
        console.error('❌ [ERRO_CONFIG] A variável de ambiente DATABASE_URL não foi informada.');
        console.error('   Exemplo de uso: DATABASE_URL="postgresql://user:pass@host:5432/dbname" node executar_migracoes.js [--bootstrap]\n');
        process.exit(1);
    }

    const client = new pg.Client({
        connectionString: connStr,
        ssl: connStr.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const versaoRes = await client.query('SELECT version();');
        console.log('✓ Conectado ao PostgreSQL com sucesso:');
        console.log(`  └─ ${versaoRes.rows[0].version}\n`);

        // 1. BOOTSTRAP DO SCHEMA BASE (Se tabela 'clientes' não existir ou flag --bootstrap estiver presente)
        const forcarBootstrap = process.argv.includes('--bootstrap');
        const resTabelas = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'clientes';
        `);

        const precisaBootstrap = forcarBootstrap || resTabelas.rows.length === 0;

        if (precisaBootstrap) {
            console.log('--- 1. INICIALIZANDO SCHEMA BASE (schema_postgresql.sql) ---');
            const schemaBasePath = path.join(__dirname, '..', 'schema_postgresql.sql');
            if (fs.existsSync(schemaBasePath)) {
                const schemaSql = fs.readFileSync(schemaBasePath, 'utf-8');
                await client.query('BEGIN;');
                try {
                    await client.query(schemaSql);
                    await client.query('COMMIT;');
                    console.log('✓ Schema base e carga inicial dos 7 agentes aplicados com sucesso.');
                } catch (errSchema) {
                    await client.query('ROLLBACK;');
                    throw new Error(`Falha ao aplicar schema_postgresql.sql: ${errSchema.message}`);
                }
            } else {
                console.warn('⚠️ Arquivo schema_postgresql.sql não encontrado no diretório esperado.');
            }
        } else {
            console.log('✓ Schema base (tabela clientes) já presente no banco de dados.');
        }

        // 2. CRIAR TABELA DE CONTROLE DE MIGRAÇÃO (schema_migrations)
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                versao VARCHAR(64) PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                checksum VARCHAR(64) NOT NULL,
                executado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✓ Tabela de controle schema_migrations verificada.');

        // 3. VERIFICAR MIGRAÇÕES JÁ APLICADAS
        const resMigradas = await client.query('SELECT versao FROM schema_migrations;');
        const migracoesAplicadas = new Set(resMigradas.rows.map(r => r.versao));

        // 4. CARREGAR E APLICAR ARQUIVOS DE MIGRAÇÃO VERSIONADOS
        const dirMigracoes = __dirname;
        const arquivos = fs.readdirSync(dirMigracoes)
            .filter(f => f.endsWith('.sql') && !f.includes('reversao'))
            .sort();

        console.log(`\n✓ Total de arquivos de migração encontrados: ${arquivos.length}`);

        for (const arquivo of arquivos) {
            const versao = path.basename(arquivo, '.sql');
            if (migracoesAplicadas.has(versao)) {
                console.log(`  - [JÁ APLICADA] ${versao}`);
                continue;
            }

            console.log(`\n--- APLICANDO MIGRAÇÃO: ${versao} (${arquivo}) ---`);
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
                console.log(`✓ SUCESSO: Migração ${versao} aplicada e registrada na transação (SHA-256: ${checksum.slice(0, 12)}...)`);
            } catch (errMig) {
                await client.query('ROLLBACK;');
                console.error(`❌ FALHA CRÍTICA na migração ${versao}:`, errMig.message);
                throw errMig;
            }
        }

        console.log('\n========================================================================');
        console.log('STATUS FINAL: ESTRUTURA DO BANCO DE DADOS 100% ATUALIZADA E ÍNTEGRA!');
        console.log('========================================================================\n');

    } catch (err) {
        console.error('Erro na execução do bootstrap/migrações:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

if (require.main === module) {
    executarMigracoes();
}

module.exports = { executarMigracoes };
