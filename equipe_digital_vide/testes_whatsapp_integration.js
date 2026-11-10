/**
 * =====================================================================
 * VIDE — TESTES UNITÁRIOS DO MÓDULO DE INTEGRAÇÃO COM WHATSAPP (META CLOUD API)
 * =====================================================================
 */

const { WhatsAppBusinessIntegration } = require('./whatsapp_business_integration');
const crypto = require('crypto');

let totalTestes = 0;
let testesAprovados = 0;

function registrarResultado(titulo, passou, detalhes = '') {
    totalTestes++;
    if (passou) {
        testesAprovados++;
        console.log(`✓ [APROVADO] ${titulo}`);
    } else {
        console.error(`✗ [FALHA] ${titulo} — Detalhes: ${detalhes}`);
    }
}

async function executarTestes() {
    console.log('======================================================================');
    console.log('VIDE — TESTES UNITÁRIOS: INTEGRAÇÃO WHATSAPP BUSINESS PLATFORM');
    console.log('======================================================================\n');

    const wa = new WhatsAppBusinessIntegration();
    wa.verifyToken = 'TOKEN_TESTE_VIDE_2026';
    wa.appSecret = 'SECRET_TESTE_META_APP';

    // 1. Handshake GET hub.challenge
    console.log('>>> TESTE 1: Handshake de Verificação de Webhook (GET)');
    const challengeValido = wa.validarDesafioWebhook({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'TOKEN_TESTE_VIDE_2026',
        'hub.challenge': 'CHALLENGE_STRING_12345'
    });
    registrarResultado('1.1 Handshake Aprovado com Token Correto', challengeValido === 'CHALLENGE_STRING_12345');

    const challengeInvalido = wa.validarDesafioWebhook({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'TOKEN_ERRADO',
        'hub.challenge': 'CHALLENGE_STRING_12345'
    });
    registrarResultado('1.2 Handshake Rejeitado com Token Inválido', challengeInvalido === null);

    // 2. Validação de Assinatura Criptográfica HMAC
    console.log('\n>>> TESTE 2: Assinatura Criptográfica X-Hub-Signature-256 (POST)');
    const payloadExemplo = JSON.stringify({ object: "whatsapp_business_account" });
    const hmacCalculado = 'sha256=' + crypto.createHmac('sha256', wa.appSecret).update(payloadExemplo).digest('hex');
    
    const sigValida = wa.validarAssinaturaMeta(payloadExemplo, hmacCalculado);
    registrarResultado('2.1 Assinatura HMAC Válida Aceita', sigValida === true);

    const sigInvalida = wa.validarAssinaturaMeta(payloadExemplo, 'sha256=invalidhash00000000000000000000000000000000000000000000000000000000');
    registrarResultado('2.2 Assinatura HMAC Inválida Rejeitada', sigInvalida === false);

    // 3. Parser de Mensagem Inbound
    console.log('\n>>> TESTE 3: Parser de Mensagens Inbound da Graph API');
    const metaPayloadInbound = {
        object: "whatsapp_business_account",
        entry: [{
            id: "WABA_100200300",
            changes: [{
                value: {
                    messaging_product: "whatsapp",
                    metadata: { display_phone_number: "5511999990000", phone_number_id: "PHONE_ID_123" },
                    contacts: [{ profile: { name: "Dra. Juliana Prado" }, wa_id: "5511988881111" }],
                    messages: [{
                        from: "5511988881111",
                        id: "wamid.HBgLMTE5ODg4ODExMTEVAgASGBQzQjE2RjBDMDVDNDhFNTA1RDRGNAA=",
                        timestamp: "1730784000",
                        type: "text",
                        text: { body: "Olá, gostaria de saber os horários para avaliação facial <script>alert(1)</script>" }
                    }]
                },
                field: "messages"
            }]
        }]
    };

    const eventos = wa.extrairEventosMeta(metaPayloadInbound);
    const temMensagem = eventos.mensagens.length === 1;
    const msg = eventos.mensagens[0];
    const textoSanitizado = msg && !msg.texto.includes('<script>');
    const dadosCorretos = msg && msg.telefone === '5511988881111' && msg.nome === 'Dra. Juliana Prado';

    registrarResultado('3.1 Extração Correta da Mensagem Inbound', temMensagem && dadosCorretos);
    registrarResultado('3.2 Sanitização Contra XSS Aplicada na Mensagem', textoSanitizado);

    // 4. Parser de Status de Entrega (Sent / Delivered / Read)
    console.log('\n>>> TESTE 4: Parser de Status de Entrega (Statuses Callback)');
    const metaPayloadStatus = {
        object: "whatsapp_business_account",
        entry: [{
            id: "WABA_100200300",
            changes: [{
                value: {
                    messaging_product: "whatsapp",
                    metadata: { display_phone_number: "5511999990000", phone_number_id: "PHONE_ID_123" },
                    statuses: [{
                        id: "wamid.HBgLMTE5ODg4ODExMTEVAgASGBQzQjE2RjBDMDVDNDhFNTA1RDRGNAA=",
                        status: "read",
                        timestamp: "1730784060",
                        recipient_id: "5511988881111"
                    }]
                },
                field: "messages"
            }]
        }]
    };

    const eventosStatus = wa.extrairEventosMeta(metaPayloadStatus);
    const temStatus = eventosStatus.statusUpdates.length === 1;
    const st = eventosStatus.statusUpdates[0];
    const statusLido = st && st.status === 'read' && st.telefone === '5511988881111';

    registrarResultado('4.1 Extração Correta de Callback de Leitura (Read Receipt)', temStatus && statusLido);

    // 5. Envio de Mensagem Outbound em Sandbox
    console.log('\n>>> TESTE 5: Envio Outbound no Sandbox Seguro');
    const respostaEnvio = await wa.enviarMensagem({
        to: '5511988881111',
        text: 'Olá Dra. Juliana! Seja muito bem-vinda à VIDE.'
    });

    const envioSandboxOk = respostaEnvio.sucesso && respostaEnvio.modo === 'SANDBOX_SEGURO' && respostaEnvio.id_mensagem_meta.startsWith('wamid.');
    registrarResultado('5.1 Despacho de Mensagem em Sandbox Retorna WAMID Válido', envioSandboxOk);

    console.log('\n======================================================================');
    console.log(`SUMÁRIO DOS TESTES DE WHATSAPP: Total: ${totalTestes} | Aprovados: ${testesAprovados} | Taxa: ${Math.round((testesAprovados/totalTestes)*100)}%`);
    console.log('======================================================================\n');

    if (testesAprovados !== totalTestes) {
        process.exit(1);
    }
}

executarTestes().catch(e => {
    console.error('Erro na execução dos testes de WhatsApp:', e);
    process.exit(1);
});
