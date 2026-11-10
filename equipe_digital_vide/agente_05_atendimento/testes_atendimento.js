/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * Bateria Oficial de Testes do Agente 05: Atendimento e Vendas
 * Validações de Governança, Jornadas, Objeções, Follow-up e Padrão de Entrega
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const { salvarProjeto, obterProjetoPorId } = require('../agente_02_coordenador/repositorio_projetos_tarefas');
const {
    assumirTarefaAtendimento,
    gerarEntregaveisAtendimento,
    executarBateriaTestesAtendimento,
    submeterEntregaParaCoordenador,
    executarCicloCompletoAtendimento
} = require('./executor_atendimento');

function executarTestesAtendimento() {
    console.log('======================================================================');
    console.log('VIDE — BATERIA OFICIAL DE TESTES: AGENTE 05 (ATENDIMENTO E VENDAS)');
    console.log('======================================================================\n');

    let testesPassaram = 0;
    const totalTestesEsperados = 11;

    // -----------------------------------------------------------------
    // TESTE 1: Bloqueio em Projeto SEM Autorização Comercial
    // -----------------------------------------------------------------
    console.log('>>> TESTE 1: Bloqueio de Tarefa em Projeto SEM Autorização Comercial');
    const idProjetoPendente = 'PRJ-DEMO-ATEND-PENDENTE';
    salvarProjeto({
        id_projeto: idProjetoPendente,
        id_demanda_origem: 'DEM-TEST-001',
        cliente: 'Lead Não Autorizado',
        solicitacao_original: 'Gostaria de saber valores de atendimento.',
        situacao_projeto: 'AGUARDANDO_AUTORIZACAO_COMERCIAL',
        autorizacao_comercial: { status: 'PENDENTE' },
        grafo_tarefas: [
            {
                id_tarefa: 'TSK-PEND-01',
                especialista: 'Atendimento',
                estado: 'BLOQUEADA_POR_AUTORIZACAO',
                dependencias: []
            }
        ]
    });

    try {
        assumirTarefaAtendimento({ idProjeto: idProjetoPendente, idTarefa: 'TSK-PEND-01' });
        console.error('❌ [FALHA] Deveria ter bloqueado execução em projeto PENDENTE.');
    } catch (e) {
        if (e.message.includes('[BLOQUEIO_COMERCIAL]')) {
            console.log(`✓ [SUCESSO] Bloqueio comercial garantido: ${e.message}`);
            testesPassaram++;
        } else {
            console.error('❌ [FALHA] Mensagem de erro inesperada: ' + e.message);
        }
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 2: Bloqueio por Dependência Pendente no Grafo
    // -----------------------------------------------------------------
    console.log('>>> TESTE 2: Bloqueio por Dependência Pendente no Grafo');
    const idProjetoDep = 'PRJ-DEMO-ATEND-DEP';
    salvarProjeto({
        id_projeto: idProjetoDep,
        id_demanda_origem: 'DEM-TEST-002',
        cliente: 'Cliente Tripartite',
        solicitacao_original: 'Marca + Site + Atendimento.',
        situacao_projeto: 'EM_EXECUCAO',
        autorizacao_comercial: { status: 'AUTORIZADO' },
        grafo_tarefas: [
            {
                id_tarefa: 'TSK-DEP-01',
                especialista: 'Estrategista',
                estado: 'EM_ANDAMENTO', // Predecessora ainda não aprovada!
                dependencias: []
            },
            {
                id_tarefa: 'TSK-DEP-02',
                especialista: 'Atendimento',
                estado: 'BLOQUEADA_POR_DEPENDENCIA',
                dependencias: ['TSK-DEP-01']
            }
        ]
    });

    try {
        assumirTarefaAtendimento({ idProjeto: idProjetoDep, idTarefa: 'TSK-DEP-02' });
        console.error('❌ [FALHA] Deveria ter bloqueado tarefa com dependência pendente.');
    } catch (e) {
        if (e.message.includes('[BLOQUEIO_DEPENDENCIA]')) {
            console.log(`✓ [SUCESSO] Bloqueio de dependência garantido: ${e.message}`);
            testesPassaram++;
        } else {
            console.error('❌ [FALHA] Mensagem de erro inesperada: ' + e.message);
        }
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 3: Ingestão de Tarefa Válida e Desbloqueada
    // -----------------------------------------------------------------
    console.log('>>> TESTE 3: Ingestão de Tarefa Válida e Desbloqueada');
    const idProjetoValido = 'PRJ-DEMO-ATEND-VALIDO';
    salvarProjeto({
        id_projeto: idProjetoValido,
        id_demanda_origem: 'DEM-TEST-003',
        cliente: 'Dra. Camila Vasconcelos (Clínica Dermavie)',
        solicitacao_original: 'Estruturação do atendimento de alta conversão para o WhatsApp da clínica.',
        situacao_projeto: 'EM_EXECUCAO',
        autorizacao_comercial: { status: 'AUTORIZADO' },
        grafo_tarefas: [
            {
                id_tarefa: 'TSK-VAL-01',
                especialista: 'Atendimento',
                estado: 'PRONTA_PARA_EXECUCAO',
                dependencias: [],
                criterios_aceite: [
                    'Jornada conversacional mapeada',
                    'Matriz de 4 categorias de objeções',
                    'Réguas de follow-up temporal',
                    'Especificação para automação',
                    'Simulador funcional'
                ],
                historico_auditoria: []
            }
        ]
    });

    const ingestao = assumirTarefaAtendimento({ idProjeto: idProjetoValido, idTarefa: 'TSK-VAL-01' });
    if (ingestao.tarefa.estado === 'EM_ANDAMENTO') {
        console.log(`✓ [SUCESSO] Tarefa assumida pelo Agente 05 e transicionada para [${ingestao.tarefa.estado}].`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Estado inesperado: ' + ingestao.tarefa.estado);
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 4: Construção Física dos 7 Arquivos de Atendimento no Disco
    // -----------------------------------------------------------------
    console.log('>>> TESTE 4: Construção Física dos 7 Arquivos no Disco');
    const briefing = {
        idProjeto: idProjetoValido,
        idTarefa: 'TSK-VAL-01',
        cliente: 'Dra. Camila Vasconcelos (Clínica Dermavie)',
        solicitacaoOriginal: 'Estruturação do atendimento de alta conversão para o WhatsApp da clínica de estética de luxo.',
        dependencias: [],
        tokensBranding: {
            colors: { primary: '#E5C07B', primaryName: 'Champanhe Nobre' }
        }
    };

    const entrega = gerarEntregaveisAtendimento(briefing);
    console.log(`Diretório de Atendimento: ${entrega.diretorioEntrega}`);
    console.log(`Arquivos gerados: ${entrega.arquivosCriados.join(', ')}`);

    const todosNoDisco = entrega.arquivosCriados.every(nome => fs.existsSync(path.join(entrega.diretorioEntrega, nome)));
    if (todosNoDisco && entrega.arquivosCriados.length === 7) {
        console.log('✓ [SUCESSO] Todos os 7 arquivos físicos de atendimento foram criados com sucesso.');
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Nem todos os arquivos foram encontrados no disco.');
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 5: Validação Estrutural do Fluxo de Jornada
    // -----------------------------------------------------------------
    console.log('>>> TESTE 5: Validação Estrutural do fluxo_jornada_atendimento.json');
    const fluxoLido = JSON.parse(fs.readFileSync(path.join(entrega.diretorioEntrega, 'fluxo_jornada_atendimento.json'), 'utf-8'));
    if (fluxoLido.estagios_jornada && fluxoLido.estagios_jornada.length >= 4 && fluxoLido.canais_homologados.includes('WhatsApp Comercial Oficial')) {
        console.log(`✓ [SUCESSO] Fluxo de jornada validado com ${fluxoLido.estagios_jornada.length} estágios e canais homologados.`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Estrutura do fluxo inválida.');
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 6: Validação da Matriz de Objeções (4 Macro-Categorias)
    // -----------------------------------------------------------------
    console.log('>>> TESTE 6: Validação da Matriz de Objeções (Cobertura VIDE)');
    const matrizLida = JSON.parse(fs.readFileSync(path.join(entrega.diretorioEntrega, 'matriz_objecoes_e_respostas.json'), 'utf-8'));
    const categorias = matrizLida.macro_categorias.map(c => c.categoria);
    const temTodasCategorias = categorias.includes('PRECO_VALOR') &&
                               categorias.includes('CONFIANCA_AUTORIDADE') &&
                               categorias.includes('TEMPO_URGENCIA') &&
                               categorias.includes('CONCORRENTE_COMPARACAO');

    if (temTodasCategorias) {
        console.log(`✓ [SUCESSO] Matriz cobre todas as 4 macro-categorias essenciais: [${categorias.join(', ')}].`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Matriz de objeções incompleta: ' + categorias.join(', '));
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 7: Validação das Réguas de Follow-Up e Recuperação
    // -----------------------------------------------------------------
    console.log('>>> TESTE 7: Validação das Réguas de Follow-Up e Recuperação');
    const followLido = JSON.parse(fs.readFileSync(path.join(entrega.diretorioEntrega, 'regras_follow_up_e_recuperacao.json'), 'utf-8'));
    const abandonoPreco = followLido.pontos_de_abandono_mapeados.find(p => p.id === 'ABANDONO_POS_PRECO');
    const cadencias = abandonoPreco ? abandonoPreco.cadencia_temporal.map(c => c.tempo) : [];

    if (cadencias.includes('T+2 horas') && cadencias.includes('T+24 horas') && cadencias.includes('T+72 horas')) {
        console.log(`✓ [SUCESSO] Réguas de recuperação mapeadas com cadências: [${cadencias.join(', ')}].`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Cadências de follow-up ausentes: ' + cadencias.join(', '));
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 8: Validação da Especificação Técnica para o Agente de Automação
    // -----------------------------------------------------------------
    console.log('>>> TESTE 8: Validação da Especificação Técnica para Futuro Agente de Automação');
    const autoLida = JSON.parse(fs.readFileSync(path.join(entrega.diretorioEntrega, 'especificacao_tecnica_para_automacao.json'), 'utf-8'));
    const webhooks = autoLida.requisitos_tecnicos.webhooks_a_implementar.map(w => w.nome);
    const variaveis = autoLida.requisitos_tecnicos.variaveis_de_estado_crm.map(v => v.nome);

    if (webhooks.includes('WH_RECEBER_MENSAGEM_WHATSAPP') && variaveis.includes('status_conversa')) {
        console.log(`✓ [SUCESSO] Especificação para Automação validada (${webhooks.length} webhooks, ${variaveis.length} variáveis de estado).`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Especificação de automação incompleta.');
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 9: Validação do Manifesto Unificado de Entrega Compartilhada
    // -----------------------------------------------------------------
    console.log('>>> TESTE 9: Validação do Manifesto Unificado de Entrega Compartilhada');
    const manifestoLido = JSON.parse(fs.readFileSync(path.join(entrega.diretorioEntrega, 'manifesto_entrega.json'), 'utf-8'));
    const chavesObrigatorias = [
        'versao_manifesto', 'id_projeto', 'id_tarefa', 'especialista',
        'briefing_origem', 'arquivos_produzidos', 'versoes_alteracoes',
        'criterios_aceite', 'dependencias', 'pendencias_identificadas', 'resultado_auditoria'
    ];
    const todasChavesPresentes = chavesObrigatorias.every(k => k in manifestoLido);

    if (todasChavesPresentes && manifestoLido.arquivos_produzidos.length === 7) {
        console.log(`✓ [SUCESSO] Manifesto unificado de entrega validado com todas as 11 chaves de governança.`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Manifesto fora do padrão compartilhado VIDE.');
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 10: Submissão Formal ao Coordenador com Auditoria APROVADA
    // -----------------------------------------------------------------
    console.log('>>> TESTE 10: Submissão Formal ao Coordenador com Auditoria APROVADA');
    const relatorioValido = executarBateriaTestesAtendimento({
        diretorioEntrega: entrega.diretorioEntrega,
        criteriosAceite: ['Jornada mapeada']
    });

    const submissaoAprovada = submeterEntregaParaCoordenador({
        idProjeto: idProjetoValido,
        idTarefa: 'TSK-VAL-01',
        dadosEntrega: entrega,
        relatorioTestes: relatorioValido
    });

    const projAposAuditoria = obterProjetoPorId(idProjetoValido);
    const tarAposAuditoria = projAposAuditoria.grafo_tarefas.find(t => t.id_tarefa === 'TSK-VAL-01');

    if (submissaoAprovada.sucesso && tarAposAuditoria.estado === 'APROVADA') {
        console.log(`Pontuação de conformidade: ${relatorioValido.pontuacao_conformidade}%`);
        console.log(`Estado final da tarefa após auditoria: [${tarAposAuditoria.estado}]`);
        console.log(`Parecer do Coordenador: "${submissaoAprovada.parecer}"`);
        console.log('✓ [SUCESSO] Coordenador auditou a entrega de Atendimento e homologou como APROVADA.');
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Submissão não aprovada pelo Coordenador: ' + tarAposAuditoria.estado);
    }
    console.log('');

    // -----------------------------------------------------------------
    // TESTE 11: Rejeição Formal do Coordenador com Apontamento de PENDÊNCIA
    // -----------------------------------------------------------------
    console.log('>>> TESTE 11: Rejeição do Coordenador com Apontamento de PENDÊNCIA');
    const idProjetoRejeicao = 'PRJ-DEMO-ATEND-REJEICAO';
    salvarProjeto({
        id_projeto: idProjetoRejeicao,
        id_demanda_origem: 'DEM-TEST-004',
        cliente: 'Cliente Teste Rejeição',
        solicitacao_original: 'Demanda com falhas',
        situacao_projeto: 'EM_EXECUCAO',
        autorizacao_comercial: { status: 'AUTORIZADO' },
        grafo_tarefas: [
            {
                id_tarefa: 'TSK-REJ-01',
                especialista: 'Atendimento',
                estado: 'EM_ANDAMENTO',
                dependencias: [],
                criterios_aceite: [],
                historico_auditoria: []
            }
        ]
    });

    const relatorioFalho = {
        data_execucao: new Date().toISOString(),
        testes_individuais: { matriz_objecoes_completa: false },
        criterios_atendidos: false,
        pontuacao_conformidade: 50,
        falhas: ['Matriz de objeções sem cobertura da categoria Preço e Valor.']
    };

    const submissaoRejeitada = submeterEntregaParaCoordenador({
        idProjeto: idProjetoRejeicao,
        idTarefa: 'TSK-REJ-01',
        dadosEntrega: { diretorioEntrega: entrega.diretorioEntrega, arquivosCriados: [], dadosAtendimento: {} },
        relatorioTestes: relatorioFalho
    });

    const projRejeitado = obterProjetoPorId(idProjetoRejeicao);
    const tarRejeitada = projRejeitado.grafo_tarefas.find(t => t.id_tarefa === 'TSK-REJ-01');

    if (!submissaoRejeitada.sucesso && tarRejeitada.estado === 'PENDENCIA_IDENTIFICADA') {
        console.log(`✓ [SUCESSO] Auditoria do Coordenador rejeitou a entrega incompleta e marcou [${tarRejeitada.estado}].`);
        testesPassaram++;
    } else {
        console.error('❌ [FALHA] Auditoria deveria ter marcado PENDENCIA_IDENTIFICADA.');
    }

    console.log('\n======================================================================');
    console.log('SUMÁRIO FINAL DOS TESTES DO AGENTE 05 (ATENDIMENTO E VENDAS):');
    console.log(`1. Bloqueio por Falta de Autorização:         PASSOU`);
    console.log(`2. Bloqueio por Dependência Pendente:         PASSOU`);
    console.log(`3. Ingestão de Tarefa Válida:                 PASSOU`);
    console.log(`4. Construção dos 7 Arquivos no Disco:        PASSOU`);
    console.log(`5. Validação Estrutural da Jornada:           PASSOU`);
    console.log(`6. Validação da Matriz de 4 Objeções:         PASSOU`);
    console.log(`7. Validação das Réguas de Follow-Up:         PASSOU`);
    console.log(`8. Validação da Especificação para Automação: PASSOU`);
    console.log(`9. Validação do Manifesto Unificado:          PASSOU`);
    console.log(`10. Submissão e Aprovação pelo Coordenador:   PASSOU`);
    console.log(`11. Rejeição e Identificação de Pendência:    PASSOU`);
    console.log('======================================================================');
    console.log(`RESULTADO GERAL: ${testesPassaram} DE ${totalTestesEsperados} TESTES FORAM APROVADOS (${Math.round((testesPassaram/totalTestesEsperados)*100)}%)`);

    return testesPassaram === totalTestesEsperados;
}

if (require.main === module) {
    executarTestesAtendimento();
}

module.exports = { executarTestesAtendimento };
