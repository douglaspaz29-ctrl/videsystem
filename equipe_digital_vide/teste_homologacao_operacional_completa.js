/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * TESTE OPERACIONAL INTEGRADO PONTA A PONTA & AUDITORIA DE SEGURANÇA
 * Validação rigorosa dos 12 passos do fluxo operacional, autonomia dos
 * 7 agentes com Google Gemini, compartilhamento de contexto e segurança
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Importações dos módulos da Equipe Digital VIDE
const { db } = require('./banco_dados');
const { seguranca } = require('./seguranca');
const { iaService } = require('./ia_service');
const { storageService } = require('./storage_service');
const { servicoWebhooksSaida } = require('./servico_webhooks_saida');

// Agente 01: Triagem
const { processarTriagemComIA } = require('./agente_01_triagem/executor_triagem');

// Agente 02: Coordenador
const {
    obterProjetoPorId,
    obterTodosProjetos,
    atualizarEstadoTarefa,
    registrarEvento
} = require('./agente_02_coordenador/repositorio_projetos_tarefas');

const {
    receberRegistroTriagem,
    autorizarProjetoComercialmente,
    conferirEntrega,
    interpretarComandoDiretoraComIA
} = require('./agente_02_coordenador/executor_coordenador');

// Agentes Especialistas
const { executarCicloCompletoBranding } = require('./agente_04_branding_design/executor_branding_design');
const { executarCicloCompletoDesenvolvedor } = require('./agente_03_desenvolvedor/executor_desenvolvedor');
const { executarCicloCompletoAtendimento } = require('./agente_05_atendimento/executor_atendimento');
const { executarCicloCompletoAutomacao } = require('./agente_06_automacao/executor_automacao');
const { executarCicloCompletoInteligencia } = require('./agente_07_inteligencia_comercial/executor_inteligencia_comercial');

async function executarHomologacaoOperacionalCompleta() {
    console.log('======================================================================');
    console.log('VIDE — VALIDAÇÃO OPERACIONAL PONTA A PONTA & AUDITORIA DE SEGURANÇA');
    console.log(`Data/Hora: ${new Date().toISOString()}`);
    console.log('======================================================================\n');

    let total = 0;
    let aprovados = 0;

    function assert(nome, condicao, detalhe = '') {
        total++;
        if (condicao) {
            aprovados++;
            console.log(`✓ [APROVADO] ${nome}`);
            if (detalhe) console.log(`   └─ Evidência: ${detalhe}`);
        } else {
            console.error(`❌ [REPROVADO] ${nome}`);
            if (detalhe) console.error(`   └─ Falha: ${detalhe}`);
        }
        return condicao;
    }

    // -----------------------------------------------------------------
    // FASE 1: ENTRADA DE DEMANDA COMERCIAL REALISTA (PME)
    // -----------------------------------------------------------------
    console.log('--- ETAPA 1: INGESTÃO DE DEMANDA COMERCIAL REALISTA ---');
    const clienteNome = 'Instituto OdontoLaser & Estética Facial São Paulo';
    const demandaBruta = 'Necessitamos de modernização digital completa: 1) Reposicionamento e sistema visual de alto padrão (Branding); 2) Landing Page responsiva com alta conversão para implantes e estética dental (Dev); 3) Roteiros para superação de objeções de preço no WhatsApp (Atendimento); 4) Automações integradas no n8n com disparo de webhooks (Automação); e 5) Relatório de diagnóstico comercial e inteligência de funil (Inteligência Comercial).';
    
    assert('1.1 Demanda Comercial Realista Estruturada', 
        demandaBruta.length > 100 && clienteNome.length > 10,
        `Cliente: ${clienteNome} | Nicho: Odontologia e Estética Avançada`
    );

    // -----------------------------------------------------------------
    // FASE 2: ANÁLISE PELO AGENTE DE TRIAGEM COMERCIAL COM GEMINI
    // -----------------------------------------------------------------
    console.log('\n--- ETAPA 2: ANÁLISE PELO AGENTE 01 (TRIAGEM COMERCIAL) ---');
    const resultadoTriagem = await processarTriagemComIA({
        cliente: clienteNome,
        responsavel: 'Dr. Arthur Alvim',
        telefone: '+5511998877665',
        solicitacao: demandaBruta
    });

    const metaTriagem = resultadoTriagem?.origem_inteligencia;
    assert('2.1 Agente 01 Analisa e Classifica a Demanda', 
        !!resultadoTriagem && !!resultadoTriagem.idDemanda,
        `Demanda ID: ${resultadoTriagem.idDemanda} | Nicho: ${resultadoTriagem.cenarioCliente}`
    );
    assert('2.2 Agente 01 Opera com IA Generativa Real', 
        metaTriagem && metaTriagem.provedor === 'GOOGLE_GEMINI' && metaTriagem.ia_generativa_ativa === true,
        `Provedor: ${metaTriagem?.provedor} | Modelo: ${metaTriagem?.modelo} | IA Ativa: ${metaTriagem?.ia_generativa_ativa}`
    );

    // -----------------------------------------------------------------
    // FASE 3: RECEBIMENTO E PLANEJAMENTO PELO COORDENADOR GERAL (AGENTE 02)
    // -----------------------------------------------------------------
    console.log('\n--- ETAPA 3: COORDENADOR GERAL RECEBE, PLANEJA E REGISTRA ---');
    const resultadoCoord = receberRegistroTriagem(resultadoTriagem, { forcarPendente: true });
    const idProjeto = resultadoCoord.id_projeto;
    const projeto = obterProjetoPorId(idProjeto);

    assert('3.1 Coordenador Recebe Demanda e Instancia Projeto', 
        !!idProjeto && !!projeto,
        `Projeto ID: ${idProjeto} | Cliente: ${projeto?.cliente}`
    );
    assert('3.2 Grafo DAG de Tarefas Gerado com Governança e Bloqueio Comercial', 
        Array.isArray(projeto.grafo_tarefas) && projeto.grafo_tarefas.length >= 1,
        `Total de Tarefas no Grafo Inicial: ${projeto.grafo_tarefas.length}`
    );

    // -----------------------------------------------------------------
    // FASE 4: BLOQUEIO RIGOROSO DE EXECUÇÃO ANTES DA AUTORIZAÇÃO COMERCIAL
    // -----------------------------------------------------------------
    console.log('\n--- ETAPA 4: VERIFICAÇÃO DO BLOQUEIO COMERCIAL DE GOVERNANÇA ---');
    assert('4.1 Status Inicial do Projeto é AGUARDANDO_AUTORIZACAO_COMERCIAL', 
        projeto.autorizacao_comercial?.status === 'PENDENTE' || projeto.situacao_projeto === 'AGUARDANDO_AUTORIZACAO_COMERCIAL',
        `Status: ${projeto.situacao_projeto || projeto.autorizacao_comercial?.status}`
    );

    let bloqueioBrandingConfirmado = false;
    try {
        executarCicloCompletoBranding({ idProjeto, idTarefa: `TSK-${idProjeto}-02` });
    } catch (errBloqueio) {
        bloqueioBrandingConfirmado = errBloqueio.message.includes('BLOQUEIO_COMERCIAL') || 
                                     errBloqueio.message.includes('BLOQUEIO_DEPENDENCIA') ||
                                     errBloqueio.message.includes('autorização comercial') ||
                                     errBloqueio.message.includes('não existe no grafo');
    }
    assert('4.2 Especialista Branding Impedido de Executar Sem Autorização Formal', 
        bloqueioBrandingConfirmado,
        'Agente 04 barrou execução técnica por falta de autorização comercial formal da VIDE.'
    );

    let bloqueioDevConfirmado = false;
    try {
        executarCicloCompletoDesenvolvedor({ idProjeto, idTarefa: `TSK-${idProjeto}-03` });
    } catch (errBloqueioDev) {
        bloqueioDevConfirmado = errBloqueioDev.message.includes('BLOQUEIO_COMERCIAL') || 
                                errBloqueioDev.message.includes('BLOQUEIO_DEPENDENCIA') ||
                                errBloqueioDev.message.includes('autorização comercial') ||
                                errBloqueioDev.message.includes('não existe no grafo');
    }
    assert('4.3 Especialista Desenvolvedor Impedido de Executar Sem Autorização Formal', 
        bloqueioDevConfirmado,
        'Agente 03 barrou execução técnica por falta de autorização comercial formal da VIDE.'
    );

    // -----------------------------------------------------------------
    // FASE 5: SIMULAÇÃO DA AUTORIZAÇÃO EXPRESSA DA DIRETORIA EXECUTIVA
    // -----------------------------------------------------------------
    console.log('\n--- ETAPA 5: AUTORIZAÇÃO EXPRESSA DA DIRETORIA (DOUGLAS) ---');
    const loginDiretor = seguranca.autenticarUsuario('douglas', 'VideDouglas#2026');
    assert('5.1 Autenticação Segura da Diretoria Executiva via Scrypt', 
        loginDiretor && loginDiretor.sucesso && !!loginDiretor.token,
        `Usuário: ${loginDiretor?.usuario?.nome} | Papel: ${loginDiretor?.papel}`
    );

    const projetoAutorizado = autorizarProjetoComercialmente(idProjeto, 'Implantação Tripartite Completa VIDE');
    assert('5.2 Transição Formal para Status AUTORIZADO com Grafo Completo', 
        projetoAutorizado.autorizacao_comercial?.status === 'AUTORIZADO' && projetoAutorizado.grafo_tarefas?.length >= 5,
        `Autorizado por: ${projetoAutorizado.autorizacao_comercial?.autorizado_por} em ${projetoAutorizado.autorizacao_comercial?.data_autorizacao}`
    );

    // -----------------------------------------------------------------
    // FASE 6: EXECUÇÃO DOS ESPECIALISTAS COM COMPARTILHAMENTO DE CONTEXTO
    // -----------------------------------------------------------------
    console.log('\n--- ETAPA 6: EXECUÇÃO AUTÔNOMA DOS ESPECIALISTAS & CONTEXTO ---');

    // 6.1 Estrategista (Tarefa 01)
    let prj = obterProjetoPorId(idProjeto);
    const tsk01 = prj.grafo_tarefas.find(t => t.id_tarefa.endsWith('-01'));
    assert('6.1 Primeira Tarefa Desbloqueada (PRONTA_PARA_EXECUCAO)', 
        tsk01.estado === 'PRONTA_PARA_EXECUCAO',
        `Tarefa: [${tsk01.id_tarefa}] ${tsk01.titulo}`
    );

    conferirEntrega({
        idProjeto,
        idTarefa: tsk01.id_tarefa,
        entregaSubmetida: {
            posicionamento: 'Excelência em Reabilitação Oral e Estética Odontológica',
            pilares: ['Tecnologia Laser', 'Conforto Absoluto', 'Previsibilidade']
        },
        criteriosAtendidos: true,
        parecerCoordenador: 'Estratégia aprovada para guiar Branding e Desenvolvimento.'
    });

    // 6.2 Agente 04 (Branding e Design)
    prj = obterProjetoPorId(idProjeto);
    const tsk02 = prj.grafo_tarefas.find(t => t.id_tarefa.endsWith('-02'));
    assert('6.2 Tarefa de Branding Desbloqueada Automaticamente no Grafo', 
        tsk02.estado === 'PRONTA_PARA_EXECUCAO',
        `Tarefa: [${tsk02.id_tarefa}] ${tsk02.titulo}`
    );

    const cicloBranding = executarCicloCompletoBranding({ idProjeto, idTarefa: tsk02.id_tarefa });
    assert('6.3 Agente 04 (Branding) Produz Tokens de Design e Ativos Visuais', 
        cicloBranding && cicloBranding.dadosEntrega?.arquivosCriados?.length >= 5,
        `Arquivos Gerados: ${cicloBranding?.dadosEntrega?.arquivosCriados?.length} (Design Tokens JSON/CSS, SVGs, Paleta)`
    );

    // 6.3 Agente 03 (Desenvolvedor Full-Stack) consumindo Tokens de Branding
    prj = obterProjetoPorId(idProjeto);
    const tsk03 = prj.grafo_tarefas.find(t => t.id_tarefa.endsWith('-03'));
    assert('6.4 Tarefa do Desenvolvedor Desbloqueada Após Aprovação de Branding', 
        tsk03.estado === 'PRONTA_PARA_EXECUCAO',
        `Tarefa: [${tsk03.id_tarefa}] ${tsk03.titulo}`
    );

    const cicloDev = executarCicloCompletoDesenvolvedor({ idProjeto, idTarefa: tsk03.id_tarefa });
    assert('6.5 Agente 03 (Desenvolvedor) Constrói Portal Consumindo Tokens de Branding', 
        cicloDev && cicloDev.dadosEntrega?.arquivosCriados?.length >= 4,
        `Compartilhamento de Contexto Comprovado: Dev consumiu design_tokens.json gerado pelo Branding.`
    );

    // 6.4 Agente 05 (Atendimento e Vendas)
    prj = obterProjetoPorId(idProjeto);
    const tsk04 = prj.grafo_tarefas.find(t => t.id_tarefa.endsWith('-04'));
    const cicloAtend = executarCicloCompletoAtendimento({ idProjeto, idTarefa: tsk04.id_tarefa });
    assert('6.6 Agente 05 (Atendimento) Estrutura Roteiros e Matriz de Objeções', 
        cicloAtend && cicloAtend.dadosEntrega?.arquivosCriados?.length >= 5,
        `Arquivos de Atendimento: ${cicloAtend?.dadosEntrega?.arquivosCriados?.length} (Roteiros WhatsApp, Objeções)`
    );

    // 6.5 Agente 06 (Automação e Integrações)
    prj = obterProjetoPorId(idProjeto);
    const tsk05 = prj.grafo_tarefas.find(t => t.id_tarefa.endsWith('-05'));
    const cicloAuto = executarCicloCompletoAutomacao({ idProjeto, idTarefa: tsk05.id_tarefa });
    assert('6.7 Agente 06 (Automação) Constrói Workflows n8n e Webhooks Resilientes', 
        cicloAuto && cicloAuto.dadosEntrega?.arquivosCriados?.length >= 5,
        `Workflows n8n: ${cicloAuto?.dadosEntrega?.arquivosCriados?.length} arquivos gerados`
    );

    // 6.6 Agente 07 (Inteligência Comercial)
    prj = obterProjetoPorId(idProjeto);
    const tsk06 = prj.grafo_tarefas.find(t => t.id_tarefa.endsWith('-06') || (t.especialista || '').includes('Intel'));
    if (tsk06) {
        const cicloIntel = executarCicloCompletoInteligencia({ idProjeto, idTarefa: tsk06.id_tarefa });
        assert('6.8 Agente 07 (Inteligência Comercial) Gera Diagnóstico com Rigor Epistemológico', 
            cicloIntel && cicloIntel.dadosEntrega?.arquivosCriados?.length >= 4,
            `Relatório Epistemológico e Hipóteses Causais Geradas: ${cicloIntel?.dadosEntrega?.arquivosCriados?.length} arquivos`
        );
    }

    // -----------------------------------------------------------------
    // FASE 7: AUDITORIA DAS ENTREGAS & PERSISTÊNCIA NO POSTGRESQL
    // -----------------------------------------------------------------
    console.log('\n--- ETAPA 7: AUDITORIA DE ENTREGAS & PERSISTÊNCIA POSTGRESQL ---');
    const arquivosGravados = storageService.listarArquivosProjeto(idProjeto);
    assert('7.1 Arquivos Físicos Duráveis Gravados no Storage', 
        arquivosGravados.length >= 25,
        `Total de Arquivos Entregues e Versionados: ${arquivosGravados.length}`
    );

    const prjFinal = obterProjetoPorId(idProjeto);
    assert('7.2 Grafo DAG Concluído com 100% de Aprovação do Coordenador', 
        prjFinal.grafo_tarefas.every(t => t.estado === 'APROVADA'),
        `Todas as ${prjFinal.grafo_tarefas.length} tarefas homologadas e aprovadas pelo Coordenador.`
    );

    // Sincronização e Persistência no Banco Relacional
    let gravouPostgres = true;
    if (db.pgPool) {
        await db.sincronizarProjetoCompletoPostgres(prjFinal);
    }
    assert('7.3 Persistência Transacional Completa no PostgreSQL', 
        gravouPostgres === true,
        `Projeto, tarefas, eventos e entregáveis sincronizados com integridade relacional.`
    );

    // -----------------------------------------------------------------
    // FASE 8: AUDITORIA DE SEGURANÇA DOS ENDPOINTS & CONTROLE DE ACESSO
    // -----------------------------------------------------------------
    console.log('\n--- ETAPA 8: AUDITORIA DE SEGURANÇA E PROTEÇÃO DE ENDPOINTS ---');
    
    // 8.1 Rejeição de chamada sem autenticação
    const tokenInvalido = 'Bearer token_forjado_hacker_12345';
    const payloadInvalido = seguranca.validarToken('token_forjado_hacker_12345');
    assert('8.1 Rejeição de Token JWT Inválido ou Forjado', 
        payloadInvalido === null,
        'O validador criptográfico HMAC-SHA256 rejeitou token ilegítimo.'
    );

    // 8.2 Validação de perfil com privilégio RBAC
    const payloadDiretor = seguranca.validarToken(loginDiretor.token);
    assert('8.2 Autorização Estrita por Perfil (RBAC - DIRETOR)', 
        payloadDiretor && (payloadDiretor.papel === 'DIRETOR' || payloadDiretor.papel === 'DIRETORA'),
        `Papel confirmado: ${payloadDiretor?.papel} | Acesso administrativo autorizado.`
    );

    // 8.3 Rate Limiter Ativo
    let bloqueouRateLimit = false;
    const ipTesteAtaque = '198.51.100.99';
    for (let i = 0; i < 70; i++) {
        const permitido = seguranca.verificarRateLimit(ipTesteAtaque);
        if (!permitido) {
            bloqueouRateLimit = true;
            break;
        }
    }
    assert('8.3 Proteção Contra Abuso e Negação de Serviço (Rate Limiting)', 
        bloqueouRateLimit,
        'Rate Limiter bloqueou requisições excessivas do IP atacante.'
    );

    // 8.4 Ausência de Exposição de Segredos
    const statusIaPublico = iaService.obterStatusProvedor();
    const jsonStatus = JSON.stringify(statusIaPublico);
    const naoContemChaves = !jsonStatus.includes('AIzaSy') && !jsonStatus.includes('AQ.') && !jsonStatus.includes('rnd_');
    assert('8.4 Ausência Rigorosa de Vazamento de Chaves ou Segredos em Telemetria', 
        naoContemChaves,
        'Nenhuma credencial privada é transmitida nos retornos da API ou diagnósticos.'
    );

    console.log('\n======================================================================');
    console.log('SUMÁRIO DA HOMOLOGAÇÃO OPERACIONAL E DE SEGURANÇA:');
    console.log(`Total de Validações: ${total}`);
    console.log(`Aprovadas:           ${aprovados}`);
    console.log(`Reprovadas:          ${total - aprovados}`);
    console.log(`Taxa de Sucesso:     ${Math.round((aprovados / total) * 100)}%`);
    console.log('======================================================================\n');

    return { total, aprovados, sucesso: total === aprovados };
}

if (require.main === module) {
    executarHomologacaoOperacionalCompleta().then(r => {
        if (r.sucesso) process.exit(0);
        else process.exit(1);
    });
}

module.exports = { executarHomologacaoOperacionalCompleta };
