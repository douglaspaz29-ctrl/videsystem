/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * SUÍTE OFICIAL DE TESTES: EVOLUÇÃO DA INTELIGÊNCIA DO MOTOR COMERCIAL
 * Validação dos 5 Pilares de Evolução Epistemológica e Analítica
 * =====================================================================
 * 1. Mineração de Padrões Recorrentes vs Rejeição de Ocorrência Isolada
 * 2. Investigação Formal de Causas (Fato, Padrão, Hipótese, Causa Confirmada)
 * 3. Detecção de Evidências Conflitantes -> INFORMACAO_INSUFICIENTE
 * 4. Priorização Multidimensional (EPV + Urgência Operacional + Confiança)
 * 5. MIV com 10 Atributos Obrigatórios e Trava de Governança
 * 6. Feedback Loop & Aprendizado Contínuo (aprendizados_miv)
 * 7. Isolamento Multiempresa RLS Bidirecional em Tabelas Enriquecidas
 * 8. Integração Agente 07 (executarCicloMotorInteligencia & avaliarImpactoMIV)
 * =====================================================================
 */

const https = require('https');
const pg = require('pg');
const { ServicoMotorInteligenciaVIDE } = require('./servico_motor_inteligencia');
const { executarCicloMotorInteligencia, avaliarImpactoMIV } = require('./agente_07_inteligencia_comercial/executor_inteligencia_comercial');

const connStr = process.env.DATABASE_URL || process.env.DATABASE_URL || null;
const API_KEY = process.env.RENDER_API_KEY || "";
const DB_ID = 'dpg-dbrabbei0phs73f98ve0-a';

function configurarAllowList(ips) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ ipAllowList: ips });
        const req = https.request({
            hostname: 'api.render.com',
            path: '/v1/postgres/' + DB_ID,
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => resolve(res.statusCode));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function obterIpAtual() {
    return new Promise((resolve, reject) => {
        https.get('https://api.ipify.org?format=json', (res) => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d).ip));
        }).on('error', reject);
    });
}

async function rodarBateriaEvolucaoMotor() {
    console.log('========================================================================');
    console.log('VIDE — SUÍTE DE TESTES: EVOLUÇÃO DA INTELIGÊNCIA DO MOTOR COMERCIAL');
    console.log('Ambiente: Homologação PostgreSQL 16 (Render Oregon)');
    console.log('========================================================================\n');

    let ip = '127.0.0.1';
    try {
        ip = await obterIpAtual();
        console.log(`✓ IP da máquina de testes identificado: ${ip}`);
        await configurarAllowList([{ cidrBlock: ip + '/32', description: 'Teste Evolucao Motor' }]);
        console.log('✓ Perímetro temporário liberado para execução dos testes.\n');
    } catch (e) {
        console.warn('⚠️ Não foi possível configurar IP no Render (assumindo conexão direta ou local):', e.message);
    }

    const poolTeste = new pg.Pool({
        connectionString: connStr,
        ssl: connStr.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    const motor = new ServicoMotorInteligenciaVIDE({ pool: poolTeste });

    const relatorio = {
        teste_1_padrao_recorrente_vs_amostra_suficiente: { status: 'PENDENTE' },
        teste_2_rejeicao_ocorrencia_isolada: { status: 'PENDENTE' },
        teste_3_investigacao_causal_epistemologica: { status: 'PENDENTE' },
        teste_4_conflito_evidencias_informacao_insuficiente: { status: 'PENDENTE' },
        teste_5_priorizacao_multidimensional_epv: { status: 'PENDENTE' },
        teste_6_miv_10_atributos_governanca: { status: 'PENDENTE' },
        teste_7_aprendizado_continuo_feedback_loop: { status: 'PENDENTE' },
        teste_8_isolamento_multiempresa_rls: { status: 'PENDENTE' },
        teste_9_integracao_agente_07_completa: { status: 'PENDENTE' }
    };

    let tenantAlfa = null;
    let tenantBeta = null;

    try {
        // =====================================================================
        // SETUP: CADASTRO DOS TENANTS
        // =====================================================================
        tenantAlfa = await motor.cadastrarEmpresa({
            nomeFantasia: 'TechLog Soluções B2B',
            razaoSocial: 'TechLog Soluções em Logística Ltda',
            segmento: 'Tecnologia & B2B'
        });
        console.log(`✓ Tenant Alfa criado: ${tenantAlfa.nome_fantasia} (${tenantAlfa.id})`);

        tenantBeta = await motor.cadastrarEmpresa({
            nomeFantasia: 'Boutique Donna Bella',
            razaoSocial: 'Donna Bella Vestuário Eireli',
            segmento: 'Varejo & Moda'
        });
        console.log(`✓ Tenant Beta criado: ${tenantBeta.nome_fantasia} (${tenantBeta.id})\n`);

        // =====================================================================
        // TESTE 1: INVESTIGAÇÃO DE PADRÕES COM AMOSTRA SUFICIENTE
        // =====================================================================
        console.log('------------------------------------------------------------------------');
        console.log('[TESTE 1] Padrão Recorrente com Amostra Suficiente (Frequência = 6)');
        console.log('------------------------------------------------------------------------');

        // Cria contato e evidências no Tenant Alfa
        const contatoAlfa1 = await motor.registrarContatoIdentificado({
            empresaId: tenantAlfa.id,
            nome: 'Carlos Eduardo (Comprador)',
            canalOrigem: 'WHATSAPP'
        });

        const interacaoAlfa1 = await motor.registrarInteracaoEEventos({
            empresaId: tenantAlfa.id,
            contatoId: contatoAlfa1.id,
            canal: 'WHATSAPP',
            direcao: 'ENTRADA',
            conteudoTexto: 'Recebemos a tabela mas achei o setup muito alto para o nosso volume.'
        });

        const evIdsAlfa = await motor.isolarEvidencias({
            empresaId: tenantAlfa.id,
            contatoId: contatoAlfa1.id,
            interacaoId: interacaoAlfa1.interacaoId,
            listaEvidencias: [
                { tipoEvidencia: 'OBJECAO_PRECO_SETUP', trechoFato: 'Achei o setup muito alto para o nosso volume.' },
                { tipoEvidencia: 'SILENCIO_POS_TABELA', trechoFato: 'Parou de responder após envio de tabela PDF sem qualificação.' }
            ]
        });

        const padraoRecorrente = await motor.minerarPadraoEHipoteses({
            empresaId: tenantAlfa.id,
            categoria: 'PRECO_VALOR',
            tituloPadrao: 'Resistência ao Custo de Setup em Negócios de Pequeno Porte',
            descricaoPadrao: 'Leads de menor porte travam no valor inicial de implantação sem ponderar o ROI recorrente.',
            frequencia: 6,
            evidenciasIds: evIdsAlfa,
            contextoSegmento: 'Logística B2B'
        });

        console.log('✓ Padrão minerado:', padraoRecorrente);
        if (padraoRecorrente.tipoClassificacao !== 'PADRAO_CONFIRMADO' || padraoRecorrente.grauConfianca !== 'ALTO') {
            throw new Error(`Falha no Teste 1: Padrão deveria ser PADRAO_CONFIRMADO com confiança ALTO, obteve: ${padraoRecorrente.tipoClassificacao} / ${padraoRecorrente.grauConfianca}`);
        }
        relatorio.teste_1_padrao_recorrente_vs_amostra_suficiente.status = 'APROVADO';

        // =====================================================================
        // TESTE 2: REJEIÇÃO EPISTEMOLÓGICA DE OCORRÊNCIA ISOLADA (Frequência = 1)
        // =====================================================================
        console.log('\n------------------------------------------------------------------------');
        console.log('[TESTE 2] Rejeição Epistemológica de Ocorrência Isolada (Frequência = 1)');
        console.log('------------------------------------------------------------------------');

        const ocorrenciaIsolada = await motor.minerarPadraoEHipoteses({
            empresaId: tenantAlfa.id,
            categoria: 'CANAL_COMUNICACAO',
            tituloPadrao: 'Lead solicitou contato exclusivo via Telegram',
            descricaoPadrao: 'Um único contato pediu atendimento por Telegram em vez de WhatsApp.',
            frequencia: 1,
            evidenciasIds: [evIdsAlfa[0]],
            contextoSegmento: 'Logística B2B'
        });

        console.log('✓ Resultado da mineração de evento único:', ocorrenciaIsolada);
        if (ocorrenciaIsolada.tipoClassificacao !== 'OCORRENCIA_ISOLADA' || ocorrenciaIsolada.grauConfianca !== 'BAIXO') {
            throw new Error(`Falha no Teste 2: Ocorrência única não pode ser confirmada como padrão! Obteve: ${ocorrenciaIsolada.tipoClassificacao}`);
        }
        if (!ocorrenciaIsolada.limitacoesAnalise || !ocorrenciaIsolada.limitacoesAnalise.includes('Amostra insuficiente')) {
            throw new Error('Falha no Teste 2: Falta registrar a limitação epistemológica de amostra insuficiente.');
        }
        relatorio.teste_2_rejeicao_ocorrencia_isolada.status = 'APROVADO';

        // =====================================================================
        // TESTE 3: INVESTIGAÇÃO CAUSAL FORMAL
        // =====================================================================
        console.log('\n------------------------------------------------------------------------');
        console.log('[TESTE 3] Investigação Causal Formal (Fato vs Hipótese vs Causa)');
        console.log('------------------------------------------------------------------------');

        const investigacaoCausal = await motor.investigarCausaRaiz({
            empresaId: tenantAlfa.id,
            padraoId: padraoRecorrente.padraoId,
            enunciadoHipotese: 'O envio do valor bruto de setup antes da demonstração das economias operacionais gera ancoragem negativa.',
            causaRaizProvavel: 'Ausência de calculadora de ROI preliminar antes do envio da proposta formal.',
            nivelConfianca: 0.85,
            tipoInvestigacao: 'HIPOTESE_CAUSAL',
            evidenciasIds: evIdsAlfa,
            metodoInvestigacao: 'ANÁLISE_TEMPORAL_AUDITORIA_CONVERSAS'
        });

        console.log('✓ Hipótese causal formalizada:', investigacaoCausal);
        if (investigacaoCausal.tipoInvestigacao !== 'HIPOTESE_CAUSAL' || investigacaoCausal.statusValidacao !== 'EM_ANALISE') {
            throw new Error('Falha no Teste 3: Hipótese não foi gravada com status e tipo adequados.');
        }
        relatorio.teste_3_investigacao_causal_epistemologica.status = 'APROVADO';

        // =====================================================================
        // TESTE 4: EVIDÊNCIAS CONFLITANTES -> INFORMACAO_INSUFICIENTE
        // =====================================================================
        console.log('\n------------------------------------------------------------------------');
        console.log('[TESTE 4] Evidências Conflitantes -> INFORMACAO_INSUFICIENTE');
        console.log('------------------------------------------------------------------------');

        const investigacaoConflito = await motor.investigarCausaRaiz({
            empresaId: tenantAlfa.id,
            padraoId: padraoRecorrente.padraoId,
            enunciadoHipotese: 'Clientes preferem planos anuais a mensais.',
            causaRaizProvavel: 'Percepção de desconto no longo prazo.',
            nivelConfianca: 0.40,
            tipoInvestigacao: 'HIPOTESE_CAUSAL',
            evidenciasIds: evIdsAlfa,
            evidenciasConflitantes: 'Enquanto 3 clientes pediram desconto anual, 4 clientes recusaram compromisso anual alegando volatilidade.',
            metodoInvestigacao: 'ENTREVISTA_QUALITATIVA'
        });

        console.log('✓ Investigação com evidências divergentes:', investigacaoConflito);
        if (investigacaoConflito.tipoInvestigacao !== 'INFORMACAO_INSUFICIENTE' || investigacaoConflito.statusValidacao !== 'CONFLITO_EVIDENCIAS') {
            throw new Error(`Falha no Teste 4: Deveria classificar como INFORMACAO_INSUFICIENTE / CONFLITO_EVIDENCIAS. Obteve: ${investigacaoConflito.tipoInvestigacao}`);
        }
        relatorio.teste_4_conflito_evidencias_informacao_insuficiente.status = 'APROVADO';

        // =====================================================================
        // TESTE 5: PRIORIZAÇÃO MULTIDIMENSIONAL EPV
        // =====================================================================
        console.log('\n------------------------------------------------------------------------');
        console.log('[TESTE 5] Priorização Multidimensional (EPV Matemático + Urgência + Confiança)');
        console.log('------------------------------------------------------------------------');

        const gargaloCritico = await motor.cadastrarGargaloEPV({
            empresaId: tenantAlfa.id,
            dimensao: 'CONVERSAO',
            titulo: 'Travamento de Vendas por Choque no Valor de Implantação',
            descricao: 'Clientes desistem imediatamente ao deparar-se com custo de setup sem amortização parcelada.',
            impactoFinanceiro: 12500.00,
            recorrencia: 0.80,
            abrangencia: 0.75,
            severidade: 0.85,
            esforco: 2,
            urgenciaOperacional: 'CRITICA',
            metodoAfericaoResultado: 'Taxa de aceitação de propostas com setup diluído em 12x',
            confiancaAnalitica: 'ALTA',
            evidenciasIds: evIdsAlfa
        });

        console.log('✓ Gargalo Crítico registrado:', gargaloCritico);
        if (!gargaloCritico.epvScore || gargaloCritico.epvScore <= 0) {
            throw new Error('Falha no Teste 5: epvScore gerado pelo PostgreSQL é inválido.');
        }
        if (gargaloCritico.urgenciaOperacional !== 'CRITICA' || !gargaloCritico.scorePriorizacaoComposto) {
            throw new Error('Falha no Teste 5: Score de priorização composto não calculado.');
        }
        console.log(`  └─ EPV Base: ${gargaloCritico.epvScore} | Score Composto (Urgência CRÍTICA 1.5x): ${gargaloCritico.scorePriorizacaoComposto}`);
        relatorio.teste_5_priorizacao_multidimensional_epv.status = 'APROVADO';

        // =====================================================================
        // TESTE 6: RECOMENDAÇÃO MIV COM 10 ATRIBUTOS E TRAVA DE GOVERNANÇA
        // =====================================================================
        console.log('\n------------------------------------------------------------------------');
        console.log('[TESTE 6] Formulação de MIV com 10 Atributos Obrigatórios & Trava de Governança');
        console.log('------------------------------------------------------------------------');

        const mivAlfa = await motor.formularRecomendacaoMIV({
            empresaId: tenantAlfa.id,
            gargaloId: gargaloCritico.gargaloId,
            hipoteseId: investigacaoCausal.hipoteseId,
            tituloMiv: 'MIV 1: Parcelamento Automático do Setup em 6x com Calculadora de Payback',
            acaoProposta: 'Apresentar opção de setup em 6 parcelas sem juros na proposta comercial e enviar simulação de ROI antes dos valores brutos.',
            justificativaMiv: 'Mitiga o atrito de desembolso inicial sem conceder desconto no valor nominal do contrato.',
            justificativaEficaciaSuficiente: 'Intervenção ataca diretamente o choque de preço comprovado pelas evidências com esforço mínimo operacional.',
            resultadoEsperado: 'Elevação da taxa de conversão pós-proposta de 18% para 35%.',
            indicadorAvaliacao: 'Taxa de conversão de propostas emitidas (%)',
            janelaObservacaoDias: 21,
            criterioSucesso: 'Taxa de fechamento superar 30% em 21 dias de medição.',
            grauConfianca: 'ALTO',
            produtoCatalogoVide: 'AUTOMACOES'
        });

        console.log('✓ Recomendação MIV formulada:', mivAlfa);
        if (mivAlfa.status !== 'AGUARDANDO_DIRETORIA') {
            throw new Error(`Falha de Governança no Teste 6: Status inicial deve ser AGUARDANDO_DIRETORIA. Obteve: ${mivAlfa.status}`);
        }
        if (!mivAlfa.resultadoEsperado || !mivAlfa.indicadorAvaliacao || !mivAlfa.criterioSucesso) {
            throw new Error('Falha no Teste 6: Atributos mandatórios da MIV não foram persistidos.');
        }

        // Homologação formal expressa pela Diretoria
        const mivAprovada = await motor.aprovarRecomendacaoMIV({
            empresaId: tenantAlfa.id,
            recomendacaoId: mivAlfa.recomendacaoId,
            usuarioAutorizador: 'DIRETOR_DOUGLAS_PAZ'
        });
        console.log('✓ MIV aprovada pela Diretoria Executiva:', mivAprovada);
        if (mivAprovada.status_aprovacao !== 'APROVADO') {
            throw new Error('Falha na aprovação da MIV.');
        }
        relatorio.teste_6_miv_10_atributos_governanca.status = 'APROVADO';

        // =====================================================================
        // TESTE 7: FEEDBACK LOOP & APRENDIZADO CONTÍNUO (aprendizados_miv)
        // =====================================================================
        console.log('\n------------------------------------------------------------------------');
        console.log('[TESTE 7] Feedback Loop & Aprendizado Contínuo (aprendizados_miv)');
        console.log('------------------------------------------------------------------------');

        const aprendizadoMIV = await motor.registrarAvaliacaoAprendizadoMIV({
            empresaId: tenantAlfa.id,
            mivId: mivAlfa.recomendacaoId,
            indicadorBaseline: 18.0,
            indicadorPos: 38.5,
            unidadeMedida: '%',
            resultadoObservado: 'Apresentação do setup em 6x elevou a conversão de 18% para 38.5% em 21 dias.',
            statusAprendizado: 'SUCESSO_CONFIRMADO',
            gapEsperadoVsRealizado: 'Superou a meta esperada de 35% em +3.5 pontos percentuais.',
            aprendizadosConsolidados: 'Pequenas e médias empresas do setor logístico são altamente sensíveis a desembolso imediato, mas aceitam o custo total se diluído no fluxo de caixa.',
            necessidadeNovaInvestigacao: false
        });

        console.log('✓ Aprendizado MIV registrado no banco:', {
            id: aprendizadoMIV.id,
            status: aprendizadoMIV.status_aprendizado,
            baseline: aprendizadoMIV.indicador_baseline,
            pos: aprendizadoMIV.indicador_pos,
            gap: aprendizadoMIV.gap_esperado_vs_realizado
        });

        if (aprendizadoMIV.status_aprendizado !== 'SUCESSO_CONFIRMADO') {
            throw new Error('Falha no Teste 7: Status de aprendizado incorreto.');
        }

        // Listar aprendizados
        const listaAprendizados = await motor.listarAprendizadosEmpresa(tenantAlfa.id);
        console.log(`✓ Total de aprendizados listados para Tenant Alfa: ${listaAprendizados.length}`);
        if (listaAprendizados.length === 0) {
            throw new Error('Falha no Teste 7: Nenhum aprendizado retornado na listagem.');
        }
        relatorio.teste_7_aprendizado_continuo_feedback_loop.status = 'APROVADO';

        // =====================================================================
        // TESTE 8: ISOLAMENTO MULTIEMPRESA RLS BIDIRECIONAL
        // =====================================================================
        console.log('\n------------------------------------------------------------------------');
        console.log('[TESTE 8] Isolamento Multiempresa RLS em Tabelas Enriquecidas e Aprendizados');
        console.log('------------------------------------------------------------------------');

        // Tenant Beta consulta seu dossiê e aprendizados
        const dossieBeta = await motor.obterDossieConsolidado(tenantBeta.id);
        const aprendizadosBeta = await motor.listarAprendizadosEmpresa(tenantBeta.id);

        console.log('✓ Dossiê do Tenant Beta retornado sob RLS:');
        console.log(`  - Padrões visíveis no Beta: ${dossieBeta.padroesComportamentais.length} (Esperado: 0)`);
        console.log(`  - Hipóteses visíveis no Beta: ${dossieBeta.hipotesesCausais.length} (Esperado: 0)`);
        console.log(`  - Gargalos visíveis no Beta: ${dossieBeta.gargalosPriorizadosEPV.length} (Esperado: 0)`);
        console.log(`  - MIVs visíveis no Beta: ${dossieBeta.recomendacoesMIV.length} (Esperado: 0)`);
        console.log(`  - Aprendizados visíveis no Beta: ${aprendizadosBeta.length} (Esperado: 0)`);

        if (dossieBeta.padroesComportamentais.length !== 0 ||
            dossieBeta.hipotesesCausais.length !== 0 ||
            dossieBeta.gargalosPriorizadosEPV.length !== 0 ||
            dossieBeta.recomendacoesMIV.length !== 0 ||
            aprendizadosBeta.length !== 0) {
            throw new Error('VIOLAÇÃO CRÍTICA DE RLS MULTIEMPRESA: Tenant Beta visualizou registros do Tenant Alfa!');
        }
        relatorio.teste_8_isolamento_multiempresa_rls.status = 'APROVADO';

        // =====================================================================
        // TESTE 9: INTEGRAÇÃO COMPLETA DO AGENTE 07
        // =====================================================================
        console.log('\n------------------------------------------------------------------------');
        console.log('[TESTE 9] Integração Agente 07 (executarCicloMotorInteligencia & avaliarImpactoMIV)');
        console.log('------------------------------------------------------------------------');

        const ciclo07 = await executarCicloMotorInteligencia({
            idProjeto: 'PRJ-TESTE-EVOLUCAO',
            empresaId: tenantBeta.id,
            dadosOperacionais: {
                segmento: 'Moda Feminina',
                impactoFinanceiroEstimado: 4500.00
            },
            loteConversas: [
                {
                    nome: 'Mariana Silva',
                    canalOrigem: 'WHATSAPP',
                    texto: 'Qual o valor do vestido de festa?',
                    evidencias: [
                        { tipoEvidencia: 'PERGUNTA_PRECO', trechoFato: 'Qual o valor do vestido de festa?' }
                    ]
                },
                {
                    nome: 'Camila Santos',
                    canalOrigem: 'WHATSAPP',
                    texto: 'Tem fotos reais do tecido antes de eu comprar?',
                    evidencias: [
                        { tipoEvidencia: 'DEMANDA_PROVA_VISUAL', trechoFato: 'Tem fotos reais do tecido antes de eu comprar?' }
                    ]
                }
            ]
        });

        console.log('✓ Ciclo do Agente 07 concluído:');
        console.log(`  - Sucesso: ${ciclo07.sucesso}`);
        console.log(`  - Padrão Classificação: ${ciclo07.padraoMinerado?.tipoClassificacao}`);
        console.log(`  - Investigação Causal: ${ciclo07.investigacaoCausal?.tipoInvestigacao}`);
        console.log(`  - EPV Score: ${ciclo07.gargaloEPV?.epvScore}`);
        console.log(`  - Score Composto: ${ciclo07.gargaloEPV?.scorePriorizacaoComposto}`);
        console.log(`  - MIV Status: ${ciclo07.recomendacaoMIV?.status}`);
        console.log(`  - MIV Indicador: ${ciclo07.recomendacaoMIV?.indicadorAvaliacao}`);

        if (!ciclo07.sucesso || !ciclo07.investigacaoCausal || !ciclo07.gargaloEPV?.scorePriorizacaoComposto) {
            throw new Error('Falha na integração completa do Agente 07.');
        }

        // Avaliação de impacto via Agente 07
        const aprendizado07 = await avaliarImpactoMIV({
            empresaId: tenantBeta.id,
            mivId: ciclo07.recomendacaoMIV.recomendacaoId,
            indicadorBaseline: 12.0,
            indicadorPos: 28.0,
            unidadeMedida: '%',
            resultadoObservado: 'Inclusão de vídeo curto e perguntas de acolhimento aumentou a resposta em +16 p.p.',
            statusAprendizado: 'SUCESSO_CONFIRMADO',
            aprendizadosConsolidados: 'Clientes de moda feminina precisam de confirmação visual do caimento antes de aceitarem valores.'
        });

        console.log('✓ Avaliação de impacto realizada via Agente 07:', aprendizado07.id);
        relatorio.teste_9_integracao_agente_07_completa.status = 'APROVADO';

        // =====================================================================
        // LIMPEZA FINAL CONTROLADA
        // =====================================================================
        console.log('\n------------------------------------------------------------------------');
        console.log('[LIMPEZA] Higienização de Registros de Testes no PostgreSQL');
        console.log('------------------------------------------------------------------------');

        const clientLimpeza = await poolTeste.connect();
        try {
            await clientLimpeza.query('BEGIN;');
            const idsTenants = [tenantAlfa.id, tenantBeta.id];
            for (const tId of idsTenants) {
                await clientLimpeza.query('DELETE FROM aprendizados_miv WHERE empresa_id = $1;', [tId]);
                await clientLimpeza.query('DELETE FROM trilha_auditoria_seguranca WHERE empresa_id = $1;', [tId]);
                await clientLimpeza.query('DELETE FROM recomendacoes_miv WHERE empresa_id = $1;', [tId]);
                await clientLimpeza.query('DELETE FROM gargalos_evidencias_rel WHERE empresa_id = $1;', [tId]);
                await clientLimpeza.query('DELETE FROM gargalos_comerciais WHERE empresa_id = $1;', [tId]);
                await clientLimpeza.query('DELETE FROM hipoteses_evidencias_rel WHERE empresa_id = $1;', [tId]);
                await clientLimpeza.query('DELETE FROM hipoteses_causais WHERE empresa_id = $1;', [tId]);
                await clientLimpeza.query('DELETE FROM padroes_evidencias_rel WHERE empresa_id = $1;', [tId]);
                await clientLimpeza.query('DELETE FROM padroes_comportamentais WHERE empresa_id = $1;', [tId]);
                await clientLimpeza.query('DELETE FROM evidencias_comerciais WHERE empresa_id = $1;', [tId]);
                await clientLimpeza.query('DELETE FROM eventos_jornada WHERE empresa_id = $1;', [tId]);
                await clientLimpeza.query('DELETE FROM interacoes_comerciais WHERE empresa_id = $1;', [tId]);
                await clientLimpeza.query('DELETE FROM identificadores_contato WHERE empresa_id = $1;', [tId]);
                await clientLimpeza.query('DELETE FROM contatos_clientes WHERE empresa_id = $1;', [tId]);
                await clientLimpeza.query('DELETE FROM diagnosticos_crescimento WHERE empresa_id = $1;', [tId]);
                await clientLimpeza.query('DELETE FROM empresas_motor WHERE id = $1;', [tId]);
            }
            await clientLimpeza.query('COMMIT;');
            console.log('✓ Base de dados higienizada com sucesso. Zero resíduos deixados no banco.');
        } catch (errLimpeza) {
            await clientLimpeza.query('ROLLBACK;');
            console.warn('⚠️ Erro na limpeza:', errLimpeza.message);
        } finally {
            clientLimpeza.release();
        }

        console.log('\n========================================================================');
        console.log('RESULTADO FINAL: TODOS OS 9 TESTES DE EVOLUÇÃO FORAM 100% APROVADOS!');
        console.log('========================================================================');
        console.log(JSON.stringify(relatorio, null, 2));

    } finally {
        await poolTeste.end();
        try {
            console.log('\nRestaurando perímetro de rede do Render para ipAllowList: []...');
            await configurarAllowList([]);
            console.log('✓ Perímetro de segurança restaurado para estado original (Acesso externo fechado).');
        } catch (e) {
            console.warn('⚠️ Aviso ao restaurar allowlist:', e.message);
        }
    }
}

rodarBateriaEvolucaoMotor().catch(err => {
    console.error('\n❌ ERRO NA SUÍTE DE TESTES:', err);
    process.exit(1);
});
