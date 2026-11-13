/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * CONFIGURAÇÃO DE AMBIENTE & GESTÃO SEGURA DE CREDENCIAIS
 * Lê variáveis de ambiente do arquivo .env com fallbacks seguros
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CAMINHO_ENV = path.join(__dirname, '..', '.env');
const CAMINHO_ENV_EXAMPLE = path.join(__dirname, '..', '.env.example');

function carregarEnv() {
    const config = {};
    if (fs.existsSync(CAMINHO_ENV)) {
        const conteudo = fs.readFileSync(CAMINHO_ENV, 'utf-8');
        const linhas = conteudo.split('\n');
        for (const linha of linhas) {
            const l = linha.trim();
            if (!l || l.startsWith('#')) continue;
            const idx = l.indexOf('=');
            if (idx > 0) {
                const chave = l.substring(0, idx).trim();
                let valor = l.substring(idx + 1).trim();
                if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
                    valor = valor.substring(1, valor.length - 1);
                }
                config[chave] = valor;
                if (!process.env[chave]) process.env[chave] = valor;
            }
        }
    }
    return config;
}

// Carrega as variáveis
carregarEnv();

// Valores com fallbacks seguros
const portaConfig = parseInt(process.env.PORT || '3000', 10);
const hostConfig = process.env.HOST || '0.0.0.0';
const baseUrlConfig = process.env.BASE_URL || 
    (process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : null) || 
    (process.env.RENDER_EXTERNAL_URL ? process.env.RENDER_EXTERNAL_URL : null) || 
    `http://localhost:${portaConfig}`;

const CONFIG = {
    PORTA: portaConfig,
    HOST: hostConfig,
    BASE_URL: baseUrlConfig,
    N8N_URL: process.env.N8N_URL || ((process.env.NODE_ENV === 'staging' || process.env.NODE_ENV === 'production') ? null : 'http://localhost:5678'),
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL || null,
    DATA_DIR: process.env.DATA_DIR || path.join(__dirname, 'dados_persistencia'),
    ENTREGAS_DIR: process.env.ENTREGAS_DIR || path.join(__dirname, 'entregas_clientes'),
    NODE_ENV: process.env.NODE_ENV || 'development',
    JWT_SECRET: process.env.JWT_SECRET || 'vide_jwt_secret_dev_' + crypto.randomBytes(16).toString('hex'),
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'vide_webhook_secret_dev_' + crypto.randomBytes(8).toString('hex'),
    DATABASE_URL: process.env.DATABASE_URL || null,
    SUPABASE_URL: process.env.SUPABASE_URL || null,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || null,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
    META_WA_VERIFY_TOKEN: process.env.META_WA_VERIFY_TOKEN || 'vide_meta_wa_verify_token_default',
    META_WA_APP_SECRET: process.env.META_WA_APP_SECRET || null,
    META_WA_ACCESS_TOKEN: process.env.META_WA_ACCESS_TOKEN || null,
    META_WA_PHONE_NUMBER_ID: process.env.META_WA_PHONE_NUMBER_ID || null,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || null,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || null
};

// Gera automaticamente o .env.example se não existir
if (!fs.existsSync(CAMINHO_ENV_EXAMPLE)) {
    const conteudoExample = `# =====================================================================
# VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
# ARQUIVO MODELO DE CONFIGURAÇÃO DE AMBIENTE (.env.example)
# Preencha com os dados da sua infraestrutura oficial de produção
# =====================================================================

PORT=3000
NODE_ENV=production

# 1. SEGURANÇA E AUTENTICAÇÃO (Obrigatório)
JWT_SECRET=coloque_uma_chave_secreta_longa_e_aleatoria_aqui
WEBHOOK_SECRET=chave_secreta_compartilhada_para_webhooks_vide

# 2. BANCO DE DADOS POSTGRESQL / SUPABASE (Obrigatório para Produção)
DATABASE_URL=postgresql://postgres:[SENHA]@[HOST]:5432/[DATABASE]
SUPABASE_URL=https://[PROJETO].supabase.co
SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# 3. WHATSAPP BUSINESS PLATFORM (META CLOUD API)
META_WA_VERIFY_TOKEN=token_definido_no_painel_de_desenvolvedor_meta
META_WA_APP_SECRET=segredo_do_aplicativo_meta_para_validar_assinatura
META_WA_ACCESS_TOKEN=token_de_acesso_do_sistema_comercial_meta
META_WA_PHONE_NUMBER_ID=id_do_numero_de_telefone_comercial_meta

# 4. INTELIGÊNCIA ARTIFICIAL (LLMs)
GEMINI_API_KEY=sua_chave_api_do_google_gemini
OPENAI_API_KEY=sua_chave_api_da_openai
`;
    fs.writeFileSync(CAMINHO_ENV_EXAMPLE, conteudoExample, 'utf-8');
}

module.exports = CONFIG;
