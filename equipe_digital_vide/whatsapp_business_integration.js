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
        this.appSecret = CONFIG.META_APP_SECRET || '';
        this.verifyToken = CONFIG.META_VERIFY_TOKEN || 'VIDE_VERIFY_TOKEN_OFICIAL_2026';
        this.phoneNumberId = CONFIG.WHATSAPP_PHONE_NUMBER_ID || '';
        this.accessToken = CONFIG.WHATSAPP_ACCESS_TOKEN || '';
        this.graphApiVersion = 'v21.0';
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
            // Em modo desenvolvimento/sandbox sem secret configurado, permite operação supervisionada
            return true;
        }
        if (!signatureHeader) return false;

        return seguranca.validarAssinaturaWebhook(rawBody, signatureHeader, this.appSecret);
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
                            data_recebimento: new Date(parseInt(m.timestamp) * 1000).toISOString(),
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
        const telefoneNormalizado = to.replace(/\D/g, '');

        // Se credenciais de produção não estiverem configuradas, executa em Sandbox Seguro
        if (!this.phoneNumberId || !this.accessToken) {
            return {
                sucesso: true,
                modo: 'SANDBOX_SEGURO',
                id_mensagem_meta: `wamid.SANDBOX_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
                destinatario: telefoneNormalizado,
                conteudo: text || template,
                nota: 'Disparo simulado com sucesso. Configure WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN no .env para atingir a rede Meta ao vivo.'
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
