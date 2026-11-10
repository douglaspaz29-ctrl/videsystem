/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * BATERIA DE TESTES OFICIAIS: SEGURANÇA, AUTENTICAÇÃO E WEBHOOKS
 * =====================================================================
 */

const crypto = require('crypto');
const { seguranca } = require('./seguranca');
const CONFIG = require('./config_ambiente');
const { db } = require('./banco_dados');

async function executarTestesSeguranca() {
    console.log('======================================================================');
    console.log('VIDE — TESTES UNITÁRIOS DE SEGURANÇA, AUTENTICAÇÃO E PERMISSÕES');
    console.log('======================================================================\n');

    let total = 0;
    let aprovados = 0;

    function assert(nome, condicao, detalhe) {
        total++;
        if (condicao) {
            aprovados++;
            console.log(`✓ [APROVADO] ${nome}`);
        } else {
            console.error(`❌ [REPROVADO] ${nome}: ${detalhe}`);
        }
    }

    // 1. Autenticação e Hash Scrypt
    console.log('>>> TESTE 1: Autenticação de Usuário e Hash Seguro');
    const loginOk = seguranca.autenticarUsuario('diretora', 'VideAdmin#2026');
    assert('1.1 Login com Senha Correta', loginOk && loginOk.sucesso && loginOk.token, 'Falha no login válido');

    const loginFail = seguranca.autenticarUsuario('diretora', 'SenhaErrada123');
    assert('1.2 Rejeição de Senha Incorreta', loginFail === null, 'Deveria ter rejeitado senha errada');

    // 2. Assinatura e Validação de Tokens JWT
    console.log('\n>>> TESTE 2: Assinatura e Validação de Tokens JWT');
    const tokenValido = loginOk.token;
    const payload = seguranca.validarToken(tokenValido);
    assert('2.1 Token Válido Decodificado', payload && payload.usuario === 'diretora' && payload.papel === 'DIRETORA', 'Token não validou');

    // Token adulterado
    const tokenAdulterado = tokenValido.substring(0, tokenValido.length - 5) + 'AAAAA';
    const payloadAdulterado = seguranca.validarToken(tokenAdulterado);
    assert('2.2 Rejeição de Token com Assinatura Adulterada', payloadAdulterado === null, 'Deveria ter rejeitado token forjado');

    // Token expirado
    const tokenExpirado = seguranca.gerarTokenSessao({ usuario: 'teste' }, -10); // expirou há 10 segundos
    const payloadExpirado = seguranca.validarToken(tokenExpirado);
    assert('2.3 Rejeição de Token Expirado', payloadExpirado === null, 'Deveria ter rejeitado token expirado');

    // 3. Validação de Assinatura de Webhook (HMAC-SHA256)
    console.log('\n>>> TESTE 3: Assinatura Criptográfica de Webhooks');
    const corpoPayload = JSON.stringify({ lead: 'Maria', mensagem: 'Olá' });
    const segredoTeste = 'segredo_super_secreto_webhook_123';
    const assinaturaCorreta = crypto.createHmac('sha256', segredoTeste).update(corpoPayload).digest('hex');

    const webhookValido = seguranca.validarAssinaturaWebhook(corpoPayload, assinaturaCorreta, segredoTeste);
    assert('3.1 Webhook com Assinatura HMAC-SHA256 Válida', webhookValido === true, 'Falha na validação de webhook legítimo');

    const webhookFalso = seguranca.validarAssinaturaWebhook(corpoPayload, 'assinatura_falsa_hacker', segredoTeste);
    assert('3.2 Rejeição de Webhook com Assinatura Forjada', webhookFalso === false, 'Deveria ter rejeitado webhook adulterado');

    // 4. Sanitização contra Injeção
    console.log('\n>>> TESTE 4: Sanitização contra Injeção e XSS');
    const textoPerigoso = "<script>alert('ataque')</script>Olá <b>Mundo</b>";
    const textoLimpo = seguranca.sanitizarTexto(textoPerigoso);
    const naoContemScript = !textoLimpo.includes('<script>') && !textoLimpo.includes('alert');
    assert('4.1 Remoção e Escape de Scripts Maliciosos (XSS)', naoContemScript, `Texto resultante: ${textoLimpo}`);

    // 5. Trilha de Auditoria Administrativa
    console.log('\n>>> TESTE 5: Auditoria de Ações Administrativas');
    const logs = db.tabelas.auditoria_admin;
    const temLogLogin = logs.some(l => l.acao.includes('LOGIN'));
    assert('5.1 Registro Imutável em auditoria_admin', temLogLogin && logs.length > 0, 
        `Total de registros de auditoria gravados: ${logs.length}`);

    console.log('\n======================================================================');
    console.log(`SUMÁRIO DOS TESTES DE SEGURANÇA:`);
    console.log(`Total: ${total} | Aprovados: ${aprovados} | Taxa: ${Math.round((aprovados / total) * 100)}%`);
    console.log('======================================================================\n');

    return { total, aprovados, sucesso: total === aprovados };
}

if (require.main === module) {
    executarTestesSeguranca().then(r => {
        if (r.sucesso) process.exit(0);
        else process.exit(1);
    });
}

module.exports = { executarTestesSeguranca };
