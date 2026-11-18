/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * SUÍTE OFICIAL DE HOMOLOGAÇÃO: EVOLUÇÃO DO AGENTE 07
 * INTELIGÊNCIA DE MARKETING DIGITAL E ANÁLISE DE PERFORMANCE COMERCIAL
 * 
 * Cobertura Completa dos 8 Cenários Mandatórios da Diretoria:
 * 1. Interpretação de métricas do Instagram (alcance, engajamento, seguidores, profundidade)
 * 2. Comparação de desempenho entre formatos de conteúdo e períodos temporais
 * 3. Interpretação de métricas de campanhas Meta Ads (spend, CPM, CPC, CTR, CPA, fadiga)
 * 4. Análise de conversão de sites e interfaces (funil web, abandono de formulário, GA4/GSC)
 * 5. Cruzamento ponta a ponta: Atenção -> Visita -> Contato -> Proposta -> Venda -> Retenção
 * 6. Separação rigorosa entre fatos, padrões, hipóteses e recomendações (Método 9 Etapas)
 * 7. Tratamento de dados incompletos ou inconsistentes (INFORMACAO_INSUFICIENTE)
 * 8. Preservação de autorização, isolamento multiempresa e calibração 7D / EPV / MIV
 * 
 * Governança: Douglas Paz (Diretor Executivo da VIDE)
 * Natureza dos Dados: SIMULADO
 * =====================================================================
 */

const assert = require('assert');
const {
    executarAnaliseMarketingEPerformance,
    analisarMetricasInstagram,
    analisarCampanhasMetaAds,
    analisarConversaoWeb,
    analisarFunilMarketingVendas,
    estruturarRelatorioAnalitico9Etapas,
    calibrarScores7DComMarketing,
    construirGargaloEPVMarketing
} = require('./agente_07_inteligencia_comercial/executor_inteligencia_comercial');

const {
    classificarTipoDadosComerciais,
    validarENormalizarItemComercial
} = require('./processador_arquivos_comerciais');

function executarSuiteEvolucaoAgente07Marketing() {
    console.log('================================================================================');
    console.log('VIDE — HOMOLOGAÇÃO OFICIAL: EVOLUÇÃO DO AGENTE 07 (MARKETING & PERFORMANCE)');
    console.log('================================================================================\n');

    let assercoesValidadas = 0;
    const registrarSucesso = (rotulo) => {
        assercoesValidadas++;
        console.log(`  [PASSOU] ${rotulo}`);
    };

    // -------------------------------------------------------------------------
    // CENÁRIO 1: INTERPRETAÇÃO DE MÉTRICAS DO INSTAGRAM
    // -------------------------------------------------------------------------
    console.log('--- CENÁRIO 1: INTERPRETAÇÃO DE MÉTRICAS DO INSTAGRAM (INSIGHTS) ---');
    
    const dadosInstagramSimulado = {
        alcance: 12500,
        impressoes: 18200,
        visualizacoes: 14000,
        reproducoes: 9800,
        curtidas: 650,
        comentarios: 120,
        compartilhamentos: 85,
        salvamentos: 145,
        visitas_perfil: 420,
        cliques_link: 38,
        cliques_contato: 14,
        seguidores_inicio: 3200,
        seguidores_atuais: 3450,
        novos_seguidores: 310,
        perda_seguidores: 60,
        retenção_media_percentual: 42.5
    };

    const resInsta = analisarMetricasInstagram(dadosInstagramSimulado, {
        negocio: 'Clínica Dermatológica & Estética Facial (SIMULADO)',
        objetivo: 'Aquisição de Pacientes para Procedimentos de Alta Margem',
        periodo: 'Últimos 30 dias (SIMULADO)'
    });

    assert.strictEqual(resInsta.status, 'ANALISADO_COM_SUCESSO');
    registrarSucesso('Status de análise do Instagram concluído com sucesso');

    // Taxa de engajamento sobre alcance: ((650 + 120 + 85 + 145) / 12500) * 100 = (1000 / 12500) * 100 = 8.00%
    assert.strictEqual(resInsta.indicadores_consolidados.total_interacoes, 1000);
    assert.strictEqual(resInsta.indicadores_consolidados.taxa_engajamento_alcance, 8.0);
    registrarSucesso('Cálculo exato de interações totais (1000) e taxa de engajamento sobre alcance (8.0%)');

    // Taxa de profundidade / salvamentos: ((85 + 145) / 1000) * 100 = 23.00%
    assert.strictEqual(resInsta.indicadores_consolidados.taxa_profundidade_conteudo, 23.0);
    registrarSucesso('Cálculo do índice de profundidade de conteúdo (salvamentos + compartilhamentos = 23.0%)');

    // Visitas e conversão em cliques: 420 visitas, 52 cliques totais -> (52 / 420) * 100 = 12.38%
    assert.strictEqual(resInsta.indicadores_consolidados.total_cliques_acao, 52);
    assert.strictEqual(resInsta.indicadores_consolidados.taxa_conversao_visitas_em_cliques, 12.38);
    registrarSucesso('Cálculo da taxa de conversão de visitantes do perfil em cliques de contato (12.38%)');

    // Dinâmica de seguidores: saldo líquido = 310 - 60 = 250
    assert.strictEqual(resInsta.indicadores_consolidados.saldo_liquido_seguidores, 250);
    assert.strictEqual(resInsta.indicadores_consolidados.taxa_crescimento_seguidores, 7.81);
    assert.strictEqual(resInsta.indicadores_consolidados.taxa_churn_seguidores, 1.88);
    registrarSucesso('Cálculo de crescimento líquido de seguidores (+250) e taxa de churn (1.88%)');
    console.log('');

    // -------------------------------------------------------------------------
    // CENÁRIO 2: COMPARAÇÃO ENTRE FORMATOS DE CONTEÚDO E PERÍODOS
    // -------------------------------------------------------------------------
    console.log('--- CENÁRIO 2: COMPARAÇÃO ENTRE FORMATOS DE CONTEÚDO E PERÍODOS ---');

    const dadosComparativos = {
        alcance: 20000,
        impressoes: 28000,
        curtidas: 1200,
        comentarios: 180,
        compartilhamentos: 220,
        salvamentos: 300,
        visitas_perfil: 650,
        cliques_link: 80,
        cliques_contato: 30,
        conteudos: [
            { id: 'POST-01', formato: 'REELS', alcance: 12000, impressoes: 15000, curtidas: 800, comentarios: 90, compartilhamentos: 150, salvamentos: 80, cliques: 20, retenção_percentual: 48.0 },
            { id: 'POST-02', formato: 'CARROSSEL', alcance: 4500, impressoes: 6500, curtidas: 250, comentarios: 60, compartilhamentos: 50, salvamentos: 190, cliques: 35 },
            { id: 'POST-03', formato: 'STORIES', alcance: 1800, impressoes: 3200, curtidas: 50, comentarios: 20, compartilhamentos: 10, salvamentos: 10, cliques: 45 },
            { id: 'POST-04', formato: 'FEED_ESTATICO', alcance: 1700, impressoes: 3300, curtidas: 100, comentarios: 10, compartilhamentos: 10, salvamentos: 20, cliques: 10 }
        ],
        historico_periodo_anterior: {
            alcance: 14000,
            taxa_engajamento: 6.2,
            visitas_perfil: 480,
            cliques_contato: 70,
            saldo_seguidores: 180
        }
    };

    const resComparativo = analisarMetricasInstagram(dadosComparativos, {
        negocio: 'Odontologia Estética Especializada (SIMULADO)',
        periodo: 'Fevereiro 2026 vs Janeiro 2026'
    });

    assert.ok(resComparativo.comparativo_formatos.REELS);
    assert.ok(resComparativo.comparativo_formatos.CARROSSEL);
    assert.ok(resComparativo.comparativo_formatos.STORIES);
    assert.strictEqual(resComparativo.comparativo_formatos.REELS.papel_funil_recomendado, 'TOPO_DESCOBERTA');
    assert.strictEqual(resComparativo.comparativo_formatos.CARROSSEL.papel_funil_recomendado, 'MEIO_AUTORIDADE_SALVAMENTO');
    assert.strictEqual(resComparativo.comparativo_formatos.STORIES.papel_funil_recomendado, 'FUNDO_CONVERSAO_DIARIA');
    registrarSucesso('Categorização estratégica de formatos no funil (Reels=Topo, Carrossel=Meio, Stories=Fundo)');

    // Reels gerou maior alcance médio e Carrossel gerou maior salvamento médio
    assert.strictEqual(resComparativo.comparativo_formatos.REELS.alcance_medio, 12000);
    assert.strictEqual(resComparativo.comparativo_formatos.CARROSSEL.salvamentos_medios, 190);
    assert.strictEqual(resComparativo.comparativo_formatos.REELS.retenção_media_audiencia, 48.0);
    registrarSucesso('Validação de métricas comparativas: Reels lidera alcance (12k) e Carrossel lidera salvamento (190)');

    // Comparativo temporal: delta de alcance e cliques
    assert.ok(resComparativo.comparativo_periodos.alcance.delta_percentual.includes('+'));
    assert.strictEqual(resComparativo.comparativo_periodos.alcance.atual, 20000);
    assert.strictEqual(resComparativo.comparativo_periodos.alcance.anterior, 14000);
    registrarSucesso('Comparação temporal calculada (+42.9% de alcance versus período anterior)');
    console.log('');

    // -------------------------------------------------------------------------
    // CENÁRIO 3: INTERPRETAÇÃO DE MÉTRICAS DE CAMPANHAS (META ADS)
    // -------------------------------------------------------------------------
    console.log('--- CENÁRIO 3: INTERPRETAÇÃO DE MÉTRICAS DE CAMPANHAS (META ADS) ---');

    const dadosMetaAds = {
        campanhas: [
            {
                id: 'CMP-FADIGA-01',
                nome: 'Campanha Tráfego Direto — Criativo Antigo',
                investimento: 600.0,
                alcance: 4000,
                impressoes: 16000, // Frequência: 16000 / 4000 = 4.0
                cliques: 80,       // CTR: (80 / 16000) * 100 = 0.50% (< 0.80%)
                resultados: 2
            },
            {
                id: 'CMP-DESCOMPASSO-02',
                nome: 'Campanha Desconto Agressivo — Falso Desejo',
                investimento: 450.0,
                alcance: 12000,
                impressoes: 15000,
                cliques: 450,      // CTR: (450 / 15000) * 100 = 3.0% (Alto)
                resultados: 1      // Conversão: (1 / 450) * 100 = 0.22% (< 1.0%)
            },
            {
                id: 'CMP-DESPERDICIO-03',
                nome: 'Campanha Institucional Sem CTA',
                investimento: 350.0,
                alcance: 8000,
                impressoes: 9000,
                cliques: 40,
                resultados: 0      // 0 resultados com spend >= 250
            }
        ],
        dados_organicos_referencia: {
            alcance: 25000,
            interacoes: 1400,
            contatos: 18
        }
    };

    const resMeta = analisarCampanhasMetaAds(dadosMetaAds, {
        negocio: 'Clínica de Estética Integrada (SIMULADO)',
        periodo: 'Últimos 14 dias'
    });

    assert.strictEqual(resMeta.status, 'ANALISADO_COM_SUCESSO');
    assert.strictEqual(resMeta.indicadores_consolidados.investimento_total_brl, 1400.0);
    assert.strictEqual(resMeta.indicadores_consolidados.cliques_totais, 570);
    assert.strictEqual(resMeta.indicadores_consolidados.resultados_totais, 3);
    assert.strictEqual(resMeta.indicadores_consolidados.cpa_medio_brl, 466.67);
    registrarSucesso('Cálculo de investimento total (R$ 1.400,00) e CPA médio ponderado (R$ 466,67)');

    // Detecção de Desperdícios
    const anomalias = resMeta.desperdicios_e_anomalias;
    assert.strictEqual(anomalias.length, 3);
    const tipos = anomalias.map(a => a.tipo_desperdicio);
    assert.ok(tipos.includes('FADIGA_DE_ANUNCIO'));
    assert.ok(tipos.includes('DESCOMPASSO_CRIATIVO_OFERTA'));
    assert.ok(tipos.includes('VERBA_DRENADA_SEM_RESULTADO'));
    registrarSucesso('Detecção das 3 anomalias: Fadiga de Anúncio, Descompasso Criativo-Oferta e Verba Drenada');

    // Governança Estrita VIDE: Veta aumento de investimento
    assert.strictEqual(resMeta.diretriz_governanca_investimento.decisao, 'PAUSAR_OU_REMANEJAR_CRIATIVOS_FADIGADOS');
    assert.ok(resMeta.diretriz_governanca_investimento.justificativa.includes('Não autorizada injeção adicional de capital'));
    registrarSucesso('Diretriz de governança bloqueia escala de orçamento sem comprovação factual');

    // Comparativo com orgânico
    assert.ok(resMeta.comparativo_organico_vs_pago.parecer_eficiencia.includes('canal orgânico está gerando mais contatos'));
    registrarSucesso('Comparativo orgânico vs pago comprova ineficiência relativa do tráfego atual');
    console.log('');

    // -------------------------------------------------------------------------
    // CENÁRIO 4: ANÁLISE DE CONVERSÃO DE SITES E INTERFACES (GA4 / GSC)
    // -------------------------------------------------------------------------
    console.log('--- CENÁRIO 4: ANÁLISE DE CONVERSÃO DE SITES E INTERFACES ---');

    const dadosWebSimulados = {
        sessoes: 2400,
        usuarios: 1950,
        novos_usuarios: 1600,
        tempo_medio_sessao_segundos: 84,
        taxa_rejeicao_percentual: 52.4,
        funil_interface: {
            sessoes_totais: 2400,
            visualizacoes_lp: 2400,
            cliques_cta: 360,           // 15% das sessões clicam no botão
            formularios_iniciados: 200, // 55.5% dos cliques iniciam
            formularios_concluidos: 60  // 30% concluem (70% de abandono!)
        },
        canais_aquisição: [
            { canal: 'BUSCA_ORGANICA', sessoes: 600, formularios_concluidos: 30 },
            { canal: 'PAID_SOCIAL_META', sessoes: 1200, formularios_concluidos: 18 },
            { canal: 'DIRETO', sessoes: 400, formularios_concluidos: 10 },
            { canal: 'REFERENCIA', sessoes: 200, formularios_concluidos: 2 }
        ]
    };

    const resWeb = analisarConversaoWeb(dadosWebSimulados, {
        negocio: 'Landing Page Harmonização Facial (SIMULADO)'
    });

    assert.strictEqual(resWeb.status, 'ANALISADO_COM_SUCESSO');
    assert.strictEqual(resWeb.indicadores_consolidados.taxa_clique_cta, 15.0);
    assert.strictEqual(resWeb.indicadores_consolidados.taxa_inicio_formulario, 55.56);
    assert.strictEqual(resWeb.indicadores_consolidados.taxa_conclusao_formulario, 30.0);
    assert.strictEqual(resWeb.indicadores_consolidados.taxa_abandono_formulario, 70.0);
    assert.strictEqual(resWeb.indicadores_consolidados.taxa_conversao_global_site, 2.5);
    registrarSucesso('Cálculo exato de conversão da interface: 70.0% de abandono de formulário e 2.5% global');

    // Identificação de atrito crítico no formulário
    assert.strictEqual(resWeb.atritos_identificados.length, 1);
    assert.strictEqual(resWeb.atritos_identificados[0].etapa, 'FORMULARIO_CAPTURA');
    assert.strictEqual(resWeb.atritos_identificados[0].severidade, 'CRITICA');
    registrarSucesso('Atrito crítico identificado no formulário web (140 leads perdidos por burocracia de campos)');

    // Qualidade por canal: Busca Orgânica converte 5.0% (ALTA) vs Paid Social 1.5% (MEDIA)
    const canalOrganico = resWeb.matriz_canais_aquisição.find(c => c.canal === 'BUSCA_ORGANICA');
    const canalPaidSocial = resWeb.matriz_canais_aquisição.find(c => c.canal === 'PAID_SOCIAL_META');
    assert.strictEqual(canalOrganico.taxa_conversao, 5.0);
    assert.strictEqual(canalOrganico.qualidade_percebida, 'ALTA');
    assert.strictEqual(canalPaidSocial.taxa_conversao, 1.5);
    assert.strictEqual(canalPaidSocial.qualidade_percebida, 'MEDIA');
    registrarSucesso('Matriz de qualidade de canal valida busca orgânica com 3,3x maior conversão que tráfego pago');

    // Contrato GA4 e GSC ativo
    assert.strictEqual(resWeb.compatibilidade_ga4_gsc.pronto_para_ga4, true);
    registrarSucesso('Preparação técnica de esquema para futura ingestão Google Analytics 4');
    console.log('');

    // -------------------------------------------------------------------------
    // CENÁRIO 5: CRUZAMENTO ENTRE MARKETING E INDICADORES COMERCIAIS (CENTRAL)
    // -------------------------------------------------------------------------
    console.log('--- CENÁRIO 5: CRUZAMENTO ENTRE MARKETING E INDICADORES COMERCIAIS ---');

    const dadosFunilIntegrado = {
        atencao_alcance: 15000,
        interesse_engajamento: 1200,
        visitas_perfil_ou_site: 600,
        contatos_capturados: 45,
        conversas_iniciadas: 40,
        propostas_apresentadas: 25,
        vendas_fechadas: 3,         // 3 vendas de 25 orçamentos (Choque pós-preço!)
        clientes_retidos_ou_recompra: 1,
        investimento_marketing_brl: 2500.0,
        ticket_medio_brl: 3500.0,
        crescimento_seguidores_percentual: 30.0,
        receita_anterior_brl: 12000.0
    };

    const resFunil = analisarFunilMarketingVendas(dadosFunilIntegrado, {
        negocio: 'Rede de Clínicas Odontológicas (SIMULADO)'
    });

    assert.strictEqual(resFunil.status, 'ANALISADO_COM_SUCESSO');
    assert.strictEqual(resFunil.indicadores_financeiros.receita_realizada_brl, 10500.0);
    assert.strictEqual(resFunil.indicadores_financeiros.roas_comercial, 4.2);
    registrarSucesso('Cálculo da receita realizada (R$ 10.500,00) e ROAS comercial direto (4.2x)');

    // Validação da cadeia contínua completa
    assert.strictEqual(resFunil.taxas_passagem.conversa_para_proposta, 62.5);
    assert.strictEqual(resFunil.taxas_passagem.proposta_para_venda, 12.0);
    registrarSucesso('Mapeamento ponta a ponta: 62.5% de avanço para proposta, mas colapso para 12.0% na venda');

    // Investigação dos cenários clássicos de desalinhamento
    const idCenarios = resFunil.cenarios_investigados.map(c => c.cenario_id);
    assert.ok(idCenarios.includes('CENARIO_04_PROPOSTAS_SEM_VENDAS'));
    assert.ok(idCenarios.includes('CENARIO_07_SEGUIDORES_SEM_RECEITA'));
    registrarSucesso('Detecção simultânea de Choque Pós-Proposta (R$ 77.000 em risco) e Seguidores sem Receita');

    // Rigor Epistemológico: Não assumir causalidade imediata
    assert.ok(resFunil.aviso_epistemologico.includes('diferencia rigorosamente correlação'));
    registrarSucesso('Aviso epistemológico formal contra presunção prematura de causalidade');
    console.log('');

    // -------------------------------------------------------------------------
    // CENÁRIO 6: MÉTODO DE ANÁLISE EM 9 ETAPAS DA VIDE
    // -------------------------------------------------------------------------
    console.log('--- CENÁRIO 6: MÉTODO DE ANÁLISE EM 9 ETAPAS DA VIDE ---');

    const params9Etapas = {
        contexto: {
            negocio: 'Harmonização Orofacial e Estética Avançada',
            objetivo: 'Aumentar a taxa de fechamento de pacientes particulares',
            canal: 'Meta Ads + WhatsApp Inbound',
            periodo: 'Janeiro a Fevereiro de 2026',
            natureza: 'SIMULADO'
        },
        evidencias: [
            { tipo: 'CONVERSAS_AUDITADAS', fato: '88 desistências observadas após o envio de valores no WhatsApp', grau_confiabilidade: 1.0 },
            { tipo: 'METRICA_INTERFACE', fato: '70% de abandono de formulário no primeiro campo de telefone', grau_confiabilidade: 0.95 }
        ],
        indicadores: {
            taxa_conversao_global: '12.0%',
            perda_pos_orcamento_brl: 75000.0,
            cpa_aquisição_brl: 55.0
        },
        interpretacao: 'O fluxo de atração gera volume qualificado, porém a falta de ancoragem antecipada de valor no WhatsApp gera choque imediato na apresentação de preço.',
        padroes: [
            { titulo: 'Silêncio aos 14 minutos pós-preço', frequencia: '43.2% dos leads', descricao: 'Leads não respondem após receberem a tabela direta sem áudio explicativo.' }
        ],
        hipoteses: [
            { enunciado: 'O envio de valores antes do esclarecimento das vantagens técnicas quebra a percepção subjetiva de benefício.', causa_provavel: 'Roteiro de atendimento direto sem diagnóstico prévio' }
        ],
        oportunidades: [
            { frente: 'ATENDIMENTO', potencial_ganho: '+10 pontos percentuais de conversão', descricao: 'Implantar áudio prévio e parcelamento visual em 12x.' }
        ],
        recomendacao: {
            destinatario: 'Agente 05 — Atendimento e Vendas',
            acao_proposta: 'Implantar roteiro em 3 etapas com apresentação de 1 caso de sucesso antes de declarar o valor numérico.',
            justificativa: 'Intervenção cirúrgica de copy que elimina a causa-raiz sem exigir aquisição de software.'
        },
        mensuracao: {
            indicador_avaliacao: 'Taxa de fechamento pós-orçamento (%)',
            baseline_atual: '28.0%',
            meta_esperada: '38.0%',
            janela_observacao_dias: 14,
            criterio_sucesso: 'Elevação da taxa para 38% nos primeiros 30 orçamentos com o novo roteiro.'
        }
    };

    const relatorio9 = estruturarRelatorioAnalitico9Etapas(params9Etapas);
    assert.strictEqual(relatorio9.metodologia, 'METODO_ANALISE_9_ETAPAS_VIDE');
    assert.ok(relatorio9.etapa_1_contexto);
    assert.ok(relatorio9.etapa_2_evidencias);
    assert.ok(relatorio9.etapa_3_indicadores);
    assert.ok(relatorio9.etapa_4_interpretacao);
    assert.ok(relatorio9.etapa_5_padroes);
    assert.ok(relatorio9.etapa_6_hipoteses);
    assert.ok(relatorio9.etapa_7_oportunidades);
    assert.ok(relatorio9.etapa_8_recomendacao);
    assert.ok(relatorio9.etapa_9_mensuracao);
    assert.strictEqual(relatorio9.etapa_8_recomendacao.principio, 'MENOR_INTERVENCAO_VIAVEL_MIV');
    registrarSucesso('Relatório analítico estrutura fielmente todas as 9 etapas metodológicas');
    console.log('');

    // -------------------------------------------------------------------------
    // CENÁRIO 7: TRATAMENTO DE DADOS INCOMPLETOS OU INCONSISTENTES
    // -------------------------------------------------------------------------
    console.log('--- CENÁRIO 7: TRATAMENTO DE DADOS INCOMPLETOS OU INCONSISTENTES ---');

    // Instagram com dados nulos
    const resInstaVazio = analisarMetricasInstagram({}, { negocio: 'Empresa Teste' });
    assert.strictEqual(resInstaVazio.status, 'INFORMACAO_INSUFICIENTE');
    assert.ok(resInstaVazio.lacunas_identificadas.includes('alcance'));
    registrarSucesso('Instagram sem dados retorna INFORMACAO_INSUFICIENTE sem inventar números');

    // Meta Ads sem campanhas
    const resMetaVazio = analisarCampanhasMetaAds({}, { negocio: 'Empresa Teste' });
    assert.strictEqual(resMetaVazio.status, 'INFORMACAO_INSUFICIENTE');
    registrarSucesso('Meta Ads vazio retorna INFORMACAO_INSUFICIENTE com justificativa técnica');

    // Web conversion sem sessões
    const resWebVazio = analisarConversaoWeb({}, { negocio: 'Empresa Teste' });
    assert.strictEqual(resWebVazio.status, 'INFORMACAO_INSUFICIENTE');
    registrarSucesso('Conversão web vazia retorna INFORMACAO_INSUFICIENTE');

    // Relatório 9 etapas incompleto (sem evidências e sem recomendação)
    const relIncompleto = estruturarRelatorioAnalitico9Etapas({
        contexto: { negocio: 'X', periodo: 'Y' },
        indicadores: { kpi: 1 }
    });
    assert.strictEqual(relIncompleto.status, 'INFORMACAO_INSUFICIENTE');
    assert.ok(relIncompleto.etapas_pendentes_ou_incompletas.includes('evidencias'));
    assert.ok(relIncompleto.etapas_pendentes_ou_incompletas.includes('recomendacao'));
    registrarSucesso('Relatório de 9 etapas bloqueado e apontando exatamente as etapas faltantes');

    // Classificação e Normalização de Ingestão de Marketing
    const dadosInstaBrutos = [
        { alcance: '15000', impressoes: '22000', curtidas: '400', comentarios: '50', salvamentos: '120', formato: 'Reels' }
    ];
    const tipoClassificado = classificarTipoDadosComerciais(dadosInstaBrutos);
    assert.strictEqual(tipoClassificado, 'METRICAS_INSTAGRAM');
    const norm = validarENormalizarItemComercial(dadosInstaBrutos[0], tipoClassificado, 'SIMULADO');
    assert.strictEqual(norm.statusValidacao, 'VALIDO');
    assert.strictEqual(norm.naturezaDado, 'SIMULADO');
    assert.strictEqual(norm.dadosNormalizados.alcance, 15000);
    assert.strictEqual(norm.dadosNormalizados.formato, 'REELS');
    registrarSucesso('Camada de Ingestão classifica METRICAS_INSTAGRAM e normaliza com natureza SIMULADO');
    console.log('');

    // -------------------------------------------------------------------------
    // CENÁRIO 8: AUTORIZAÇÃO, ISOLAMENTO MULTIEMPRESA E INTEGRAÇÃO MOTOR
    // -------------------------------------------------------------------------
    console.log('--- CENÁRIO 8: AUTORIZAÇÃO, ISOLAMENTO MULTIEMPRESA E MOTOR 7D / EPV / MIV ---');

    // Bloqueio mandatória de empresaId ausente
    try {
        executarAnaliseMarketingEPerformance({
            empresaId: null,
            dadosMarketing: { instagram: dadosInstagramSimulado }
        });
        assert.fail('Deveria ter lançado erro de bloqueio de segurança.');
    } catch (e) {
        assert.ok(e.message.includes('[AGENTE_07_MARKETING]'));
        assert.ok(e.message.includes('empresa_id é mandatório'));
        registrarSucesso('Bloqueio estrito de execução sem empresaId garantindo isolamento multiempresa');
    }

    // Execução orquestrada com empresaId válido
    const empresaValidaUUID = '00000000-0000-0000-0000-000000000001';
    const analiseOrquestrada = executarAnaliseMarketingEPerformance({
        empresaId: empresaValidaUUID,
        idProjeto: 'PRJ-DEMO-MKT-001',
        dadosMarketing: {
            eh_simulado: true,
            instagram: dadosInstagramSimulado,
            metaAds: dadosMetaAds,
            webConversion: dadosWebSimulados,
            funilJornada: dadosFunilIntegrado
        },
        contextoComercial: {
            segmento: 'Estética & Saúde',
            ticketMedio: 3500.0
        }
    });

    assert.strictEqual(analiseOrquestrada.empresa_id, empresaValidaUUID);
    assert.strictEqual(analiseOrquestrada.natureza_dados, 'SIMULADO');
    assert.strictEqual(analiseOrquestrada.responsavel, 'Agente 07 — Inteligência Comercial');
    assert.ok(analiseOrquestrada.analises.instagram);
    assert.ok(analiseOrquestrada.analises.meta_ads);
    assert.ok(analiseOrquestrada.analises.conversao_web);
    assert.ok(analiseOrquestrada.analises.funil_marketing_vendas);
    registrarSucesso('Orquestração completa do Agente 07 em todas as 4 frentes com rastreabilidade');

    // Calibração de Scores 7D com Marketing
    const scoresBase7D = {
        comunicacao: 60,
        aquisição: 50,
        atendimento: 70,
        processo_comercial: 65,
        conversao: 45,
        estrutura_digital: 50,
        gestao: { score_total: 55 }
    };

    const scoresCalibrados = calibrarScores7DComMarketing(scoresBase7D, {
        instagram: analiseOrquestrada.analises.instagram,
        metaAds: analiseOrquestrada.analises.meta_ads,
        webConversion: analiseOrquestrada.analises.conversao_web
    });

    // Comunicação recebe bônus por bom engajamento (8.0%) e profundidade
    assert.ok(scoresCalibrados.comunicacao > scoresBase7D.comunicacao);
    // Aquisição é penalizada pelas 3 anomalias detectadas no Meta Ads
    assert.ok(scoresCalibrados.aquisição < scoresBase7D.aquisição);
    // Conversão é penalizada pelo abandono de 70% no formulário web
    assert.ok(scoresCalibrados.conversao < scoresBase7D.conversao);
    registrarSucesso('Scores 7D calibrados dinamicamente refletindo comunicação (+), aquisição (-) e conversão (-)');

    // Formulação de Gargalo EPV de Marketing
    const gargaloMkt = construirGargaloEPVMarketing({
        empresaId: empresaValidaUUID,
        diagnosticoId: 'diag-001',
        tipoGargalo: 'ABANDONO_FORMULARIO_WEB',
        dadosMarketing: analiseOrquestrada.analises.conversao_web.indicadores_consolidados,
        ticketMedioBRL: 3500.0
    });

    assert.strictEqual(gargaloMkt.dimensao, 'CONVERSAO');
    assert.strictEqual(gargaloMkt.urgenciaOperacional, 'ALTA');
    assert.ok(gargaloMkt.impactoFinanceiro > 0);
    registrarSucesso('Gargalo EPV gerado com quantificação financeira de perda de interface (R$ ' + gargaloMkt.impactoFinanceiro + ')');
    console.log('');

    // -------------------------------------------------------------------------
    // SUMÁRIO DE HOMOLOGAÇÃO
    // -------------------------------------------------------------------------
    console.log('================================================================================');
    console.log('SUMÁRIO FINAL DA SUÍTE DE HOMOLOGAÇÃO DO AGENTE 07:');
    console.log(`TOTAL DE ASSERÇÕES RIGOROSAS VALIDADAS COM SUCESSO: ${assercoesValidadas}`);
    console.log('TODOS OS 8 CENÁRIOS MANDATÓRIOS FORAM HOMOLOGADOS COM 100% DE APROVAÇÃO!');
    console.log('================================================================================\n');

    return {
        sucesso: true,
        assercoesValidadas
    };
}

// Execução direta se invocado via CLI
if (require.main === module) {
    try {
        const resultado = executarSuiteEvolucaoAgente07Marketing();
        process.exit(resultado.sucesso ? 0 : 1);
    } catch (e) {
        console.error('\n❌ [FALHA CRÍTICA NA HOMOLOGAÇÃO DO AGENTE 07]:', e);
        process.exit(1);
    }
}

module.exports = { executarSuiteEvolucaoAgente07Marketing };
