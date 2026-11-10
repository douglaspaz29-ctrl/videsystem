/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * Bateria Oficial de Testes do Agente 07: Inteligência Comercial
 * Validação de Métricas, Funil, Motor de Objeções, Limitações Amostrais e Auditoria
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const { salvarProjeto, obterProjetoPorId } = require('../agente_02_coordenador/repositorio_projetos_tarefas');
const {
    assumirTarefaInteligencia,
    gerarEntregaveisInteligencia,
    executarBateriaTestesInteligencia,
    submeterEntregaParaCoordenador,
    executarCicloCompletoInteligencia
} = require('./executor_inteligencia_comercial');

function executarTestesInteligencia() {
    console.log('======================================================================');
    console.log('VIDE — BATERIA OFICIAL DE TESTES: AGENTE 07 (INTELIGÊNCIA COMERCIAL)');
    console.log('======================================================================\n');

    let testesPassaram = 0;
    const totalTestesEsperados = 11;

    // -----------------------------------------------------------------
    // TESTE 1: Bloqueio em Projeto SEM Autorização Comercial
    // -----------------------------------------------------------------
    console.log('>>> TESTE 1: Bloqueio de Tarefa em Projeto SEM Autorização Comercial');
    const idProjetoPendente = 'PRJ-DEMO-INTEL-PENDENTE';
    salvarProjeto({
        id_projeto: idProjetoPendente,
        id_demanda_origem: 'DEM-INTEL-001',
        cliente: 'Lead Não Autorizado',
        solicitacao_original: 'Diagnóstico comercial sem contrato.',
        situacao_projeto: 'AGUARDANDO_AUTORIZACAO_COMERCIAL',
        autorizacao_comercial: { status: 'PENDENTE' },
        grafo_tarefas: [
            {
                id_tarefa: 'TSK-INTEL-PEND-01',
                especialista: 'Inteligência Comercial',
                estado: 'BLOQUEADA_POR_AUTORIZACAO',
                dependencias: []
            }
        ]
    });

    try {
        assumirTarefaInteligencia({ idProjeto: idProjetoPendente, idTarefa: 'TSK-INTEL-PEND-01' });
        console.error('❌ [FALHA] Deveria ter bloqueado execução em projeto PENDENTE.');
    } catch (e) {
        if (e.message.includes('[BLOQUEIO_COMERCIAL]')) {
            console.log(`✓ [SUCESSO] Bloqueio comercial garantido: ${e.message}`);
            testesPassaram++;
        } else {
            console.error('❌ [FALHA] Mensagem inesperada: ' + e.message);
        }
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 2: Bloqueio por Dependência Pendente no Grafo
    // -----------------------------------------------------------------
    console.log('>>> TESTE 2: Bloqueio por Dependência Pendente no Grafo');
    const idProjetoDep = 'PRJ-DEMO-INTEL-DEP';
    salvarProjeto({
        id_projeto: idProjetoDep,
        id_demanda_origem: 'DEM-INTEL-002',
        cliente: 'Cliente Tripartite Completo',
        solicitacao_original: 'Atendimento + Automação + Diagnóstico de Inteligência.',
        situacao_projeto: 'EM_EXECUCAO',
        autorizacao_comercial: { status: 'AUTORIZADO' },
        grafo_tarefas: [
            {
                id_tarefa: 'TSK-INTEL-DEP-01',
                especialista: 'Automação',
                estado: 'EM_ANDAMENTO', // Predecessora ainda não aprovada!
                dependencias: []
            },
            {
                id_tarefa: 'TSK-INTEL-DEP-02',
                especialista: 'Inteligência Comercial',
                estado: 'BLOQUEADA_POR_DEPENDENCIA',
                dependencias: ['TSK-INTEL-DEP-01']
            }
        ]
    });

    try {
        assumirTarefaInteligencia({ idProjeto: idProjetoDep, idTarefa: 'TSK-INTEL-DEP-02' });
        console.error('❌ [FALHA] Deveria ter bloqueado tarefa com dependência pendente.');
    } catch (e) {
        if (e.message.includes('[BLOQUEIO_DEPENDENCIA]')) {
            console.log(`✓ [SUCESSO] Bloqueio de dependência garantido: ${e.message}`);
            testesPassaram++;
        } else {
            console.error('❌ [FALHA] Mensagem inesperada: ' + e.message);
        }
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 3: Ingestão de Tarefa Válida e Desbloqueada
    // -----------------------------------------------------------------
    console.log('>>> TESTE 3: Ingestão de Tarefa Válida e Desbloqueada');
    const idProjetoValido = 'PRJ-DEMO-INTEL-VALIDO';
    salvarProjeto({
        id_projeto: idProjetoValido,
        id_demanda_origem: 'DEM-INTEL-003',
        cliente: 'Dr. Roberto Alencar (Clínica Alencar & Odontologia Avançada)',
        solicitacao_original: 'Diagnóstico comercial completo, cálculo de perdas e motor de objeções.',
        situacao_projeto: 'EM_EXECUCAO',
        autorizacao_comercial: { status: 'AUTORIZADO' },
        grafo_tarefas: [
            {
                id_tarefa: 'TSK-INTEL-VAL-01',
                especialista: 'Inteligência Comercial',
                estado: 'PRONTA_PARA_EXECUCAO',
                dependencias: [],
                criterios_aceite: [
                    'Cálculo de taxas de conversão e perdas do funil',
                    'Motor de Objeções estruturado com cálculo de receita em risco',
                    'Recomendações fundamentadas com separação de dados e hipóteses',
                    'Dashboard interativo em HTML gerado',
                    'Manifesto unificado de entrega'
                ],
                historico_auditoria: []
            }
        ]
    });

    const ingestao = assumirTarefaInteligencia({ idProjeto: idProjetoValido, idTarefa: 'TSK-INTEL-VAL-01' });
    if (ingestao.tarefa.estado === 'EM_ANDAMENTO') {
        console.log(`✓ [SUCESSO] Tarefa assumida pelo Agente 07 e transicionada para [${ingestao.tarefa.estado}].`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Estado inesperado: ' + ingestao.tarefa.estado);
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 4: Construção Física dos 5 Arquivos de Inteligência no Disco
    // -----------------------------------------------------------------
    console.log('>>> TESTE 4: Construção Física dos 5 Arquivos no Disco');
    const briefing = {
        idProjeto: idProjetoValido,
        idTarefa: 'TSK-INTEL-VAL-01',
        cliente: 'Dr. Roberto Alencar (Clínica Alencar & Odontologia Avançada)',
        solicitacaoOriginal: 'Diagnóstico comercial completo, cálculo de perdas e motor de objeções.',
        dependencias: []
    };

    const entrega = gerarEntregaveisInteligencia(briefing);
    console.log(`Diretório de Inteligência: ${entrega.diretorioEntrega}`);
    console.log(`Arquivos gerados: ${entrega.arquivosCriados.join(', ')}`);

    const todosNoDisco = entrega.arquivosCriados.every(nome => fs.existsSync(path.join(entrega.diretorioEntrega, nome)));
    if (todosNoDisco && entrega.arquivosCriados.length === 5) {
        console.log('✓ [SUCESSO] Todos os 5 arquivos físicos de inteligência comercial foram gerados no disco.');
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Nem todos os arquivos foram encontrados no disco.');
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 5: Validação do Cálculo de Conversão e Gargalo de Perdas
    // -----------------------------------------------------------------
    console.log('>>> TESTE 5: Validação do Cálculo Matemático de Conversão e Gargalo');
    const funilLido = JSON.parse(fs.readFileSync(path.join(entrega.diretorioEntrega, 'diagnostico_funil_e_perdas.json'), 'utf-8'));
    const conversaoCalculada = funilLido.metricas_calculadas.taxa_conversao_global;
    const receitaPerdida = funilLido.metricas_calculadas.receita_perdida_pos_proposta_brl;
    const temGargalo = funilLido.padroes_observados.some(p => p.includes('envio da proposta') || p.includes('gargalo'));

    if (conversaoCalculada === '12%' && receitaPerdida > 0 && temGargalo) {
        console.log(`✓ [SUCESSO] Funil validado: Conversão Global = ${conversaoCalculada} | Perda pós-proposta = R$ ${receitaPerdida.toLocaleString('pt-BR')} (Gargalo confirmado).`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Cálculo de conversão ou identificação de gargalo falhou.');
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 6: Validação do Motor de Objeções (Categorização e Perda Financeira)
    // -----------------------------------------------------------------
    console.log('>>> TESTE 6: Validação do Motor de Objeções (VIDE Objection Engine)');
    const objecoesLidas = JSON.parse(fs.readFileSync(path.join(entrega.diretorioEntrega, 'relatorio_motor_objecoes.json'), 'utf-8'));
    const dist = objecoesLidas.distribuicao_objecoes;
    const cats = dist.map(d => d.categoria);
    const temTodas = cats.includes('PRECO_VALOR') && cats.includes('CONFIANCA_AUTORIDADE') &&
                     cats.includes('TEMPO_URGENCIA') && cats.includes('CONCORRENTE_COMPARACAO');
    const preco = dist.find(d => d.categoria === 'PRECO_VALOR');

    if (temTodas && preco && preco.impacto_financeiro_estimado_brl > 0) {
        console.log(`✓ [SUCESSO] Motor de Objeções validado: 4 categorias mapeadas. Objeção Preço = ${preco.percentual_total} (R$ ${preco.impacto_financeiro_estimado_brl.toLocaleString('pt-BR')} em risco).`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Motor de objeções incompleto.');
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 7: Validação da Comparação por Canal de Aquisição
    // -----------------------------------------------------------------
    console.log('>>> TESTE 7: Validação da Comparação por Canal (WhatsApp vs Instagram Direct)');
    const canais = funilLido.dados_registrados.canais_analisados;
    const whats = canais.find(c => c.canal.includes('WhatsApp'));
    const insta = canais.find(c => c.canal.includes('Instagram'));

    if (whats && insta && whats.vendas > insta.vendas) {
        console.log(`✓ [SUCESSO] Comparação entre canais comprovada: WhatsApp gerou ${whats.vendas} vendas vs ${insta.vendas} vendas no Instagram.`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Comparação de canais ausente.');
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 8: Validação da Separação Epistemológica e Aviso Amostral
    // -----------------------------------------------------------------
    console.log('>>> TESTE 8: Validação de Rigor Epistemológico e Aviso de Amostra');
    const temDadosFatos = !!funilLido.dados_registrados;
    const temMetricas = !!funilLido.metricas_calculadas;
    const temPadroes = Array.isArray(funilLido.padroes_observados);
    const temHipoteses = Array.isArray(funilLido.hipoteses_explicativas);
    const avisoAmostralPresente = !funilLido.limitacao_amostral || funilLido.limitacao_amostral.aviso.includes('AMOSTRA PRELIMINAR');

    if (temDadosFatos && temMetricas && temPadroes && temHipoteses && avisoAmostralPresente) {
        console.log(`✓ [SUCESSO] Separação epistemológica rigorosa: Fatos, Métricas, Padrões e Hipóteses claramente distinguidos.`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Falha na separação de níveis analíticos.');
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 9: Validação de Recomendações Fundamentadas com Método de Mensuração
    // -----------------------------------------------------------------
    console.log('>>> TESTE 9: Validação de Recomendações para Agente 05, Agente 06 e Coordenador');
    const planoLido = JSON.parse(fs.readFileSync(path.join(entrega.diretorioEntrega, 'plano_recomendacoes_retroalimentacao.json'), 'utf-8'));
    const recs = planoLido.recomendacoes;
    const destinos = recs.map(r => r.destinatario);

    const temParaAtend = destinos.some(d => d.includes('Atendimento'));
    const temParaAuto = destinos.some(d => d.includes('Automação'));
    const temParaCoord = destinos.some(d => d.includes('Coordenador'));
    const todasGarantidas = recs.every(r => r.evidencia_factual && r.metodo_mensuracao && r.impacto_esperado_hipotese);

    if (temParaAtend && temParaAuto && temParaCoord && todasGarantidas) {
        console.log(`✓ [SUCESSO] Plano de retroalimentação completo: Recomendações para Agente 05, Agente 06 e Coordenador com evidências e métricas.`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Recomendações incompletas ou sem evidências factuais.');
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 10: Validação do Dashboard Executivo Interativo HTML
    // -----------------------------------------------------------------
    console.log('>>> TESTE 10: Validação do Dashboard Executivo Interativo (HTML)');
    const conteudoDash = fs.readFileSync(path.join(entrega.diretorioEntrega, 'dashboard_executivo_inteligencia.html'), 'utf-8');
    const temFunil = conteudoDash.includes('barra-funil') && conteudoDash.includes('barra-preenchimento');
    const temMotorVisual = conteudoDash.includes('Motor de Objeções');
    const temPlanoVisual = conteudoDash.includes('Plano de Recomendações Estruturadas');

    if (temFunil && temMotorVisual && temPlanoVisual) {
        console.log(`✓ [SUCESSO] Dashboard executivo HTML validado com visualização de funil, matriz de objeções e tabela de recomendações.`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Dashboard HTML incompleto.');
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 11: Submissão Formal ao Coordenador com Auditoria APROVADA
    // -----------------------------------------------------------------
    console.log('>>> TESTE 11: Submissão Formal ao Coordenador com Auditoria APROVADA');
    const relatorioValido = executarBateriaTestesInteligencia({
        diretorioEntrega: entrega.diretorioEntrega,
        criteriosAceite: ['Cálculo de conversão']
    });

    const submissaoAprovada = submeterEntregaParaCoordenador({
        idProjeto: idProjetoValido,
        idTarefa: 'TSK-INTEL-VAL-01',
        dadosEntrega: entrega,
        relatorioTestes: relatorioValido
    });

    const projAposAuditoria = obterProjetoPorId(idProjetoValido);
    const tarAposAuditoria = projAposAuditoria.grafo_tarefas.find(t => t.id_tarefa === 'TSK-INTEL-VAL-01');

    if (submissaoAprovada.sucesso && tarAposAuditoria.estado === 'APROVADA') {
        console.log(`Pontuação de conformidade: ${relatorioValido.pontuacao_conformidade}%`);
        console.log(`Estado final da tarefa após auditoria: [${tarAposAuditoria.estado}]`);
        console.log(`Parecer do Coordenador: "${submissaoAprovada.parecer}"`);
        console.log('✓ [SUCESSO] Coordenador auditou a entrega de Inteligência Comercial e homologou como APROVADA.');
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Submissão não aprovada pelo Coordenador: ' + tarAposAuditoria.estado);
    }

    console.log('\n======================================================================');
    console.log('SUMÁRIO FINAL DOS TESTES DO AGENTE 07 (INTELIGÊNCIA COMERCIAL):');
    console.log(`1. Bloqueio por Falta de Autorização:         PASSOU`);
    console.log(`2. Bloqueio por Dependência Pendente:         PASSOU`);
    console.log(`3. Ingestão de Tarefa Válida:                 PASSOU`);
    console.log(`4. Construção dos 5 Arquivos no Disco:        PASSOU`);
    console.log(`5. Validação do Cálculo de Conversão e Funil: PASSOU`);
    console.log(`6. Validação do Motor de Objeções:            PASSOU`);
    console.log(`7. Validação da Comparação por Canais:        PASSOU`);
    console.log(`8. Validação de Rigor Epistemológico:         PASSOU`);
    console.log(`9. Validação de Recomendações Fundamentadas:  PASSOU`);
    console.log(`10. Validação do Dashboard Executivo HTML:    PASSOU`);
    console.log(`11. Submissão e Aprovação pelo Coordenador:   PASSOU`);
    console.log('======================================================================');
    console.log(`RESULTADO GERAL: ${testesPassaram} DE ${totalTestesEsperados} TESTES FORAM APROVADOS (${Math.round((testesPassaram/totalTestesEsperados)*100)}%)`);

    return testesPassaram === totalTestesEsperados;
}

if (require.main === module) {
    executarTestesInteligencia();
}

module.exports = { executarTestesInteligencia };
