/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * Módulo de Conexão e Handshake Operacional:
 * Agente 01 (Triagem) ➔ Agente 02 (Coordenador Geral)
 * =====================================================================
 */

const { processarTriagemRevisada } = require('./agente_01_triagem/executor_triagem');
const { receberRegistroTriagem } = require('./agente_02_coordenador/executor_coordenador');

/**
 * Executa o fluxo ponta a ponta: Triagem Comercial ➔ Criação do Projeto no Coordenador
 * Suporta múltiplas assinaturas para robustez e compatibilidade total
 */
function executarFluxoTriagemParaCoordenador(params = {}) {
    const solicitacaoOriginal = params.solicitacaoOriginal || params.solicitacao || params.mensagem || '';
    const identificadorCenario = params.identificadorCenario || params.cliente || params.nome || 'Cenário Simulado (Não Declarado)';
    const prazoUrgenciaInformado = params.prazoUrgenciaInformado || params.prazo_declarado || params.prazo || null;
    const opcoes = params.opcoes || {};

    // 1. Executa Agente 01 — Triagem VIDE
    const registroTriagem = processarTriagemRevisada({
        solicitacaoOriginal,
        identificadorCenario,
        prazoUrgenciaInformado
    });

    const triagemNormalizada = {
        ...registroTriagem,
        id_demanda: registroTriagem.idDemanda,
        servico_solicitado: registroTriagem.servicoSolicitado || '',
        classificacao_demanda: (registroTriagem.servicoSolicitado && (registroTriagem.servicoSolicitado.includes('Tripartite') || registroTriagem.servicoSolicitado.includes('Marca') || registroTriagem.servicoSolicitado.includes('Branding') || registroTriagem.servicoSolicitado.includes('Landing'))) ? 'TRIPARTITE' : 'PADRAO'
    };

    // 2. Transfere formalmente para o Agente 02 — Coordenador Geral
    const projetoCriado = receberRegistroTriagem(registroTriagem, opcoes);

    return {
        sucesso: true,
        triagem: triagemNormalizada,
        projeto: projetoCriado,
        etapa_01_triagem: triagemNormalizada,
        etapa_02_coordenador: projetoCriado
    };
}

module.exports = {
    executarFluxoTriagemParaCoordenador,
    conectarTriagemAoCoordenador: executarFluxoTriagemParaCoordenador
};
