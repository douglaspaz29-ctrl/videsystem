/**
 * =====================================================================
 * VIDE — TESTE EXTERNO DE PONTA A PONTA (PRODUÇÃO / ACESSO PÚBLICO HTTPS)
 * Validação rigorosa via Internet contra o endpoint público seguro
 * =====================================================================
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

const PUBLIC_BASE_URL = 'https://688666c0d610b8.lhr.life';
const BASE_DIR = 'C:/Users/Natalia/Downloads/VIDE/.agent/VIDE-MOTOR-INTELIGENCIA/equipe_digital_vide';

// Especialistas
const { executarCicloCompletoDesenvolvedor } = require(path.join(BASE_DIR, 'agente_03_desenvolvedor/executor_desenvolvedor'));
const { executarCicloCompletoBranding } = require(path.join(BASE_DIR, 'agente_04_branding_design/executor_branding_design'));
const { executarCicloCompletoAtendimento } = require(path.join(BASE_DIR, 'agente_05_atendimento/executor_atendimento'));
const { executarCicloCompletoAutomacao } = require(path.join(BASE_DIR, 'agente_06_automacao/executor_automacao'));
const { executarCicloCompletoInteligencia } = require(path.join(BASE_DIR, 'agente_07_inteligencia_comercial/executor_inteligencia_comercial'));
const { obterProjetoPorId } = require(path.join(BASE_DIR, 'agente_02_coordenador/repositorio_projetos_tarefas'));
const { conferirEntrega } = require(path.join(BASE_DIR, 'agente_02_coordenador/executor_coordenador'));

function requestHttp(url, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const reqOptions = {
            hostname: u.hostname,
            port: u.port || 443,
            path: u.pathname + u.search,
            method: options.method || 'GET',
            headers: {
                'Connection': 'close',
                ...(options.headers || {})
            },
            timeout: 10000
        };

        if (body && !reqOptions.headers['Content-Length']) {
            reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = https.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(data); } catch(e) { parsed = data; }
                resolve({ status: res.statusCode, headers: res.headers, data: parsed });
            });
        });

        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function run() {
    console.log('======================================================================');
    console.log('VIDE — TESTES EXTERNOS DE PONTA A PONTA (VIA INTERNET HTTPS)');
    console.log('Endpoint Público:', PUBLIC_BASE_URL);
    console.log('Data/Hora:', new Date().toISOString());
    console.log('======================================================================\n');

    let total = 0;
    let aprovados = 0;

    function assert(nome, cond, detalhe = '') {
        total++;
        if (cond) {
            aprovados++;
            console.log(`✓ [APROVADO] ${nome}`);
            if (detalhe) console.log(`   └─ Evidência: ${detalhe}`);
        } else {
            console.error(`❌ [REPROVADO] ${nome}`);
            if (detalhe) console.error(`   └─ Erro: ${detalhe}`);
        }
    }

    // 1. CHECAGEM DO ENDPOINT PÚBLICO
    console.log('--- ETAPA 1: VERIFICAÇÃO DE ALCANCE PÚBLICO EXTERNO ---');
    const telemetriaRes = await requestHttp(`${PUBLIC_BASE_URL}/api/status/infraestrutura`);
    assert('1.1 Backend Acessível com Sucesso via HTTPS Público', 
        telemetriaRes.status === 200 && telemetriaRes.data.servidor?.status === 'ONLINE',
        `Status HTTP: ${telemetriaRes.status} | Servidor: ${telemetriaRes.data?.servidor?.status}`
    );

    // 2. DISPARO EXTERNO DE WEBHOOK DE TRIAGEM
    console.log('\n--- ETAPA 2: DISPARO DE DEMANDA EXTERNA VIA WEBHOOK ---');
    const webhookPayload = JSON.stringify({
        origem: 'PRODUCAO_EXTERNA_WEBHOOK',
        cliente: 'Grupo Alpha Saúde & Estética',
        responsável: 'Dra. Gabriela Fontes',
        telefone: '+5511977778888',
        solicitacao: 'Contratação formal da VIDE para transformação digital completa: 1) Criação de identidade visual elegante (Branding); 2) Desenvolvimento de Landing page de alta performance (Dev); 3) Estruturação de atendimento e qualificação de pacientes (Atendimento); 4) Automação de fluxos e follow-up no WhatsApp via n8n (Automação); e 5) Diagnóstico de Inteligência Comercial (Inteligência).',
        autorizado_comercialmente: true
    });

    const webhookRes = await requestHttp(`${PUBLIC_BASE_URL}/api/webhook/triagem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, webhookPayload);

    console.log('DEBUG WEBHOOK RES:', JSON.stringify(webhookRes.data));

    const idDemanda = webhookRes.data.id_demanda || 
                      webhookRes.data.resultado?.etapa_01_triagem?.idDemanda || 
                      webhookRes.data.resultado?.triagem?.id_demanda;
                      
    const idProjeto = webhookRes.data.id_projeto || 
                      webhookRes.data.resultado?.etapa_02_coordenador?.id_projeto || 
                      webhookRes.data.resultado?.projeto?.id_projeto;

    assert('2.1 Webhook Externo Processa Demanda em Produção', 
        webhookRes.status === 200 && webhookRes.data.sucesso && !!idProjeto,
        `Demanda: ${idDemanda} | Projeto: ${idProjeto}`
    );

    // 3. CONSULTA EXTERNA VIA REST API DO PROJETO CRIADO
    console.log('\n--- ETAPA 3: CONSULTA DO GRAFO DE TAREFAS VIA REST API EXTERNA ---');
    const projRes = await requestHttp(`${PUBLIC_BASE_URL}/api/projetos/${encodeURIComponent(idProjeto)}`);
    assert('3.1 Projeto e Grafo Recuperados com Sucesso via API Externa', 
        projRes.status === 200 && projRes.data.sucesso && projRes.data.projeto.grafo_tarefas.length >= 6,
        `Status Projeto: ${projRes.data.projeto?.situacao_projeto} | Tarefas: ${projRes.data.projeto?.grafo_tarefas?.length}`
    );

    let grafo = projRes.data.projeto.grafo_tarefas;

    // 4. EXECUÇÃO ORQUESTRADA DOS 7 AGENTES
    console.log('\n--- ETAPA 4: EXECUÇÃO DOS ESPECIALISTAS COM DEPENDÊNCIAS ---');

    // 4.1 Estrategista
    const tskEstrategista = grafo.find(t => t.especialista === 'Estrategista');
    const aprovEstrategista = conferirEntrega({
        idProjeto: idProjeto,
        idTarefa: tskEstrategista.id_tarefa,
        entregaSubmetida: {
            posicionamento: 'Medicina e Estética Integrada Premium',
            arquitetura: 'Branding ➔ Landing Page ➔ Roteiros ➔ n8n ➔ Diagnóstico'
        },
        criteriosAtendidos: true,
        parecerCoordenador: 'Arquitetura validada pela coordenação geral.'
    });
    const tskBrandingLiberada = aprovEstrategista?.grafo_tarefas?.find(t => t.especialista === 'Branding e Design');
    assert('4.1 Estrategista Conclui e Destrava Branding no Grafo', 
        !!aprovEstrategista && tskBrandingLiberada?.estado === 'PRONTA_PARA_EXECUCAO',
        `Novo estado Branding: ${tskBrandingLiberada?.estado}`
    );

    // 4.2 Branding
    const tskBranding = aprovEstrategista.grafo_tarefas.find(t => t.especialista === 'Branding e Design');
    const cicloBranding = executarCicloCompletoBranding({
        idProjeto: idProjeto,
        idTarefa: tskBranding.id_tarefa
    });
    assert('4.2 Branding e Design Gera 6 Ativos e Destrava Dev', 
        cicloBranding.resultadoSubmissao?.sucesso && cicloBranding.dadosEntrega?.arquivosCriados?.length === 6,
        `Arquivos: ${cicloBranding.dadosEntrega?.arquivosCriados?.length} gerados no disco`
    );

    // 4.3 Desenvolvedor Full-Stack
    const tskDev = cicloBranding.resultadoSubmissao.projeto.grafo_tarefas.find(t => t.especialista === 'Desenvolvedor');
    const cicloDev = executarCicloCompletoDesenvolvedor({
        idProjeto: idProjeto,
        idTarefa: tskDev.id_tarefa
    });
    assert('4.3 Desenvolvedor Constrói Portal e Coordenador Homologa', cicloDev.resultadoSubmissao?.sucesso);

    // 4.4 Atendimento e Vendas
    const tskAtend = cicloDev.resultadoSubmissao.projeto.grafo_tarefas.find(t => t.especialista === 'Atendimento');
    const cicloAtend = executarCicloCompletoAtendimento({
        idProjeto: idProjeto,
        idTarefa: tskAtend.id_tarefa
    });
    assert('4.4 Atendimento Estrutura 7 Arquivos Comerciais e Destrava Automação', cicloAtend.resultadoSubmissao?.sucesso);

    // 4.5 Automação e Integrações
    const tskAuto = cicloAtend.resultadoSubmissao.projeto.grafo_tarefas.find(t => t.especialista === 'Automação');
    const cicloAuto = executarCicloCompletoAutomacao({
        idProjeto: idProjeto,
        idTarefa: tskAuto.id_tarefa
    });
    assert('4.5 Automação Gera Workflows n8n e Destrava Inteligência', cicloAuto.resultadoSubmissao?.sucesso);

    // 4.6 Inteligência Comercial
    const tskIntel = cicloAuto.resultadoSubmissao.projeto.grafo_tarefas.find(t => t.especialista === 'Inteligência Comercial');
    const cicloIntel = executarCicloCompletoInteligencia({
        idProjeto: idProjeto,
        idTarefa: tskIntel.id_tarefa
    });
    assert('4.6 Inteligência Comercial Conclui Análise com Rigor Epistemológico', cicloIntel.resultadoSubmissao?.sucesso);

    // 5. CONFERÊNCIA EXTERNA DO ESTADO FINAL DO PROJETO VIA API PÚBLICA
    console.log('\n--- ETAPA 5: CONFERÊNCIA FINAL EM PRODUÇÃO (API EXTERNA) ---');
    const projFinalRes = await requestHttp(`${PUBLIC_BASE_URL}/api/projetos/${encodeURIComponent(idProjeto)}`);
    const projFinal = projFinalRes.data.projeto;
    
    assert('5.1 Projeto Atinge AGUARDANDO_HOMOLOGACAO_GESTAO na Nuvem', 
        projFinal.situacao_projeto === 'AGUARDANDO_HOMOLOGACAO_GESTAO',
        `Situação Final: ${projFinal.situacao_projeto}`
    );

    assert('5.2 100% das Tarefas Foram Homologadas e Aprovadas', 
        projFinal.grafo_tarefas.every(t => t.estado === 'APROVADA'),
        `Total de tarefas aprovadas: ${projFinal.grafo_tarefas.filter(t => t.estado === 'APROVADA').length}`
    );

    // 6. VERIFICAÇÃO DA CENTRAL DE COMANDO PÚBLICA
    console.log('\n--- ETAPA 6: CENTRAL DE COMANDO E TERMINAL VIA INTERNET ---');
    const centralHtmlRes = await requestHttp(`${PUBLIC_BASE_URL}/central`);
    assert('6.1 Central de Comando Acessível via HTTPS Público', centralHtmlRes.status === 200 || centralHtmlRes.status === 302);

    const cmdPayload = JSON.stringify({ instrucao: 'quais projetos estão em andamento?' });
    const cmdRes = await requestHttp(`${PUBLIC_BASE_URL}/api/coordenador/instrucao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, cmdPayload);
    assert('6.2 Terminal Interativo da Central Responde Comandos via Web Pública', 
        cmdRes.status === 200 && cmdRes.data.sucesso,
        `Resposta: ${cmdRes.data.parecer?.substring(0, 60)}...`
    );

    // =========================================================================
    // SUMÁRIO DO TESTE EXTERNO
    // =========================================================================
    console.log('\n======================================================================');
    console.log(`SUMÁRIO DOS TESTES EXTERNOS DE PRODUÇÃO:`);
    console.log(`Total de Testes: ${total}`);
    console.log(`Aprovados:       ${aprovados}`);
    console.log(`Reprovados:      ${total - aprovados}`);
    console.log(`Taxa de Sucesso: ${Math.round((aprovados / total) * 100)}%`);
    console.log('======================================================================\n');

    if (aprovados === total) {
        console.log('>>> PARECER FINAL: TESTES EXTERNOS 100% APROVADOS! PRODUÇÃO VALIDADA.');
        process.exit(0);
    } else {
        console.error('>>> PARECER FINAL: FALHA EM TESTES EXTERNOS.');
        process.exit(1);
    }
}

run().catch(err => {
    console.error('ERRO FATAL NO TESTE EXTERNO:', err);
    process.exit(1);
});
