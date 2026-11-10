/**
 * =====================================================================
 * VIDE — TESTE MESTRE INTEGRADO DOS 7 AGENTES E CENTRAL DE COMANDO
 * Validação rigorosa de ponta a ponta conforme diretrizes da Diretoria
 * =====================================================================
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

const BASE_DIR = 'C:/Users/Natalia/Downloads/VIDE/.agent/VIDE-MOTOR-INTELIGENCIA/equipe_digital_vide';
const { db } = require(path.join(BASE_DIR, 'banco_dados'));
const { executarFluxoTriagemParaCoordenador } = require(path.join(BASE_DIR, 'conexao_triagem_coordenador'));
const { obterProjetoPorId, listarProjetos } = require(path.join(BASE_DIR, 'agente_02_coordenador/repositorio_projetos_tarefas'));
const { autorizarProjetoComercialmente, conferirEntrega, interpretarComandoDiretora } = require(path.join(BASE_DIR, 'agente_02_coordenador/executor_coordenador'));

// Especialistas
const { executarCicloCompletoDesenvolvedor } = require(path.join(BASE_DIR, 'agente_03_desenvolvedor/executor_desenvolvedor'));
const { executarCicloCompletoBranding } = require(path.join(BASE_DIR, 'agente_04_branding_design/executor_branding_design'));
const { executarCicloCompletoAtendimento } = require(path.join(BASE_DIR, 'agente_05_atendimento/executor_atendimento'));
const { executarCicloCompletoAutomacao } = require(path.join(BASE_DIR, 'agente_06_automacao/executor_automacao'));
const { executarCicloCompletoInteligencia } = require(path.join(BASE_DIR, 'agente_07_inteligencia_comercial/executor_inteligencia_comercial'));

async function executarTesteMestre() {
    console.log('======================================================================');
    console.log('VIDE — TESTE MESTRE OPERACIONAL INTEGRADO (7 AGENTES + CENTRAL)');
    console.log('Data/Hora da Execução:', new Date().toISOString());
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
            if (detalhe) console.error(`   └─ Erro: ${detalhe}`);
        }
    }

    // 1. INICIALIZAÇÃO E PERSISTÊNCIA DO BANCO
    console.log('--- ETAPA 1: BANCO DE DADOS & PERSISTÊNCIA ---');
    const clienteId = `CLI-MESTRE-${Date.now().toString(36).toUpperCase()}`;
    const resCli = db.inserirCliente({
        id_cliente: clienteId,
        nome_empresa: 'Holding Douglas Alpha S/A',
        responsavel: 'Douglas (Diretor Executivo)',
        canal_origem: 'DIRETORIA_EXECUTIVA'
    });
    assert('1.1 Inserção de Cliente no Banco', resCli.sucesso, `Cliente ID: ${clienteId}`);

    // 2. RECEBIMENTO E CLASSIFICAÇÃO PELA TRIAGEM (AGENTE 01)
    console.log('\n--- ETAPA 2: TRIAGEM COMERCIAL (AGENTE 01) ---');
    const entradaDemanda = {
        cliente: 'Holding Douglas Alpha S/A',
        responsavel: 'Douglas',
        telefone: '+5511999999999',
        solicitacao: 'Preciso de uma transformação completa da minha marca, novo portal institucional, estruturação do atendimento com scripts e automação integrada de captação.',
        prazo_declarado: 'Urgente para o próximo mês'
    };
    const fluxo1 = await executarFluxoTriagemParaCoordenador(entradaDemanda);
    assert('2.1 Agente 01 Triagem Processa e Classifica Solicitação', fluxo1.sucesso && fluxo1.triagem, `Demanda ID: ${fluxo1.triagem.id_demanda}`);
    assert('2.2 Classificação Identifica Escopo Tripartite com Dependências', fluxo1.triagem.classificacao_demanda === 'TRIPARTITE' || fluxo1.triagem.servico_solicitado.includes('Branding') || fluxo1.triagem.servico_solicitado.includes('Marca'), `Serviço Solicitado: ${fluxo1.triagem.servico_solicitado}`);

    // 3. CRIAÇÃO DE PROJETO E BLOQUEIO DE AUTORIZAÇÃO (AGENTE 02)
    console.log('\n--- ETAPA 3: COORDENADOR GERAL & GOVERNANÇA (AGENTE 02) ---');
    const projId = fluxo1.projeto.id_projeto;
    let proj = obterProjetoPorId(projId);
    assert('3.1 Coordenador Cria Projeto com Grafo de Tarefas', !!proj && proj.grafo_tarefas.length >= 4, `Total de Tarefas no Grafo: ${proj.grafo_tarefas.length}`);

    // Teste de bloqueio de execução sem autorização
    const demandaNaoPaga = {
        cliente: 'Empresa Sem Contrato',
        solicitacao: 'Gostaria de ver uma prévia do site antes de pagar',
        prazo_declarado: null
    };
    const fluxoBloqueio = await executarFluxoTriagemParaCoordenador(demandaNaoPaga);
    const projBloqueado = obterProjetoPorId(fluxoBloqueio.projeto.id_projeto);
    assert('3.2 Bloqueio Rigoroso de Execução Técnica Sem Autorização Comercial', 
        projBloqueado.situacao_projeto === 'AGUARDANDO_AUTORIZACAO_COMERCIAL' && 
        projBloqueado.grafo_tarefas.every(t => t.id_especialista_responsavel === 'COMERCIAL' || t.estado_tarefa.includes('BLOQUEADA')),
        `Status: ${projBloqueado.situacao_projeto} | Nenhuma tarefa técnica despachada`
    );

    // Liberação formal
    const resAuth = autorizarProjetoComercialmente(projId, 'DIRETOR_DOUGLAS', 'Contrato assinado e pagamento inicial confirmado.');
    proj = obterProjetoPorId(projId);
    assert('3.3 Liberação Formal Após Autorização Comercial', resAuth.sucesso && proj.autorizacao_comercial.status === 'AUTORIZADO', `Autorizado por: ${proj.autorizacao_comercial.autorizado_por}`);

    // 4. DISTRIBUIÇÃO E EXECUÇÃO DOS ESPECIALISTAS COM DEPENDÊNCIAS
    console.log('\n--- ETAPA 4: EXECUÇÃO DOS 7 AGENTES ESPECIALISTAS ---');

    // 4.1 Estrategista / Tarefa 01
    const tsk01 = proj.grafo_tarefas[0];
    assert('4.1 Primeira Tarefa Destravada (PRONTA_PARA_EXECUCAO)', tsk01.estado_tarefa === 'PRONTA_PARA_EXECUCAO', `Tarefa: [${tsk01.id_tarefa}] ${tsk01.titulo_tarefa}`);
    
    // Submeter entrega TSK-01
    const pastaProj = path.join(BASE_DIR, 'entregas_clientes', projId);
    if (!fs.existsSync(pastaProj)) fs.mkdirSync(pastaProj, { recursive: true });
    const arqEstrategia = path.join(pastaProj, 'documento_arquitetura_estrategica.md');
    fs.writeFileSync(arqEstrategia, '# Arquitetura Estratégica VIDE\n\nDiretrizes aprovadas pela Diretoria Executiva.', 'utf-8');

    const audit1 = conferirEntrega(projId, tsk01.id_tarefa, {
        descricao: 'Arquitetura e escopo integrados validados.',
        arquivos_entregues: ['documento_arquitetura_estrategica.md'],
        dados_tecnicos: { escopo_aprovado: true }
    });
    assert('4.2 Coordenador Homologa Entrega da Tarefa 01', audit1.sucesso && audit1.estado_final === 'APROVADA', `Parecer: ${audit1.parecer}`);

    // Recarregar projeto para ver próxima tarefa destravada
    proj = obterProjetoPorId(projId);
    const tskBranding = proj.grafo_tarefas.find(t => t.id_especialista_responsavel === 'BRANDING' || t.titulo_tarefa.includes('Visual') || t.titulo_tarefa.includes('Branding'));
    assert('4.3 Grafo Desbloqueia Automaticamente Tarefa de Branding', tskBranding && tskBranding.estado_tarefa === 'PRONTA_PARA_EXECUCAO', `Tarefa Branding: ${tskBranding ? tskBranding.id_tarefa : 'não encontrada'}`);

    // 4.4 Agente 04 — Branding e Design
    const resBranding = await branding.executarBrandingCompleto({
        id_projeto: projId,
        id_tarefa: tskBranding.id_tarefa,
        cliente: 'Holding Douglas Alpha S/A',
        segmento: 'Engenharia Digital & Tecnologia',
        paleta: { primaria: '#050505', acento: '#00F0FF', neutro: '#1A1A1A' }
    });
    assert('4.4 Agente 04 (Branding) Produz Tokens e Ativos Visuais', resBranding.sucesso && resBranding.arquivos_gerados.length >= 3, `Arquivos Gerados: ${resBranding.arquivos_gerados.length}`);

    const auditBranding = conferirEntrega(projId, tskBranding.id_tarefa, {
        descricao: 'Identidade visual, paleta de cores e tokens CSS gerados.',
        arquivos_entregues: resBranding.arquivos_gerados,
        dados_tecnicos: resBranding
    });
    assert('4.5 Coordenador Homologa Branding e Desbloqueia Dev', auditBranding.sucesso && auditBranding.estado_final === 'APROVADA');

    // 4.6 Agente 03 — Desenvolvedor Full-Stack
    proj = obterProjetoPorId(projId);
    const tskDev = proj.grafo_tarefas.find(t => t.id_especialista_responsavel === 'DESENVOLVEDOR' || t.titulo_tarefa.includes('Landing Page') || t.titulo_tarefa.includes('Site'));
    assert('4.6 Tarefa do Desenvolvedor Desbloqueada no Grafo', tskDev && tskDev.estado_tarefa === 'PRONTA_PARA_EXECUCAO', `Dev ID: ${tskDev.id_tarefa}`);

    const resDev = await dev.executarDesenvolvimentoLandingPage({
        id_projeto: projId,
        id_tarefa: tskDev.id_tarefa,
        cliente: 'Holding Douglas Alpha S/A',
        tokens_branding: resBranding.tokens_css
    });
    assert('4.7 Agente 03 (Desenvolvedor) Constrói Portal Consumindo Tokens', resDev.sucesso && resDev.arquivos_gerados.length >= 2, `Arquivos: ${resDev.arquivos_gerados.join(', ')}`);

    const auditDev = conferirEntrega(projId, tskDev.id_tarefa, {
        descricao: 'Portal construído com HTML5 semântico e CSS de alta conversão.',
        arquivos_entregues: resDev.arquivos_gerados,
        dados_tecnicos: resDev
    });
    assert('4.8 Coordenador Homologa Portal do Desenvolvedor', auditDev.sucesso);

    // 4.9 Agente 05 — Atendimento e Vendas
    proj = obterProjetoPorId(projId);
    const tskAtend = proj.grafo_tarefas.find(t => t.id_especialista_responsavel === 'ATENDIMENTO');
    if (tskAtend) {
        const resAtend = await atendimento.estruturarProcessoAtendimentoCompleto({
            id_projeto: projId,
            id_tarefa: tskAtend.id_tarefa,
            cliente: 'Holding Douglas Alpha S/A',
            canais: ['WhatsApp', 'Instagram Direct']
        });
        assert('4.9 Agente 05 (Atendimento) Estrutura Roteiros Comerciais e Objeções', resAtend.sucesso && resAtend.arquivos_gerados.length >= 4, `Arquivos: ${resAtend.arquivos_gerados.length}`);
        conferirEntrega(projId, tskAtend.id_tarefa, {
            descricao: 'Matrizes de qualificação, objeções e follow-up finalizadas.',
            arquivos_entregues: resAtend.arquivos_gerados,
            dados_tecnicos: resAtend
        });
    }

    // 4.10 Agente 06 — Automação e Integrações
    proj = obterProjetoPorId(projId);
    const tskAuto = proj.grafo_tarefas.find(t => t.id_especialista_responsavel === 'AUTOMACAO');
    if (tskAuto) {
        const resAuto = await automacao.gerarWorkflowsAutomacao({
            id_projeto: projId,
            id_tarefa: tskAuto.id_tarefa,
            cliente: 'Holding Douglas Alpha S/A'
        });
        assert('4.10 Agente 06 (Automação) Constrói Workflows n8n e Webhooks', resAuto.sucesso && resAuto.arquivos_gerados.length >= 2, `Arquivos: ${resAuto.arquivos_gerados.length}`);
        conferirEntrega(projId, tskAuto.id_tarefa, {
            descricao: 'Workflows n8n gerados e integrados.',
            arquivos_entregues: resAuto.arquivos_gerados,
            dados_tecnicos: resAuto
        });
    }

    // 4.11 Agente 07 — Inteligência Comercial
    const resIntel = await intel.executarAuditoriaComercial({
        id_projeto: projId,
        cliente: 'Holding Douglas Alpha S/A',
        conversas_amostra: []
    });
    assert('4.11 Agente 07 (Inteligência Comercial) Gera Relatório com Rigor Epistemológico', resIntel.sucesso && resIntel.arquivos_gerados.length >= 3, `Arquivos: ${resIntel.arquivos_gerados.length}`);

    // 5. REGISTRO FÍSICO DAS ENTREGAS EM DISCO
    console.log('\n--- ETAPA 5: AUDITORIA DE PERSISTÊNCIA DAS ENTREGAS ---');
    const arquivosNoDisco = fs.readdirSync(pastaProj);
    assert('5.1 Arquivos Físicos Gravados no Diretório do Cliente', arquivosNoDisco.length >= 6, `Total de Arquivos em ${pastaProj}: ${arquivosNoDisco.length}`);

    // 6. HISTÓRICO E ISOLAMENTO
    console.log('\n--- ETAPA 6: HISTÓRICO OPERACIONAL E ISOLAMENTO ---');
    proj = obterProjetoPorId(projId);
    assert('6.1 Histórico de Eventos Auditados Preservado', proj.historico_operacional && proj.historico_operacional.length >= 3, `Eventos Registrados: ${proj.historico_operacional.length}`);

    // 7. COMUNICAÇÃO COM A CENTRAL DE COMANDO
    console.log('\n--- ETAPA 7: COMUNICAÇÃO COM CENTRAL DE COMANDO & API ---');
    const statusApi = await new Promise((resolve) => {
        http.get('http://localhost:3000/api/status/infraestrutura', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ ok: res.statusCode === 200, data: parsed });
                } catch(e) { resolve({ ok: false, err: e.message }); }
            });
        }).on('error', err => resolve({ ok: false, err: err.message }));
    });
    assert('7.1 Central de Comando Recebe Telemetria ao Vivo da API', statusApi.ok && statusApi.data.servidor.status === 'ONLINE', `Servidor Status: ${statusApi.data.servidor.status}`);

    const cmdApi = await new Promise((resolve) => {
        const payload = JSON.stringify({ instrucao: 'quais projetos estão em andamento?' });
        const req = http.request('http://localhost:3000/api/coordenador/instrucao', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ ok: res.statusCode === 200, data: parsed });
                } catch(e) { resolve({ ok: false, err: e.message }); }
            });
        });
        req.on('error', err => resolve({ ok: false, err: err.message }));
        req.write(payload);
        req.end();
    });
    assert('7.2 Terminal da Central de Comando Interage com o Coordenador', cmdApi.ok && cmdApi.data.sucesso, `Resposta do Coordenador: ${cmdApi.data.parecer.substring(0, 70)}...`);

    // =========================================================================
    // RESULTADO FINAL CONSOLIDADO
    // =========================================================================
    console.log('\n======================================================================');
    console.log(`SUMÁRIO DO TESTE MESTRE DA EQUIPE DIGITAL VIDE:`);
    console.log(`Total de Testes Executados: ${total}`);
    console.log(`Testes Aprovados:           ${aprovados}`);
    console.log(`Testes Reprovados:          ${total - aprovados}`);
    console.log(`Taxa de Sucesso:            ${Math.round((aprovados / total) * 100)}%`);
    console.log('======================================================================\n');

    if (aprovados === total) {
        console.log('>>> PARECER FINAL: SISTEMA 100% HOMOLOGADO E OPERACIONAL!');
        process.exit(0);
    } else {
        console.error('>>> PARECER FINAL: FALHA EM TESTES CRÍTICOS.');
        process.exit(1);
    }
}

executarTesteMestre().catch(err => {
    console.error('ERRO FATAL:', err);
    process.exit(1);
});
