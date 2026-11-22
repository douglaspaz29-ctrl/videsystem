/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * MÓDULO OFICIAL DE INTEGRAÇÃO COM WHATSAPP BUSINESS PLATFORM (META CLOUD API)
 * Compatível com especificações da Meta Graph API v21.0
 * =====================================================================
 */

const https = require('https');
const crypto = require('crypto');
const CONFIG = require('./config_ambiente');
const { seguranca } = require('./seguranca');

class WhatsAppBusinessIntegration {
    constructor() {
        this.appSecret = CONFIG.META_WA_APP_SECRET || CONFIG.META_APP_SECRET || process.env.META_WA_APP_SECRET || process.env.META_APP_SECRET || '';
        this.verifyToken = CONFIG.META_WA_VERIFY_TOKEN || CONFIG.META_VERIFY_TOKEN || process.env.META_WA_VERIFY_TOKEN || 'VIDE_VERIFY_TOKEN_OFICIAL_2026';
        this.phoneNumberId = CONFIG.META_WA_PHONE_NUMBER_ID || CONFIG.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WA_PHONE_NUMBER_ID || '';
        this.accessToken = CONFIG.META_WA_ACCESS_TOKEN || CONFIG.WHATSAPP_ACCESS_TOKEN || process.env.META_WA_ACCESS_TOKEN || '';
        this.graphApiVersion = 'v21.0';
        this.mensagensProcessadas = new Map(); // Cache de idempotência wamid -> { timestamp, id_projeto, telefone }
        this.contatosAssociados = new Map();   // Cache de associação wa_id -> contato comercial
        this.janelaDeduplicacaoMs = 10 * 60 * 1000; // 10 minutos
    }

    /**
     * Retorna o diagnóstico explícito do estado da integração com a Meta Cloud API
     */
    obterStatusIntegracao() {
        const credenciaisCompletas = Boolean(this.phoneNumberId && this.accessToken && this.appSecret);
        return {
            conectado_rede_meta: credenciaisCompletas,
            modo_operacao: credenciaisCompletas ? 'PRODUCAO_META_CLOUD_API' : 'NAO_CONECTADO_SIMULADO_SANDBOX',
            versao_graph_api: this.graphApiVersion,
            configuracao_atual: {
                verify_token_configurado: Boolean(this.verifyToken),
                app_secret_configurado: Boolean(this.appSecret),
                access_token_configurado: Boolean(this.accessToken),
                phone_number_id_configurado: Boolean(this.phoneNumberId)
            },
            requisitos_ativacao_real: [
                'META_WA_VERIFY_TOKEN: Token de verificação definido no painel Meta for Developers para o handshake GET do webhook.',
                'META_WA_APP_SECRET: Segredo do aplicativo Meta (App Secret) para validação criptográfica HMAC-SHA256 (X-Hub-Signature-256).',
                'META_WA_ACCESS_TOKEN: Token permanente do usuário do sistema (System User Access Token) no Meta Business Suite com permissões whatsapp_business_messaging e whatsapp_business_management.',
                'META_WA_PHONE_NUMBER_ID: Identificador numérico oficial do número de telefone comercial (Phone Number ID) na WhatsApp Business Account (WABA).',
                'URL de Callback no Painel Meta: Configurar https://vide-homologacao-backend.onrender.com/api/webhook/whatsapp assinando o campo messages.'
            ]
        };
    }

    /**
     * 1. Validação de Handshake de Webhook da Meta (GET Request)
     * Responde ao desafio hub.challenge da Meta Cloud API
     * @param {Object} query - Parâmetros da query string
     * @returns {string|null} Retorna o challenge se aprovado, ou null
     */
    validarDesafioWebhook(query) {
        const mode = query['hub.mode'];
        const token = query['hub.verify_token'];
        const challenge = query['hub.challenge'];

        if (mode === 'subscribe' && token === this.verifyToken) {
            return challenge;
        }
        return null;
    }

    /**
     * 2. Verificação Criptográfica da Assinatura X-Hub-Signature-256 (POST Request)
     * Garante que o payload veio legitimamente dos servidores da Meta
     * @param {string|Buffer} rawBody
     * @param {string} signatureHeader - Header 'x-hub-signature-256'
     * @returns {boolean}
     */
    validarAssinaturaMeta(rawBody, signatureHeader) {
        if (!this.appSecret) {
            // Se o header de assinatura foi enviado mesmo sem appSecret configurado no ambiente, valida com WEBHOOK_SECRET se solicitado
            if (signatureHeader && CONFIG.WEBHOOK_SECRET) {
                return seguranca.validarAssinaturaWebhook(rawBody, signatureHeader, CONFIG.WEBHOOK_SECRET);
            }
            return true;
        }
        if (!signatureHeader) return false;

        return seguranca.validarAssinaturaWebhook(rawBody, signatureHeader, this.appSecret);
    }

    /**
     * 2.1. Prevenção de Mensagens Repetidas (Idempotência por wamid e hash de conteúdo)
     * @param {Object} msg - Mensagem extraída por extrairEventosMeta
     * @returns {Object|null} Registro anterior se duplicada, ou null se inédita
     */
    verificarDuplicidadeMensagem(msg) {
        if (!msg) return null;
        const agora = Date.now();
        for (const [k, v] of this.mensagensProcessadas.entries()) {
            if (agora - v.timestamp > this.janelaDeduplicacaoMs) {
                this.mensagensProcessadas.delete(k);
            }
        }

        const chaveWamid = msg.id_mensagem_meta ? `wamid:${msg.id_mensagem_meta}` : null;
        const chaveConteudo = `txt:${msg.telefone || ''}:${(msg.texto || '').trim().toLowerCase()}`;

        if (chaveWamid && this.mensagensProcessadas.has(chaveWamid)) {
            return this.mensagensProcessadas.get(chaveWamid);
        }
        if (this.mensagensProcessadas.has(chaveConteudo)) {
            const reg = this.mensagensProcessadas.get(chaveConteudo);
            if (agora - reg.timestamp < 120000) { // Janela de 120s para mesmo texto do mesmo número
                return reg;
            }
        }
        return null;
    }

    /**
     * Registra mensagem como processada no controle de idempotência
     */
    registrarMensagemProcessada(msg, dadosResultado = {}) {
        if (!msg) return;
        const agora = Date.now();
        const registro = {
            id_mensagem_meta: msg.id_mensagem_meta,
            telefone: msg.telefone,
            timestamp: agora,
            ...dadosResultado
        };
        if (msg.id_mensagem_meta) {
            this.mensagensProcessadas.set(`wamid:${msg.id_mensagem_meta}`, registro);
        }
        const chaveConteudo = `txt:${msg.telefone || ''}:${(msg.texto || '').trim().toLowerCase()}`;
        this.mensagensProcessadas.set(chaveConteudo, registro);
    }

    /**
     * 2.2. Identificação e Associação de Contato Comercial
     */
    associarContatoComercial(msg) {
        const telefoneLimpo = String(msg.telefone || '').replace(/\D/g, '');
        const existente = this.contatosAssociados.get(telefoneLimpo);
        const agoraIso = new Date().toISOString();

        const contato = {
            id_contato: existente ? existente.id_contato : `CNT-WA-${crypto.createHash('md5').update(telefoneLimpo || 'anon').digest('hex').substring(0, 8).toUpperCase()}`,
            wa_id: telefoneLimpo,
            telefone: telefoneLimpo,
            nome: msg.nome && msg.nome !== 'Lead WhatsApp' ? msg.nome : (existente?.nome || 'Lead WhatsApp'),
            canal_origem: 'WHATSAPP_META_CLOUD',
            primeira_interacao_em: existente ? existente.primeira_interacao_em : agoraIso,
            ultima_interacao_em: agoraIso,
            total_mensagens: (existente ? existente.total_mensagens : 0) + 1
        };
        this.contatosAssociados.set(telefoneLimpo, contato);
        return contato;
    }

    /**
     * 3. Parser Estruturado de Eventos Inbound da Meta
     * Converte o payload aninhado da Graph API em registros limpos e normalizados para a VIDE
     * @param {Object} payloadMeta
     * @returns {Object} { mensagens: Array, statusUpdates: Array }
     */
    extrairEventosMeta(payloadMeta) {
        const mensagens = [];
        const statusUpdates = [];

        if (!payloadMeta || !payloadMeta.entry || !Array.isArray(payloadMeta.entry)) {
            return { mensagens, statusUpdates };
        }

        for (const entry of payloadMeta.entry) {
            if (!entry.changes || !Array.isArray(entry.changes)) continue;

            for (const change of entry.changes) {
                const value = change.value;
                if (!value || value.messaging_product !== 'whatsapp') continue;

                const contactMap = {};
                if (value.contacts && Array.isArray(value.contacts)) {
                    for (const c of value.contacts) {
                        contactMap[c.wa_id] = c.profile ? c.profile.name : 'Lead WhatsApp';
                    }
                }

                // Extração de Mensagens Inbound
                if (value.messages && Array.isArray(value.messages)) {
                    for (const m of value.messages) {
                        let texto = '';
                        if (m.type === 'text' && m.text) {
                            texto = m.text.body || '';
                        } else if (m.type === 'button' && m.button) {
                            texto = m.button.text || m.button.payload || '';
                        } else if (m.type === 'interactive') {
                            texto = m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '';
                        } else {
                            texto = `[Mensagem tipo ${m.type} recebida]`;
                        }

                        mensagens.push({
                            id_mensagem_meta: m.id,
                            telefone: m.from,
                            nome: contactMap[m.from] || 'Lead WhatsApp',
                            texto: seguranca.sanitizarTexto(texto),
                            tipo: m.type,
                            timestamp_epoch: m.timestamp,
                            data_recebimento: m.timestamp ? new Date(parseInt(m.timestamp, 10) * 1000).toISOString() : new Date().toISOString(),
                            phone_number_id: value.metadata?.phone_number_id || null
                        });
                    }
                }

                // Extração de Atualizações de Status (Sent, Delivered, Read, Failed)
                if (value.statuses && Array.isArray(value.statuses)) {
                    for (const s of value.statuses) {
                        statusUpdates.push({
                            id_mensagem_meta: s.id,
                            status: s.status, // 'sent' | 'delivered' | 'read' | 'failed'
                            telefone: s.recipient_id,
                            timestamp_epoch: s.timestamp,
                            erros: s.errors || null
                        });
                    }
                }
            }
        }

        return { mensagens, statusUpdates };
    }

    /**
     * 4. Envio de Mensagem Outbound via Meta Cloud API (Graph API v21.0)
     * Envia mensagem de texto ou template homologado pela Meta
     * @param {Object} params
     * @param {string} params.to - Número de telefone com DDI e DDD (ex: '5511999998888')
     * @param {string} [params.text] - Texto simples
     * @param {Object} [params.template] - Especificação de Template Meta oficial
     * @returns {Promise<Object>}
     */
    async enviarMensagem({ to, text, template }) {
        const telefoneNormalizado = String(to || '').replace(/\D/g, '');
        if (!telefoneNormalizado || telefoneNormalizado.length < 8) {
            throw new Error('[WHATSAPP_VALIDACAO_ERRO] Número de telefone de destino inválido.');
        }

        // Se credenciais de produção não estiverem configuradas, executa em Sandbox Seguro (Modo Simulado Explícito)
        if (!this.phoneNumberId || !this.accessToken) {
            return {
                sucesso: true,
                modo: 'SANDBOX_SEGURO',
                conectado_rede_meta: false,
                id_mensagem_meta: `wamid.SANDBOX_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
                destinatario: telefoneNormalizado,
                conteudo: text || template,
                nota: 'MODO SIMULADO (NÃO CONECTADO À META): Disparo validado em sandbox local. Configure META_WA_PHONE_NUMBER_ID e META_WA_ACCESS_TOKEN para envio real na Meta Cloud API.'
            };
        }

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: telefoneNormalizado
        };

        if (template) {
            payload.type = 'template';
            payload.template = template;
        } else {
            payload.type = 'text';
            payload.text = { preview_url: false, body: text };
        }

        const bodyString = JSON.stringify(payload);

        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'graph.facebook.com',
                port: 443,
                path: `/${this.graphApiVersion}/${this.phoneNumberId}/messages`,
                method: 'POST',
                timeout: 8000,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(bodyString)
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve({
                                sucesso: true,
                                modo: 'PRODUCAO_META_CLOUD',
                                conectado_rede_meta: true,
                                id_mensagem_meta: parsed.messages?.[0]?.id,
                                resposta_meta: parsed
                            });
                        } else {
                            reject(new Error(`[META_API_ERROR] HTTP ${res.statusCode}: ${parsed.error?.message || data}`));
                        }
                    } catch (e) {
                        reject(new Error(`[META_PARSE_ERROR] Falha ao processar resposta: ${e.message}`));
                    }
                });
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('[META_TIMEOUT_ERROR] Timeout de 8000ms ao contatar graph.facebook.com'));
            });
            req.on('error', (err) => reject(new Error(`[META_NETWORK_ERROR] ${err.message}`)));
            req.write(bodyString);
            req.end();
        });
    }
}

const whatsAppService = new WhatsAppBusinessIntegration();

module.exports = {
    WhatsAppBusinessIntegration,
    whatsAppService
};
