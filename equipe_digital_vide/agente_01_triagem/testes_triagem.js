/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * Teste Oficial do Agente 01: Triagem VIDE (Revisão v1.1)
 * Executa as 3 solicitações de validação exigidas
 * Identificando explicitamente os cenários como simulações,
 * sem dados fictícios inventados como fatos.
 * =====================================================================
 */

const { processarTriagemRevisada, formatarEncaminhamentoCoordenadorRevisado } = require('./executor_triagem');

const CENARIOS_TESTE = [
    {
        numero: 1,
        identificadorCenario: "Cenário Simulado 1 (Cliente Não Declarado)",
        solicitacao: "Quero criar uma landing page para minha empresa.",
        prazoUrgencia: null // Não informado pelo cliente
    },
    {
        numero: 2,
        identificadorCenario: "Cenário Simulado 2 (Cliente Não Declarado)",
        solicitacao: "Recebo contatos pelo Instagram, mas não consigo converter em vendas.",
        prazoUrgencia: null // Não informado pelo cliente
    },
    {
        numero: 3,
        identificadorCenario: "Cenário Simulado 3 (Cliente Não Declarado)",
        solicitacao: "Preciso melhorar minha marca, criar um site e automatizar o atendimento.",
        prazoUrgencia: null // Não informado pelo cliente
    }
];

console.log('======================================================================');
console.log('VIDE — REVALIDAÇÃO OPERACIONAL DO AGENTE 01 (TRIAGEM v1.1)');
console.log('Executando os 3 cenários de teste oficiais sob as regras revisadas...');
console.log('======================================================================\n');

CENARIOS_TESTE.forEach(cenario => {
    console.log(`----------------------------------------------------------------------`);
    console.log(`>>> ${cenario.identificadorCenario.toUpperCase()}`);
    console.log(`Solicitação Recebida: "${cenario.solicitacao}"`);
    console.log(`Prazo/Urgência Declarado: ${cenario.prazoUrgencia || 'NÃO INFORMADO'}`);
    console.log(`----------------------------------------------------------------------\n`);

    const resultado = processarTriagemRevisada({
        solicitacaoOriginal: cenario.solicitacao,
        identificadorCenario: cenario.identificadorCenario,
        prazoUrgenciaInformado: cenario.prazoUrgencia
    });

    console.log('--- COMUNICAÇÃO IMEDIATA COM O CLIENTE ---');
    console.log(resultado.comunicacaoCliente);
    console.log('\n--- REGISTRO DE ENCAMINHAMENTO AO COORDENADOR GERAL (PADRÃO v1.1) ---');
    console.log(formatarEncaminhamentoCoordenadorRevisado(resultado));
    console.log('\n');
});

console.log('======================================================================');
console.log('REVALIDAÇÃO CONCLUÍDA COM SUCESSO: Todas as 3 solicitações reprocessadas.');
console.log('======================================================================');
