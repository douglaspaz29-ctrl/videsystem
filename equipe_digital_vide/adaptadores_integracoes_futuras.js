/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * ADAPTADORES E CONTRATOS DE INTEGRAÇÃO MULTI-FONTE
 * 
 * Arquitetura Desacoplada para Ingestão Contínua:
 * - Fontes Nativas: CSV, XLSX, Formulários Estruturados, Cadastros Manuais
 * - Adaptadores Preparados (Mock/Contrato):
 *   * WhatsApp Meta Cloud API (Webhooks de Conversas & Leads)
 *   * Instagram Graph API (Direct Messages & Menções)
 *   * CRMs Comerciais (HubSpot, RD Station, Pipedrive)
 *   * Plataformas E-commerce & Pagamentos (Shopify, WooCommerce, Hotmart, Stripe)
 * 
 * Conformidade:
 * - Zero credenciais reais hardcoded
 * - Contratos de dados padronizados e tipados
 * - Preservação estrita da natureza do dado (SIMULADO / IMPORTADO / OPERACIONAL_VERIFICADO)
 * =====================================================================
 */

const {
    processarCSVouTSV,
    processarXLSX,
    classificarTipoDadosComerciais,
    validarENormalizarItemComercial
} = require('./processador_arquivos_comerciais');

/**
 * Interface base abstrata para todos os adaptadores de dados comerciais
 */
class AdaptadorOrigemComercial {
    constructor(nomeFonte, naturezaDadoPadrao = 'IMPORTADO') {
        this.nomeFonte = nomeFonte;
        this.naturezaDadoPadrao = naturezaDadoPadrao;
    }

    /**
     * Transforma a carga de entrada em registros brutos tabulares/objetos
     * @param {any} cargaEntrada 
     * @param {Object} [opcoes]
     * @returns {Promise<{ registrosBrutos: Array<Object>, tipoInferido: string, metadados: Object }>}
     */
    async extrairRegistros(cargaEntrada, opcoes = {}) {
        throw new Error(`Método extrairRegistros não implementado no adaptador ${this.nomeFonte}`);
    }
}

/**
 * Adaptador para Arquivos CSV e TSV
 */
class AdaptadorCSV extends AdaptadorOrigemComercial {
    constructor() {
        super('IMPORTACAO_CSV', 'IMPORTADO');
    }

    async extrairRegistros(cargaEntrada, opcoes = {}) {
        const texto = typeof cargaEntrada === 'string' ? cargaEntrada : Buffer.isBuffer(cargaEntrada) ? cargaEntrada.toString('utf8') : '';
        const registrosBrutos = processarCSVouTSV(texto);
        const tipoInferido = classificarTipoDadosComerciais(registrosBrutos, opcoes.tipoExplicitado);
        return {
            registrosBrutos,
            tipoInferido,
            metadados: {
                totalLinhas: registrosBrutos.length,
                formato: 'CSV_TSV',
                nomeArquivo: opcoes.nomeArquivo || 'dados_comerciais.csv'
            }
        };
    }
}

/**
 * Adaptador para Planilhas XLSX
 */
class AdaptadorXLSX extends AdaptadorOrigemComercial {
    constructor() {
        super('IMPORTACAO_XLSX', 'IMPORTADO');
    }

    async extrairRegistros(cargaEntrada, opcoes = {}) {
        let buffer = cargaEntrada;
        if (typeof cargaEntrada === 'string') {
            // Suporta base64 ou caminho/string
            buffer = Buffer.from(cargaEntrada, 'base64');
        }
        const registrosBrutos = processarXLSX(buffer);
        const tipoInferido = classificarTipoDadosComerciais(registrosBrutos, opcoes.tipoExplicitado);
        return {
            registrosBrutos,
            tipoInferido,
            metadados: {
                totalLinhas: registrosBrutos.length,
                formato: 'XLSX',
                nomeArquivo: opcoes.nomeArquivo || 'planilha_comercial.xlsx'
            }
        };
    }
}

/**
 * Adaptador para Formulários Estruturados e Cadastros Manuais
 */
class AdaptadorFormularioManual extends AdaptadorOrigemComercial {
    constructor() {
        super('FORMULARIO_ESTRUTURADO', 'IMPORTADO');
    }

    async extrairRegistros(cargaEntrada, opcoes = {}) {
        let registrosBrutos = [];
        if (Array.isArray(cargaEntrada)) {
            registrosBrutos = cargaEntrada;
        } else if (typeof cargaEntrada === 'object' && cargaEntrada !== null) {
            registrosBrutos = [cargaEntrada];
        }
        const tipoInferido = classificarTipoDadosComerciais(registrosBrutos, opcoes.tipoExplicitado);
        return {
            registrosBrutos,
            tipoInferido,
            metadados: {
                totalLinhas: registrosBrutos.length,
                formato: 'JSON_ESTRUTURADO',
                origemFormulario: opcoes.origemFormulario || 'CentralDeComando'
            }
        };
    }
}

/**
 * Adaptador Preparado: WhatsApp Meta Cloud API (Webhooks)
 */
class AdaptadorWhatsAppMetaCloud extends AdaptadorOrigemComercial {
    constructor() {
        super('WHATSAPP_META_CLOUD', 'OPERACIONAL_VERIFICADO');
    }

    async extrairRegistros(webhookPayload, opcoes = {}) {
        // Converte payload padrão de webhook da Cloud API para itens padronizados
        const registros = [];
        try {
            const entry = webhookPayload?.entry || [];
            for (const ent of entry) {
                const changes = ent.changes || [];
                for (const ch of changes) {
                    const val = ch.value || {};
                    const contacts = val.contacts || [];
                    const messages = val.messages || [];

                    const nomeContato = contacts[0]?.profile?.name || null;
                    const waId = contacts[0]?.wa_id || null;

                    for (const msg of messages) {
                        registros.push({
                            id_mensagem_externa: msg.id,
                            telefone: waId ? `+${waId}` : null,
                            nome: nomeContato,
                            tipo_mensagem: msg.type,
                            texto: msg.text?.body || (msg.type === 'button' ? msg.button?.text : `[Midia: ${msg.type}]`),
                            timestamp: msg.timestamp ? new Date(parseInt(msg.timestamp, 10) * 1000).toISOString() : new Date().toISOString(),
                            direcao: 'ENTRADA',
                            canal: 'WHATSAPP'
                        });
                    }
                }
            }
        } catch (e) {
            // Em caso de payload mock/simplificado
            if (Array.isArray(webhookPayload)) return { registrosBrutos: webhookPayload, tipoInferido: 'INTERACAO', metadados: { provider: 'META' } };
        }

        return {
            registrosBrutos: registros,
            tipoInferido: 'INTERACAO',
            metadados: {
                totalLinhas: registros.length,
                provedor: 'Meta Cloud API v19.0',
                statusConexao: 'CONTRATO_PREPARADO'
            }
        };
    }
}

/**
 * Adaptador Preparado: Instagram Graph API (Direct Messages)
 */
class AdaptadorInstagramGraph extends AdaptadorOrigemComercial {
    constructor() {
        super('INSTAGRAM_GRAPH', 'OPERACIONAL_VERIFICADO');
    }

    async extrairRegistros(webhookPayload, opcoes = {}) {
        const registros = [];
        try {
            const entry = webhookPayload?.entry || [];
            for (const ent of entry) {
                const messaging = ent.messaging || [];
                for (const m of messaging) {
                    registros.push({
                        id_mensagem_externa: m.message?.mid,
                        instagram_sender_id: m.sender?.id,
                        texto: m.message?.text || '[Mídia ou sticker]',
                        timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString(),
                        direcao: 'ENTRADA',
                        canal: 'INSTAGRAM'
                    });
                }
            }
        } catch (e) {
            // Fallback payload
        }

        return {
            registrosBrutos: registros,
            tipoInferido: 'INTERACAO',
            metadados: {
                totalLinhas: registros.length,
                provedor: 'Instagram Graph API',
                statusConexao: 'CONTRATO_PREPARADO'
            }
        };
    }
}

/**
 * Adaptador Preparado: CRM Comercial (HubSpot / RD Station / Pipedrive)
 */
class AdaptadorCRMs extends AdaptadorOrigemComercial {
    constructor(nomeCRM = 'CRM_GENERICO') {
        super(`INTEGRACAO_${nomeCRM.toUpperCase()}`, 'IMPORTADO');
    }

    async extrairRegistros(payloadCRM, opcoes = {}) {
        let registros = [];
        if (Array.isArray(payloadCRM)) {
            registros = payloadCRM;
        } else if (payloadCRM && payloadCRM.results) {
            registros = payloadCRM.results;
        } else if (payloadCRM && payloadCRM.deals) {
            registros = payloadCRM.deals;
        }

        const tipoInferido = classificarTipoDadosComerciais(registros, opcoes.tipoExplicitado || 'OPORTUNIDADE_ORCAMENTO');
        return {
            registrosBrutos: registros,
            tipoInferido,
            metadados: {
                totalLinhas: registros.length,
                origemCrm: this.nomeFonte,
                statusConexao: 'CONTRATO_PREPARADO'
            }
        };
    }
}

/**
 * Adaptador Preparado: E-commerce & Pagamentos (Shopify / Hotmart / Stripe)
 */
class AdaptadorEcommerce extends AdaptadorOrigemComercial {
    constructor(nomePlataforma = 'ECOMMERCE_GENERICO') {
        super(`ECOMMERCE_${nomePlataforma.toUpperCase()}`, 'OPERACIONAL_VERIFICADO');
    }

    async extrairRegistros(payloadVendas, opcoes = {}) {
        let registros = [];
        if (Array.isArray(payloadVendas)) {
            registros = payloadVendas;
        } else if (payloadVendas && (payloadVendas.orders || payloadVendas.vendas || payloadVendas.charges)) {
            registros = payloadVendas.orders || payloadVendas.vendas || payloadVendas.charges;
        }

        return {
            registrosBrutos: registros,
            tipoInferido: 'VENDA',
            metadados: {
                totalLinhas: registros.length,
                plataforma: this.nomeFonte,
                statusConexao: 'CONTRATO_PREPARADO'
            }
        };
    }
}

/**
 * Fábrica Central de Adaptadores
 */
function obterAdaptador(fonteOrigem = 'IMPORTACAO_CSV') {
    const f = (fonteOrigem || '').toUpperCase();
    if (f.includes('CSV') || f.includes('TSV')) return new AdaptadorCSV();
    if (f.includes('XLSX') || f.includes('EXCEL') || f.includes('PLANILHA')) return new AdaptadorXLSX();
    if (f.includes('WHATSAPP') || f.includes('META')) return new AdaptadorWhatsAppMetaCloud();
    if (f.includes('INSTAGRAM')) return new AdaptadorInstagramGraph();
    if (f.includes('CRM') || f.includes('HUBSPOT') || f.includes('PIPEDRIVE') || f.includes('RD')) return new AdaptadorCRMs(f);
    if (f.includes('ECOMMERCE') || f.includes('SHOPIFY') || f.includes('STRIPE') || f.includes('HOTMART')) return new AdaptadorEcommerce(f);
    return new AdaptadorFormularioManual();
}

module.exports = {
    AdaptadorOrigemComercial,
    AdaptadorCSV,
    AdaptadorXLSX,
    AdaptadorFormularioManual,
    AdaptadorWhatsAppMetaCloud,
    AdaptadorInstagramGraph,
    AdaptadorCRMs,
    AdaptadorEcommerce,
    obterAdaptador
};
