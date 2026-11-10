/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * BATERIA DE TESTES: MÓDULO DE INTELIGÊNCIA ARTIFICIAL (IA SERVICE)
 * Validação de Integração LLM, Motor Semântico e Serviços Cognitivos
 * =====================================================================
 */

const { iaService } = require('./ia_service');

async function executarTestesIA() {
    console.log('======================================================================');
    console.log('VIDE — TESTES UNITÁRIOS DO MÓDULO DE INTELIGÊNCIA ARTIFICIAL (IA)');
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

    // 1. Enriquecimento de Triagem
    console.log('>>> TESTE 1: Enriquecimento Cognitivo da Triagem (Agente 01)');
    const rTriagem = await iaService.enriquecerTriagemComIA(
        'Preciso de uma landing page para clínica de longevidade',
        'Clínica Lumina'
    );
    const triagemOk = !!rTriagem && (rTriagem.diagnostico_inteligente || rTriagem.analise_cognitiva);
    assert('1.1 IA Gera Diagnóstico Semântico para Triagem', triagemOk, 'Falha ao enriquecer triagem');

    // 2. Síntese de Marca e Tom de Voz
    console.log('\n>>> TESTE 2: Síntese de Narrativa de Branding (Agente 04)');
    const rBranding = await iaService.sintetizarNarrativaBrandingIA('Clínica Lumina', 'Medicina Preventiva');
    const brandingOk = !!rBranding && (rBranding.conceito_posicionamento || rBranding.tom_de_voz);
    assert('2.1 IA Formula Narrativa e Tom de Voz da Marca', brandingOk, 'Falha na síntese de branding');

    // 3. Contra-argumentos de Objeções
    console.log('\n>>> TESTE 3: Contra-argumento Contextual de Objeção (Agente 05)');
    const rObjecao = await iaService.gerarContraArgumentoObjeçãoIA('PRECO_VALOR', 'Achei o valor muito salgado');
    const objecaoOk = !!rObjecao && (rObjecao.abordagem_sugerida || rObjecao.frase_ancoragem);
    assert('3.1 IA Gera Abordagem de Reversão de Objeção', objecaoOk, 'Falha no contra-argumento');

    // 4. Classificação de Sentimento e Intenção no WhatsApp
    console.log('\n>>> TESTE 4: Classificação de Intenção do Lead (Agente 06)');
    const rMsgOptOut = await iaService.classificarIntencaoMensagemIA('Pare de me mandar mensagens, por favor');
    const optOutOk = rMsgOptOut.intencao === 'OPT_OUT' || rMsgOptOut.acao === 'ABORTAR_CADENCIAS';
    assert('4.1 IA Classifica Intenção de Opt-Out Corretamente', optOutOk, `Intenção: ${rMsgOptOut.intencao}`);

    const rMsgCompra = await iaService.classificarIntencaoMensagemIA('Já fiz o pagamento via Pix, como agendamos?');
    const compraOk = rMsgCompra.intencao === 'INTENCAO_COMPRA_ALTA' || rMsgCompra.sentimento === 'POSITIVO';
    assert('4.2 IA Classifica Intenção de Compra Alta Corretamente', compraOk, `Intenção: ${rMsgCompra.intencao}`);

    // 5. Formulação de Hipóteses Causais
    console.log('\n>>> TESTE 5: Formulação de Hipóteses Causais (Agente 07)');
    const rHip = await iaService.formularHipotesesCausaisIA(['Perda de 71% dos leads após envio de proposta em PDF']);
    assert('5.1 IA Formula Hipótese Explicativa para Queda do Funil', !!rHip.hipotese_gerada_ia, 'Falha ao formular hipótese');

    console.log('\n======================================================================');
    console.log(`SUMÁRIO DOS TESTES DE IA:`);
    console.log(`Total: ${total} | Aprovados: ${aprovados} | Taxa: ${Math.round((aprovados / total) * 100)}%`);
    console.log('======================================================================\n');

    return { total, aprovados, sucesso: total === aprovados };
}

if (require.main === module) {
    executarTestesIA().then(r => {
        if (r.sucesso) process.exit(0);
        else process.exit(1);
    });
}

module.exports = { executarTestesIA };
