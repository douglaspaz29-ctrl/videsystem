/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * MÓDULO OFICIAL DE SEGURANÇA, AUTENTICAÇÃO E CONTROLE DE ACESSO (RBAC)
 * =====================================================================
 */

const crypto = require('crypto');
const CONFIG = require('./config_ambiente');
const { db } = require('./banco_dados');

// Rate Limiter em Memória
const MAPA_RATE_LIMIT = new Map();
const LIMITE_REQUISICOES = 60; // 60 requisições
const JANELA_MS = 60 * 1000;    // por minuto

class ServicoSeguranca {
    constructor() {
        this.inicializarUsuarioDiretoraPadrao();
    }

    /**
     * Inicializa os usuários administradores da VIDE (Diretoria Executiva)
     */
    inicializarUsuarioDiretoraPadrao() {
        // 1. Usuário Diretora
        const existente = Array.from(db.tabelas.usuarios_sistema.values()).find(u => u.usuario === 'diretora');
        if (!existente) {
            const salt = crypto.randomBytes(16).toString('hex');
            const senhaHash = this.gerarHashSenha('VideAdmin#2026', salt);
            db.tabelas.usuarios_sistema.set('usr_diretora', {
                id: 'usr_diretora',
                usuario: 'diretora',
                nome: 'Diretora Executiva VIDE',
                senha_hash: senhaHash,
                salt: salt,
                papel: 'DIRETORA',
                ativo: true,
                criado_em: new Date().toISOString()
            });
        }

        // 2. Usuário Douglas (Diretor Executivo)
        const existenteDouglas = Array.from(db.tabelas.usuarios_sistema.values()).find(u => u.usuario === 'douglas');
        if (!existenteDouglas) {
            const saltD = crypto.randomBytes(16).toString('hex');
            const senhaHashD = this.gerarHashSenha('VideDouglas#2026', saltD);
            db.tabelas.usuarios_sistema.set('usr_douglas', {
                id: 'usr_douglas',
                usuario: 'douglas',
                nome: 'Douglas (Diretor Executivo VIDE)',
                senha_hash: senhaHashD,
                salt: saltD,
                papel: 'DIRETOR',
                ativo: true,
                criado_em: new Date().toISOString()
            });
        }

        db.persistir();
    }

    /**
     * Gera hash de senha criptograficamente seguro via Scrypt
     */
    gerarHashSenha(senhaPura, salt) {
        return crypto.scryptSync(senhaPura, salt, 64).toString('hex');
    }

    /**
     * Autentica usuário com usuário e senha
     */
    autenticarUsuario(usuario, senha) {
        const u = Array.from(db.tabelas.usuarios_sistema.values()).find(x => x.usuario === usuario && x.ativo);
        if (!u) {
            db.registrarAuditoriaAdmin({
                usuario: usuario || 'desconhecido',
                acao: 'LOGIN_FALHOU',
                entidade: 'usuarios_sistema',
                sucesso: false
            });
            return null;
        }

        const hashTeste = this.gerarHashSenha(senha, u.salt);
        if (hashTeste !== u.senha_hash) {
            db.registrarAuditoriaAdmin({
                usuario: usuario,
                acao: 'LOGIN_FALHOU_SENHA_INCORRETA',
                entidade: 'usuarios_sistema',
                entidadeId: u.id,
                sucesso: false
            });
            return null;
        }

        db.registrarAuditoriaAdmin({
            usuario: usuario,
            acao: 'LOGIN_SUCESSO',
            entidade: 'usuarios_sistema',
            entidadeId: u.id,
            sucesso: true
        });

        // Gera token de sessão assinado
        const token = this.gerarTokenSessao({
            userId: u.id,
            usuario: u.usuario,
            papel: u.papel,
            clienteId: u.cliente_id || null
        });

        return {
            sucesso: true,
            usuario: {
                id: u.id,
                usuario: u.usuario,
                nome: u.nome,
                papel: u.papel,
                clienteId: u.cliente_id || null
            },
            token
        };
    }

    /**
     * Gera token JWT assinado com HMAC-SHA256
     */
    gerarTokenSessao(payload, expiracaoSegundos = 86400) { // 24 horas
        const header = { alg: 'HS256', typ: 'JWT' };
        const dados = {
            ...payload,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + expiracaoSegundos
        };

        const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
        const b64Payload = Buffer.from(JSON.stringify(dados)).toString('base64url');
        const assinatura = crypto.createHmac('sha256', CONFIG.JWT_SECRET)
            .update(`${b64Header}.${b64Payload}`)
            .digest('base64url');

        return `${b64Header}.${b64Payload}.${assinatura}`;
    }

    /**
     * Valida token JWT assinado
     */
    validarToken(token) {
        if (!token || typeof token !== 'string') return null;
        const partes = token.split('.');
        if (partes.length !== 3) return null;

        const [b64Header, b64Payload, assinaturaRecebida] = partes;
        const assinaturaEsperada = crypto.createHmac('sha256', CONFIG.JWT_SECRET)
            .update(`${b64Header}.${b64Payload}`)
            .digest('base64url');

        if (assinaturaRecebida !== assinaturaEsperada) return null;

        try {
            const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf-8'));
            const agora = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < agora) return null; // Expirado
            return payload;
        } catch (e) {
            return null;
        }
    }

    /**
     * Valida requisição HTTP (Bearer Token ou Header de API)
     */
    autenticarRequisicao(req) {
        // 1. Tenta cabeçalho Authorization: Bearer <token>
        const authHeader = req.headers['authorization'] || '';
        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7).trim();
            const payload = this.validarToken(token);
            if (payload) return { autenticado: true, usuario: payload };
        }

        // 2. Tenta chave de API administrativa direta
        const apiKey = req.headers['x-vide-api-key'];
        if (apiKey && apiKey === CONFIG.JWT_SECRET) {
            return {
                autenticado: true,
                usuario: { usuario: 'sistema_api', papel: 'DIRETORA' }
            };
        }

        return { autenticado: false, erro: 'Token de autenticação ausente ou inválido.' };
    }

    /**
     * Valida assinatura de Webhook (HMAC-SHA256)
     */
    validarAssinaturaWebhook(corpoBruto, assinaturaRecebida, segredo = CONFIG.WEBHOOK_SECRET) {
        if (!assinaturaRecebida) return false;
        
        let sigLimpa = assinaturaRecebida.replace(/^sha256=/, '');
        const hashCalculado = crypto.createHmac('sha256', segredo)
            .update(corpoBruto)
            .digest('hex');

        const bRecebido = Buffer.from(sigLimpa);
        const bCalculado = Buffer.from(hashCalculado);

        if (bRecebido.length !== bCalculado.length) {
            return false;
        }

        return crypto.timingSafeEqual(bRecebido, bCalculado);
    }

    /**
     * Sanitiza strings contra injeção e scripts maliciosos
     */
    sanitizarTexto(texto) {
        if (typeof texto !== 'string') return texto;
        return texto
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/[<>'"]/g, (tag) => {
                const entidades = { '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
                return entidades[tag] || tag;
            })
            .trim();
    }

    /**
     * Controle de Rate Limit (Prevenção de Abuso e Negação de Serviço)
     */
    verificarRateLimit(ip) {
        const agora = Date.now();
        const registro = MAPA_RATE_LIMIT.get(ip) || { contagem: 0, resetEm: agora + JANELA_MS };

        if (agora > registro.resetEm) {
            registro.contagem = 1;
            registro.resetEm = agora + JANELA_MS;
        } else {
            registro.contagem++;
        }

        MAPA_RATE_LIMIT.set(ip, registro);
        return registro.contagem <= LIMITE_REQUISICOES;
    }
}

const seguranca = new ServicoSeguranca();

module.exports = {
    ServicoSeguranca,
    seguranca
};
