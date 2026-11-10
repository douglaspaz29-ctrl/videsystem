/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * TESTES AUTOMATIZADOS: AGENTE 04 — BRANDING E DESIGN
 * Validação rigorosa dos 8 cenários do ciclo de branding e UI/UX
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');

const {
    validarPermissaoExecucaoBranding,
    conceberSistemaIdentidadeVisual,
    construirArquivosFisicosBranding,
    executarBateriaTestesBranding,
    submeterAoCoordenadorBranding,
    executarCicloCompletoBranding,
    DIRETORIO_ENTREGAS_BASE
} = require('./executor_branding_design');

const {
    salvarProjeto,
    obterProjetoPorId
} = require('../agente_02_coordenador/repositorio_projetos_tarefas');

const {
    conferirEntrega
} = require('../agente_02_coordenador/executor_coordenador');

async function executarTestesBranding() {
    console.log('======================================================================');
    console.log('VIDE — BATERIA OFICIAL DE TESTES: AGENTE 04 (BRANDING E DESIGN)');
    console.log('======================================================================\n');

    const resultados = {
        caso1_ingestao_valida: false,
        caso2_bloqueio_comercial: false,
        caso3_geracao_arquivos_fisicos: false,
        caso4_validacao_json_tokens: false,
        caso5_validacao_css_tokens: false,
        caso6_validacao_svgs_vetoriais: false,
        caso7_aprovacao_coordenador: false,
        caso8_rejeicao_auditoria_pendencia: false
    };

    const idProjetoDemo = 'PRJ-DEMO-TESTE-BRANDING';

    // -----------------------------------------------------------------
    // PREPARAÇÃO: Criar Projeto de Teste para o Agente 04
    // -----------------------------------------------------------------
    salvarProjeto({
        id_projeto: idProjetoDemo,
        cliente: 'Dra. Camila Vasconcelos (Dermatologia & Estética)',
        solicitacao_original: 'Quero reposicionar minha clínica para estética de luxo e criar uma nova identidade com landing page.',
        situacao_projeto: 'EM_EXECUCAO',
        autorizacao_comercial: {
            status: 'AUTORIZADO',
            servicos_autorizados: ['Identidade Visual de Marca', 'Landing Page'],
            data_autorizacao: new Date().toISOString()
        },
        cronograma: { criado_em: new Date().toISOString(), prioridade: 'ALTA' },
        grafo_tarefas: [
            {
                id_tarefa: `TSK-${idProjetoDemo}-01`,
                especialista: 'Branding e Design',
                titulo: 'Desenvolvimento do Sistema de Identidade Visual e UI/UX',
                descricao: 'Criar posicionamento, paleta, tipografia, logotipo vetorial e tokens para o dev.',
                dependencias: [],
                criterios_aceite: [
                    'Direcionamento de marca e arquétipo definidos',
                    'Paleta cromática documentada em HEX',
                    'Logotipo em SVG vetorial escalável',
                    'Design tokens em JSON e CSS gerados',
                    'Manual de aplicação (Brand Guidelines)'
                ],
                estado: 'PRONTA_PARA_EXECUCAO',
                historico_auditoria: []
            }
        ]
    });

    // -----------------------------------------------------------------
    // CASO 2: Bloqueio de Tarefa em Projeto NÃO AUTORIZADO
    // -----------------------------------------------------------------
    console.log('>>> CASO 2: Bloqueio de Tarefa em Projeto SEM Autorização Comercial');
    const idProjetoPendente = 'PRJ-DEMO-BRANDING-PENDENTE';
    salvarProjeto({
        id_projeto: idProjetoPendente,
        cliente: 'Lead sem Contrato',
        situacao_projeto: 'AGUARDANDO_AUTORIZACAO_COMERCIAL',
        autorizacao_comercial: { status: 'PENDENTE' },
        cronograma: { criado_em: new Date().toISOString() },
        grafo_tarefas: [
            {
                id_tarefa: `TSK-${idProjetoPendente}-01`,
                especialista: 'Branding e Design',
                estado: 'BLOQUEADA_POR_AUTORIZACAO'
            }
        ]
    });

    try {
        validarPermissaoExecucaoBranding(idProjetoPendente, `TSK-${idProjetoPendente}-01`);
        console.log('FALHA: Deveria ter bloqueado projeto não autorizado!');
    } catch (e) {
        if (e.message.includes('[BLOQUEIO_COMERCIAL]')) {
            resultados.caso2_bloqueio_comercial = true;
            console.log(`✓ [SUCESSO] Bloqueio comercial garantido: ${e.message}\n`);
        } else {
            console.log('FALHA: Erro incorreto: ' + e.message);
        }
    }

    // -----------------------------------------------------------------
    // CASO 1: Ingestão de Tarefa Válida e Desbloqueada
    // -----------------------------------------------------------------
    console.log('>>> CASO 1: Ingestão de Tarefa Autorizada de Branding');
    const { tarefa } = validarPermissaoExecucaoBranding(idProjetoDemo, `TSK-${idProjetoDemo}-01`);
    const projAposIngestao = obterProjetoPorId(idProjetoDemo);
    const tarefaEmAndamento = projAposIngestao.grafo_tarefas.find(t => t.id_tarefa === `TSK-${idProjetoDemo}-01`);

    if (tarefaEmAndamento.estado === 'EM_ANDAMENTO') {
        resultados.caso1_ingestao_valida = true;
        console.log(`✓ [SUCESSO] Tarefa assumida pelo Agente 04 e transicionada para [EM_ANDAMENTO].\n`);
    } else {
        console.log('FALHA no Caso 1: Estado não foi alterado para EM_ANDAMENTO.');
    }

    // -----------------------------------------------------------------
    // CASO 3: Construção Física de Arquivos no Disco
    // -----------------------------------------------------------------
    console.log('>>> CASO 3: Construção Física dos Ativos de Identidade Visual no Disco');
    const dadosBranding = conceberSistemaIdentidadeVisual({
        cliente: projAposIngestao.cliente,
        solicitacao: projAposIngestao.solicitacao_original,
        idProjeto: idProjetoDemo
    });

    const dadosEntrega = construirArquivosFisicosBranding({
        idProjeto: idProjetoDemo,
        idTarefa: `TSK-${idProjetoDemo}-01`,
        dadosBranding
    });

    const caminhoJson = path.join(dadosEntrega.diretorioBranding, 'design_tokens.json');
    const caminhoCss = path.join(dadosEntrega.diretorioBranding, 'tokens_design.css');
    const caminhoLogoSvg = path.join(dadosEntrega.diretorioBranding, 'assets', 'logo.svg');
    const caminhoSimboloSvg = path.join(dadosEntrega.diretorioBranding, 'assets', 'simbolo.svg');
    const caminhoMd = path.join(dadosEntrega.diretorioBranding, 'brand_guidelines.md');
    const caminhoHtml = path.join(dadosEntrega.diretorioBranding, 'guia_marca_interativo.html');

    const todosExistem = fs.existsSync(caminhoJson) &&
                         fs.existsSync(caminhoCss) &&
                         fs.existsSync(caminhoLogoSvg) &&
                         fs.existsSync(caminhoSimboloSvg) &&
                         fs.existsSync(caminhoMd) &&
                         fs.existsSync(caminhoHtml);

    console.log(`Diretório de Branding: ${dadosEntrega.diretorioBranding}`);
    console.log(`Arquivos gerados: ${dadosEntrega.arquivosCriados.join(', ')}`);

    if (todosExistem) {
        resultados.caso3_geracao_arquivos_fisicos = true;
        console.log('✓ [SUCESSO] Todos os 6 arquivos físicos de Branding foram criados no disco.\n');
    } else {
        console.log('FALHA no Caso 3: Arquivos físicos de branding ausentes.');
    }

    // -----------------------------------------------------------------
    // CASO 4: Validação do JSON de Design Tokens
    // -----------------------------------------------------------------
    console.log('>>> CASO 4: Validação Estrutural do design_tokens.json');
    const jsonTokens = JSON.parse(fs.readFileSync(caminhoJson, 'utf-8'));
    const temCores = jsonTokens.colors && jsonTokens.colors.primary && jsonTokens.colors.background;
    const temTipografia = jsonTokens.typography && jsonTokens.typography.scales.h1;
    const temArquetipo = jsonTokens.branding && jsonTokens.branding.arquetipo;

    if (temCores && temTipografia && temArquetipo) {
        resultados.caso4_validacao_json_tokens = true;
        console.log(`✓ [SUCESSO] design_tokens.json validado (Primária: ${jsonTokens.colors.primary}, Arquétipo: ${jsonTokens.branding.arquetipo}).\n`);
    } else {
        console.log('FALHA no Caso 4: design_tokens.json incompleto.');
    }

    // -----------------------------------------------------------------
    // CASO 5: Validação do CSS de Variáveis (tokens_design.css)
    // -----------------------------------------------------------------
    console.log('>>> CASO 5: Validação do tokens_design.css para Consumo do Dev');
    const conteudoCss = fs.readFileSync(caminhoCss, 'utf-8');
    const temRoot = conteudoCss.includes(':root');
    const temVarPrimaria = conteudoCss.includes('--cor-primaria:');
    const temVarFonte = conteudoCss.includes('--fonte-titulos:');

    if (temRoot && temVarPrimaria && temVarFonte) {
        resultados.caso5_validacao_css_tokens = true;
        console.log('✓ [SUCESSO] tokens_design.css validado com design tokens nativos para o Desenvolvedor.\n');
    } else {
        console.log('FALHA no Caso 5: tokens_design.css inválido.');
    }

    // -----------------------------------------------------------------
    // CASO 6: Validação dos Vetores SVG (Logo e Símbolo)
    // -----------------------------------------------------------------
    console.log('>>> CASO 6: Validação de Escalabilidade dos Vetores SVG');
    const conteudoLogo = fs.readFileSync(caminhoLogoSvg, 'utf-8');
    const conteudoSimbolo = fs.readFileSync(caminhoSimboloSvg, 'utf-8');

    const logoOk = conteudoLogo.includes('<svg') && conteudoLogo.includes('viewBox="0 0 340 80"') && conteudoLogo.includes('</svg>');
    const simboloOk = conteudoSimbolo.includes('<svg') && conteudoSimbolo.includes('viewBox="0 0 80 80"') && conteudoSimbolo.includes('</svg>');

    if (logoOk && simboloOk) {
        resultados.caso6_validacao_svgs_vetoriais = true;
        console.log('✓ [SUCESSO] Vetores SVG validados com viewBox escalável e tags fechadas perfeitamente.\n');
    } else {
        console.log('FALHA no Caso 6: Arquivos SVG com problemas estruturais.');
    }

    // -----------------------------------------------------------------
    // CASO 7: Submissão e Homologação na Auditoria do Coordenador
    // -----------------------------------------------------------------
    console.log('>>> CASO 7: Submissão Formal ao Coordenador Geral com Auditoria APROVADA');
    const relatorioBateria = executarBateriaTestesBranding({
        diretorioBranding: dadosEntrega.diretorioBranding,
        criteriosAceite: tarefa.criterios_aceite
    });

    console.log(`Pontuação de conformidade calculada: ${relatorioBateria.pontuacao_conformidade}%`);
    const submissaoAprovada = submeterAoCoordenadorBranding({
        idProjeto: idProjetoDemo,
        idTarefa: `TSK-${idProjetoDemo}-01`,
        dadosEntrega,
        relatorioTestes: relatorioBateria
    });

    const projAposAuditoria = obterProjetoPorId(idProjetoDemo);
    const tarefaAuditada = projAposAuditoria.grafo_tarefas.find(t => t.id_tarefa === `TSK-${idProjetoDemo}-01`);
    console.log(`Estado final da tarefa após auditoria: [${tarefaAuditada.estado}]`);
    console.log(`Parecer do Coordenador: "${tarefaAuditada.historico_auditoria.slice(-1)[0].nota}"`);

    if (submissaoAprovada.sucesso && tarefaAuditada.estado === 'APROVADA') {
        resultados.caso7_aprovacao_coordenador = true;
        console.log('✓ [SUCESSO] Coordenador auditou a entrega de Branding e homologou como APROVADA.\n');
    } else {
        console.log('FALHA no Caso 7: A tarefa de branding não foi aprovada.');
    }

    // -----------------------------------------------------------------
    // CASO 8: Rejeição e Identificação de Pendência na Auditoria
    // -----------------------------------------------------------------
    console.log('>>> CASO 8: Rejeição do Coordenador com Apontamento de PENDÊNCIA');
    const relatorioIncompleto = {
        data_execucao: new Date().toISOString(),
        testes_individuais: { arquivos_obrigatorios_presentes: false },
        criterios_atendidos: false,
        pontuacao_conformidade: 40,
        falhas: ['Logotipo em SVG vetorial não foi exportado']
    };

    const submissaoRejeitada = submeterAoCoordenadorBranding({
        idProjeto: idProjetoDemo,
        idTarefa: `TSK-${idProjetoDemo}-01`,
        dadosEntrega,
        relatorioTestes: relatorioIncompleto
    });

    const projAposRejeicao = obterProjetoPorId(idProjetoDemo);
    const tarefaRejeitada = projAposRejeicao.grafo_tarefas.find(t => t.id_tarefa === `TSK-${idProjetoDemo}-01`);

    if (!submissaoRejeitada.sucesso && tarefaRejeitada.estado === 'PENDENCIA_IDENTIFICADA') {
        resultados.caso8_rejeicao_auditoria_pendencia = true;
        console.log('✓ [SUCESSO] Auditoria do Coordenador rejeitou a entrega incompleta e marcou PENDENCIA_IDENTIFICADA.\n');
    } else {
        console.log('FALHA no Caso 8: A tarefa deveria ter sido rejeitada.');
    }

    // -----------------------------------------------------------------
    // SUMÁRIO FINAL
    // -----------------------------------------------------------------
    console.log('======================================================================');
    console.log('SUMÁRIO FINAL DOS TESTES DO AGENTE 04 (BRANDING E DESIGN):');
    console.log(`1. Ingestão de Tarefa Válida:                 ${resultados.caso1_ingestao_valida ? 'PASSOU' : 'FALHOU'}`);
    console.log(`2. Bloqueio por Falta de Autorização:         ${resultados.caso2_bloqueio_comercial ? 'PASSOU' : 'FALHOU'}`);
    console.log(`3. Construção dos 6 Arquivos no Disco:        ${resultados.caso3_geracao_arquivos_fisicos ? 'PASSOU' : 'FALHOU'}`);
    console.log(`4. Validação de Tokens JSON:                  ${resultados.caso4_validacao_json_tokens ? 'PASSOU' : 'FALHOU'}`);
    console.log(`5. Validação de Tokens CSS:                   ${resultados.caso5_validacao_css_tokens ? 'PASSOU' : 'FALHOU'}`);
    console.log(`6. Validação de Vetores SVG:                  ${resultados.caso6_validacao_svgs_vetoriais ? 'PASSOU' : 'FALHOU'}`);
    console.log(`7. Submissão e Aprovação pelo Coordenador:    ${resultados.caso7_aprovacao_coordenador ? 'PASSOU' : 'FALHOU'}`);
    console.log(`8. Rejeição e Identificação de Pendência:     ${resultados.caso8_rejeicao_auditoria_pendencia ? 'PASSOU' : 'FALHOU'}`);
    console.log('======================================================================');

    const todosPassaram = Object.values(resultados).every(Boolean);
    console.log(`\nRESULTADO GERAL: ${todosPassaram ? 'TODOS OS 8 TESTES DE BRANDING FORAM APROVADOS (100%)' : 'HOUVE FALHAS NA VALIDAÇÃO'}`);
}

executarTestesBranding();
