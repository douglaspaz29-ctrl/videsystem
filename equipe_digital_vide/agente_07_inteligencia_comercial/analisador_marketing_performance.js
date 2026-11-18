/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * AGENTE 07 — INTELIGÊNCIA COMERCIAL: MOTOR ANALÍTICO DE MARKETING & PERFORMANCE
 * 
 * Módulo de Inteligência Analítica em Marketing Digital e Performance Comercial
 * 
 * Competências Centrais:
 * 1. Análise e Interpretação de Instagram Insights (Orgânico & Formatos)
 * 2. Análise de Meta Business Suite e Campanhas de Anúncios (Orgânico vs Pago)
 * 3. Análise de Conversão de Sites e Interfaces (Funil Web, GA4 & GSC schemas)
 * 4. Cruzamento Ponta a Ponta: Atenção -> Visita -> Contato -> Venda -> Retenção
 * 5. Método de Análise Rigoroso em 9 Etapas (Epistemologia Estrita VIDE)
 * 6. Tratamento de Inconsistências e Dados Ausentes (INFORMACAO_INSUFICIENTE)
 * 7. Integração Oficial com o Motor de Inteligência Comercial (7D, EPV e MIV)
 * 
 * Diretoria Executiva: Douglas Paz (Diretor Executivo da VIDE)
 * =====================================================================
 */

/**
 * -------------------------------------------------------------------------
 * 1. ANÁLISE DE INSTAGRAM INSIGHTS
 * -------------------------------------------------------------------------
 * Interpreta alcance, impressões, interações, visualizações, formatos de conteúdo,
 * comportamento de audiência e cruzamento com objetivos comerciais.
 * 
 * @param {Object} dadosInstagram - Dados brutos ou sintetizados do Instagram
 * @param {Object} contextoComercial - Contexto do negócio, objetivo e período
 * @returns {Object} Diagnóstico estruturado com indicadores e padrões
 */
function analisarMetricasInstagram(dadosInstagram = {}, contextoComercial = {}) {
    const {
        alcance = 0,
        impressoes = 0,
        visualizacoes = 0,
        reproducoes = 0,
        curtidas = 0,
        comentarios = 0,
        compartilhamentos = 0,
        salvamentos = 0,
        visitas_perfil = 0,
        cliques_link = 0,
        cliques_contato = 0,
        seguidores_inicio = null,
        seguidores_fim = null,
        seguidores_atuais = 0,
        novos_seguidores = 0,
        perda_seguidores = 0,
        retenção_media_percentual = null,
        conteudos = [],
        historico_periodo_anterior = null
    } = dadosInstagram;

    const inconsistencias = [];

    // Verificação de suficiência de dados
    if (!alcance && !impressoes && conteudos.length === 0) {
        return {
            status: 'INFORMACAO_INSUFICIENTE',
            motivo: 'Volume de dados de alcance, impressões ou publicações ausente para análise conclusiva do Instagram.',
            lacunas_identificadas: ['alcance', 'impressoes', 'conteudos'],
            contexto: contextoComercial
        };
    }

    // 1. Cálculos de Interações e Engajamento
    const totalInteracoes = curtidas + comentarios + compartilhamentos + salvamentos;
    const taxaEngajamentoAlcance = alcance > 0 ? Number(((totalInteracoes / alcance) * 100).toFixed(2)) : 0;
    const taxaEngajamentoImpressoes = impressoes > 0 ? Number(((totalInteracoes / impressoes) * 100).toFixed(2)) : 0;
    
    // Taxa de Profundidade / Valor Percebido (salvamentos + compartilhamentos sobre total)
    const taxaProfundidadeConteudo = totalInteracoes > 0 
        ? Number((((salvamentos + compartilhamentos) / totalInteracoes) * 100).toFixed(2)) 
        : 0;

    // 2. Comportamento de Tráfego e Conversão do Perfil
    const razaoVisitasAlcance = alcance > 0 ? Number(((visitas_perfil / alcance) * 100).toFixed(2)) : 0;
    const totalCliquesAcao = cliques_link + cliques_contato;
    const taxaConversaoVisitasEmCliques = visitas_perfil > 0 
        ? Number(((totalCliquesAcao / visitas_perfil) * 100).toFixed(2)) 
        : 0;

    // 3. Dinâmica de Seguidores (Crescimento Líquido e Churn)
    const saldoLiquidoSeguidores = novos_seguidores - perda_seguidores;
    const baseSeguidores = seguidores_inicio || seguidores_atuais || 1;
    const taxaCrescimentoSeguidores = Number(((saldoLiquidoSeguidores / baseSeguidores) * 100).toFixed(2));
    const taxaChurnSeguidores = baseSeguidores > 0 ? Number(((perda_seguidores / baseSeguidores) * 100).toFixed(2)) : 0;

    // 4. Análise Segmentada por Formato de Conteúdo (Reels, Carrossel, Stories, Feed Estático)
    const formatosAgrupados = {
        REELS: { qtd: 0, alcance: 0, impressoes: 0, interacoes: 0, salvamentos: 0, cliques: 0, retenção_acum: 0, contRetencao: 0 },
        CARROSSEL: { qtd: 0, alcance: 0, impressoes: 0, interacoes: 0, salvamentos: 0, cliques: 0 },
        STORIES: { qtd: 0, alcance: 0, impressoes: 0, interacoes: 0, cliques: 0 },
        FEED_ESTATICO: { qtd: 0, alcance: 0, impressoes: 0, interacoes: 0, salvamentos: 0, cliques: 0 }
    };

    for (const c of conteudos) {
        const fmt = (c.formato || 'FEED_ESTATICO').toUpperCase().replace(/[\s-]/g, '_');
        const bucket = formatosAgrupados[fmt] || formatosAgrupados.FEED_ESTATICO;
        
        bucket.qtd++;
        bucket.alcance += (c.alcance || 0);
        bucket.impressoes += (c.impressoes || 0);
        const interacPost = (c.curtidas || 0) + (c.comentarios || 0) + (c.compartilhamentos || 0) + (c.salvamentos || 0);
        bucket.interacoes += interacPost;
        if (bucket.salvamentos !== undefined) bucket.salvamentos += (c.salvamentos || 0);
        bucket.cliques += (c.cliques_link || c.cliques || 0);

        if (fmt === 'REELS' && typeof c.retenção_percentual === 'number') {
            bucket.retenção_acum += c.retenção_percentual;
            bucket.contRetencao++;
        }
    }

    const comparativoFormatos = {};
    for (const [fmt, val] of Object.entries(formatosAgrupados)) {
        if (val.qtd > 0) {
            const alcMedio = Math.round(val.alcance / val.qtd);
            const engMedio = val.alcance > 0 ? Number(((val.interacoes / val.alcance) * 100).toFixed(2)) : 0;
            const salvMedio = val.salvamentos !== undefined ? Math.round(val.salvamentos / val.qtd) : null;
            const cliquesMedio = Math.round(val.cliques / val.qtd);
            
            comparativoFormatos[fmt] = {
                publicacoes: val.qtd,
                alcance_medio: alcMedio,
                taxa_engajamento_media: engMedio,
                salvamentos_medios: salvMedio,
                cliques_medios: cliquesMedio,
                papel_funil_recomendado: fmt === 'REELS' ? 'TOPO_DESCOBERTA' :
                                         fmt === 'CARROSSEL' ? 'MEIO_AUTORIDADE_SALVAMENTO' :
                                         fmt === 'STORIES' ? 'FUNDO_CONVERSAO_DIARIA' : 'POSICIONAMENTO_INSTITUCIONAL'
            };

            if (fmt === 'REELS' && val.contRetencao > 0) {
                comparativoFormatos[fmt].retenção_media_audiencia = Number((val.retenção_acum / val.contRetencao).toFixed(2));
            }
        }
    }

    // 5. Comparação Temporal (Período Anterior vs Atual)
    let comparativoPeriodos = null;
    if (historico_periodo_anterior && typeof historico_periodo_anterior === 'object') {
        const ant = historico_periodo_anterior;
        const calcDelta = (atual, anterior) => {
            if (!anterior || anterior === 0) return atual > 0 ? '+100.0%' : '0.0%';
            const varP = ((atual - anterior) / anterior) * 100;
            return `${varP >= 0 ? '+' : ''}${varP.toFixed(1)}%`;
        };

        comparativoPeriodos = {
            alcance: { anterior: ant.alcance || 0, atual: alcance, delta_percentual: calcDelta(alcance, ant.alcance) },
            engajamento: { anterior: ant.taxa_engajamento || 0, atual: taxaEngajamentoAlcance, delta_percentual: calcDelta(taxaEngajamentoAlcance, ant.taxa_engajamento) },
            visitas_perfil: { anterior: ant.visitas_perfil || 0, atual: visitas_perfil, delta_percentual: calcDelta(visitas_perfil, ant.visitas_perfil) },
            cliques_contato: { anterior: ant.cliques_contato || 0, atual: totalCliquesAcao, delta_percentual: calcDelta(totalCliquesAcao, ant.cliques_contato) },
            seguidores_liquidos: { anterior: ant.saldo_seguidores || 0, atual: saldoLiquidoSeguidores, delta_percentual: calcDelta(saldoLiquidoSeguidores, ant.saldo_seguidores) }
        };
    }

    // 6. Diagnóstico de Desconexão entre Audiência e Intenção Comercial
    const padroesIdentificados = [];
    if (alcance > 5000 && razaoVisitasAlcance < 1.0) {
        padroesIdentificados.push({
            tipo: 'ALTO_ALCANCE_BAIXA_ATRAÇÃO_PERFIL',
            descricao: `O conteúdo possui ampla distribuição (${alcance} pessoas), mas taxa de visitação ao perfil é inexpressiva (${razaoVisitasAlcance}%). Sugere temática apelativa sem vinculação clara à autoridade ou aos serviços da empresa.`
        });
    }

    if (visitas_perfil > 200 && taxaConversaoVisitasEmCliques < 2.0) {
        padroesIdentificados.push({
            tipo: 'VISITANTES_SEM_CONVERSAO_EM_LINK',
            descricao: `O perfil atrai visitantes (${visitas_perfil} visitas), mas menos de 2% clicam na chamada comercial (${taxaConversaoVisitasEmCliques}%). Sugere bio confusa, link quebrado/pouco atrativo ou ausência de proposta de valor explícita.`
        });
    }

    if (taxaProfundidadeConteudo > 40.0) {
        padroesIdentificados.push({
            tipo: 'CONTEUDO_ALTA_PROFUNDIDADE',
            descricao: `Alta taxa de salvamentos e compartilhamentos (${taxaProfundidadeConteudo}% do engajamento total), demonstrando autoridade técnica e utilidade percebida pelo público qualificado.`
        });
    }

    if (retenção_media_percentual === null && !conteudos.some(c => typeof c.retenção_percentual === 'number')) {
        inconsistencias.push('Métrica de retenção de audiência (watch time / % vídeo assistido) não fornecida pelo canal.');
    }

    return {
        status: 'ANALISADO_COM_SUCESSO',
        canal: 'INSTAGRAM_INSIGHTS',
        contexto: contextoComercial,
        indicadores_consolidados: {
            alcance_total: alcance,
            impressoes_totais: impressoes,
            total_interacoes: totalInteracoes,
            taxa_engajamento_alcance: taxaEngajamentoAlcance,
            taxa_engajamento_impressoes: taxaEngajamentoImpressoes,
            taxa_profundidade_conteudo: taxaProfundidadeConteudo,
            visitas_perfil: visitas_perfil,
            razao_visitas_alcance: razaoVisitasAlcance,
            total_cliques_acao: totalCliquesAcao,
            taxa_conversao_visitas_em_cliques: taxaConversaoVisitasEmCliques,
            saldo_liquido_seguidores: saldoLiquidoSeguidores,
            taxa_crescimento_seguidores: taxaCrescimentoSeguidores,
            taxa_churn_seguidores: taxaChurnSeguidores
        },
        comparativo_formatos: comparativoFormatos,
        comparativo_periodos: comparativoPeriodos,
        padroes_identificados: padroesIdentificados,
        limitacoes_ou_lacunas: inconsistencias
    };
}

/**
 * -------------------------------------------------------------------------
 * 2. ANÁLISE DE META BUSINESS SUITE & ANÚNCIOS (ORGÂNICO VS PAGO)
 * -------------------------------------------------------------------------
 * Avalia investimento, frequência, CPM, CPC, CTR, CPA e diagnostica desperdícios,
 * saturação e fadiga de criativos, com política estrita contra aumento irresponsável de verba.
 * 
 * @param {Object} dadosCampanhas - Dados de anúncios e conjuntos Meta Ads
 * @param {Object} contextoComercial - Dados comerciais e regras de negócio
 * @returns {Object} Diagnóstico de performance de mídia paga e comparativo
 */
function analisarCampanhasMetaAds(dadosCampanhas = {}, contextoComercial = {}) {
    const {
        campanhas = [],
        conjuntos = [],
        anuncios = [],
        dados_organicos_referencia = null
    } = dadosCampanhas;

    if (!Array.isArray(campanhas) || campanhas.length === 0) {
        return {
            status: 'INFORMACAO_INSUFICIENTE',
            motivo: 'Nenhuma campanha informada para análise de performance de mídia paga.',
            contexto: contextoComercial
        };
    }

    let investimentoTotal = 0;
    let alcanceTotal = 0;
    let impressoesTotais = 0;
    let cliquesTotais = 0;
    let resultadosTotais = 0;
    let conversoesAtribuidasTotais = 0;

    const detalheCampanhas = [];
    const anomaliasDesperdicio = [];

    for (const c of campanhas) {
        const spend = Number(c.investimento || c.spend || 0);
        const alc = Number(c.alcance || c.reach || 0);
        const imp = Number(c.impressoes || c.impressions || 0);
        const clk = Number(c.cliques || c.clicks || 0);
        const res = Number(c.resultados || c.results || 0);
        const conv = Number(c.conversoes_atribuidas || c.conversions || res);

        investimentoTotal += spend;
        alcanceTotal += alc;
        impressoesTotais += imp;
        cliquesTotais += clk;
        resultadosTotais += res;
        conversoesAtribuidasTotais += conv;

        const freq = alc > 0 ? Number((imp / alc).toFixed(2)) : 0;
        const cpm = imp > 0 ? Number(((spend / imp) * 1000).toFixed(2)) : 0;
        const cpc = clk > 0 ? Number((spend / clk).toFixed(2)) : 0;
        const ctr = imp > 0 ? Number(((clk / imp) * 100).toFixed(2)) : 0;
        const cpa = res > 0 ? Number((spend / res).toFixed(2)) : (spend > 0 ? spend : 0);
        const taxaConversaoCliqueResultado = clk > 0 ? Number(((res / clk) * 100).toFixed(2)) : 0;

        // Detecção de Desperdício 1: Fadiga de Anúncio (Frequência Alta + Queda de CTR / CPM Alto)
        if (freq >= 3.5 && ctr < 0.80) {
            anomaliasDesperdicio.push({
                campanha_id: c.id || c.nome,
                tipo_desperdicio: 'FADIGA_DE_ANUNCIO',
                gravidade: 'ALTA',
                frequencia_observada: freq,
                ctr_observado: ctr,
                diagnostico: `Público exposto em média ${freq}x ao mesmo criativo com taxa de clique baixa (${ctr}%). Indica esgotamento visual do público-alvo e queima ineficiente de orçamento.`
            });
        }

        // Detecção de Desperdício 2: Descompasso Criativo x Destino (CTR Alto + Zero/Baixa Conversão)
        if (ctr >= 2.0 && taxaConversaoCliqueResultado < 1.0 && clk >= 100) {
            anomaliasDesperdicio.push({
                campanha_id: c.id || c.nome,
                tipo_desperdicio: 'DESCOMPASSO_CRIATIVO_OFERTA',
                gravidade: 'ALTA',
                ctr_observado: ctr,
                taxa_conversao_destino: taxaConversaoCliqueResultado,
                diagnostico: `Anúncio com alto interesse no feed (CTR ${ctr}%), mas abandono maciço no destino (${taxaConversaoCliqueResultado}% de conversão em ${clk} cliques). Indica promessa descasada, destino com lentidão ou formulário inadequado.`
            });
        }

        // Detecção de Desperdício 3: Consumo de Verba Sem Retorno (Spend Relevante + 0 Resultados)
        if (spend >= 250 && res === 0) {
            anomaliasDesperdicio.push({
                campanha_id: c.id || c.nome,
                tipo_desperdicio: 'VERBA_DRENADA_SEM_RESULTADO',
                gravidade: 'CRITICA',
                investimento_perdido: spend,
                diagnostico: `Campanha consumiu R$ ${spend.toFixed(2)} sem registrar nenhuma conversão/resultado comercial.`
            });
        }

        detalheCampanhas.push({
            id: c.id || c.nome,
            nome: c.nome || 'Campanha Sem Nome',
            objetivo: c.objetivo || 'LEADS',
            investimento: spend,
            alcance: alc,
            impressoes: imp,
            frequencia: freq,
            cliques: clk,
            ctr: ctr,
            cpc: cpc,
            cpm: cpm,
            resultados: res,
            cpa: cpa,
            taxa_conversao_clique_resultado: taxaConversaoCliqueResultado
        });
    }

    const cpmMedioGlobal = impressoesTotais > 0 ? Number(((investimentoTotal / impressoesTotais) * 1000).toFixed(2)) : 0;
    const cpcMedioGlobal = cliquesTotais > 0 ? Number((investimentoTotal / cliquesTotais).toFixed(2)) : 0;
    const ctrMedioGlobal = impressoesTotais > 0 ? Number(((cliquesTotais / impressoesTotais) * 100).toFixed(2)) : 0;
    const cpaMedioGlobal = resultadosTotais > 0 ? Number((investimentoTotal / resultadosTotais).toFixed(2)) : 0;
    const frequenciaMediaPonderada = alcanceTotal > 0 ? Number((impressoesTotais / alcanceTotal).toFixed(2)) : 0;

    // Comparativo com Desempenho Orgânico (se fornecido)
    let comparativoOrganicoVsPago = null;
    if (dados_organicos_referencia) {
        const orgAlcance = dados_organicos_referencia.alcance || 0;
        const orgInteracoes = dados_organicos_referencia.interacoes || 0;
        const orgContatos = dados_organicos_referencia.contatos || 0;

        comparativoOrganicoVsPago = {
            alcance_pago: alcanceTotal,
            alcance_organico: orgAlcance,
            razao_alcance_pago_organico: orgAlcance > 0 ? Number((alcanceTotal / orgAlcance).toFixed(2)) : 'N/A',
            custo_aquisição_pago_brl: cpaMedioGlobal,
            contatos_organicos: orgContatos,
            parecer_eficiencia: orgContatos > resultadosTotais && investimentoTotal > 0
                ? 'O canal orgânico está gerando mais contatos que a mídia paga, indicando que a estratégia de anúncios atual requer calibração antes de qualquer novo aporte.'
                : 'Mídia paga cumpre papel complementar na escala de volume.'
        };
    }

    // Regra de Governança Estrita da VIDE: Nunca recomendar aumento de verba sem evidências comprovadas
    let diretrizInvestimento = {
        decisao: 'MANTER_OU_OTIMIZAR_DISTRIBUICAO',
        justificativa: 'Governança VIDE veta escala de verba antes da eliminação de vazamentos e fadigas.'
    };

    if (anomaliasDesperdicio.some(a => a.gravidade === 'CRITICA' || a.gravidade === 'ALTA')) {
        diretrizInvestimento = {
            decisao: 'PAUSAR_OU_REMANEJAR_CRIATIVOS_FADIGADOS',
            justificativa: `Identificadas ${anomaliasDesperdicio.length} anomalias críticas/altas. Não autorizada injeção adicional de capital até renovação de criativos e ajuste de público.`
        };
    } else if (cpaMedioGlobal > 0 && resultadosTotais >= 20 && anomaliasDesperdicio.length === 0) {
        diretrizInvestimento = {
            decisao: 'ESCALA_GRADUAL_SUJEITA_A_TESTE',
            justificativa: 'Campanha opera com métricas saudáveis e sem fadiga identificada. Escala limitada a até 20% mediante teste com grupo de controle.'
        };
    }

    return {
        status: 'ANALISADO_COM_SUCESSO',
        canal: 'META_ADS_PERFORMANCE',
        contexto: contextoComercial,
        indicadores_consolidados: {
            investimento_total_brl: investimentoTotal,
            alcance_total: alcanceTotal,
            impressoes_totais: impressoesTotais,
            frequencia_media: frequenciaMediaPonderada,
            cliques_totais: cliquesTotais,
            cpm_medio_brl: cpmMedioGlobal,
            cpc_medio_brl: cpcMedioGlobal,
            ctr_medio_percentual: ctrMedioGlobal,
            resultados_totais: resultadosTotais,
            cpa_medio_brl: cpaMedioGlobal,
            conversoes_atribuidas_totais: conversoesAtribuidasTotais
        },
        detalhe_campanhas: detalheCampanhas,
        desperdicios_e_anomalias: anomaliasDesperdicio,
        comparativo_organico_vs_pago: comparativoOrganicoVsPago,
        diretriz_governanca_investimento: diretrizInvestimento
    };
}

/**
 * -------------------------------------------------------------------------
 * 3. ANÁLISE DE CONVERSÃO DE SITES E INTERFACES (PREPARADO PARA GA4 & GSC)
 * -------------------------------------------------------------------------
 * Avalia sessões, canais de aquisição, abandono de formulário, CTR de CTAs e
 * prepara tecnicamente a estrutura compatível com Google Analytics 4 e Search Console.
 * 
 * @param {Object} dadosWeb - Métricas de sessões, páginas, formulários e canais
 * @param {Object} contextoComercial - Dados da oferta e qualidade de leads
 * @returns {Object} Diagnóstico de funil de interface web
 */
function analisarConversaoWeb(dadosWeb = {}, contextoComercial = {}) {
    const {
        sessoes = 0,
        usuarios = 0,
        novos_usuarios = 0,
        visualizacoes_pagina = 0,
        tempo_medio_sessao_segundos = 0,
        taxa_rejeicao_percentual = 0,
        paginas_destino = [],
        canais_aquisição = [],
        funil_interface = {
            sessoes_totais: 0,
            visualizacoes_lp: 0,
            cliques_cta: 0,
            formularios_iniciados: 0,
            formularios_concluidos: 0
        },
        preparacao_ga4_gsc = {
            ga4_eventos_mapeados: ['session_start', 'page_view', 'click_cta', 'form_start', 'form_submit'],
            gsc_consultas_organicas: []
        }
    } = dadosWeb;

    if (!sessoes && (!funil_interface || !funil_interface.sessoes_totais)) {
        return {
            status: 'INFORMACAO_INSUFICIENTE',
            motivo: 'Volume de sessões ou eventos do funil de interface ausente para análise de conversão web.',
            contexto: contextoComercial
        };
    }

    const sessTotais = sessoes || funil_interface.sessoes_totais || 1;
    const clkCta = funil_interface.cliques_cta || 0;
    const formIni = funil_interface.formularios_iniciados || 0;
    const formConc = funil_interface.formularios_concluidos || 0;

    // Cálculos de Conversão por Etapa da Interface
    const taxaCliqueCTA = Number(((clkCta / sessTotais) * 100).toFixed(2));
    const taxaInicioFormulario = clkCta > 0 ? Number(((formIni / clkCta) * 100).toFixed(2)) : 0;
    const taxaConclusaoFormulario = formIni > 0 ? Number(((formConc / formIni) * 100).toFixed(2)) : 0;
    const taxaAbandonoFormulario = formIni > 0 ? Number((((formIni - formConc) / formIni) * 100).toFixed(2)) : 0;
    const taxaConversaoGlobalSite = Number(((formConc / sessTotais) * 100).toFixed(2));

    // Análise por Canal de Tráfego e Qualidade Relativa
    const matrizCanais = [];
    for (const c of canais_aquisição) {
        const canalSess = c.sessoes || 0;
        const canalConc = c.formularios_concluidos || c.leads || 0;
        const convCanal = canalSess > 0 ? Number(((canalConc / canalSess) * 100).toFixed(2)) : 0;

        matrizCanais.push({
            canal: c.canal || 'OUTROS',
            sessoes: canalSess,
            leads_gerados: canalConc,
            taxa_conversao: convCanal,
            qualidade_percebida: convCanal >= 3.0 ? 'ALTA' : (convCanal >= 1.0 ? 'MEDIA' : 'BAIXA')
        });
    }

    // Diagnóstico de Atritos e Vazamentos de Interface
    const atritosInterface = [];
    if (taxaCliqueCTA < 5.0 && sessTotais >= 200) {
        atritosInterface.push({
            etapa: 'CHAMADA_PARA_ACAO_CTA',
            severidade: 'ALTA',
            diagnostico: `Apenas ${taxaCliqueCTA}% dos visitantes clicam no botão de ação principal. Indica proposta de valor pouco convincente no primeiro scroll ou botão pouco visível.`
        });
    }

    if (taxaAbandonoFormulario >= 50.0 && formIni >= 20) {
        atritosInterface.push({
            etapa: 'FORMULARIO_CAPTURA',
            severidade: 'CRITICA',
            taxa_abandono: taxaAbandonoFormulario,
            diagnostico: `${taxaAbandonoFormulario}% das pessoas que iniciam o formulário desistem antes de enviar (${formIni - formConc} abandonos). Sugere formulário com excesso de campos, dados sensíveis solicitados prematuramente ou instabilidade técnica.`
        });
    }

    return {
        status: 'ANALISADO_COM_SUCESSO',
        canal: 'CONVERSAO_WEB_INTERFACE',
        contexto: contextoComercial,
        indicadores_consolidados: {
            sessoes_totais: sessTotais,
            usuarios_totais: usuarios || sessTotais,
            novos_usuarios: novos_usuarios,
            tempo_medio_sessao_segundos: tempo_medio_sessao_segundos,
            taxa_rejeicao_percentual: taxa_rejeicao_percentual,
            cliques_cta: clkCta,
            formularios_iniciados: formIni,
            formularios_concluidos: formConc,
            taxa_clique_cta: taxaCliqueCTA,
            taxa_inicio_formulario: taxaInicioFormulario,
            taxa_conclusao_formulario: taxaConclusaoFormulario,
            taxa_abandono_formulario: taxaAbandonoFormulario,
            taxa_conversao_global_site: taxaConversaoGlobalSite
        },
        matriz_canais_aquisição: matrizCanais,
        atritos_identificados: atritosInterface,
        compatibilidade_ga4_gsc: {
            pronto_para_ga4: true,
            eventos_monitorados: preparacao_ga4_gsc.ga4_eventos_mapeados,
            observacoes_tecnicas: 'Estrutura preparada para ingestão via exportação BigQuery/JSON ou API oficial do GA4 na Fase 2.'
        }
    };
}

/**
 * -------------------------------------------------------------------------
 * 4. CRUZAMENTO ENTRE MARKETING E INDICADORES COMERCIAIS (COMPETÊNCIA CENTRAL)
 * -------------------------------------------------------------------------
 * Integra a cadeia contínua completa:
 * Atenção (Marketing) -> Interesse -> Visita -> Contato -> Conversa -> Proposta -> Venda -> Retenção
 * 
 * Mapeia os 7 cenários clássicos de vazamento comercial, separando rigorosamente
 * correlação de causalidade.
 * 
 * @param {Object} dadosJornada - Dados das etapas da jornada integrada
 * @param {Object} contextoNegocio - Informações de ticket, ciclo de vendas e modelo de negócio
 * @returns {Object} Diagnóstico de vazamentos ponta a ponta
 */
function analisarFunilMarketingVendas(dadosJornada = {}, contextoNegocio = {}) {
    const {
        atencao_alcance = 0,
        interesse_engajamento = 0,
        visitas_perfil_ou_site = 0,
        contatos_capturados = 0,
        conversas_iniciadas = 0,
        propostas_apresentadas = 0,
        vendas_fechadas = 0,
        clientes_retidos_ou_recompra = 0,
        investimento_marketing_brl = 0,
        ticket_medio_brl = 1000
    } = dadosJornada;

    const receitaRealizada = vendas_fechadas * ticket_medio_brl;
    const roasComercial = investimento_marketing_brl > 0 
        ? Number((receitaRealizada / investimento_marketing_brl).toFixed(2)) 
        : null;

    // Cálculos de Eficiência por Etapa (Taxas de Passagem)
    const taxaAtencaoParaInteresse = atencao_alcance > 0 
        ? Number(((interesse_engajamento / atencao_alcance) * 100).toFixed(2)) 
        : 0;

    const taxaVisitaParaContato = visitas_perfil_ou_site > 0 
        ? Number(((contatos_capturados / visitas_perfil_ou_site) * 100).toFixed(2)) 
        : 0;

    const taxaContatoParaConversa = contatos_capturados > 0 
        ? Number(((conversas_iniciadas / contatos_capturados) * 100).toFixed(2)) 
        : 0;

    const taxaConversaParaProposta = conversas_iniciadas > 0 
        ? Number(((propostas_apresentadas / conversas_iniciadas) * 100).toFixed(2)) 
        : 0;

    const taxaPropostaParaVenda = propostas_apresentadas > 0 
        ? Number(((vendas_fechadas / propostas_apresentadas) * 100).toFixed(2)) 
        : 0;

    const taxaConversaoFinalGlobal = atencao_alcance > 0 
        ? Number(((vendas_fechadas / atencao_alcance) * 100).toFixed(4)) 
        : 0;

    // Investigação Sistemática dos 7 Cenários de Desalinhamento
    const cenariosDetectados = [];

    // Cenário 1: Muito alcance, poucos contatos
    if (atencao_alcance >= 5000 && contatos_capturados <= 10) {
        cenariosDetectados.push({
            cenario_id: 'CENARIO_01_ALCANCE_SEM_CONTATOS',
            nome: 'Muito Alcance com Baixa Geração de Contatos',
            fatos_observados: `${atencao_alcance} pessoas alcançadas geraram apenas ${contatos_capturados} contatos comerciais diretos.`,
            diagnostico_causal_provavel: 'A mensagem de topo de funil possui apelo estético ou viral, mas carece de chamada à ação comercial, filtro de público qualificado ou oferta explícita.',
            natureza: 'HIPOTESE_INVESTIGATIVA',
            distincao_epistemologica: 'A baixa conversão correlaciona-se com alcance genérico; deve-se investigar se o tráfego atingiu o perfil socioeconômico comprador.'
        });
    }

    // Cenário 2: Muitos cliques, poucos formulários concluídos
    if (visitas_perfil_ou_site >= 300 && contatos_capturados < 15) {
        cenariosDetectados.push({
            cenario_id: 'CENARIO_02_CLIQUES_SEM_FORMULARIOS',
            nome: 'Muitos Cliques / Visitas com Poucos Formulários Concluídos',
            fatos_observados: `${visitas_perfil_ou_site} visitas geraram apenas ${contatos_capturados} contatos (${taxaVisitaParaContato}% de conversão).`,
            diagnostico_causal_provavel: 'Atrito na página de destino: carregamento lento, promessa do anúncio diferente do conteúdo da landing page, ou formulário excessivamente burocrático.',
            natureza: 'HIPOTESE_INVESTIGATIVA'
        });
    }

    // Cenário 3: Muitos contatos, poucas propostas
    if (contatos_capturados >= 30 && taxaConversaParaProposta < 25.0) {
        cenariosDetectados.push({
            cenario_id: 'CENARIO_03_CONTATOS_SEM_PROPOSTAS',
            nome: 'Muitos Contatos com Baixo Avanço para Proposta',
            fatos_observados: `De ${conversas_iniciadas} conversas iniciadas, apenas ${propostas_apresentadas} atingiram apresentação de orçamento (${taxaConversaParaProposta}%).`,
            diagnostico_causal_provavel: 'Falha no processo de atendimento (Agente 05): demora na resposta, falta de script de sondagem, ou leads atraídos com expectativa de preço irreal.',
            natureza: 'HIPOTESE_INVESTIGATIVA'
        });
    }

    // Cenário 4: Muitas propostas, poucas vendas
    if (propostas_apresentadas >= 20 && taxaPropostaParaVenda < 20.0) {
        const perdaEstimadaBRL = (propostas_apresentadas - vendas_fechadas) * ticket_medio_brl;
        cenariosDetectados.push({
            cenario_id: 'CENARIO_04_PROPOSTAS_SEM_VENDAS',
            nome: 'Muitas Propostas com Poucas Vendas (Choque de Preço)',
            fatos_observados: `${propostas_apresentadas} propostas apresentadas resultaram em apenas ${vendas_fechadas} vendas (${taxaPropostaParaVenda}% de conversão). Perda em risco: R$ ${perdaEstimadaBRL.toLocaleString('pt-BR')}.`,
            diagnostico_causal_provavel: 'Gargalo clássico de conversão: envio de preço numérico sem ancoragem antecipada de valor, opções de pagamento rígidas ou ausência de régua ativa de follow-up pós-orçamento.',
            natureza: 'HIPOTESE_INVESTIGATIVA'
        });
    }

    // Cenário 5: Campanhas com custo elevado e baixo resultado comercial
    if (investimento_marketing_brl >= 1500 && roasComercial !== null && roasComercial < 1.0) {
        cenariosDetectados.push({
            cenario_id: 'CENARIO_05_ALTO_CUSTO_BAIXO_RETORNO',
            nome: 'Campanhas com Custo Elevado e Retorno Comercial Negativo',
            fatos_observados: `Investimento de R$ ${investimento_marketing_brl.toLocaleString('pt-BR')} gerou receita de R$ ${receitaRealizada.toLocaleString('pt-BR')} (ROAS ${roasComercial}). Operação em déficit direto de aquisição.`,
            diagnostico_causal_provavel: 'Segmentação cara com baixa propensão de fechamento ou funil comercial incapaz de monetizar o tráfego pago.',
            natureza: 'HIPOTESE_INVESTIGATIVA'
        });
    }

    // Cenário 6: Conteúdos com baixo alcance, mas alta geração de oportunidades qualificadas
    if (atencao_alcance < 1500 && vendas_fechadas >= 5 && taxaConversaoFinalGlobal >= 0.20) {
        cenariosDetectados.push({
            cenario_id: 'CENARIO_06_BAIXO_ALCANCE_ALTA_CONVERSAO',
            nome: 'Baixo Alcance com Alta Conversão em Vendas',
            fatos_observados: `Mesmo com alcance modesto (${atencao_alcance}), fecharam-se ${vendas_fechadas} vendas. Taxa de conversão de ponta a ponta de ${taxaConversaoFinalGlobal}%.`,
            diagnostico_causal_provavel: 'Conteúdo altamente nichado de fundo de funil, com foco em resolução técnica de problemas, atingindo compradores de alta prontidão.',
            natureza: 'PADRAO_POSITIVO_CONFIRMADO'
        });
    }

    // Cenário 7: Crescimento de seguidores sem evolução proporcional dos resultados comerciais
    if (dadosJornada.crescimento_seguidores_percentual >= 20.0 && receitaRealizada <= (dadosJornada.receita_anterior_brl || receitaRealizada)) {
        cenariosDetectados.push({
            cenario_id: 'CENARIO_07_SEGUIDORES_SEM_RECEITA',
            nome: 'Crescimento de Seguidores Descolado dos Resultados Comerciais',
            fatos_observados: `A base de seguidores cresceu significativamente, mas a receita de vendas permaneceu estagnada.`,
            diagnostico_causal_provavel: 'Ilusão de métricas de vaidade. Audiência atraída por entretenimento ou temas colaterais que não convertem em pacientes/clientes pagantes.',
            natureza: 'HIPOTESE_INVESTIGATIVA'
        });
    }

    return {
        status: 'ANALISADO_COM_SUCESSO',
        jornada_continua: {
            atencao_alcance,
            interesse_engajamento,
            visitas_perfil_ou_site,
            contatos_capturados,
            conversas_iniciadas,
            propostas_apresentadas,
            vendas_fechadas,
            clientes_retidos_ou_recompra
        },
        indicadores_financeiros: {
            investimento_marketing_brl,
            receita_realizada_brl: receitaRealizada,
            roas_comercial: roasComercial,
            ticket_medio_brl
        },
        taxas_passagem: {
            atencao_para_interesse: taxaAtencaoParaInteresse,
            visita_para_contato: taxaVisitaParaContato,
            contato_para_conversa: taxaContatoParaConversa,
            conversa_para_proposta: taxaConversaParaProposta,
            proposta_para_venda: taxaPropostaParaVenda,
            conversao_global_funil: taxaConversaoFinalGlobal
        },
        cenarios_investigados: cenariosDetectados,
        aviso_epistemologico: 'A VIDE diferencia rigorosamente correlação estatística de relação causal comprovada. As causas prováveis apontadas são hipóteses de trabalho sujeitas a intervenções controladas (MIV).'
    };
}

/**
 * -------------------------------------------------------------------------
 * 5. MÉTODO DE ANÁLISE RIGOROSO EM 9 ETAPAS
 * -------------------------------------------------------------------------
 * Constrói o parecer analítico oficial cumprindo as 9 etapas metodológicas:
 * 1. Contexto, 2. Evidências, 3. Indicadores, 4. Interpretação, 5. Padrões,
 * 6. Hipóteses, 7. Oportunidades, 8. Recomendação (MIV), 9. Mensuração.
 * 
 * @param {Object} params - Parâmetros das 9 etapas
 * @returns {Object} Relatório analítico formal e rastreável
 */
function estruturarRelatorioAnalitico9Etapas({
    contexto = {},
    evidencias = [],
    indicadores = {},
    interpretacao = '',
    padroes = [],
    hipoteses = [],
    oportunidades = [],
    recomendacao = {},
    mensuracao = {}
}) {
    // Validação de integridade do método
    const camposObrigatorios = [
        { nome: 'contexto', valor: contexto && contexto.negocio && contexto.periodo },
        { nome: 'evidencias', valor: Array.isArray(evidencias) && evidencias.length > 0 },
        { nome: 'indicadores', valor: indicadores && Object.keys(indicadores).length > 0 },
        { nome: 'interpretacao', valor: typeof interpretacao === 'string' && interpretacao.trim().length > 10 },
        { nome: 'padroes', valor: Array.isArray(padroes) },
        { nome: 'hipoteses', valor: Array.isArray(hipoteses) },
        { nome: 'oportunidades', valor: Array.isArray(oportunidades) },
        { nome: 'recomendacao', valor: recomendacao && recomendacao.acao_proposta },
        { nome: 'mensuracao', valor: mensuracao && mensuracao.indicador_avaliacao }
    ];

    const camposFaltantes = camposObrigatorios.filter(c => !c.valor).map(c => c.nome);

    if (camposFaltantes.length > 0) {
        return {
            status: 'INFORMACAO_INSUFICIENTE',
            erro_metodologico: 'Relatório analítico não cumpre os requisitos do Método de Análise em 9 Etapas da VIDE.',
            etapas_pendentes_ou_incompletas: camposFaltantes
        };
    }

    return {
        metodologia: 'METODO_ANALISE_9_ETAPAS_VIDE',
        versao: '2.0',
        gerado_em: new Date().toISOString(),
        responsavel: 'Agente 07 — Inteligência Comercial',
        etapa_1_contexto: {
            negocio: contexto.negocio,
            objetivo_comercial: contexto.objetivo,
            canal_analisado: contexto.canal || 'OMNICHANNEL',
            periodo_apuracao: contexto.periodo,
            natureza_dados: contexto.natureza || 'SIMULADO'
        },
        etapa_2_evidencias: evidencias.map((ev, idx) => ({
            id: `EVID-${idx + 1}`,
            tipo: ev.tipo || 'DADO_OBSERVADO',
            fato_verificado: ev.fato || ev,
            fonte: ev.fonte || 'RELATORIO_FORNECIDO',
            grau_confiabilidade: ev.grau_confiabilidade || 1.00
        })),
        etapa_3_indicadores: indicadores,
        etapa_4_interpretacao: interpretacao,
        etapa_5_padroes: padroes.map((p, idx) => ({
            id: `PADRAO-${idx + 1}`,
            titulo: p.titulo || p,
            frequencia_ou_recorrencia: p.frequencia || 'RECORRENTE',
            comportamento: p.descricao || p
        })),
        etapa_6_hipoteses: hipoteses.map((h, idx) => ({
            id: `HIP-${idx + 1}`,
            enunciado: h.enunciado || h,
            causa_provavel: h.causa_provavel || 'Sob investigação empírica',
            status: 'HIPOTESE_SUJEITA_A_TESTE',
            aviso_rigor: 'Não confundir correlação com nexo causal definitivo sem validação de teste A/B.'
        })),
        etapa_7_oportunidades: oportunidades.map((o, idx) => ({
            id: `OPORT-${idx + 1}`,
            frente: o.frente || 'CONVERSAO',
            potencial_ganho: o.potencial_ganho || 'Otimização cirúrgica de taxa',
            descricao: o.descricao || o
        })),
        etapa_8_recomendacao: {
            principio: 'MENOR_INTERVENCAO_VIAVEL_MIV',
            acao_proposta: recomendacao.acao_proposta,
            destinatario: recomendacao.destinatario || 'Agente 05 — Atendimento e Vendas',
            justificativa_proporcionalidade: recomendacao.justificativa || 'Intervenção cirúrgica focada na causa-raiz sem gerar complexidade desnecessária.',
            status: 'AGUARDANDO_APROVACAO_GESTAO'
        },
        etapa_9_mensuracao: {
            indicador_avaliacao: mensuracao.indicador_avaliacao,
            baseline_atual: mensuracao.baseline_atual,
            meta_esperada: mensuracao.meta_esperada,
            janela_observacao_dias: mensuracao.janela_observacao_dias || 14,
            criterio_sucesso: mensuracao.criterio_sucesso
        }
    };
}

/**
 * -------------------------------------------------------------------------
 * 6. INTEGRAÇÃO COM MOTOR DE INTELIGÊNCIA COMERCIAL (7D, EPV, MIV)
 * -------------------------------------------------------------------------
 * Converte insights de marketing em pontuações enriquecidas para o Diagnóstico 7D,
 * cálculo de gargalo EPV e formulação de Menor Intervenção Viável.
 */

/**
 * Enriquece os scores de maturidade comercial 7D a partir de métricas de marketing
 * @param {Object} scoresAtuais - Scores atuais das 7 dimensões
 * @param {Object} metricasMarketing - Métricas de marketing disponíveis
 * @returns {Object} Scores calibrados
 */
function calibrarScores7DComMarketing(scoresAtuais = {}, metricasMarketing = {}) {
    const scores = { ...scoresAtuais };
    const { instagram, metaAds, webConversion } = metricasMarketing;

    // D1: Comunicação
    if (instagram && instagram.indicadores_consolidados) {
        const engaj = instagram.indicadores_consolidados.taxa_engajamento_alcance || 0;
        const prof = instagram.indicadores_consolidados.taxa_profundidade_conteudo || 0;
        
        let bonusComunicacao = 0;
        if (engaj >= 3.0) bonusComunicacao += 10;
        if (prof >= 30.0) bonusComunicacao += 10;
        if (instagram.padroes_identificados && instagram.padroes_identificados.some(p => p.tipo === 'ALTO_ALCANCE_BAIXA_ATRAÇÃO_PERFIL')) {
            bonusComunicacao -= 15; // Penaliza ruído de mensagem
        }
        scores.comunicacao = Math.min(100, Math.max(0, (scores.comunicacao || 50) + bonusComunicacao));
    }

    // D2: Aquisição
    if (metaAds && metaAds.indicadores_consolidados) {
        const cpm = metaAds.indicadores_consolidados.cpm_medio_brl || 0;
        const ctr = metaAds.indicadores_consolidados.ctr_medio_percentual || 0;
        
        let bonusAquisicao = 0;
        if (ctr >= 1.5) bonusAquisicao += 10;
        if (cpm > 50) bonusAquisicao -= 10; // Tráfego excessivamente caro
        if (metaAds.desperdicios_e_anomalias && metaAds.desperdicios_e_anomalias.length > 0) {
            bonusAquisicao -= (metaAds.desperdicios_e_anomalias.length * 8); // Penaliza desperdícios
        }
        scores.aquisição = Math.min(100, Math.max(0, (scores.aquisição || 50) + bonusAquisicao));
    }

    // D5: Conversão / D6: Estrutura Digital
    if (webConversion && webConversion.indicadores_consolidados) {
        const convGlobal = webConversion.indicadores_consolidados.taxa_conversao_global_site || 0;
        const abandono = webConversion.indicadores_consolidados.taxa_abandono_formulario || 0;

        let bonusConversao = 0;
        if (convGlobal >= 2.5) bonusConversao += 15;
        if (abandono >= 50.0) bonusConversao -= 20;

        scores.conversao = Math.min(100, Math.max(0, (scores.conversao || 50) + bonusConversao));
        scores.estrutura_digital = Math.min(100, Math.max(0, (scores.estrutura_digital || 50) + (convGlobal > 1.0 ? 10 : -10)));
    }

    return scores;
}

/**
 * Formula dados de Gargalo Comercial EPV decorrentes de atritos de marketing
 * @param {Object} params
 * @returns {Object} Payload para servicoMotorInteligencia.cadastrarGargaloEPV
 */
function construirGargaloEPVMarketing({
    empresaId,
    diagnosticoId,
    tipoGargalo = 'DESPERDICIO_OU_ATALHO',
    dadosMarketing = {},
    ticketMedioBRL = 1000
}) {
    if (tipoGargalo === 'ABANDONO_FORMULARIO_WEB') {
        const formIni = dadosMarketing.formularios_iniciados || 100;
        const formConc = dadosMarketing.formularios_concluidos || 30;
        const leadsPerdidos = formIni - formConc;
        const valorEmRisco = Math.round(leadsPerdidos * (ticketMedioBRL * 0.15)); // 15% conversão estimada em vendas

        return {
            empresaId,
            diagnosticoId,
            dimensao: 'CONVERSAO',
            titulo: 'Atrito Severo e Abandono na Página de Captura (Web)',
            descricao: `Mais de ${Math.round((leadsPerdidos / formIni) * 100)}% dos visitantes que iniciam o formulário abandonam antes de enviar. Fricção de interface e excesso de campos burocráticos.`,
            impactoFinanceiro: valorEmRisco,
            recorrencia: 0.80,
            abrangencia: 0.60,
            severidade: 0.75,
            esforco: 2, // Ajuste rápido de formulário
            urgenciaOperacional: 'ALTA',
            metodoAfericaoResultado: 'Taxa de conclusão de formulário nos próximos 14 dias',
            confiancaAnalitica: 'ALTA'
        };
    }

    if (tipoGargalo === 'FADIGA_META_ADS') {
        const spendDesperdicado = dadosMarketing.investimento_fadigado || 500;
        return {
            empresaId,
            diagnosticoId,
            dimensao: 'AQUISICAO',
            titulo: 'Fadiga Visual de Anúncios e Esgotamento de Frequência no Meta Ads',
            descricao: 'Frequência superior a 3.5 com CTR em declínio, gerando aumento de CPM e desperdício de verba publicitária.',
            impactoFinanceiro: spendDesperdicado,
            recorrencia: 0.90,
            abrangencia: 0.50,
            severidade: 0.70,
            esforco: 2,
            urgenciaOperacional: 'ALTA',
            metodoAfericaoResultado: 'Renovação dos criativos e monitoramento de CTR nos próximos 7 dias',
            confiancaAnalitica: 'ALTA'
        };
    }

    // Default: Desconexão Alcance x Contatos
    return {
        empresaId,
        diagnosticoId,
        dimensao: 'COMUNICACAO',
        titulo: 'Desconexão entre Distribuição de Conteúdo e Conversão Comercial',
        descricao: 'Alto volume de alcance com baixa taxa de retenção e cliques em links de atendimento comercial.',
        impactoFinanceiro: 3000.00,
        recorrencia: 0.70,
        abrangencia: 0.60,
        severidade: 0.60,
        esforco: 2,
        urgenciaOperacional: 'MEDIA',
        metodoAfericaoResultado: 'Razão visitas ao perfil e cliques de contato no Instagram',
        confiancaAnalitica: 'MEDIA'
    };
}

module.exports = {
    analisarMetricasInstagram,
    analisarCampanhasMetaAds,
    analisarConversaoWeb,
    analisarFunilMarketingVendas,
    estruturarRelatorioAnalitico9Etapas,
    calibrarScores7DComMarketing,
    construirGargaloEPVMarketing
};
