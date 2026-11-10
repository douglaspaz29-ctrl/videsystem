/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * PIPELINE DE INTEGRAÇÃO OPERACIONAL: TRIAGEM (01) ➔ COORDENADOR GERAL (02)
 * Conecta formalmente a saída da Triagem à gestão e persistência do Coordenador.
 * =====================================================================
 */

const { processarTriagemRevisada } = require('./agente_01_triagem/executor_triagem');
const { receberRegistroTriagem } = require('./agente_02_coordenador/executor_coordenador');
const { obterProjetoPorId, listarProjetos } = require('./agente_02_coordenador/repositorio_projetos_tarefas');

/**
 * Executa o fluxo ponta a ponta: Triagem -> Coordenador Geral
 * @param {Object} params
 * @param {string} params.solicitacaoOriginal
 * @param {string} [params.identificadorCenario]
 * @param {string} [params.prazoUrgenciaInformado]
 * @param {Object} [params.opcoes]
 * @returns {Object} Resultado integrado (Triagem + Projeto Persistido no Coordenador)
 */
function executarFluxoTriagemParaCoordenador({
    solicitacaoOriginal,
    identificadorCenario = 'Cenário Simulado (Não Declarado)',
    prazoUrgenciaInformado = null,
    opcoes = {}
}) {
    // 1. Executa Agente 01 — Triagem VIDE
    const registroTriagem = processarTriagemRevisada({
        solicitacaoOriginal,
        identificadorCenario,
        prazoUrgenciaInformado
    });

    // 2. Transfere formalmente para o Agente 02 — Coordenador Geral
    const projetoCriado = receberRegistroTriagem(registroTriagem, opcoes);

    return {
        etapa_01_triagem: registroTriagem,
        etapa_02_coordenador: projetoCriado
    };
}

module.exports = {
    executarFluxoTriagemParaCoordenador,
    obterProjetoPorId,
    listarProjetos
};
