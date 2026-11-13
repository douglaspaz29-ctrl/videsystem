/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * MÓDULO OFICIAL DE WEBHOOKS DE SAÍDA (OUTBOUND DISPATCHER)
 * Disparo de Notificações em Tempo Real para n8n, CRM e Sistemas Externos
 * =====================================================================
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const CONFIG = require('./config_ambiente');

class ServicoWebhooksSaida {
    constructor() {
        this.historicoEventos = [];
        this.limiteHistorico = 100;
        this.destinatariosAdicionais = new Set();
    }

    /**
     * Adiciona um endpoint de webhook como assinante de eventos
     * @param {string} url 
     */
    adicionarAssinante(url) {
        if (url && typeof url === 'string' && url.startsWith('http')) {
            this.destinatariosAdicionais.add(url);
        }
    }

    /**
     * Retorna a lista de destinos configurados para receber eventos
     */
    obterDestinosAtivos() {
        const destinos = [];
        if (CONFIG.N8N_WEBHOOK_URL) destinos.push(CONFIG.N8N_WEBHOOK_URL);
        if (CONFIG.N8N_URL && !destinos.includes(CONFIG.N8N_URL)) {
            // Se N8N_URL estiver definida, aponta para webhook/vide-eventos se não houver N8N_WEBHOOK_URL
            if (!CONFIG.N8N_WEBHOOK_URL) {
                const urlBase = CONFIG.N8N_URL.replace(/\/$/, '');
                destinos.push(`${urlBase}/webhook/vide-eventos`);
            }
        }
        for (const url of this.destinatariosAdicionais) {
            if (!destinos.includes(url)) destinos.push(url);
        }
        return destinos;
    }

    /**
     * Assina o payload com HMAC-SHA256 usando o segredo de webhook da VIDE
     * @param {string} payloadJson 
     * @returns {string} Assinatura hex
     */
    gerarAssinaturaHmac(payloadJson) {
        const secret = CONFIG.WEBHOOK_SECRET || 'vide_secret_default';
        return crypto.createHmac('sha256', secret).update(payloadJson).digest('hex');
    }

    /**
     * Dispara um evento assíncrono para todos os destinos configurados
     * @param {string} tipoEvento - Ex: 'lead_recebido', 'projeto_autorizado', 'esteira_concluida'
     * @param {Object} dados - Dados do evento
     * @returns {Promise<Array<Object>>} Resultados de envio
     */
    async dispararEvento(tipoEvento, dados = {}) {
        const destinos = this.obterDestinosAtivos();
        const payloadCompleto = {
            id_evento: `EVT-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
            evento: tipoEvento,
            timestamp: new Date().toISOString(),
            ambiente: CONFIG.NODE_ENV,
            dados
        };

        const jsonString = JSON.stringify(payloadCompleto);
        const assinatura = this.gerarAssinaturaHmac(jsonString);

        const resultados = [];

        // Se não houver destinos externos, registra evento localmente
        if (destinos.length === 0) {
            this.registrarHistorico({
                id_evento: payloadCompleto.id_evento,
                evento: tipoEvento,
                url_destino: 'NENHUM_DESTINO_CONFIGURADO',
                status_http: null,
                sucesso: true,
                aviso: 'Evento gerado e retido no histórico interno. Para envio em rede, configure N8N_WEBHOOK_URL.',
                tempo_ms: 0,
                timestamp: payloadCompleto.timestamp
            });
            return [{ sucesso: true, destino: 'LOCAL_LOG' }];
        }

        // Dispara para todos os destinos em paralelo com timeout de 5 segundos
        for (const url of destinos) {
            const resEnvio = await this.enviarHttp(url, jsonString, assinatura, payloadCompleto.id_evento, tipoEvento);
            resultados.push(resEnvio);
        }

        return resultados;
    }

    /**
     * Realiza o envio HTTP/HTTPS individual com timeout e captura de resposta
     */
    enviarHttp(urlDestino, bodyJson, assinatura, idEvento, tipoEvento) {
        return new Promise((resolve) => {
            const inicioMs = Date.now();
            try {
                const urlObj = new URL(urlDestino);
                const isHttps = urlObj.protocol === 'https:';
                const client = isHttps ? https : http;

                const options = {
                    hostname: urlObj.hostname,
                    port: urlObj.port || (isHttps ? 443 : 80),
                    path: urlObj.pathname + urlObj.search,
                    method: 'POST',
                    timeout: 5000,
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(bodyJson),
                        'x-vide-event': tipoEvento,
                        'x-vide-signature-256': `sha256=${assinatura}`,
                        'User-Agent': 'VIDE-Core-Webhook-Dispatcher/2.0'
                    }
                };

                const req = client.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        const tempoMs = Date.now() - inicioMs;
                        const sucesso = res.statusCode >= 200 && res.statusCode < 300;
                        const registro = {
                            id_evento: idEvento,
                            evento: tipoEvento,
                            url_destino: urlDestino,
                            status_http: res.statusCode,
                            sucesso,
                            tempo_ms: tempoMs,
                            timestamp: new Date().toISOString()
                        };
                        this.registrarHistorico(registro);
                        resolve({ sucesso, status: res.statusCode, destino: urlDestino, tempoMs });
                    });
                });

                req.on('timeout', () => {
                    req.destroy();
                    const tempoMs = Date.now() - inicioMs;
                    const registro = {
                        id_evento: idEvento,
                        evento: tipoEvento,
                        url_destino: urlDestino,
                        status_http: 408,
                        sucesso: false,
                        erro: 'Timeout de 5000ms atingido',
                        tempo_ms: tempoMs,
                        timestamp: new Date().toISOString()
                    };
                    this.registrarHistorico(registro);
                    resolve({ sucesso: false, erro: 'TIMEOUT', destino: urlDestino });
                });

                req.on('error', (err) => {
                    const tempoMs = Date.now() - inicioMs;
                    const registro = {
                        id_evento: idEvento,
                        evento: tipoEvento,
                        url_destino: urlDestino,
                        status_http: null,
                        sucesso: false,
                        erro: err.message,
                        tempo_ms: tempoMs,
                        timestamp: new Date().toISOString()
                    };
                    this.registrarHistorico(registro);
                    resolve({ sucesso: false, erro: err.message, destino: urlDestino });
                });

                req.write(bodyJson);
                req.end();
            } catch (errGeral) {
                const tempoMs = Date.now() - inicioMs;
                resolve({ sucesso: false, erro: errGeral.message, destino: urlDestino, tempoMs });
            }
        });
    }

    /**
     * Registra evento no histórico em memória
     */
    registrarHistorico(registro) {
        this.historicoEventos.unshift(registro);
        if (this.historicoEventos.length > this.limiteHistorico) {
            this.historicoEventos.pop();
        }
    }

    /**
     * Obtém os últimos eventos disparados
     * @param {number} limite 
     */
    obterHistorico(limite = 20) {
        return this.historicoEventos.slice(0, limite);
    }
}

const servicoWebhooksSaida = new ServicoWebhooksSaida();

module.exports = {
    ServicoWebhooksSaida,
    servicoWebhooksSaida
};
