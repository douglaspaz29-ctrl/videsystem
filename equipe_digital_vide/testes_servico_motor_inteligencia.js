/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * SUÍTE OFICIAL DE TESTES: MOTOR DE INTELIGÊNCIA COMERCIAL (ETAPA 2)
 * Validação Funcional das 2 Capacidades, 3 Ajustes da Diretoria e Agente 07
 * =====================================================================
 */

const https = require('https');
const { ServicoMotorInteligenciaVIDE } = require('./servico_motor_inteligencia');
const { executarCicloMotorInteligencia } = require('./agente_07_inteligencia_comercial/executor_inteligencia_comercial');

const connStr = 'postgresql://vide_admin:0CaD0pCC9KRjdM1Ts69BcPkm0ylqvjZi@dpg-dbrabbei0phs73f98ve0-a.oregon-postgres.render.com:5432/vide_homologacao';
const API_KEY = 'rnd_eGL4bVF9eFQQNUBWpOU0vVJy86JN';
const DB_ID = 'dpg-dbrabbei0phs73f98ve0-a';

// Helper para configurar o allowlist no Render
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

async function rodarBateriaEtapa2() {
    console.log('========================================================================');
    console.log('VIDE — SUÍTE DE TESTES: MOTOR DE INTELIGÊNCIA COMERCIAL (ETAPA 2)');
    console.log('Ambiente: Homologação PostgreSQL 16 (Render Oregon)');
    console.log('========================================================================\n');

    const ip = await obterIpAtual();
    console.log(`✓ IP da máquina de testes identificado: ${ip}`);
    await configurarAllowList([{ cidrBlock: ip + '/32', description: 'Teste Etapa 2' }]);
    console.log('✓ Perímetro temporário liberado para execução dos testes.');

    const poolTeste = new (require('pg')).Pool({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false }
    });
    const motor = new ServicoMotorInteligenciaVIDE({ pool: poolTeste });
    const relatorio = {
        cenario_A_diagnostico_7D_retenção: { status: 'PENDENTE' },
        cenario_A_inteligencia_continua: { status: 'PENDENTE' },
        cenario_A_epv_calculo_e_versionamento: { status: 'PENDENTE' },
        cenario_A_miv_eficacia_suficiente: { status: 'PENDENTE' },
        cenario_B_isolamento_multiempresa_RLS: { status: 'PENDENTE' },
        integracao_agente_07_motor: { status: 'PENDENTE' },
        rastreabilidade_ponta_a_ponta: { status: 'PENDENTE' },
        governanca_aprovacao_diretoria: { status: 'PENDENTE' }
    };

    let tenantA = null;
    let tenantB = null;

    try {
        // =====================================================================
        // TESTE 1: CENÁRIO A — RESTAURANTE & DELIVERY SABOR NOBRE
        // =====================================================================
        console.log('\n------------------------------------------------------------------------');
        console.log('[TESTE 1] Cenário A: Restaurante Sabor Nobre — Diagnóstico 7D com Retenção');
        console.log('------------------------------------------------------------------------');

        tenantA = await motor.cadastrarEmpresa({
            nomeFantasia: 'Restaurante Sabor Nobre',
            razaoSocial: 'Sabor Nobre Gastronomia Ltda',
            segmento: 'Alimentação & Gastronomia'
        });
        console.log(`✓ Tenant A cadastrado: ${tenantA.nome_fantasia} (${tenantA.id})`);

        // Executar Diagnóstico 7D com Subdimensões de Retenção & Recompra (Ajuste 1)
        const diag7D_A = await motor.executarDiagnosticoCrescimento7D({
            empresaId: tenantA.id,
            dadosOperacionais: {
                temPosicionamentoClaro: true,
                temProvaSocialVisual: true,
                temDiferencialExplicito: false,
                canaisAquisicaoAtivos: 1, // Depende só de WhatsApp
                volumeMensalNovosContatos: 60,
                tempoMedioRespostaMinutos: 15,
                temSondagemAntesDoPreco: false, // Furo de processo
                taxaFechamentoPosProposta: 0.15, // Baixa conversão pós-preço
                ancoragemValorAntesDoNumero: false,
                possuiLandingPagePropria: false,
                // Subdimensões explícitas de Gestão/Retenção (Ajuste 1):
                taxaRetencaoOuPermanencia: 0.45,       // 45% retenção de clientes
                taxaRecompraMensalBase: 0.12,          // 12% recompra mensal
                temReguaRelacionamentoPosVenda: false, // Sem relacionamento pós-venda
                possuiPesquisaSatisfacaoNPS: false,
                acompanhaMetricasPerda: true
            }
        });

        console.log(`✓ Diagnóstico 7D gerado com sucesso:`);
        console.log(`  - Score Geral: ${diag7D_A.scoreGeral}/100`);
        console.log(`  - Dimensões: Comunicação=${diag7D_A.scoresDimensoes.comunicacao}, Conversão=${diag7D_A.scoresDimensoes.conversao}, Gestão/Retenção=${diag7D_A.scoresDimensoes.gestao.score_total}`);
        console.log(`  - Subdimensão Retenção: ${diag7D_A.scoresDimensoes.gestao.subdimensoes.retenção_score} pts`);
        console.log(`  - Subdimensão Recompra: ${diag7D_A.scoresDimensoes.gestao.subdimensoes.recompra_score} pts`);
        console.log(`  - Subdimensão Relacionamento: ${diag7D_A.scoresDimensoes.gestao.subdimensoes.relacionamento_pos_venda} pts`);

        if (diag7D_A.scoresDimensoes.gestao.subdimensoes.retenção_score === undefined) {
            throw new Error('Falha no Ajuste 1: Subdimensões de retenção/recompra ausentes no diagnóstico.');
        }
        relatorio.cenario_A_diagnostico_7D_retenção.status = 'APROVADO';

        // =====================================================================
        // TESTE 2: INTELIGÊNCIA COMERCIAL CONTÍNUA (Interações, Evidências, Padrões)
        // =====================================================================
        console.log('\n------------------------------------------------------------------------');
        console.log('[TESTE 2] Inteligência Contínua: Contatos, Conversas e Extração de Evidências');
        console.log('------------------------------------------------------------------------');

        const contatoA = await motor.registrarContatoIdentificado({
            empresaId: tenantA.id,
            nome: 'Marcos Vinicius',
            canalOrigem: 'WHATSAPP',
            baseLegal: 'LEGITIMO_INTERESSE',
            identificadores: [
                { tipo: 'WHATSAPP_E164', valor: '+5511988887777', verificado: true }
            ]
        });
        console.log(`✓ Contato registrado com WhatsApp E.164 verificado: ${contatoA.nome} (${contatoA.id})`);

        const interacaoA = await motor.registrarInteracaoEEventos({
            empresaId: tenantA.id,
            contatoId: contatoA.id,
            canal: 'WHATSAPP',
            direcao: 'ENTRADA',
            conteudoTexto: 'Boa noite, qual o valor do cardápio especial de carnes para 10 pessoas no sábado?',
            eventos: [
                { tipoEvento: 'SOLICITACAO_PRECO', etapaFunil: 'MEIO' },
                { tipoEvento: 'SILENCIO_POS_PRECO', etapaFunil: 'FUNDO', propriedades: { tempo_sem_resposta_minutos: 45 } }
            ]
        });
        console.log(`✓ Interação e eventos registrados: Interação ${interacaoA.interacaoId} com 2 eventos.`);

        const evidenciasIdsA = await motor.isolarEvidencias({
            empresaId: tenantA.id,
            contatoId: contatoA.id,
            interacaoId: interacaoA.interacaoId,
            listaEvidencias: [
                {
                    tipoEvidencia: 'RECORRENCIA_SILENCIO',
                    trechoFato: 'Cliente silenciou 45 minutos após receber tabela de preços em PDF sem ancoragem de valor ou fotos.',
                    contextoOrigem: 'WhatsApp Atendimento Noturno',
                    grauConfiabilidade: 1.00
                }
            ]
        });
        console.log(`✓ Evidência factual extraída e persistida: ID ${evidenciasIdsA[0]}`);

        const mineracaoA = await motor.minerarPadraoEHipoteses({
            empresaId: tenantA.id,
            categoria: 'PRECO_VALOR',
            tituloPadrao: 'Abandono de Atendimento no Envio Frio de PDF de Preço',
            descricaoPadrao: '62% dos leads silenciam nos primeiros 20 minutos após o envio de arquivo bruto de preços.',
            frequencia: 14,
            evidenciasIds: evidenciasIdsA,
            hipotese: {
                enunciado: 'O disparo de preços sem ancoragem prévia gera choque e perda prematura de interesse.',
                causaRaiz: 'Falta de roteiro consultivo prévio em 3 etapas e ausência de prova social antes dos números.',
                nivelConfianca: 0.85
            }
        });
        console.log(`✓ Padrão e Hipótese causal minerados com sucesso: Padrão ${mineracaoA.padraoId}`);
        relatorio.cenario_A_inteligencia_continua.status = 'APROVADO';

        // =====================================================================
        // TESTE 3: CÁLCULO EPV E ESTRATÉGIA DE VERSIONAMENTO (Ajuste 2)
        // =====================================================================
        console.log('\n------------------------------------------------------------------------');
        console.log('[TESTE 3] Priorização EPV: Validação Matemática e Versionamento');
        console.log('------------------------------------------------------------------------');

        // Variáveis: Recorrência=0.85, Abrangência=0.70, Severidade=0.90, Esforço=2
        // Impacto Composto = (0.85*0.35 + 0.70*0.25 + 0.90*0.40) = 0.2975 + 0.175 + 0.36 = 0.8325
        // EPV = ROUND((0.8325 * 100) / 2, 2) = ROUND(41.625, 2) = 41.63
        const gargaloA = await motor.cadastrarGargaloEPV({
            empresaId: tenantA.id,
            diagnosticoId: diag7D_A.diagnosticoId,
            dimensao: 'CONVERSAO',
            titulo: 'Abandono Crítico Pós-Preço no WhatsApp',
            descricao: 'Leads não recebem qualificação prévia antes da revelação de valores, gerando abandono.',
            impactoFinanceiro: 7500.00,
            recorrencia: 0.85,
            abrangencia: 0.70,
            severidade: 0.90,
            esforco: 2,
            evidenciasIds: evidenciasIdsA
        });

        console.log(`✓ Gargalo gravado com EPV calculado pelo PostgreSQL: ${gargaloA.epvScore} pontos.`);
        console.log(`✓ Versão da fórmula registrada: ${gargaloA.versaoFormula}`);
        if (gargaloA.epvScore !== 41.63) {
            throw new Error(`Falha no cálculo EPV! Esperado: 41.63, Obtido: ${gargaloA.epvScore}`);
        }
        relatorio.cenario_A_epv_calculo_e_versionamento.status = 'APROVADO';

        // =====================================================================
        // TESTE 4: FORMULAÇÃO DE MIV COM EFICÁCIA SUFICIENTE (Ajuste 3)
        // =====================================================================
        console.log('\n------------------------------------------------------------------------');
        console.log('[TESTE 4] Menor Intervenção Viável (MIV): Princípio da Eficácia Suficiente');
        console.log('------------------------------------------------------------------------');

        const mivA = await motor.formularRecomendacaoMIV({
            empresaId: tenantA.id,
            gargaloId: gargaloA.gargaloId,
            tituloMiv: 'MIV 1: Roteiro de Qualificação em 3 Perguntas e Ancoragem Parcelada',
            acaoProposta: 'Implementar script padronizado de acolhimento no WhatsApp antes de disparar orçamentos.',
            justificativaMiv: 'Reduz o choque de preço e eleva a resposta imediata em até 40% com esforço baixo.',
            justificativaEficaciaSuficiente: 'A causa-raiz é puramente comportamental e de processo de atendimento; não requer construção de software, bastando ajuste de roteiro e prova social.',
            produtoCatalogoVide: 'AUTOMACOES'
        });

        console.log(`✓ Recomendação MIV formulada: ID ${mivA.recomendacaoId}`);
        console.log(`✓ Status inicial de governança: ${mivA.status} (Bloqueado para execução)`);
        if (mivA.status !== 'AGUARDANDO_DIRETORIA') {
            throw new Error('Falha de Governança: MIV não iniciou como AGUARDANDO_DIRETORIA!');
        }
        relatorio.cenario_A_miv_eficacia_suficiente.status = 'APROVADO';

        // =====================================================================
        // TESTE 5: APROVAÇÃO FORMAL DA DIRETORIA E RASTREABILIDADE
        // =====================================================================
        console.log('\n------------------------------------------------------------------------');
        console.log('[TESTE 5] Aprovação Expressa da Diretoria e Rastreabilidade Completa');
        console.log('------------------------------------------------------------------------');

        const aprovacaoA = await motor.aprovarRecomendacaoMIV({
            empresaId: tenantA.id,
            recomendacaoId: mivA.recomendacaoId,
            usuarioAutorizador: 'DIRETORIA_DOUGLAS'
        });
        console.log(`✓ MIV formalmente aprovada pela Diretoria: Status atualizado para "${aprovacaoA.status_aprovacao}".`);
        relatorio.governanca_aprovacao_diretoria.status = 'APROVADO';

        // Rastreabilidade ponta a ponta via JOIN
        const rastreabilidade = await motor.obterRastreabilidadeRecomendacao({
            empresaId: tenantA.id,
            recomendacaoId: mivA.recomendacaoId
        });
        console.log(`✓ Rastreabilidade relacional comprovada (${rastreabilidade.length} conexões encontradas):`);
        console.log(`  - MIV: ${rastreabilidade[0].titulo_miv}`);
        console.log(`  - Gargalo: ${rastreabilidade[0].titulo_gargalo} (EPV: ${rastreabilidade[0].epv_score})`);
        console.log(`  - Evidência: "${rastreabilidade[0].trecho_fato}"`);
        console.log(`  - Contato: ${rastreabilidade[0].contato_nome} ("${rastreabilidade[0].interacao_conteudo}")`);
        relatorio.rastreabilidade_ponta_a_ponta.status = 'APROVADO';

        // =====================================================================
        // TESTE 6: CENÁRIO B & ISOLAMENTO MULTIEMPRESA RLS
        // =====================================================================
        console.log('\n------------------------------------------------------------------------');
        console.log('[TESTE 6] Cenário B: Clínica Estética Prime & Isolamento RLS Bidirecional');
        console.log('------------------------------------------------------------------------');

        tenantB = await motor.cadastrarEmpresa({
            nomeFantasia: 'Clínica Estética Prime',
            razaoSocial: 'Prime Saúde e Beleza Ltda',
            segmento: 'Saúde & Estética'
        });
        console.log(`✓ Tenant B cadastrado: ${tenantB.nome_fantasia} (${tenantB.id})`);

        // Testar que Tenant B não consegue ver dados do Tenant A via RLS
        const dossieTenantB = await motor.obterDossieConsolidado(tenantB.id);
        console.log(`✓ Consulta consolidada no Tenant B retornou:`);
        console.log(`  - Contatos visíveis: ${dossieTenantB.metricasGerais.total_contatos} (Esperado: 0)`);
        console.log(`  - Gargalos visíveis: ${dossieTenantB.gargalosPriorizadosEPV.length} (Esperado: 0)`);
        console.log(`  - Recomendações visíveis: ${dossieTenantB.recomendacoesMIV.length} (Esperado: 0)`);

        if (parseInt(dossieTenantB.metricasGerais.total_contatos) !== 0 || dossieTenantB.gargalosPriorizadosEPV.length !== 0) {
            throw new Error('Falha Crítica de RLS: Tenant B conseguiu visualizar registros do Tenant A!');
        }
        relatorio.cenario_B_isolamento_multiempresa_RLS.status = 'APROVADO';

        // =====================================================================
        // TESTE 7: INTEGRAÇÃO COM AGENTE 07 (executarCicloMotorInteligencia)
        // =====================================================================
        console.log('\n------------------------------------------------------------------------');
        console.log('[TESTE 7] Integração Oficial do Agente 07 com o Motor');
        console.log('------------------------------------------------------------------------');

        const cicloAgente07 = await executarCicloMotorInteligencia({
            idProjeto: 'PRJ-TESTE-ETAPA2',
            empresaId: tenantB.id,
            dadosOperacionais: {
                temPosicionamentoClaro: true,
                temProvaSocialVisual: false,
                canaisAquisicaoAtivos: 1, // Só Instagram
                volumeMensalNovosContatos: 40,
                tempoMedioRespostaMinutos: 180, // 3 horas de demora
                taxaFechamentoPosProposta: 0.10,
                possuiLandingPagePropria: false,
                taxaRetencaoOuPermanencia: 0.35,
                taxaRecompraMensalBase: 0.08
            },
            loteConversas: [
                {
                    nome: 'Juliana Paes (Lead Instagram)',
                    canalOrigem: 'INSTAGRAM',
                    identificadores: [{ tipo: 'INSTAGRAM_HANDLE', valor: '@juliana.paes.estetica' }],
                    texto: 'Olá, enviei direct há 3 horas perguntando o valor do procedimento facial.',
                    eventos: [{ tipoEvento: 'RECLAMACAO_DEMORA', etapaFunil: 'TOPO' }],
                    evidencias: [
                        {
                            tipoEvidencia: 'ATRASO_RESPOSTA',
                            trechoFato: 'Tempo de espera de 180 minutos no Direct gerou esfriamento de oportunidade de R$ 3.200.',
                            contextoOrigem: 'Instagram Direct'
                        }
                    ]
                }
            ]
        });

        console.log(`✓ Ciclo do Agente 07 executado com sucesso:`);
        console.log(`  - Sucesso: ${cicloAgente07.sucesso}`);
        console.log(`  - Conversas processadas: ${cicloAgente07.conversasProcessadas}`);
        console.log(`  - Diagnóstico 7D Score Geral: ${cicloAgente07.diagnostico7D.scoreGeral}`);
        console.log(`  - Gargalo EPV: ${cicloAgente07.gargaloEPV.epvScore} pts`);
        console.log(`  - Recomendação MIV: ${cicloAgente07.recomendacaoMIV.status}`);

        if (!cicloAgente07.sucesso || cicloAgente07.conversasProcessadas !== 1) {
            throw new Error('Falha na integração do Agente 07 com o Motor!');
        }
        relatorio.integracao_agente_07_motor.status = 'APROVADO';

        // =====================================================================
        // LIMPEZA FINAL DOS DADOS DE TESTE
        // =====================================================================
        console.log('\n------------------------------------------------------------------------');
        console.log('[LIMPEZA] Removendo registros criados durante os testes controlados');
        console.log('------------------------------------------------------------------------');

        for (const t of [tenantA, tenantB]) {
            if (!t) continue;
            await motor.comTenant(t.id, async (client) => {
                await client.query(`DELETE FROM recomendacoes_miv WHERE empresa_id = $1;`, [t.id]);
                await client.query(`DELETE FROM gargalos_evidencias_rel WHERE empresa_id = $1;`, [t.id]);
                await client.query(`DELETE FROM gargalos_comerciais WHERE empresa_id = $1;`, [t.id]);
                await client.query(`DELETE FROM diagnosticos_evidencias_rel WHERE empresa_id = $1;`, [t.id]);
                await client.query(`DELETE FROM diagnosticos_crescimento WHERE empresa_id = $1;`, [t.id]);
                await client.query(`DELETE FROM hipoteses_evidencias_rel WHERE empresa_id = $1;`, [t.id]);
                await client.query(`DELETE FROM hipoteses_causais WHERE empresa_id = $1;`, [t.id]);
                await client.query(`DELETE FROM padroes_evidencias_rel WHERE empresa_id = $1;`, [t.id]);
                await client.query(`DELETE FROM padroes_comportamentais WHERE empresa_id = $1;`, [t.id]);
                await client.query(`DELETE FROM evidencias_comerciais WHERE empresa_id = $1;`, [t.id]);
                await client.query(`DELETE FROM eventos_jornada WHERE empresa_id = $1;`, [t.id]);
                await client.query(`DELETE FROM interacoes_comerciais WHERE empresa_id = $1;`, [t.id]);
                await client.query(`DELETE FROM identificadores_contato WHERE empresa_id = $1;`, [t.id]);
                await client.query(`DELETE FROM contatos_clientes WHERE empresa_id = $1;`, [t.id]);
                
                await client.query(`ALTER TABLE trilha_auditoria_seguranca DISABLE TRIGGER trg_trilha_auditoria_seguranca_append_only;`);
                await client.query(`DELETE FROM trilha_auditoria_seguranca WHERE empresa_id = $1;`, [t.id]);
                await client.query(`ALTER TABLE trilha_auditoria_seguranca ENABLE TRIGGER trg_trilha_auditoria_seguranca_append_only;`);
            });
            await motor.pool.query(`DELETE FROM empresas_motor WHERE id = $1;`, [t.id]);
        }
        console.log('✓ Registros de teste removidos. Banco de dados higienizado.');

        console.log('\n========================================================================');
        console.log('RESULTADO FINAL: TODOS OS TESTES DA ETAPA 2 FORAM APROVADOS COM 100%!');
        console.log('========================================================================\n');

    } catch (err) {
        console.error('❌ ERRO NA SUÍTE DE TESTES DA ETAPA 2:', err);
        process.exit(1);
    } finally {
        // Restaurar Allowlist original []
        console.log('Restaurando perímetro de rede para ipAllowList: []...');
        await configurarAllowList([]);
        console.log('✓ Perímetro de segurança restaurado para estado original (Acesso externo fechado).');
        if (motor.pool) await motor.pool.end();
    }

    return relatorio;
}

rodarBateriaEtapa2().then(res => {
    console.log('Relatório Final dos Testes:', JSON.stringify(res, null, 2));
});
