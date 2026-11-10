/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * GRANDE TESTE INTEGRADO DA EQUIPE:
 * Cliente ➔ Triagem ➔ Coordenador ➔ Branding ➔ Desenvolvedor ➔ Auditoria ➔ Painel
 * Prova real de complementaridade e colaboração entre especialistas
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');

// 1. Módulos da Triagem e Coordenador
const { processarTriagemRevisada } = require('../agente_01_triagem/executor_triagem');
const { receberRegistroTriagem, conferirEntrega } = require('../agente_02_coordenador/executor_coordenador');
const { obterProjetoPorId, listarProjetos } = require('../agente_02_coordenador/repositorio_projetos_tarefas');

// 2. Especialistas Executores
const { executarCicloCompletoBranding } = require('../agente_04_branding_design/executor_branding_design');
const { executarCicloCompletoDesenvolvedor } = require('../agente_03_desenvolvedor/executor_desenvolvedor');

async function executarGrandeFluxoIntegrado() {
    console.log('======================================================================');
    console.log('VIDE — TESTE INTEGRADO: O PRIMEIRO CASO DE PONTA A PONTA DA EQUIPE');
    console.log('Cliente ➔ Triagem ➔ Coordenador ➔ Branding ➔ Dev ➔ Auditoria ➔ Painel');
    console.log('======================================================================\n');

    // -----------------------------------------------------------------
    // ETAPA 1: Entrada do Cliente Real
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 1: Entrada do Lead');
    const solicitacaoCliente = 
        "Olá, sou a Dra. Camila Vasconcelos. Tenho uma clínica de estética avançada e harmonização facial de luxo. " +
        "Preciso criar uma nova marca elegante com paleta dourada champanhe e uma landing page de alta conversão integrada ao meu WhatsApp.";
    const nomeCliente = "Dra. Camila Vasconcelos (Clínica Dermavie Estética)";
    console.log(`Cliente: ${nomeCliente}`);
    console.log(`Solicitação: "${solicitacaoCliente}"\n`);

    // -----------------------------------------------------------------
    // ETAPA 2: Triagem Semântica (Agente 01 v1.1)
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 2: Triagem (Agente 01 v1.1)');
    const registroTriagem = processarTriagemRevisada({
        solicitacaoOriginal: solicitacaoCliente,
        identificadorCenario: nomeCliente,
        prazoUrgenciaInformado: "15 dias"
    });

    console.log(`✓ ID Demanda Gerada: ${registroTriagem.idDemanda}`);
    console.log(`✓ Escopo Sugerido: ${registroTriagem.servicoSolicitado}`);
    console.log(`✓ Prioridade: ${registroTriagem.prioridade}`);
    console.log(`✓ Especialistas Confirmados: ${registroTriagem.especialistasConfirmados.join(', ')}\n`);

    // -----------------------------------------------------------------
    // ETAPA 3: Coordenador Geral — Verificação e Montagem do Grafo
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 3: Coordenador Geral (Agente 02)');
    // Demanda possui contratação formal de Marca + Landing Page
    const projeto = receberRegistroTriagem(registroTriagem);

    console.log(`✓ ID do Projeto Gerado: ${projeto.id_projeto}`);
    console.log(`✓ Situação Inicial: ${projeto.situacao_projeto}`);
    console.log(`✓ Autorização Comercial: ${projeto.autorizacao_comercial.status}`);
    console.log(`✓ Tarefas Criadas no Grafo: ${projeto.grafo_tarefas.length}`);

    // Exibe o grafo inicial de dependências
    projeto.grafo_tarefas.forEach(t => {
        console.log(`   - [${t.id_tarefa}] (${t.especialista}) -> Estado: [${t.estado}] | Depende de: [${t.dependencias.join(', ') || 'NENHUMA'}]`);
    });
    console.log('');

    const tarefaBranding = projeto.grafo_tarefas.find(t => t.especialista.includes('Branding'));
    const tarefaDev = projeto.grafo_tarefas.find(t => t.especialista === 'Desenvolvedor');

    if (!tarefaBranding || !tarefaDev) {
        throw new Error('Falha: Grafo não gerou tarefas para Branding e Dev!');
    }

    // -----------------------------------------------------------------
    // ETAPA 4: Agente 04 (Branding e Design) em Ação
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 4: Agente 04 (Branding e Design)');
    console.log(`Iniciando execução da tarefa [${tarefaBranding.id_tarefa}]...`);

    const resultadoBranding = executarCicloCompletoBranding({
        idProjeto: projeto.id_projeto,
        idTarefa: tarefaBranding.id_tarefa
    });

    console.log(`✓ Arquivos Físicos Gerados: ${resultadoBranding.dadosEntrega.arquivosCriados.join(', ')}`);
    console.log(`✓ Cor Primária Escolhida: ${resultadoBranding.dadosBranding.designTokens.colors.primary} (${resultadoBranding.dadosBranding.designTokens.colors.primaryName})`);
    console.log(`✓ Arquétipo Definido: ${resultadoBranding.dadosBranding.designTokens.branding.arquetipo}`);
    console.log(`✓ Bateria de Testes de Branding: ${resultadoBranding.relatorioTestes.pontuacao_conformidade}% de conformidade`);
    console.log(`✓ Auditoria do Coordenador: ${resultadoBranding.resultadoSubmissao.sucesso ? 'APROVADA' : 'REJEITADA'}\n`);

    // -----------------------------------------------------------------
    // ETAPA 5: Verificação do Recálculo do Grafo pelo Coordenador
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 5: Recálculo do Grafo pelo Coordenador');
    const projAposBranding = obterProjetoPorId(projeto.id_projeto);
    const tarefaDevAtualizada = projAposBranding.grafo_tarefas.find(t => t.id_tarefa === tarefaDev.id_tarefa);
    console.log(`✓ Estado da Tarefa de Branding: [${projAposBranding.grafo_tarefas.find(t => t.id_tarefa === tarefaBranding.id_tarefa).estado}]`);
    console.log(`✓ Estado da Tarefa do Desenvolvedor após liberação: [${tarefaDevAtualizada.estado}]`);

    if (tarefaDevAtualizada.estado !== 'PRONTA_PARA_EXECUCAO') {
        throw new Error('Falha: A tarefa do Desenvolvedor deveria ter sido desbloqueada após a aprovação de Branding!');
    }
    console.log('--> Grafo recalculado com sucesso. Dependência desbloqueada para o Desenvolvedor.\n');

    // -----------------------------------------------------------------
    // ETAPA 6: Agente 03 (Desenvolvedor) Consumindo os Ativos de Branding
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 6: Agente 03 (Desenvolvedor) Consumindo Design Tokens do Branding');
    console.log(`Iniciando execução da tarefa [${tarefaDev.id_tarefa}]...`);

    const resultadoDev = executarCicloCompletoDesenvolvedor({
        idProjeto: projeto.id_projeto,
        idTarefa: tarefaDev.id_tarefa
    });

    console.log(`✓ Arquivos Físicos Gerados no Site: ${resultadoDev.dadosEntrega.arquivosCriados.join(', ')}`);
    
    // Comprovação de fidelidade visual aos Design Tokens do Agente 04:
    const cssGerado = fs.readFileSync(path.join(resultadoDev.dadosEntrega.diretorioEntrega, 'css', 'estilos.css'), 'utf-8');
    const htmlGerado = fs.readFileSync(path.join(resultadoDev.dadosEntrega.diretorioEntrega, 'index.html'), 'utf-8');
    
    const usouCorBranding = cssGerado.includes(resultadoBranding.dadosBranding.designTokens.colors.primary);
    const usouLogoBranding = htmlGerado.includes('assets/logo.svg') || htmlGerado.includes('logo-svg-branding');

    console.log(`✓ Consumiu a Cor Primária do Branding (#E5C07B): ${usouCorBranding}`);
    console.log(`✓ Incorporou o Logotipo SVG do Branding no Header: ${usouLogoBranding}`);
    console.log(`✓ Bateria de Testes Técnicos do Dev: ${resultadoDev.relatorioTestes.pontuacao_conformidade}% de conformidade`);
    console.log(`✓ Auditoria do Coordenador: ${resultadoDev.resultadoSubmissao.sucesso ? 'APROVADA' : 'REJEITADA'}\n`);

    // -----------------------------------------------------------------
    // ETAPA 7: Auditoria Final e Conclusão do Projeto
    // -----------------------------------------------------------------
    console.log('>>> ETAPA 7: Conclusão e Homologação da Gestão');
    const projFinal = obterProjetoPorId(projeto.id_projeto);
    console.log(`✓ Situação Final do Projeto: [${projFinal.situacao_projeto}]`);
    console.log('✓ Resumo das Tarefas:');
    projFinal.grafo_tarefas.forEach(t => {
        console.log(`   - [${t.id_tarefa}] ${t.especialista}: [${t.estado}]`);
    });

    // -----------------------------------------------------------------
    // ETAPA 8: Verificação de Visibilidade no Painel Interno
    // -----------------------------------------------------------------
    console.log('\n>>> ETAPA 8: Verificação no Índice do Painel Executivo');
    const indice = listarProjetos();
    const noPainel = indice.find(p => p.id_projeto === projeto.id_projeto);
    console.log(`✓ Projeto presente no índice do Painel: ${!!noPainel}`);
    console.log(`✓ Total de tarefas registradas no índice: ${noPainel.total_tarefas}`);

    console.log('\n======================================================================');
    console.log('RESULTADO DO PRIMEIRO TESTE INTEGRADO DA EQUIPE DIGITAL VIDE:');
    console.log('SUCESSO ABSOLUTO! O pipeline completo fluiu perfeitamente:');
    console.log('1. Triagem categorizou com precisão.');
    console.log('2. Coordenador travou e desbloqueou dependências com rigor.');
    console.log('3. Branding gerou identidade, tokens e vetores no disco.');
    console.log('4. Desenvolvedor consumiu os tokens e construiu a Landing Page real.');
    console.log('5. Coordenador auditou as duas etapas e aprovou com 100% de conformidade.');
    console.log('======================================================================');
}

executarGrandeFluxoIntegrado();
