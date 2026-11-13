/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * BATERIA DE AUDITORIA & TESTES REAIS DE IA NOS 7 AGENTES
 * Validação de Provedor, Modelo, Especialidade e Metadados de Inteligência
 * =====================================================================
 */

const { iaService } = require('./ia_service');

async function executarAuditoriaIA7Agentes() {
    console.log('======================================================================');
    console.log('VIDE — AUDITORIA DE IA GENERATIVA & MOTOR COGNITIVO NOS 7 AGENTES');
    console.log(`Data/Hora: ${new Date().toISOString()}`);
    console.log('======================================================================\n');

    const statusGeral = iaService.obterStatusProvedor();
    console.log(`[STATUS GERAL DO PROVEDOR]`);
    console.log(`• Provedor:           ${statusGeral.provedor}`);
    console.log(`• Modelo:             ${statusGeral.modelo}`);
    console.log(`• IA Generativa Ativa: ${statusGeral.ia_generativa_ativa ? 'SIM' : 'NÃO (Fallback Cognitivo Resiliente)'}`);
    console.log(`• Chave Configurada:  ${statusGeral.chave_configurada}`);
    if (statusGeral.motivo_fallback) {
        console.log(`• Motivo do Fallback: ${statusGeral.motivo_fallback}`);
    }
    console.log('----------------------------------------------------------------------\n');

    let total = 0;
    let aprovados = 0;

    function validarResultadoAgente(numero, nomeAgente, res, campoConteudo) {
        total++;
        const meta = res?.origem_inteligencia;
        const temConteudo = !!(res && (res[campoConteudo] || typeof res === 'string'));
        const temProvedor = !!(meta && meta.provedor);
        const temModelo = !!(meta && meta.modelo);
        const temFlagIa = meta && typeof meta.ia_generativa_ativa === 'boolean';

        const passou = temConteudo && temProvedor && temModelo && temFlagIa;
        if (passou) {
            aprovados++;
            console.log(`✓ [APROVADO] Agente 0${numero}: ${nomeAgente}`);
            console.log(`   └─ Provedor: ${meta.provedor} | Modelo: ${meta.modelo} | IA Generativa: ${meta.ia_generativa_ativa}`);
            if (!meta.ia_generativa_ativa) {
                console.log(`   └─ Nota de Fallback: ${meta.motivo_fallback || 'Fallback Determinístico Ativo'}`);
            }
        } else {
            console.error(`❌ [REPROVADO] Agente 0${numero}: ${nomeAgente} (Falha na validação de metadados de IA)`);
        }
        return passou;
    }

    // 1. Agente 01 — Triagem Comercial
    console.log('>>> 1. TESTE DO AGENTE 01 — TRIAGEM COMERCIAL');
    const r01 = await iaService.enriquecerTriagemComIA(
        'Quero um portal completo com nova marca e agendamento de consultas para clínica estética',
        'Clínica Lumina Estética'
    );
    validarResultadoAgente(1, 'Triagem Comercial', r01, 'analise_cognitiva');

    // 2. Agente 02 — Coordenador Geral (Planejamento + Auditoria)
    console.log('\n>>> 2. TESTE DO AGENTE 02 — COORDENADOR GERAL');
    const r02Plano = await iaService.planejarGrafoCoordenadorComIA(
        'Portal e automação comercial',
        { servicoSolicitado: 'Tripartite', especialistasConfirmados: ['Branding', 'Dev', 'Atendimento'] },
        'Clínica Lumina'
    );
    validarResultadoAgente(2, 'Coordenador Geral (Planejamento)', r02Plano, 'planejamento_ia');

    const r02Audit = await iaService.auditarEntregaComIA(
        'Branding e Design',
        'Design System e Tokens Visuais',
        ['Tokens JSON gerados', 'Logotipo SVG criado'],
        ['design_tokens.json', 'assets/logo.svg']
    );
    validarResultadoAgente(2, 'Coordenador Geral (Auditoria)', r02Audit, 'parecer_auditoria');

    // 3. Agente 03 — Desenvolvedor Full-Stack
    console.log('\n>>> 3. TESTE DO AGENTE 03 — DESENVOLVEDOR FULL-STACK');
    const r03 = await iaService.gerarCopyDesenvolvedorComIA(
        'Clínica Lumina Estética',
        'Estética Avançada',
        'Landing Page com alta taxa de conversão para procedimentos faciais'
    );
    validarResultadoAgente(3, 'Desenvolvedor Full-Stack', r03, 'copy');

    // 4. Agente 04 — Branding e Design
    console.log('\n>>> 4. TESTE DO AGENTE 04 — BRANDING E DESIGN');
    const r04 = await iaService.sintetizarNarrativaBrandingIA(
        'Clínica Lumina Estética',
        'Estética Médica & Longevidade',
        'Posicionamento de luxo acessível e acolhimento'
    );
    validarResultadoAgente(4, 'Branding e Design', r04, 'narrativa_marca');

    // 5. Agente 05 — Atendimento e Vendas
    console.log('\n>>> 5. TESTE DO AGENTE 05 — ATENDIMENTO E VENDAS');
    const r05 = await iaService.gerarEstrategiaAtendimentoIA(
        'Clínica Lumina Estética',
        'Estética Médica',
        'Scripts para reversão de objeções de preço no WhatsApp'
    );
    validarResultadoAgente(5, 'Atendimento e Vendas', r05, 'estrategia_atendimento');

    // 6. Agente 06 — Automação e Integrações
    console.log('\n>>> 6. TESTE DO AGENTE 06 — AUTOMAÇÃO E INTEGRAÇÕES');
    const r06 = await iaService.gerarParametrosAutomacaoIA(
        'Clínica Lumina Estética',
        'Estética Médica',
        { gatilho: 'Novo Lead', canal: 'WhatsApp', cadencia: '2h, 24h, 72h' }
    );
    validarResultadoAgente(6, 'Automação e Integrações', r06, 'arquitetura_automacao');

    // 7. Agente 07 — Inteligência Comercial
    console.log('\n>>> 7. TESTE DO AGENTE 07 — INTELIGÊNCIA COMERCIAL');
    const r07 = await iaService.gerarDiagnosticoInteligenciaIA(
        'Clínica Lumina Estética',
        [{ lead: 'Lead 01', status: 'Perdido', motivo: 'Sem resposta após preço' }],
        [{ categoria: 'PRECO_VALOR', total: 14 }]
    );
    validarResultadoAgente(7, 'Inteligência Comercial', r07, 'diagnostico_executivo');

    console.log('\n======================================================================');
    console.log(`SUMÁRIO DA AUDITORIA DE IA NOS 7 AGENTES:`);
    console.log(`Total de Validações: ${total}`);
    console.log(`Aprovadas:           ${aprovados}`);
    console.log(`Taxa de Sucesso:     ${Math.round((aprovados / total) * 100)}%`);
    console.log(`Provedor Confirmado: ${statusGeral.provedor}`);
    console.log(`Modelo Confirmado:   ${statusGeral.modelo}`);
    console.log(`IA Generativa Ativa: ${statusGeral.ia_generativa_ativa}`);
    console.log('======================================================================\n');

    return { total, aprovados, sucesso: total === aprovados, statusGeral };
}

if (require.main === module) {
    executarAuditoriaIA7Agentes().then(r => {
        if (r.sucesso) process.exit(0);
        else process.exit(1);
    });
}

module.exports = { executarAuditoriaIA7Agentes };
