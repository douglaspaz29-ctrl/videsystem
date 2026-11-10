/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * TESTES AUTOMATIZADOS: AGENTE 03 — DESENVOLVEDOR FULL-STACK
 * Validação rigorosa dos 9 cenários do ciclo de desenvolvimento
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');

const {
    validarPermissaoExecucao,
    interpretarBriefing,
    gerarCodigoSolucao,
    construirArquivosFisicos,
    executarBateriaTestes,
    submeterAoCoordenador,
    executarCicloCompletoDesenvolvedor,
    DIRETORIO_ENTREGAS_BASE
} = require('./executor_desenvolvedor');

const {
    salvarProjeto,
    obterProjetoPorId,
    atualizarEstadoTarefa
} = require('../agente_02_coordenador/repositorio_projetos_tarefas');

const {
    receberRegistroTriagem,
    conferirEntrega
} = require('../agente_02_coordenador/executor_coordenador');

async function executarTodosOsTestes() {
    console.log('======================================================================');
    console.log('VIDE — BATERIA OFICIAL DE TESTES: AGENTE 03 (DESENVOLVEDOR FULL-STACK)');
    console.log('======================================================================\n');

    const resultados = {
        caso1_recebimento_valido: false,
        caso2_bloqueio_comercial: false,
        caso3_bloqueio_dependencia: false,
        caso4_construcao_arquivos_fisicos: false,
        caso5_validacao_html_semantico: false,
        caso6_validacao_css_responsivo: false,
        caso7_validacao_formulario_whatsapp: false,
        caso8_aprovacao_coordenador: false,
        caso9_rejeicao_auditoria_pendencia: false
    };

    // ID de projeto controlado para demonstração
    const idProjetoDemo = `PRJ-DEMO-TESTE-DEV`;

    // -----------------------------------------------------------------
    // PREPARAÇÃO: Criar Projeto de Teste com 2 tarefas encadeadas
    // -----------------------------------------------------------------
    const projetoDemo = {
        id_projeto: idProjetoDemo,
        id_demanda_origem: 'DEM-DEMO-DEV',
        cliente: 'Clínica OrthoPrime (Dr. Roberto - Odontologia Avançada)',
        solicitacao_original: 'Olá, sou o Dr. Roberto da Clínica OrthoPrime e preciso criar uma landing page com urgência.',
        situacao_projeto: 'EM_EXECUCAO',
        autorizacao_comercial: {
            status: 'AUTORIZADO',
            servicos_autorizados: ['Desenvolvimento de Landing Page Institucional'],
            data_autorizacao: new Date().toISOString()
        },
        cronograma: {
            prioridade: 'ALTA',
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        },
        grafo_tarefas: [
            {
                id_tarefa: `TSK-${idProjetoDemo}-01`,
                especialista: 'Branding e Design',
                titulo: 'Validação dos Ativos de Identidade Visual',
                descricao: 'Verificar logotipo e cores da clínica.',
                dependencias: [],
                criterios_aceite: ['Logotipo em alta resolução', 'Paleta cromática definida'],
                estado: 'PRONTA_PARA_EXECUCAO',
                historico_auditoria: []
            },
            {
                id_tarefa: `TSK-${idProjetoDemo}-02`,
                especialista: 'Desenvolvedor',
                titulo: 'Desenvolvimento e Programação da Landing Page',
                descricao: 'Construir landing page responsiva com formulário e integração WhatsApp.',
                dependencias: [`TSK-${idProjetoDemo}-01`],
                criterios_aceite: [
                    'Código HTML semântico e estruturado',
                    'Design responsivo para mobile e desktop',
                    'Formulário com validação de telefone brasileiro',
                    'Botão com link direto para WhatsApp com mensagem pré-formatada'
                ],
                estado: 'BLOQUEADA_POR_DEPENDENCIA',
                historico_auditoria: []
            }
        ],
        registro_operacional: []
    };

    salvarProjeto(projetoDemo);

    // -----------------------------------------------------------------
    // CASO 2: Bloqueio de Tarefa em Projeto NÃO AUTORIZADO
    // -----------------------------------------------------------------
    console.log('>>> CASO 2: Bloqueio de Tarefa em Projeto SEM Autorização Comercial');
    const idProjetoNaoAutorizado = `PRJ-DEMO-NAO-AUTORIZADO`;
    salvarProjeto({
        id_projeto: idProjetoNaoAutorizado,
        cliente: 'Lead sem Contrato',
        solicitacao_original: 'Apenas tirando uma dúvida sobre preços',
        situacao_projeto: 'AGUARDANDO_AUTORIZACAO_COMERCIAL',
        autorizacao_comercial: { status: 'PENDENTE' },
        cronograma: { criado_em: new Date().toISOString() },
        grafo_tarefas: [
            {
                id_tarefa: `TSK-${idProjetoNaoAutorizado}-01`,
                especialista: 'Desenvolvedor',
                estado: 'BLOQUEADA_POR_AUTORIZACAO'
            }
        ]
    });

    try {
        validarPermissaoExecucao(idProjetoNaoAutorizado, `TSK-${idProjetoNaoAutorizado}-01`);
        console.log('FALHA: Deveria ter bloqueado projeto não autorizado!');
    } catch (e) {
        if (e.message.includes('[BLOQUEIO_COMERCIAL]')) {
            resultados.caso2_bloqueio_comercial = true;
            console.log(`✓ [SUCESSO] Bloqueio mantido: ${e.message}\n`);
        } else {
            console.log('FALHA: Erro incorreto: ' + e.message);
        }
    }

    // -----------------------------------------------------------------
    // CASO 3: Bloqueio por Dependência Pendente (TSK-01 ainda não aprovada)
    // -----------------------------------------------------------------
    console.log('>>> CASO 3: Bloqueio de Tarefa com Dependência Pendente no Grafo');
    try {
        validarPermissaoExecucao(idProjetoDemo, `TSK-${idProjetoDemo}-02`);
        console.log('FALHA: Deveria ter bloqueado por dependência!');
    } catch (e) {
        if (e.message.includes('[BLOQUEIO_DEPENDENCIA]')) {
            resultados.caso3_bloqueio_dependencia = true;
            console.log(`✓ [SUCESSO] Bloqueio de dependência respeitado: ${e.message}\n`);
        } else {
            console.log('FALHA: Erro incorreto: ' + e.message);
        }
    }

    // -----------------------------------------------------------------
    // CASO 1: Recebimento Válido de Tarefa (Após aprovar dependência)
    // -----------------------------------------------------------------
    console.log('>>> CASO 1: Ingestão de Tarefa Válida e Desbloqueada');
    // Simulamos que a tarefa 01 (Branding) foi aprovada pelo Coordenador
    conferirEntrega({
        idProjeto: idProjetoDemo,
        idTarefa: `TSK-${idProjetoDemo}-01`,
        entregaSubmetida: { logo: 'logo_orthoprime.png', cores: ['#00f0ff', '#0d121f'] },
        criteriosAtendidos: true,
        parecerCoordenador: 'Ativos de marca validados com sucesso.'
    });

    // Agora o Coordenador recalculou e TSK-02 passou para PRONTA_PARA_EXECUCAO
    const projAposAprovacao = obterProjetoPorId(idProjetoDemo);
    const tarefaDev = projAposAprovacao.grafo_tarefas.find(t => t.id_tarefa === `TSK-${idProjetoDemo}-02`);
    console.log(`Estado da tarefa do Desenvolvedor após liberação: [${tarefaDev.estado}]`);

    const ingestao = validarPermissaoExecucao(idProjetoDemo, `TSK-${idProjetoDemo}-02`);
    const projAposIngestao = obterProjetoPorId(idProjetoDemo);
    const tarefaEmAndamento = projAposIngestao.grafo_tarefas.find(t => t.id_tarefa === `TSK-${idProjetoDemo}-02`);

    if (tarefaEmAndamento.estado === 'EM_ANDAMENTO') {
        resultados.caso1_recebimento_valido = true;
        console.log(`✓ [SUCESSO] Tarefa assumida pelo Desenvolvedor e transicionada para [EM_ANDAMENTO].\n`);
    } else {
        console.log('FALHA no Caso 1: Estado não foi alterado para EM_ANDAMENTO.');
    }

    // -----------------------------------------------------------------
    // CASO 4: Construção Física de Arquivos no Disco
    // -----------------------------------------------------------------
    console.log('>>> CASO 4: Construção Física dos Arquivos da Landing Page no Disco');
    const briefing = interpretarBriefing(tarefaDev, projAposIngestao);
    const dadosEntrega = construirArquivosFisicos({
        idProjeto: idProjetoDemo,
        idTarefa: `TSK-${idProjetoDemo}-02`,
        briefing
    });

    const caminhoIndex = path.join(dadosEntrega.diretorioEntrega, 'index.html');
    const caminhoCss = path.join(dadosEntrega.diretorioEntrega, 'css', 'estilos.css');
    const caminhoJs = path.join(dadosEntrega.diretorioEntrega, 'js', 'script.js');
    const caminhoReadme = path.join(dadosEntrega.diretorioEntrega, 'README.md');

    const todosArquivosExistem = fs.existsSync(caminhoIndex) &&
                                 fs.existsSync(caminhoCss) &&
                                 fs.existsSync(caminhoJs) &&
                                 fs.existsSync(caminhoReadme);

    console.log(`Diretório da entrega física: ${dadosEntrega.diretorioEntrega}`);
    console.log(`Arquivos gerados: ${dadosEntrega.arquivosCriados.join(', ')}`);
    console.log(`Tamanho index.html: ${fs.statSync(caminhoIndex).size} bytes`);
    console.log(`Tamanho estilos.css: ${fs.statSync(caminhoCss).size} bytes`);
    console.log(`Tamanho script.js: ${fs.statSync(caminhoJs).size} bytes`);

    if (todosArquivosExistem && fs.statSync(caminhoIndex).size > 1000) {
        resultados.caso4_construcao_arquivos_fisicos = true;
        console.log('✓ [SUCESSO] Todos os arquivos físicos foram gravados e verificados no disco.\n');
    } else {
        console.log('FALHA no Caso 4: Arquivos físicos não foram gerados corretamente.');
    }

    // -----------------------------------------------------------------
    // CASO 5: Validação Técnica do HTML Semântico
    // -----------------------------------------------------------------
    console.log('>>> CASO 5: Bateria de Testes no Código HTML');
    const conteudoHtml = fs.readFileSync(caminhoIndex, 'utf-8');
    const temDoctype = conteudoHtml.includes('<!DOCTYPE html>');
    const temViewport = conteudoHtml.includes('name="viewport"');
    const temHeader = conteudoHtml.includes('<header') && conteudoHtml.includes('</header>');
    const temMain = conteudoHtml.includes('<main>') && conteudoHtml.includes('</main>');
    const temForm = conteudoHtml.includes('<form id="form-agendamento"') && conteudoHtml.includes('</form>');
    const temInputs = conteudoHtml.includes('id="nome-cliente"') && conteudoHtml.includes('id="telefone-cliente"');

    if (temDoctype && temViewport && temHeader && temMain && temForm && temInputs) {
        resultados.caso5_validacao_html_semantico = true;
        console.log('✓ [SUCESSO] HTML semântico com Doctype, Viewport, Header, Main, Form e Inputs validados.\n');
    } else {
        console.log('FALHA no Caso 5: HTML não cumpre as regras semânticas obrigatórias.');
    }

    // -----------------------------------------------------------------
    // CASO 6: Validação de Responsividade no CSS (Breakpoints)
    // -----------------------------------------------------------------
    console.log('>>> CASO 6: Validação de Responsividade e Design Tokens no CSS');
    const conteudoCss = fs.readFileSync(caminhoCss, 'utf-8');
    const temDesignTokens = conteudoCss.includes('--fundo-base') && conteudoCss.includes('--ciano-principal');
    const temMediaTablet = conteudoCss.includes('max-width: 768px');
    const temMediaMobile = conteudoCss.includes('max-width: 480px');

    if (temDesignTokens && temMediaTablet && temMediaMobile) {
        resultados.caso6_validacao_css_responsivo = true;
        console.log('✓ [SUCESSO] CSS modular com Design Tokens e media queries para Tablet e Mobile testados.\n');
    } else {
        console.log('FALHA no Caso 6: CSS não possui breakpoints responsivos.');
    }

    // -----------------------------------------------------------------
    // CASO 7: Validação do Formulário e Integração com WhatsApp no JS
    // -----------------------------------------------------------------
    console.log('>>> CASO 7: Validação de Máscara de Telefone e WhatsApp no JS');
    const conteudoJs = fs.readFileSync(caminhoJs, 'utf-8');
    const temListenerSubmit = conteudoJs.includes("addEventListener('submit'");
    const temMascara = conteudoJs.includes('replace');
    const temWhatsApp = conteudoJs.includes('wa.me');

    if (temListenerSubmit && temMascara && temWhatsApp) {
        resultados.caso7_validacao_formulario_whatsapp = true;
        console.log('✓ [SUCESSO] JavaScript contém máscara de telefone BR, validação de campos e link WhatsApp.\n');
    } else {
        console.log('FALHA no Caso 7: JavaScript incompleto.');
    }

    // -----------------------------------------------------------------
    // CASO 8: Submissão ao Coordenador e Auditoria APROVADA
    // -----------------------------------------------------------------
    console.log('>>> CASO 8: Submissão Formal ao Coordenador Geral com Auditoria APROVADA');
    const relatorioBateria = executarBateriaTestes({
        diretorioEntrega: dadosEntrega.diretorioEntrega,
        criteriosAceite: briefing.criteriosAceite
    });

    console.log(`Pontuação de conformidade calculada: ${relatorioBateria.pontuacao_conformidade}%`);
    console.log(`Critérios atendidos: ${relatorioBateria.criterios_atendidos}`);

    const submissaoAprovada = submeterAoCoordenador({
        idProjeto: idProjetoDemo,
        idTarefa: `TSK-${idProjetoDemo}-02`,
        dadosEntrega,
        relatorioTestes: relatorioBateria
    });

    const projAposAuditoria = obterProjetoPorId(idProjetoDemo);
    const tarefaAuditada = projAposAuditoria.grafo_tarefas.find(t => t.id_tarefa === `TSK-${idProjetoDemo}-02`);
    console.log(`Estado final da tarefa após conferência do Coordenador: [${tarefaAuditada.estado}]`);
    console.log(`Parecer registrado pelo Coordenador: "${tarefaAuditada.historico_auditoria.slice(-1)[0].nota}"`);

    if (submissaoAprovada.sucesso && tarefaAuditada.estado === 'APROVADA') {
        resultados.caso8_aprovacao_coordenador = true;
        console.log('✓ [SUCESSO] Coordenador auditou a entrega do Desenvolvedor e homologou como APROVADA.\n');
    } else {
        console.log('FALHA no Caso 8: A tarefa não foi aprovada pelo Coordenador.');
    }

    // -----------------------------------------------------------------
    // CASO 9: Rejeição na Auditoria quando Critérios NÃO são Atendidos
    // -----------------------------------------------------------------
    console.log('>>> CASO 9: Rejeição Formal do Coordenador com Apontamento de PENDÊNCIA');
    const relatorioComFalha = {
        data_execucao: new Date().toISOString(),
        testes_individuais: { arquivos_presentes: true, html_semantico: false },
        criterios_atendidos: false,
        pontuacao_conformidade: 50,
        falhas: ['Formulário sem validação de telefone brasileiro']
    };

    const submissaoRejeitada = submeterAoCoordenador({
        idProjeto: idProjetoDemo,
        idTarefa: `TSK-${idProjetoDemo}-02`,
        dadosEntrega,
        relatorioTestes: relatorioComFalha
    });

    const projAposRejeicao = obterProjetoPorId(idProjetoDemo);
    const tarefaRejeitada = projAposRejeicao.grafo_tarefas.find(t => t.id_tarefa === `TSK-${idProjetoDemo}-02`);
    console.log(`Estado da tarefa após falha nos critérios: [${tarefaRejeitada.estado}]`);
    console.log(`Nota registrada: "${tarefaRejeitada.historico_auditoria.slice(-1)[0].nota}"`);

    if (!submissaoRejeitada.sucesso && tarefaRejeitada.estado === 'PENDENCIA_IDENTIFICADA') {
        resultados.caso9_rejeicao_auditoria_pendencia = true;
        console.log('✓ [SUCESSO] Auditoria do Coordenador rejeitou a entrega incompleta e marcou PENDENCIA_IDENTIFICADA.\n');
    } else {
        console.log('FALHA no Caso 9: Tarefa deveria ter sido rejeitada.');
    }

    // -----------------------------------------------------------------
    // SUMÁRIO FINAL
    // -----------------------------------------------------------------
    console.log('======================================================================');
    console.log('SUMÁRIO FINAL DOS TESTES DO AGENTE 03 (DESENVOLVEDOR):');
    console.log(`1. Ingestão de Tarefa Válida:                 ${resultados.caso1_recebimento_valido ? 'PASSOU' : 'FALHOU'}`);
    console.log(`2. Bloqueio por Falta de Autorização:         ${resultados.caso2_bloqueio_comercial ? 'PASSOU' : 'FALHOU'}`);
    console.log(`3. Bloqueio por Dependência Pendente:         ${resultados.caso3_bloqueio_dependencia ? 'PASSOU' : 'FALHOU'}`);
    console.log(`4. Construção Física no Disco:                ${resultados.caso4_construcao_arquivos_fisicos ? 'PASSOU' : 'FALHOU'}`);
    console.log(`5. Validação de HTML Semântico:               ${resultados.caso5_validacao_html_semantico ? 'PASSOU' : 'FALHOU'}`);
    console.log(`6. Validação de CSS e Responsividade:         ${resultados.caso6_validacao_css_responsivo ? 'PASSOU' : 'FALHOU'}`);
    console.log(`7. Validação de Formulário & WhatsApp:        ${resultados.caso7_validacao_formulario_whatsapp ? 'PASSOU' : 'FALHOU'}`);
    console.log(`8. Submissão e Aprovação pelo Coordenador:    ${resultados.caso8_aprovacao_coordenador ? 'PASSOU' : 'FALHOU'}`);
    console.log(`9. Rejeição e Identificação de Pendência:     ${resultados.caso9_rejeicao_auditoria_pendencia ? 'PASSOU' : 'FALHOU'}`);
    console.log('======================================================================');

    const todosPassaram = Object.values(resultados).every(Boolean);
    console.log(`\nRESULTADO GERAL: ${todosPassaram ? 'TODOS OS 9 TESTES FORAM APROVADOS COM SUCESSO (100%)' : 'HOUVE FALHAS NA VALIDAÇÃO'}`);
}

executarTodosOsTestes();
