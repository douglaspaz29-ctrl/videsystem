/**
 * =====================================================================
 * VIDE — TESTES DE PERSISTÊNCIA DURÁVEL DE PONTA A PONTA
 * Validação de sobrevivência a restarts de containers efêmeros e redeploys
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const { db } = require('./banco_dados');
const { storageService } = require('./storage_service');
const { executarFluxoTriagemParaCoordenador } = require('./conexao_triagem_coordenador');
const { autorizarProjetoComercialmente, conferirEntrega } = require('./agente_02_coordenador/executor_coordenador');
const { obterProjetoPorId, listarProjetos } = require('./agente_02_coordenador/repositorio_projetos_tarefas');

async function executarCicloPersistencia() {
    console.log('======================================================================');
    console.log('VIDE — AUDITORIA DE PERSISTÊNCIA DURÁVEL & REIDRATAÇÃO PÓS-DEPLOY');
    console.log('======================================================================\n');

    let total = 0;
    let aprovados = 0;

    function assert(nome, cond, detalhe = '') {
        total++;
        if (cond) {
            aprovados++;
            console.log(`✓ [APROVADO] ${nome}`);
            if (detalhe) console.log(`   └─ ${detalhe}`);
        } else {
            console.error(`❌ [REPROVADO] ${nome}: ${detalhe}`);
        }
    }

    // 1. Diagnóstico do Storage
    const diag = storageService.obterDiagnostico();
    assert('1.1 Diagnóstico de Storage Reporta Configuração Persistente', 
        diag.volume_persistente_configurado === true, 
        `Tipo: ${diag.tipo_storage} | Persistente: ${diag.volume_persistente_configurado}`);

    // 2. Criação de Projeto via Triagem
    const resTriagem = executarFluxoTriagemParaCoordenador({
        solicitacaoOriginal: 'Quero reformulação completa da minha marca médica e landing page institucional.',
        identificadorCenario: 'Dr. Persistência Teste — Hospital Alpha',
        prazoUrgenciaInformado: '20 dias'
    });
    const idProjeto = resTriagem.projeto.id_projeto;
    assert('2.1 Criação de Projeto via Triagem & Coordenador', !!idProjeto, `ID Projeto: ${idProjeto}`);

    // 3. Autorização do Coordenador Geral
    const resAuth = autorizarProjetoComercialmente(idProjeto, 'Escopo Tripartite Homologado');
    assert('3.1 Registro de Autorização do Coordenador', 
        resAuth.autorizacao_comercial.status === 'AUTORIZADO', 
        `Status: ${resAuth.autorizacao_comercial.status}`);

    // 4. Geração e Salvamento de Arquivo pelo Especialista no Storage Durável
    const conteudoTokens = JSON.stringify({
        primary_color: '#050505',
        accent_color: '#00E5FF',
        typography: 'Cabinet Grotesk, sans-serif',
        gerado_em: new Date().toISOString()
    }, null, 2);

    const caminhoGravado = storageService.salvarArquivo(idProjeto, 'branding', 'design_tokens.json', conteudoTokens);
    assert('4.1 Salvamento de Entregável Físico via Storage Service', 
        fs.existsSync(caminhoGravado), 
        `Caminho: ${caminhoGravado}`);

    // 5. Homologação da Entrega pelo Coordenador Geral
    const tarefaBranding = resAuth.grafo_tarefas.find(t => t.especialista.toLowerCase().includes('brand'));
    if (tarefaBranding) {
        const resAuditoria = conferirEntrega({
            idProjeto,
            idTarefa: tarefaBranding.id_tarefa,
            entregaSubmetida: { arquivos: ['design_tokens.json'] },
            criteriosAtendidos: true,
            parecerCoordenador: 'Design tokens aprovados com rigor técnico.'
        });
        assert('5.1 Homologação de Entrega no Grafo pelo Coordenador', 
            resAuditoria.situacao_projeto !== 'REJEITADO', 
            `Situação: ${resAuditoria.situacao_projeto}`);
    }

    // 6. Simulação de Reinicialização de Container Efêmero (Wipe de Cache em Disco)
    console.log('\n--- SIMULAÇÃO DE PERDA DE CACHE EM DISCO (CONTAINER EFÊMERO) ---');
    if (fs.existsSync(caminhoGravado)) {
        fs.unlinkSync(caminhoGravado);
    }
    assert('6.1 Cache Local em Disco Deletado Intencionalmente', !fs.existsSync(caminhoGravado));

    // 7. Recuperação e Reidratação Automática
    const conteudoRecuperado = await storageService.obterConteudoArquivo(idProjeto, 'branding', 'design_tokens.json');
    assert('7.1 Recuperação / Fallback do Arquivo no Storage Durável', 
        conteudoRecuperado !== null && conteudoRecuperado.includes('accent_color'), 
        `Conteúdo reidratado com sucesso (${conteudoRecuperado ? conteudoRecuperado.length : 0} bytes)`);

    // 8. Consulta de Integridade de Dados Pós-Gravação
    const projConsultado = obterProjetoPorId(idProjeto);
    assert('8.1 Consulta de Projeto Pós-Gravação com Integridade Total', 
        projConsultado !== null && projConsultado.id_projeto === idProjeto && projConsultado.autorizacao_comercial.status === 'AUTORIZADO', 
        `Projeto ${idProjeto} íntegro com ${projConsultado ? projConsultado.grafo_tarefas.length : 0} tarefas no grafo`);

    console.log('\n======================================================================');
    console.log(`SUMÁRIO DA PERSISTÊNCIA DURÁVEL: Total: ${total} | Aprovados: ${aprovados} | Taxa: ${Math.round((aprovados/total)*100)}%`);
    console.log('======================================================================\n');

    if (aprovados !== total) process.exit(1);
    console.log('PARECER FINAL: PERSISTÊNCIA DURÁVEL VALIDADA COM SUCESSO!\n');
}

if (require.main === module) {
    executarCicloPersistencia().catch(err => {
        console.error('Erro na execução do ciclo de persistência:', err);
        process.exit(1);
    });
}

module.exports = { executarCicloPersistencia };
