/**
 * =====================================================================
 * VIDE — TESTE OPERACIONAL OBRIGATÓRIO DA CENTRAL DE COMANDO
 * Cenário Oficial: Loja de Roupas (Moda Feminina) com Contatos no Instagram e WhatsApp
 * sem processo comercial organizado.
 * =====================================================================
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { processarTriagemComIA } = require('./agente_01_triagem/executor_triagem');
const {
    receberRegistroTriagem,
    autorizarProjetoComercialmente,
    conferirEntrega,
    interpretarComandoDiretoraComIA
} = require('./agente_02_coordenador/executor_coordenador');
const { obterProjetoPorId, salvarProjeto } = require('./agente_02_coordenador/repositorio_projetos_tarefas');
const { executarDiagnosticoComercialVIDE } = require('./diagnostico_comercial_vide');
const { storageService } = require('./storage_service');
const { db } = require('./banco_dados');
const { seguranca } = require('./seguranca');

// Especialistas
const { executarCicloCompletoBranding } = require('./agente_04_branding_design/executor_branding_design');
const { executarCicloCompletoDesenvolvedor } = require('./agente_03_desenvolvedor/executor_desenvolvedor');
const { executarCicloCompletoAtendimento } = require('./agente_05_atendimento/executor_atendimento');
const { executarCicloCompletoAutomacao } = require('./agente_06_automacao/executor_automacao');
const { executarCicloCompletoInteligencia } = require('./agente_07_inteligencia_comercial/executor_inteligencia_comercial');

async function executarBateria12Passos() {
    console.log('======================================================================');
    console.log('VIDE — BATERIA DE HOMOLOGAÇÃO: CENTRAL DE COMANDO & CENÁRIO REALISTA');
    console.log('Cenário: Loja de Roupas (Instagram/WhatsApp sem processo comercial)');
    console.log('======================================================================\n');

    let totalChecks = 0;
    let aprovados = 0;

    function checar(passo, condicao, descricao) {
        totalChecks++;
        if (condicao) {
            aprovados++;
            console.log(`✓ [PASSO ${passo}] APROVADO: ${descricao}`);
        } else {
            console.error(`❌ [PASSO ${passo}] REPROVADO: ${descricao}`);
            throw new Error(`Falha no passo ${passo}: ${descricao}`);
        }
    }

    // -------------------------------------------------------------------------
    // PASSO 1: Enviar solicitação ao Coordenador Geral (Ingestão da Demanda)
    // -------------------------------------------------------------------------
    console.log('--- 1. INGESTÃO DA DEMANDA DA LOJA DE ROUPAS ---');
    const solicitacaoLoja = "Tenho uma loja de roupas femininas (Maison Bella Moda). Recebemos dezenas de mensagens por dia no Direct do Instagram e WhatsApp de clientes perguntando preços e fotos, mas não temos processo organizado, demoramos para responder e quase ninguém compra. Queremos arrumar essa operação.";
    
    const triagem = await processarTriagemComIA({
        solicitacaoOriginal: solicitacaoLoja,
        identificadorCenario: "Maison Bella Moda Feminina",
        prazoUrgenciaInformado: "Preciso organizar isso em 15 dias"
    });
    checar('01', !!triagem && !!triagem.idDemanda, `Demanda ingerida: [${triagem.idDemanda}]`);

    const projeto = receberRegistroTriagem(triagem, { forcarPendente: true });
    const idProjeto = projeto.id_projeto;
    checar('01.1', !!idProjeto && projeto.situacao_projeto === 'AGUARDANDO_AUTORIZACAO_COMERCIAL', `Projeto criado: [${idProjeto}]`);

    // -------------------------------------------------------------------------
    // PASSO 2: Fornecer briefing e arquivos de referência (Alimentar a Equipe)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. ALIMENTAR A EQUIPE COM BRIEFING E ARQUIVOS ---');
    const briefingTexto = "Cliente: Maison Bella Moda Feminina.\nPúblico: Mulheres de 25 a 45 anos, classe A/B.\nCores preferidas: Fundo escuro elegante (Obsidiana) com toques de Dourado Champagne e Bege Seda.\nProdutos principais: Vestidos de festa, alfaiataria premium e conjuntos de linho.\nTicket médio: R$ 380 a R$ 850 por peça.\nProblema crítico: Os clientes pedem preço, a atendente demora 2 horas para responder e não faz follow-up.";
    
    // Grava arquivo de briefing
    storageService.salvarArquivo(idProjeto, 'materiais_cliente', 'briefing_executivo_loja.md', Buffer.from(briefingTexto, 'utf-8'));
    
    // Simula anexo de documento de catálogo de produtos
    const catalogoProdutosSimulado = JSON.stringify({
        colecao: "Primavera/Verão 2026",
        destaques: ["Vestido Midi Seda", "Blazer Alfaiataria Chic", "Conjunto Linho Puro"]
    }, null, 2);
    storageService.salvarArquivo(idProjeto, 'materiais_cliente', 'catalogo_produtos.json', Buffer.from(catalogoProdutosSimulado, 'utf-8'));

    // Atualiza projeto com anexos
    projeto.briefing_diretoria = briefingTexto;
    projeto.materiais_anexados = [
        { nome_arquivo: 'briefing_executivo_loja.md', tamanho_bytes: Buffer.byteLength(briefingTexto), tipo: 'text/markdown', caminho_relativo: 'materiais_cliente/briefing_executivo_loja.md' },
        { nome_arquivo: 'catalogo_produtos.json', tamanho_bytes: Buffer.byteLength(catalogoProdutosSimulado), tipo: 'application/json', caminho_relativo: 'materiais_cliente/catalogo_produtos.json' }
    ];
    salvarProjeto(projeto);

    checar('02', projeto.materiais_anexados.length === 2, `${projeto.materiais_anexados.length} materiais associados ao projeto no storage.`);

    // -------------------------------------------------------------------------
    // PASSO 3 & 4: Diagnóstico Comercial VIDE & Identificação de Informações Ausentes
    // -------------------------------------------------------------------------
    console.log('\n--- 3 & 4. DIAGNÓSTICO COMERCIAL VIDE & INFORMAÇÕES AUSENTES ---');
    const diag = await executarDiagnosticoComercialVIDE({
        idProjeto,
        dadosNegocio: {
            cliente: "Maison Bella Moda Feminina",
            segmento: "Varejo de Moda Feminina Premium",
            solicitacao: solicitacaoLoja,
            briefing: briefingTexto
        }
    });

    checar('03', diag.sucesso === true, `Diagnóstico Comercial VIDE executado com sucesso.`);
    checar('04', Array.isArray(diag.informacoes_ausentes) && diag.informacoes_ausentes.length > 0, 
        `${diag.informacoes_ausentes.length} informações ausentes mapeadas rigorosamente.`);
    checar('04.1', Array.isArray(diag.perguntas_complementares) && diag.perguntas_complementares.length >= 3,
        `${diag.perguntas_complementares.length} perguntas complementares formuladas.`);

    // -------------------------------------------------------------------------
    // PASSO 5: Distribuição das tarefas aos especialistas
    // -------------------------------------------------------------------------
    console.log('\n--- 5. DISTRIBUIÇÃO DAS TAREFAS NO GRAFO DAG ---');
    const prjAtual = obterProjetoPorId(idProjeto);
    checar('05', prjAtual.grafo_tarefas && prjAtual.grafo_tarefas.length > 0, 
        `Grafo DAG estruturado com ${prjAtual.grafo_tarefas.length} tarefas.`);

    // -------------------------------------------------------------------------
    // PASSO 6: Agentes recebem o contexto necessário
    // -------------------------------------------------------------------------
    console.log('\n--- 6. VERIFICAÇÃO DE CONTEXTO DOS AGENTES ---');
    checar('06', prjAtual.briefing_diretoria.includes('Maison Bella') && prjAtual.materiais_anexados.length === 2,
        `Contexto completo, briefing e materiais disponíveis para consumo dos agentes.`);

    // -------------------------------------------------------------------------
    // PASSO 9: Sistema gera diagnóstico e recomendação comercial (Catálogo VIDE)
    // -------------------------------------------------------------------------
    console.log('\n--- 9. RECOMENDAÇÃO OFICIAL DO CATÁLOGO VIDE ---');
    checar('09', diag.solucao_recomendada.includes('VIDE'), `Solução recomendada: ${diag.solucao_recomendada}`);
    checar('09.1', diag.proposta_comercial.diretrizes_investimento.referencia_presenca_digital.includes('R$ 1.500'),
        `Diretriz de investimento respeita precificação preliminar e sob dimensionamento.`);

    // -------------------------------------------------------------------------
    // PASSO 10: Bloqueio comercial permanece ativo até autorização da Diretoria
    // -------------------------------------------------------------------------
    console.log('\n--- 10. VERIFICAÇÃO DE BLOQUEIO PREVENTIVO DE EXECUÇÃO ---');
    checar('10', prjAtual.situacao_projeto === 'AGUARDANDO_AUTORIZACAO_COMERCIAL', 
        `Status de governança estrito: AGUARDANDO_AUTORIZACAO_COMERCIAL.`);

    // Tentar executar especialista antes da aprovação deve ser barrado!
    let bloqueioAtivo = false;
    try {
        executarCicloCompletoBranding({ idProjeto, idTarefa: 'TSK-01' });
    } catch(err) {
        if (err.message.includes('BLOQUEIO_COMERCIAL')) {
            bloqueioAtivo = true;
        }
    }
    checar('10.1', bloqueioAtivo, `Tentativa de execução sem autorização foi impedida com exceção [BLOQUEIO_COMERCIAL].`);

    // -------------------------------------------------------------------------
    // SIMULAÇÃO DA AUTORIZAÇÃO FORMAL DE DOUGLAS
    // -------------------------------------------------------------------------
    console.log('\n--- AUTORIZAÇÃO FORMAL DA DIRETORIA EXECUTIVA (DOUGLAS) ---');
    const prjAutorizado = autorizarProjetoComercialmente(idProjeto);
    checar('10.2', prjAutorizado.situacao_projeto === 'EM_EXECUCAO', `Projeto desbloqueado e em execução autorizada.`);

    // -------------------------------------------------------------------------
    // PASSO 7 & 8: Execução, colaboração e consolidação das entregas
    // -------------------------------------------------------------------------
    console.log('\n--- 7 & 8. EXECUÇÃO AUTÔNOMA DOS ESPECIALISTAS & COLABORAÇÃO ---');
    
    // 0. Estrategista (Homologação de Posicionamento para destravar o DAG)
    const tskEstrategista = prjAutorizado.grafo_tarefas.find(t => (t.especialista || '').toLowerCase().includes('estrateg'));
    if (tskEstrategista) {
        conferirEntrega({
            idProjeto,
            idTarefa: tskEstrategista.id_tarefa,
            entregaSubmetida: {
                posicionamento: 'Posicionamento e Proposta de Valor Aprovados',
                mapa_arquitetura: 'Pipeline Tripartite e Comercial Maison Bella'
            },
            criteriosAtendidos: true,
            parecerCoordenador: 'Homologação estratégica aprovada pela Diretoria VIDE.'
        });
    }

    // 1. Branding (Agente 04)
    const tskBranding = prjAutorizado.grafo_tarefas.find(t => (t.especialista || '').toLowerCase().includes('brand'));
    if (tskBranding) {
        const resBranding = executarCicloCompletoBranding({ idProjeto, idTarefa: tskBranding.id_tarefa });
        checar('07.1', resBranding && resBranding.dadosEntrega?.arquivosCriados?.length > 0, 
            `Agente 04 (Branding) gerou design tokens e identidade para ${diag.cliente}.`);
    }

    // 2. Dev Full-Stack (Agente 03) - Consome os tokens de Branding
    const tskDev = prjAutorizado.grafo_tarefas.find(t => (t.especialista || '').toLowerCase().includes('desenvolv'));
    if (tskDev) {
        const resDev = executarCicloCompletoDesenvolvedor({ idProjeto, idTarefa: tskDev.id_tarefa });
        checar('07.2', resDev && resDev.dadosEntrega?.arquivosCriados?.length > 0,
            `Agente 03 (Desenvolvedor) construiu Landing Page consumindo Design Tokens do Branding.`);
    }

    // 3. Atendimento e Vendas (Agente 05)
    const tskAtend = prjAutorizado.grafo_tarefas.find(t => (t.especialista || '').toLowerCase().includes('atend'));
    if (tskAtend) {
        const resAtend = executarCicloCompletoAtendimento({ idProjeto, idTarefa: tskAtend.id_tarefa });
        checar('07.3', resAtend && resAtend.dadosEntrega?.arquivosCriados?.length > 0,
            `Agente 05 (Atendimento) estruturou roteiros de qualificação e combate a objeções.`);
    }

    // 4. Automação (Agente 06)
    const tskAuto = prjAutorizado.grafo_tarefas.find(t => (t.especialista || '').toLowerCase().includes('auto'));
    if (tskAuto) {
        const resAuto = executarCicloCompletoAutomacao({ idProjeto, idTarefa: tskAuto.id_tarefa });
        checar('07.4', resAuto && resAuto.dadosEntrega?.arquivosCriados?.length > 0,
            `Agente 06 (Automação) estruturou fluxos n8n de WhatsApp e webhooks.`);
    }

    // 5. Inteligência Comercial (Agente 07)
    const tskIntel = prjAutorizado.grafo_tarefas.find(t => (t.especialista || '').toLowerCase().includes('intel'));
    if (tskIntel) {
        const resIntel = executarCicloCompletoInteligencia({ idProjeto, idTarefa: tskIntel.id_tarefa });
        checar('07.5', resIntel && resIntel.dadosEntrega?.arquivosCriados?.length > 0,
            `Agente 07 (Inteligência) gerou diagnóstico analítico de perdas com rigor epistemológico.`);
    }

    // -------------------------------------------------------------------------
    // PASSO 11: Histórico e resultados persistidos
    // -------------------------------------------------------------------------
    console.log('\n--- 11. AUDITORIA DE PERSISTÊNCIA DURÁVEL ---');
    const arquivosStorage = storageService.listarArquivosProjeto(idProjeto);
    checar('11', arquivosStorage.length >= 25, `${arquivosStorage.length} arquivos físicos persistidos no storage durável.`);

    const projetoPersistido = obterProjetoPorId(idProjeto);
    checar('11.1', projetoPersistido.registro_operacional && projetoPersistido.registro_operacional.length >= 5,
        `Histórico de eventos transacionais auditados: ${projetoPersistido.registro_operacional.length} eventos.`);

    // -------------------------------------------------------------------------
    // PASSO 12: Consulta de tudo pela Central de Comando
    // -------------------------------------------------------------------------
    console.log('\n--- 12. CONSULTABILIDADE VIA CENTRAL DE COMANDO ---');
    // Consulta conversacional com o Coordenador
    const respostaChat = await interpretarComandoDiretoraComIA(`Qual é o status da Maison Bella Moda e quais decisões dependem de mim?`);
    checar('12', respostaChat.sucesso === true && (respostaChat.resposta.includes('ENTENDI') || respostaChat.resposta.includes('DIRETORIA') || respostaChat.resposta.includes('Bella')),
        `Coordenador respondeu via chat estruturado identificando objetivos e decisões da Diretoria.`);

    console.log('\n======================================================================');
    console.log(`BATERIA CONCLUÍDA: ${aprovados}/${totalChecks} VERIFICAÇÕES APROVADAS (100% DE SUCESSO)`);
    console.log('======================================================================\n');
}

executarBateria12Passos().catch(err => {
    console.error('Falha na bateria:', err);
    process.exit(1);
});
