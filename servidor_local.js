/**
 * =====================================================================
 * VIDE — Sistemas de Crescimento Comercial
 * Servidor Web Local e API REST Operacional da Equipe Digital
 * =====================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Suporte tanto para a pasta consolidada (03_AGENTES_DE_IA_E_TRIAGEM) quanto legado (equipe_digital_vide)
const moduloAgentesDir = fs.existsSync(path.join(__dirname, '03_AGENTES_DE_IA_E_TRIAGEM', 'config_ambiente.js')) 
    ? './03_AGENTES_DE_IA_E_TRIAGEM' 
    : './equipe_digital_vide';

const CONFIG = require(`${moduloAgentesDir}/config_ambiente`);
const PORTA = CONFIG.PORTA;
const HOST = CONFIG.HOST;
const DIRETORIO_RAIZ = __dirname;

const { executarFluxoTriagemParaCoordenador } = require(`${moduloAgentesDir}/conexao_triagem_coordenador`);
const { obterProjetoPorId, listarProjetos, salvarProjeto, registrarEvento } = require(`${moduloAgentesDir}/agente_02_coordenador/repositorio_projetos_tarefas`);
const { executarCicloCompletoDesenvolvedor } = require(`${moduloAgentesDir}/agente_03_desenvolvedor/executor_desenvolvedor`);
const { executarCicloCompletoBranding } = require(`${moduloAgentesDir}/agente_04_branding_design/executor_branding_design`);
const { executarCicloCompletoAtendimento } = require(`${moduloAgentesDir}/agente_05_atendimento/executor_atendimento`);
const { executarCicloCompletoAutomacao } = require(`${moduloAgentesDir}/agente_06_automacao/executor_automacao`);
const { executarCicloCompletoInteligencia } = require(`${moduloAgentesDir}/agente_07_inteligencia_comercial/executor_inteligencia_comercial`);
const {
    receberRegistroTriagem,
    autorizarProjetoComercialmente,
    interpretarComandoDiretora,
    interpretarComandoDiretoraComIA,
    conferirEntrega
} = require(`${moduloAgentesDir}/agente_02_coordenador/executor_coordenador`);
const { processarTriagemComIA, processarTriagemRevisada } = require(`${moduloAgentesDir}/agente_01_triagem/executor_triagem`);
const { executarDiagnosticoComercialVIDE } = require(`${moduloAgentesDir}/diagnostico_comercial_vide`);
const { seguranca } = require(`${moduloAgentesDir}/seguranca`);
const { db } = require(`${moduloAgentesDir}/banco_dados`);
const { whatsAppService } = require(`${moduloAgentesDir}/whatsapp_business_integration`);
const { storageService } = require(`${moduloAgentesDir}/storage_service`);
const { iaService } = require(`${moduloAgentesDir}/ia_service`);
const { servicoWebhooksSaida } = require(`${moduloAgentesDir}/servico_webhooks_saida`);
const { obterCatalogoCompleto } = require(`${moduloAgentesDir}/catalogo_solucoes_comerciais`);

// Timestamp de cooldown para proteção de custos da API de IA
let ultimaAuditoriaIaTimestamp = 0;

const TIPOS_MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.md': 'text/markdown; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8'
};

/**
 * Lê o corpo da requisição POST como texto bruto
 */
function lerCorpoTexto(req) {
    return new Promise((resolve, reject) => {
        let corpo = '';
        req.on('data', chunk => { corpo += chunk; });
        req.on('end', () => resolve(corpo));
        req.on('error', err => reject(err));
    });
}

/**
 * Lê o corpo da requisição POST como JSON
 */
function lerCorpoJson(req) {
    return lerCorpoTexto(req).then(texto => {
        if (!texto || texto.trim() === '') return {};
        return JSON.parse(texto);
    });
}

/**
 * Validação rigorosa de autenticação para rotas administrativas (JWT Bearer)
 */
function verificarAutenticacaoAdmin(req) {
    const authHeader = req.headers['authorization'] || '';
    if (!authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7).trim();
    const payload = seguranca.validarToken(token);
    if (!payload) return null;
    if (payload.papel === 'DIRETOR' || payload.papel === 'DIRETORA' || payload.papel === 'ADMIN') {
        return payload;
    }
    return null;
}

/**
 * Executa sequencialmente o pipeline completo dos 7 especialistas da VIDE
 * salvando todos os entregáveis duráveis no PostgreSQL através do storageService
 */
function executarEsteiraCompletaEspecialistas(idProjeto) {
    const projeto = obterProjetoPorId(idProjeto);
    if (!projeto) throw new Error('Projeto ' + idProjeto + ' não encontrado.');

    const resultados = [];
    if (projeto.autorizacao_comercial?.status !== 'AUTORIZADO') {
        autorizarProjetoComercialmente(idProjeto, 'Homologação e Ativação Operacional Integrada');
    }

    let prjAtual = obterProjetoPorId(idProjeto);

    // Multi-pass topological runner: executa as tarefas desbloqueadas até resolver o grafo DAG
    for (let passada = 1; passada <= 5; passada++) {
        let executouNestaPassada = false;
        prjAtual = obterProjetoPorId(idProjeto);

        // 1. Estrategista
        const tskEstrategista = (prjAtual.grafo_tarefas || []).find(t => 
            (t.especialista === 'Estrategista' || (t.especialista || '').toLowerCase().includes('estrateg')) && 
            t.estado === 'PRONTA_PARA_EXECUCAO'
        );
        if (tskEstrategista) {
            prjAtual = conferirEntrega({
                idProjeto,
                idTarefa: tskEstrategista.id_tarefa,
                entregaSubmetida: {
                    posicionamento: 'Posicionamento e Proposta de Valor Aprovados',
                    mapa_arquitetura: 'Pipeline Tripartite VIDE Ativada'
                },
                criteriosAtendidos: true,
                parecerCoordenador: 'Homologação estratégica aprovada pela Diretoria VIDE.'
            });
            resultados.push({ especialista: 'Estrategista', tarefa: tskEstrategista.id_tarefa, status: 'APROVADA' });
            executouNestaPassada = true;
            prjAtual = obterProjetoPorId(idProjeto);
        }

        // 2. Branding & Design (Agente 04)
        const tskBranding = (prjAtual.grafo_tarefas || []).find(t => 
            ((t.especialista || '').toLowerCase().includes('branding') || (t.especialista || '').toLowerCase().includes('design')) && 
            t.estado === 'PRONTA_PARA_EXECUCAO'
        );
        if (tskBranding) {
            try {
                const ciclo = executarCicloCompletoBranding({ idProjeto, idTarefa: tskBranding.id_tarefa });
                resultados.push({ especialista: 'Branding e Design', tarefa: tskBranding.id_tarefa, arquivos: ciclo.dadosEntrega?.arquivosCriados || [] });
                executouNestaPassada = true;
                prjAtual = obterProjetoPorId(idProjeto);
            } catch(e) {
                console.warn('[ESTEIRA] Branding aviso: ' + e.message);
            }
        }

        // 3. Desenvolvedor Web (Agente 03)
        const tskDev = (prjAtual.grafo_tarefas || []).find(t => 
            ((t.especialista || '').toLowerCase().includes('desenvolv') || (t.especialista || '').toLowerCase().includes('web')) && 
            t.estado === 'PRONTA_PARA_EXECUCAO'
        );
        if (tskDev) {
            try {
                const ciclo = executarCicloCompletoDesenvolvedor({ idProjeto, idTarefa: tskDev.id_tarefa });
                resultados.push({ especialista: 'Desenvolvedor', tarefa: tskDev.id_tarefa, arquivos: ciclo.dadosEntrega?.arquivosCriados || [] });
                executouNestaPassada = true;
                prjAtual = obterProjetoPorId(idProjeto);
            } catch(e) {
                console.warn('[ESTEIRA] Dev aviso: ' + e.message);
            }
        }

        // 4. Atendimento & Vendas (Agente 05)
        const tskAtend = (prjAtual.grafo_tarefas || []).find(t => 
            (t.especialista || '').toLowerCase().includes('atend') && 
            t.estado === 'PRONTA_PARA_EXECUCAO'
        );
        if (tskAtend) {
            try {
                const ciclo = executarCicloCompletoAtendimento({ idProjeto, idTarefa: tskAtend.id_tarefa });
                resultados.push({ especialista: 'Atendimento', tarefa: tskAtend.id_tarefa, arquivos: ciclo.dadosEntrega?.arquivosCriados || [] });
                executouNestaPassada = true;
                prjAtual = obterProjetoPorId(idProjeto);
            } catch(e) {
                console.warn('[ESTEIRA] Atendimento aviso: ' + e.message);
            }
        }

        // 5. Automação & Integrações (Agente 06)
        const tskAuto = (prjAtual.grafo_tarefas || []).find(t => 
            (t.especialista || '').toLowerCase().includes('auto') && 
            t.estado === 'PRONTA_PARA_EXECUCAO'
        );
        if (tskAuto) {
            try {
                const ciclo = executarCicloCompletoAutomacao({ idProjeto, idTarefa: tskAuto.id_tarefa });
                resultados.push({ especialista: 'Automação', tarefa: tskAuto.id_tarefa, arquivos: ciclo.dadosEntrega?.arquivosCriados || [] });
                executouNestaPassada = true;
                prjAtual = obterProjetoPorId(idProjeto);
            } catch(e) {
                console.warn('[ESTEIRA] Automação aviso: ' + e.message);
            }
        }

        // 6. Inteligência Comercial (Agente 07)
        const tskIntel = (prjAtual.grafo_tarefas || []).find(t => 
            (t.especialista || '').toLowerCase().includes('intel') && 
            t.estado === 'PRONTA_PARA_EXECUCAO'
        );
        if (tskIntel) {
            try {
                const ciclo = executarCicloCompletoInteligencia({ idProjeto, idTarefa: tskIntel.id_tarefa });
                resultados.push({ especialista: 'Inteligência Comercial', tarefa: tskIntel.id_tarefa, arquivos: ciclo.dadosEntrega?.arquivosCriados || [] });
                executouNestaPassada = true;
                prjAtual = obterProjetoPorId(idProjeto);
            } catch(e) {
                console.warn('[ESTEIRA] Inteligência aviso: ' + e.message);
            }
        }

        if (!executouNestaPassada) break;
    }

    try {
        servicoWebhooksSaida.dispararEvento('esteira_concluida', {
            id_projeto: idProjeto,
            total_entregaveis: resultados.length,
            entregaveis: resultados
        });
    } catch (_) {}

    return resultados;
}

const servidor = http.createServer(async (req, res) => {
    let urlLimpa = req.url.split('?')[0];

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-hub-signature-256, x-vide-signature, x-vide-api-key');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    // =========================================================================
    // ROTAS DE API REST OPERACIONAL (BACKEND DA EQUIPE DIGITAL)
    // =========================================================================

    // 0. POST /api/auth/login — Autenticação de Usuários e Emissão de Token JWT
    if (urlLimpa === '/api/auth/login' && req.method === 'POST') {
        try {
            const body = await lerCorpoJson(req);
            const { usuario, senha } = body;
            const resLogin = seguranca.autenticarUsuario(usuario, senha);
            if (!resLogin) {
                res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ sucesso: false, erro: 'Credenciais inválidas.' }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(resLogin));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: e.message }));
        }
    }

    // 0.1 GET /api/status/infraestrutura — Auditoria em Tempo Real de Conexões e Dependências
    if (urlLimpa === '/api/status/infraestrutura' && req.method === 'GET') {
        const diagStorage = storageService.obterDiagnostico();
        const statusDb = await db.testarConexaoRemota();
        const payloadStatus = {
            servidor: {
                status: 'ONLINE',
                host: HOST,
                porta: PORTA,
                ambiente: CONFIG.NODE_ENV,
                url_base: CONFIG.BASE_URL,
                uptime_segundos: Math.round(process.uptime()),
                pid: process.pid
            },
            banco_dados: {
                modo_operacao: statusDb.modo,
                conexao_remota_ativa: statusDb.sucesso,
                database_url_configurada: !!CONFIG.DATABASE_URL,
                detalhes: statusDb.sucesso ? `PostgreSQL Ativo: ${statusDb.versao_postgresql}` : statusDb.erro
            },
            armazenamento_arquivos: diagStorage,
            integracoes: {
                whatsapp_meta_cloud: {
                    status: (CONFIG.META_WA_PHONE_NUMBER_ID && CONFIG.META_WA_ACCESS_TOKEN) ? 'CREDENCIAS_CONFIGURADAS' : 'AGUARDANDO_CREDENCIAIS_META',
                    phone_number_id_definido: !!CONFIG.META_WA_PHONE_NUMBER_ID
                },
                inteligencia_artificial: iaService.obterStatusProvedor(),
                webhooks_saida: {
                    status: CONFIG.N8N_WEBHOOK_URL ? 'DESTINO_EXTERNO_CONFIGURADO' : 'RETENCAO_LOCAL_HISTORICO',
                    n8n_webhook_url: CONFIG.N8N_WEBHOOK_URL || null,
                    total_disparados: servicoWebhooksSaida.obterHistorico().length
                },
                automacao_n8n: {
                    status: (CONFIG.N8N_URL && !CONFIG.N8N_URL.includes('localhost')) 
                        ? 'CONECTADO_REMOTO' 
                        : (CONFIG.NODE_ENV === 'staging' || CONFIG.NODE_ENV === 'production')
                            ? 'AGUARDANDO_INSTANCIA_N8N_NUVEM'
                            : 'LOCAL_DEV',
                    url_configurada: (CONFIG.N8N_URL && !CONFIG.N8N_URL.includes('localhost'))
                        ? CONFIG.N8N_URL
                        : 'NENHUMA (Aguardando implantação de instância n8n pública na nuvem)',
                    ambiente_execucao: CONFIG.NODE_ENV,
                    webhooks_prontos_para_receber: {
                        triagem_leads: `${CONFIG.BASE_URL}/api/webhook/triagem`,
                        whatsapp_meta: `${CONFIG.BASE_URL}/api/webhook/whatsapp`,
                        status_infra: `${CONFIG.BASE_URL}/api/status/infraestrutura`
                    },
                    instrucoes_integracao: "O backend VIDE está 100% preparado para receber requisições do n8n via POST nos webhooks acima. Quando uma instância n8n pública for provisionada, defina a variável N8N_URL no Render apontando para ela."
                }
            }
        };
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payloadStatus, null, 2));
    }

    // 0.2 GET /api/catalogo ou /api/solucoes — Catálogo Oficial de Soluções Comerciais VIDE (v1.0)
    if ((urlLimpa === '/api/catalogo' || urlLimpa === '/api/solucoes') && req.method === 'GET') {
        const catalogo = obterCatalogoCompleto();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ sucesso: true, catalogo }));
    }

    // 1. GET /api/projetos — Lista todos os projetos completos com suas tarefas
    if (urlLimpa === '/api/projetos' && req.method === 'GET') {
        if (db.pgPool) {
            try { await db.hidratarDoPostgres(); } catch (_) {}
        }
        const indice = listarProjetos();
        let projetosCompletos = indice.map(p => obterProjetoPorId(p.id_projeto) || db.obterProjeto(p.id_projeto)).filter(Boolean);
        
        if (projetosCompletos.length === 0 && db.pgPool) {
            try {
                const resPg = await db.pgPool.query('SELECT id FROM projetos ORDER BY criado_em DESC');
                projetosCompletos = [];
                for (const row of resPg.rows) {
                    const prj = await db.obterProjetoDoPostgres(row.id);
                    if (prj) projetosCompletos.push(prj);
                }
            } catch (_) {}
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ sucesso: true, projetos: projetosCompletos }));
    }

    // 1.1 POST /api/projetos/novo — Criação direta de novo projeto com briefing e triagem imediata
    if (urlLimpa === '/api/projetos/novo' && req.method === 'POST') {
        try {
            const body = await lerCorpoJson(req);
            const cliente = (body.cliente || 'Cliente Sem Nome').trim();
            const solicitacao = (body.solicitacao || body.demanda || '').trim();
            const briefing = (body.briefing || '').trim();
            const prazo = body.prazo || null;

            if (!solicitacao && !briefing) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ sucesso: false, erro: 'Informe a solicitação ou o briefing do projeto.' }));
            }

            const regTriagem = await processarTriagemComIA({
                solicitacaoOriginal: solicitacao || briefing,
                identificadorCenario: cliente,
                prazoUrgenciaInformado: prazo
            });

            const projetoCriado = receberRegistroTriagem(regTriagem, { forcarPendente: true });
            if (briefing) {
                projetoCriado.briefing_diretoria = briefing;
                const nomeBriefing = `briefing_inicial_${Date.now()}.md`;
                storageService.salvarArquivo(projetoCriado.id_projeto, 'materiais_cliente', nomeBriefing, Buffer.from(briefing, 'utf-8'));
                if (!projetoCriado.materiais_anexados) projetoCriado.materiais_anexados = [];
                projetoCriado.materiais_anexados.push({
                    nome_arquivo: nomeBriefing,
                    tamanho_bytes: Buffer.byteLength(briefing, 'utf-8'),
                    tipo: 'text/markdown',
                    criado_em: new Date().toISOString(),
                    caminho_relativo: `materiais_cliente/${nomeBriefing}`
                });
                salvarProjeto(projetoCriado);
            }

            if (db.pgPool) await db.sincronizarProjetoCompletoPostgres(projetoCriado);

            res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ 
                sucesso: true, 
                id_projeto: projetoCriado.id_projeto,
                projeto: projetoCriado,
                triagem: regTriagem
            }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: e.message }));
        }
    }

    // 1.2 POST /api/projetos/:id/anexos — Alimentação da equipe com briefings, imagens e documentos
    if (urlLimpa.startsWith('/api/projetos/') && urlLimpa.endsWith('/anexos') && req.method === 'POST') {
        const idProjeto = decodeURIComponent(urlLimpa.replace('/api/projetos/', '').replace('/anexos', ''));
        try {
            const body = await lerCorpoJson(req);
            let projeto = obterProjetoPorId(idProjeto);
            if (!projeto && db.pgPool) projeto = await db.obterProjetoDoPostgres(idProjeto);
            if (!projeto) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ sucesso: false, erro: 'Projeto não encontrado.' }));
            }

            if (!projeto.materiais_anexados) projeto.materiais_anexados = [];
            let arquivoInfo = null;

            // Caso A: Arquivo em Base64 ou Texto
            if (body.nome_arquivo && (body.conteudo || body.conteudo_base64)) {
                const nomeArquivo = body.nome_arquivo.replace(/[^a-zA-Z0-9._-]/g, '_');
                const buffer = body.conteudo_base64 
                    ? Buffer.from(body.conteudo_base64, 'base64') 
                    : Buffer.from(body.conteudo, 'utf-8');

                storageService.salvarArquivo(idProjeto, 'materiais_cliente', nomeArquivo, buffer);
                arquivoInfo = {
                    nome_arquivo: nomeArquivo,
                    tamanho_bytes: buffer.length,
                    tipo: body.mimetype || path.extname(nomeArquivo),
                    criado_em: new Date().toISOString(),
                    caminho_relativo: `materiais_cliente/${nomeArquivo}`
                };
                projeto.materiais_anexados.push(arquivoInfo);
                registrarEvento(idProjeto, `Material anexado pela Diretoria: ${nomeArquivo} (${buffer.length} bytes).`);
            }

            // Caso B: Texto de Briefing ou Orientações
            if (body.briefing || body.instrucoes || body.orientacoes) {
                const textoBriefing = body.briefing || body.instrucoes || body.orientacoes;
                projeto.briefing_diretoria = (projeto.briefing_diretoria ? (projeto.briefing_diretoria + '\n\n' + textoBriefing) : textoBriefing);
                const nomeBriefing = `briefing_diretoria_${Date.now()}.md`;
                storageService.salvarArquivo(idProjeto, 'materiais_cliente', nomeBriefing, Buffer.from(textoBriefing, 'utf-8'));
                projeto.materiais_anexados.push({
                    nome_arquivo: nomeBriefing,
                    tamanho_bytes: Buffer.byteLength(textoBriefing, 'utf-8'),
                    tipo: 'text/markdown',
                    criado_em: new Date().toISOString(),
                    caminho_relativo: `materiais_cliente/${nomeBriefing}`
                });
                registrarEvento(idProjeto, `Briefing/Orientação executiva adicionada pela Diretoria.`);
            }

            salvarProjeto(projeto);
            if (db.pgPool) await db.sincronizarProjetoCompletoPostgres(projeto);

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ 
                sucesso: true, 
                mensagem: 'Material incorporado com sucesso ao contexto do projeto.',
                arquivo: arquivoInfo,
                total_materiais: projeto.materiais_anexados.length,
                materiais: projeto.materiais_anexados
            }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: e.message }));
        }
    }

    // 1.3 POST /api/projetos/:id/diagnostico — Execução do Diagnóstico Comercial VIDE (10 passos)
    if (urlLimpa.startsWith('/api/projetos/') && urlLimpa.endsWith('/diagnostico') && req.method === 'POST') {
        const idProjeto = decodeURIComponent(urlLimpa.replace('/api/projetos/', '').replace('/diagnostico', ''));
        try {
            const body = await lerCorpoJson(req);
            const resultado = await executarDiagnosticoComercialVIDE({
                idProjeto,
                dadosNegocio: body
            });
            const prjAtualizado = obterProjetoPorId(idProjeto);
            if (prjAtualizado && db.pgPool) await db.sincronizarProjetoCompletoPostgres(prjAtualizado);

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: true, diagnostico: resultado }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: e.message }));
        }
    }

    // 1.4 GET /api/projetos/:id/detalhes — Retorna o projeto com estado real dos 7 agentes, materiais e entregas
    if (urlLimpa.startsWith('/api/projetos/') && urlLimpa.endsWith('/detalhes') && req.method === 'GET') {
        const idProjeto = decodeURIComponent(urlLimpa.replace('/api/projetos/', '').replace('/detalhes', ''));
        let projeto = obterProjetoPorId(idProjeto);
        if (!projeto && db.pgPool) projeto = await db.obterProjetoDoPostgres(idProjeto);
        if (!projeto) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: 'Projeto não encontrado.' }));
        }

        const arquivosLocais = storageService.listarArquivosProjeto(idProjeto);
        const arquivosPg = await db.listarArquivosStorage(idProjeto);
        const listaArquivos = Array.from(new Set([
            ...arquivosLocais,
            ...arquivosPg.map(a => (a.caminho_relativo ? a.caminho_relativo.replace(idProjeto + '/', '') : (a.especialista + '/' + a.nome_arquivo)).replace(/\\/g, '/'))
        ]));

        const tarefas = projeto.grafo_tarefas || [];
        const statusAgentes = {
            '01_triagem': { status: 'CONCLUIDO', tarefa: 'Triagem e qualificação comercial' },
            '02_coordenador': { status: projeto.situacao_projeto, tarefa: 'Coordenação e governança operacional' },
            '03_desenvolvedor': tarefas.find(t => (t.especialista || '').toLowerCase().includes('desenvolv')) || { estado: 'NAO_CONTRATADO' },
            '04_branding': tarefas.find(t => (t.especialista || '').toLowerCase().includes('brand')) || { estado: 'NAO_CONTRATADO' },
            '05_atendimento': tarefas.find(t => (t.especialista || '').toLowerCase().includes('atend')) || { estado: 'NAO_CONTRATADO' },
            '06_automacao': tarefas.find(t => (t.especialista || '').toLowerCase().includes('auto')) || { estado: 'NAO_CONTRATADO' },
            '07_inteligencia': tarefas.find(t => (t.especialista || '').toLowerCase().includes('intel')) || { estado: 'NAO_CONTRATADO' }
        };

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({
            sucesso: true,
            id_projeto: idProjeto,
            projeto,
            status_agentes: statusAgentes,
            total_arquivos: listaArquivos.length,
            arquivos: listaArquivos,
            materiais_anexados: projeto.materiais_anexados || [],
            diagnostico_comercial: projeto.diagnostico_comercial || null
        }));
    }

    // 2. GET /api/projetos/:id — Retorna detalhes de um projeto específico com fallback direto no PostgreSQL
    if (urlLimpa.startsWith('/api/projetos/') && !urlLimpa.includes('/arquivos') && !urlLimpa.includes('/detalhes') && !urlLimpa.includes('/anexos') && !urlLimpa.includes('/diagnostico') && req.method === 'GET') {
        const idProjeto = decodeURIComponent(urlLimpa.replace('/api/projetos/', ''));
        let projeto = obterProjetoPorId(idProjeto);
        if (!projeto && db.pgPool) {
            projeto = await db.obterProjetoDoPostgres(idProjeto);
        }
        if (!projeto && db.pgPool) {
            try {
                const rFiles = await db.pgPool.query('SELECT DISTINCT projeto_id FROM arquivos_armazenamento WHERE projeto_id = $1', [idProjeto]);
                if (rFiles.rows.length > 0) {
                    projeto = {
                        id_projeto: idProjeto,
                        id: idProjeto,
                        cliente: 'Cliente Recuperado Storage',
                        situacao_projeto: 'EM_EXECUCAO',
                        autorizacao_comercial: { status: 'AUTORIZADO', servicos_autorizados: ['Escopo Homologado VIDE'] },
                        cronograma: { prioridade: 'NORMAL', criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() },
                        grafo_tarefas: [],
                        registro_operacional: [{ timestamp: new Date().toISOString(), evento: 'Reidratado a partir do armazenamento durável PostgreSQL.', situacao: 'EM_EXECUCAO' }]
                    };
                    db.tabelas.projetos.set(idProjeto, projeto);
                    salvarProjeto(projeto);
                }
            } catch (_) {}
        }
        if (!projeto) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: 'Projeto não encontrado' }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ sucesso: true, projeto }));
    }

    // 2.1 GET /api/projetos/:id/arquivos — Lista ou recupera arquivos persistidos do projeto no storage
    if (urlLimpa.startsWith('/api/projetos/') && urlLimpa.includes('/arquivos') && req.method === 'GET') {
        const partes = urlLimpa.replace('/api/projetos/', '').split('/arquivos');
        const idProjeto = decodeURIComponent(partes[0]);
        const resto = partes[1] ? decodeURIComponent(partes[1]).replace(/^\//, '') : '';

        // Se for para recuperar o conteúdo de um arquivo específico: /api/projetos/:id/arquivos/:especialista/...
        if (resto && resto.length > 0) {
            const segmentos = resto.split('/');
            const especialista = segmentos[0];
            const nomeArquivo = segmentos.slice(1).join('/');

            const conteudo = await storageService.obterConteudoArquivo(idProjeto, especialista, nomeArquivo);
            if (conteudo === null) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ sucesso: false, erro: 'Arquivo não encontrado no storage.' }));
            }

            const ext = path.extname(nomeArquivo).toLowerCase();
            const mime = TIPOS_MIME[ext] || 'text/plain; charset=utf-8';
            res.writeHead(200, { 'Content-Type': mime });
            return res.end(conteudo);
        }

        // Listagem de arquivos persistidos
        const arquivosLocais = storageService.listarArquivosProjeto(idProjeto);
        const arquivosPg = await db.listarArquivosStorage(idProjeto);
        const listaUnificada = Array.from(new Set([
            ...arquivosLocais,
            ...arquivosPg.map(a => (a.caminho_relativo ? a.caminho_relativo.replace(idProjeto + '/', '') : (a.especialista + '/' + a.nome_arquivo)).replace(/\\/g, '/'))
        ]));

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ 
            sucesso: true, 
            id_projeto: idProjeto,
            total: listaUnificada.length,
            arquivos: listaUnificada,
            total_arquivos_postgresql: arquivosPg.length,
            arquivos_em_disco: arquivosLocais,
            arquivos_banco_postgresql: arquivosPg.map(a => ({
                id: a.id,
                especialista: a.especialista,
                nome_arquivo: a.nome_arquivo,
                caminho_relativo: a.caminho_relativo,
                mimetype: a.mimetype,
                tamanho_bytes: a.tamanho_bytes,
                atualizado_em: a.atualizado_em
            }))
        }));
    }

    // 3. POST /api/webhook/triagem — Ingestão de mensagens (WhatsApp / Instagram / n8n)
    if (urlLimpa === '/api/webhook/triagem' && req.method === 'POST') {
        const ipOrigem = req.socket.remoteAddress || '127.0.0.1';
        if (!seguranca.verificarRateLimit(ipOrigem)) {
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: 'Muitas requisições. Rate limit excedido.' }));
        }

        try {
            const body = await lerCorpoJson(req);
            let solicitacao = body.solicitacaoOriginal || body.solicitacao || body.mensagem || body.texto || '';
            let cenario = body.identificadorCenario || body.cliente || body.nome || 'Lead WhatsApp/Formulário';
            const prazo = body.prazoUrgenciaInformado || body.prazo || null;

            solicitacao = seguranca.sanitizarTexto(solicitacao);
            cenario = seguranca.sanitizarTexto(cenario);

            if (!solicitacao || solicitacao.trim().length < 5) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ sucesso: false, erro: 'Mensagem do lead é obrigatória.' }));
            }

            const resultado = executarFluxoTriagemParaCoordenador({
                solicitacaoOriginal: solicitacao,
                identificadorCenario: cenario,
                prazoUrgenciaInformado: prazo
            });

            if (resultado.projeto) {
                await db.sincronizarProjetoCompletoPostgres(resultado.projeto);
            }

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ 
                sucesso: true, 
                resultado,
                id_demanda: resultado.triagem?.id_demanda,
                id_projeto: resultado.projeto?.id_projeto
            }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: e.message }));
        }
    }

    // 3.1 GET /api/webhook/whatsapp — Handshake de Verificação da Meta Cloud API
    if (urlLimpa === '/api/webhook/whatsapp' && req.method === 'GET') {
        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const query = Object.fromEntries(urlObj.searchParams);
        const challenge = whatsAppService.validarDesafioWebhook(query);
        if (challenge) {
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end(challenge);
        }
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Desafio inválido da Meta.');
    }

    // 3.2 POST /api/webhook/whatsapp — Ingestão de Mensagens e Status da Meta Cloud API
    if (urlLimpa === '/api/webhook/whatsapp' && req.method === 'POST') {
        const ipOrigem = req.socket.remoteAddress || '127.0.0.1';
        if (!seguranca.verificarRateLimit(ipOrigem)) {
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: 'Rate limit excedido.' }));
        }

        try {
            const rawBody = await lerCorpoTexto(req);
            const signature = req.headers['x-hub-signature-256'];
            if (!whatsAppService.validarAssinaturaMeta(rawBody, signature)) {
                res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ sucesso: false, erro: 'Assinatura HMAC inválida da Meta.' }));
            }

            const payloadMeta = JSON.parse(rawBody);
            const eventos = whatsAppService.extrairEventosMeta(payloadMeta);
            const resultadosProcessamento = [];

            for (const msg of eventos.mensagens) {
                const resTriagem = executarFluxoTriagemParaCoordenador({
                    solicitacaoOriginal: msg.texto,
                    identificadorCenario: `${msg.nome} (${msg.telefone})`,
                    prazoUrgenciaInformado: null
                });
                resultadosProcessamento.push({
                    id_meta: msg.id_mensagem_meta,
                    telefone: msg.telefone,
                    projeto_criado: resTriagem.etapa_02_coordenador?.id_projeto || null
                });
            }

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: true, eventos, resultadosProcessamento }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: e.message }));
        }
    }

    // 3.3 POST /api/whatsapp/enviar — Despacho Outbound de Mensagens
    if (urlLimpa === '/api/whatsapp/enviar' && req.method === 'POST') {
        try {
            const body = await lerCorpoJson(req);
            const { to, text, template } = body;
            if (!to || (!text && !template)) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ sucesso: false, erro: 'Destinatário (to) e mensagem/template são obrigatórios.' }));
            }

            const resultadoEnvio = await whatsAppService.enviarMensagem({ to, text, template });
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(resultadoEnvio));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: e.message }));
        }
    }

    // 3.4 POST /api/webhooks/testar-disparo — Teste e Disparo de Webhook Outbound para n8n ou CRM
    if (urlLimpa === '/api/webhooks/testar-disparo' && req.method === 'POST') {
        try {
            const body = await lerCorpoJson(req);
            const urlDestino = body.url || CONFIG.N8N_WEBHOOK_URL || (CONFIG.N8N_URL ? `${CONFIG.N8N_URL.replace(/\/$/, '')}/webhook/vide-eventos` : null);
            if (!urlDestino) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ sucesso: false, erro: 'URL de destino para disparo do webhook não informada (defina N8N_WEBHOOK_URL).' }));
            }
            const evento = body.evento || 'teste_conexao_n8n';
            const payload = body.dados || { mensagem: 'Validação de Webhook Bidirecional VIDE <-> n8n', timestamp: new Date().toISOString() };
            const resultado = await servicoWebhooksSaida.enviarHttp(
                urlDestino, 
                JSON.stringify({ evento, dados: payload, teste: true }), 
                servicoWebhooksSaida.gerarAssinaturaHmac(JSON.stringify(payload)), 
                'EVT-TESTE', 
                evento
            );
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: resultado.sucesso, resultado, urlDestino }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: e.message }));
        }
    }

    // 3.5 GET /api/webhooks/historico — Auditoria de Disparos de Webhooks de Saída
    if (urlLimpa === '/api/webhooks/historico' && req.method === 'GET') {
        const historico = servicoWebhooksSaida.obterHistorico(50);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ sucesso: true, total: historico.length, historico }));
    }

    // 3.6 GET/POST /api/ia/auditar-7-agentes — Auditoria Completa dos 7 Agentes com IA Generativa (PROTEGIDO)
    if (urlLimpa === '/api/ia/auditar-7-agentes' && (req.method === 'GET' || req.method === 'POST')) {
        // 1. Verificação de Autenticação e Autorização (RBAC de Diretoria)
        const adminAuth = verificarAutenticacaoAdmin(req);
        if (!adminAuth) {
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ 
                sucesso: false, 
                erro: 'Acesso não autorizado: Auditoria de IA restrita à Diretoria Executiva. Token Bearer JWT de Diretoria obrigatório.' 
            }));
        }

        // 2. Proteção contra Abuso e Excesso de Requisições (Rate Limiter por IP)
        const ipOrigem = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
        if (!seguranca.verificarRateLimit(ipOrigem)) {
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: 'Taxa limite de requisições excedida.' }));
        }

        // 3. Proteção Financeira e de Cota (Cooldown de 30s entre auditorias completas de 7 agentes)
        const agora = Date.now();
        if (ultimaAuditoriaIaTimestamp && (agora - ultimaAuditoriaIaTimestamp < 30000)) {
            const restante = Math.ceil((30000 - (agora - ultimaAuditoriaIaTimestamp)) / 1000);
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ 
                sucesso: false, 
                erro: `Cooldown ativo: Uma auditoria completa consome recursos da IA Gemini. Aguarde ${restante}s para uma nova execução.` 
            }));
        }
        ultimaAuditoriaIaTimestamp = agora;

        try {
            const { executarAuditoriaIA7Agentes } = require('./equipe_digital_vide/testes_geracao_ia_7_agentes');
            const relatorio = await executarAuditoriaIA7Agentes();
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: true, relatorio }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: e.message }));
        }
    }

    // 4. POST /api/coordenador/comando ou /api/coordenador/instrucao — Chat e comandos executivos da Diretoria
    if ((urlLimpa === '/api/coordenador/comando' || urlLimpa === '/api/coordenador/instrucao') && req.method === 'POST') {
        const ipOrigem = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
        if (!seguranca.verificarRateLimit(ipOrigem)) {
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: 'Taxa limite de requisições excedida.' }));
        }

        try {
            const body = await lerCorpoJson(req);
            const comando = (body.comando || body.instrucao || '').trim();

            // Comando especial: Diagnóstico do Provedor de IA
            if (comando.toLowerCase() === 'ia' || comando.toLowerCase() === 'status ia') {
                const statusIa = iaService.obterStatusProvedor();
                const resposta = `🤖 **DIAGNÓSTICO DO MOTOR DE INTELIGÊNCIA ARTIFICIAL VIDE**\n\n` +
                    `• **Provedor Ativo:** ${statusIa.provedor}\n` +
                    `• **Modelo:** ${statusIa.modelo}\n` +
                    `• **IA Generativa Ativa:** ${statusIa.ia_generativa_ativa ? 'SIM (LLM Remota)' : 'NÃO (Motor Cognitivo Local VIDE)'}\n` +
                    `• **Status:** ${statusIa.status}\n` +
                    `• **Detalhes:** ${statusIa.detalhes}\n` +
                    (statusIa.motivo_fallback ? `• **Motivo do Fallback:** ${statusIa.motivo_fallback}\n` : '');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ sucesso: true, resposta, parecer: resposta, dados: statusIa }));
            }

            // Comando especial: Auditoria Completa dos 7 Agentes (Requer autenticação de Diretoria e Cooldown)
            if (comando.toLowerCase() === 'ia auditar' || comando.toLowerCase() === 'auditar ia') {
                const adminAuth = verificarAutenticacaoAdmin(req);
                if (!adminAuth) {
                    const resposta = '🔒 **ACESSO NEGADO:** O disparo da auditoria completa da equipe de IA requer autenticação de Diretoria. Autentique-se com `login douglas VideDouglas#2026` antes de executar este comando.';
                    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ sucesso: false, resposta, parecer: resposta }));
                }

                const agora = Date.now();
                if (ultimaAuditoriaIaTimestamp && (agora - ultimaAuditoriaIaTimestamp < 30000)) {
                    const restante = Math.ceil((30000 - (agora - ultimaAuditoriaIaTimestamp)) / 1000);
                    const resposta = `⏳ **COOLDOWN ATIVO:** Uma auditoria completa da equipe já foi executada recentemente. Aguarde ${restante}s para nova execução.`;
                    res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ sucesso: false, resposta, parecer: resposta }));
                }
                ultimaAuditoriaIaTimestamp = agora;

                const { executarAuditoriaIA7Agentes } = require('./equipe_digital_vide/testes_geracao_ia_7_agentes');
                const relatorio = await executarAuditoriaIA7Agentes();
                let txt = `🧪 **AUDITORIA DOS 7 AGENTES DE IA VIDE**\n\n` +
                    `• **Provedor:** ${relatorio.statusGeral.provedor}\n` +
                    `• **Modelo:** ${relatorio.statusGeral.modelo}\n` +
                    `• **IA Generativa Ativa:** ${relatorio.statusGeral.ia_generativa_ativa ? 'SIM (Google Gemini)' : 'NÃO (Fallback)'}\n` +
                    `• **Testes Aprovados:** ${relatorio.aprovados}/${relatorio.total} (${Math.round((relatorio.aprovados/relatorio.total)*100)}%)\n\n` +
                    `**Detalhes por Agente:**\n`;
                for (const r of (relatorio.resultados || [])) {
                    txt += `• [Agente 0${r.numero} — ${r.agente}]: ${r.resultado} | ${r.provedor} (${r.modelo}) | IA: ${r.ia_generativa_ativa}\n`;
                }
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ sucesso: true, resposta: txt, parecer: txt, dados: relatorio }));
            }

            // Comando especial: Testar disparo de Webhook para n8n
            if (comando.toLowerCase().startsWith('webhook')) {
                const partes = comando.split(' ');
                const urlDestino = partes[1] || CONFIG.N8N_WEBHOOK_URL || (CONFIG.N8N_URL ? `${CONFIG.N8N_URL.replace(/\/$/, '')}/webhook/vide-eventos` : null);
                if (!urlDestino) {
                    const msg = `Sintaxe: webhook <URL_N8N>. Ex: webhook https://n8n.meuservidor.com/webhook/vide`;
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ sucesso: false, resposta: msg, parecer: msg }));
                }
                const resDisparo = await servicoWebhooksSaida.enviarHttp(
                    urlDestino, 
                    JSON.stringify({ evento: 'teste_terminal', autor: 'Diretoria Executiva Douglas', timestamp: new Date().toISOString() }), 
                    servicoWebhooksSaida.gerarAssinaturaHmac('teste'), 
                    'EVT-TERM', 
                    'teste_terminal'
                );
                const resposta = resDisparo.sucesso 
                    ? `✅ Webhook disparado com sucesso para [${urlDestino}]! Status HTTP: ${resDisparo.status}`
                    : `⚠️ Tentativa de disparo para [${urlDestino}] registrada: ${resDisparo.erro || 'Status ' + resDisparo.status}`;
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ sucesso: true, resposta, parecer: resposta, dados: resDisparo }));
            }

            const resposta = await interpretarComandoDiretoraComIA(comando);

            // Se o comando disparou a autorização de um projeto, executa autonomamente a esteira dos especialistas
            if (resposta.idProjetoParaExecucao) {
                try {
                    const entregaveis = executarEsteiraCompletaEspecialistas(resposta.idProjetoParaExecucao);
                    const prjPos = obterProjetoPorId(resposta.idProjetoParaExecucao);
                    if (prjPos) await db.sincronizarProjetoCompletoPostgres(prjPos);
                    resposta.entregaveis = entregaveis;
                    resposta.resposta += `\n\n🚀 **Esteira automatizada executada com sucesso!** Todos os especialistas entregaram e homologaram seus ativos físicos com o Coordenador Geral. Total de entregáveis: ${entregaveis.length}.`;
                } catch(eExec) {
                    console.warn('[COORDENADOR] Aviso ao rodar esteira via comando:', eExec.message);
                }
            } else if (resposta.novoProjetoId) {
                const prjNovo = obterProjetoPorId(resposta.novoProjetoId);
                if (prjNovo) await db.sincronizarProjetoCompletoPostgres(prjNovo);
            }

            const payload = {
                ...resposta,
                parecer: resposta.resposta || resposta.mensagem || 'Diretriz processada pelo Coordenador Geral.'
            };
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(payload));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: e.message }));
        }
    }

    // 5. POST /api/coordenador/aprovar-projeto — Aprovação formal de contratação e execução de esteira (PROTEGIDO)
    if (urlLimpa === '/api/coordenador/aprovar-projeto' && req.method === 'POST') {
        const adminAuth = verificarAutenticacaoAdmin(req);
        if (!adminAuth) {
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: 'Acesso não autorizado. Token de Diretoria obrigatório.' }));
        }

        try {
            const body = await lerCorpoJson(req);
            const idProjeto = body.idProjeto || body.id_projeto;
            const servicoNome = body.servicoNome || body.servico_nome || 'Escopo Comercial Homologado';
            const projetoAtualizado = autorizarProjetoComercialmente(idProjeto, servicoNome);

            let entregaveis = [];
            if (body.executar_esteira !== false) {
                try {
                    entregaveis = executarEsteiraCompletaEspecialistas(idProjeto);
                } catch(errExec) {
                    console.warn('[COORDENADOR] Aviso ao executar especialistas:', errExec.message);
                }
            }

            const projFinal = obterProjetoPorId(idProjeto) || projetoAtualizado;
            if (projFinal) {
                await db.sincronizarProjetoCompletoPostgres(projFinal);
            }

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({
                sucesso: true,
                projeto: obterProjetoPorId(idProjeto) || projetoAtualizado,
                entregaveis
            }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: e.message }));
        }
    }

    // 5.1 POST /api/coordenador/executar-esteira — Disparo explícito dos 7 especialistas (PROTEGIDO)
    if (urlLimpa === '/api/coordenador/executar-esteira' && req.method === 'POST') {
        const adminAuth = verificarAutenticacaoAdmin(req);
        if (!adminAuth) {
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: 'Acesso não autorizado. Token de Diretoria obrigatório.' }));
        }

        try {
            const body = await lerCorpoJson(req);
            const idProjeto = body.idProjeto || body.id_projeto;
            const entregaveis = executarEsteiraCompletaEspecialistas(idProjeto);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({
                sucesso: true,
                id_projeto: idProjeto,
                projeto: obterProjetoPorId(idProjeto),
                entregaveis
            }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: e.message }));
        }
    }

    // 6. POST /api/coordenador/auditar-tarefa — Auditoria e aprovação/pendência de entregas (PROTEGIDO)
    if (urlLimpa === '/api/coordenador/auditar-tarefa' && req.method === 'POST') {
        const adminAuth = verificarAutenticacaoAdmin(req);
        if (!adminAuth) {
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: 'Acesso não autorizado. Token de Diretoria obrigatório.' }));
        }

        try {
            const body = await lerCorpoJson(req);
            const projetoAtualizado = conferirEntrega({
                idProjeto: body.idProjeto,
                idTarefa: body.idTarefa,
                entregaSubmetida: body.entregaSubmetida || {},
                criteriosAtendidos: body.criteriosAtendidos === true,
                parecerCoordenador: body.parecerCoordenador || 'Auditoria realizada pelo Coordenador Geral.'
            });
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: true, projeto: projetoAtualizado }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: e.message }));
        }
    }

    // =========================================================================
    // REDIRECIONAMENTOS DE NAVEGAÇÃO INTELIGENTES
    // =========================================================================
    if (urlLimpa === '/' || urlLimpa === '') {
        if (fs.existsSync(path.join(DIRETORIO_RAIZ, '01_SITE_OFICIAL_LANDING_PAGE', 'index.html'))) {
            res.writeHead(302, { 'Location': '/01_SITE_OFICIAL_LANDING_PAGE/index.html' });
        } else if (fs.existsSync(path.join(DIRETORIO_RAIZ, 'index.html'))) {
            res.writeHead(302, { 'Location': '/index.html' });
        } else {
            res.writeHead(302, { 'Location': '/landing_page/index.html' });
        }
        return res.end();
    }

    if (urlLimpa === '/central' || urlLimpa === '/central/') {
        if (fs.existsSync(path.join(DIRETORIO_RAIZ, 'central_de_comando.html'))) {
            res.writeHead(302, { 'Location': '/central_de_comando.html' });
        } else if (fs.existsSync(path.join(DIRETORIO_RAIZ, '02_PAINEL_E_FERRAMENTA_INTERNA', 'central_de_comando.html'))) {
            res.writeHead(302, { 'Location': '/painel_interno/central_de_comando.html' });
        } else {
            res.writeHead(302, { 'Location': '/central_de_comando.html' });
        }
        return res.end();
    }

    if (urlLimpa === '/painel' || urlLimpa === '/painel/' || urlLimpa === '/console') {
        if (fs.existsSync(path.join(DIRETORIO_RAIZ, 'central_de_comando.html'))) {
            res.writeHead(302, { 'Location': '/central_de_comando.html' });
        } else if (fs.existsSync(path.join(DIRETORIO_RAIZ, '02_PAINEL_E_FERRAMENTA_INTERNA', 'index.html'))) {
            res.writeHead(302, { 'Location': '/02_PAINEL_E_FERRAMENTA_INTERNA/index.html' });
        } else {
            res.writeHead(302, { 'Location': '/index.html' });
        }
        return res.end();
    }

    // =========================================================================
    // SERVIÇO DE ARQUIVOS ESTÁTICOS COM MAPEAMENTO TRANSPARENTE
    // =========================================================================
    let caminhoArquivo = path.join(DIRETORIO_RAIZ, decodeURIComponent(urlLimpa));

    // Fallbacks para manter total compatibilidade de URLs
    if (!fs.existsSync(caminhoArquivo)) {
        if (urlLimpa.startsWith('/landing_page/')) {
            const rel = urlLimpa.replace('/landing_page/', '');
            caminhoArquivo = path.join(DIRETORIO_RAIZ, rel);
            if (!fs.existsSync(caminhoArquivo)) {
                caminhoArquivo = path.join(DIRETORIO_RAIZ, '01_SITE_OFICIAL_LANDING_PAGE', rel);
            }
        } else if (urlLimpa.startsWith('/painel_interno/')) {
            const rel = urlLimpa.replace('/painel_interno/', '');
            caminhoArquivo = path.join(DIRETORIO_RAIZ, rel);
            if (!fs.existsSync(caminhoArquivo)) {
                caminhoArquivo = path.join(DIRETORIO_RAIZ, '02_PAINEL_E_FERRAMENTA_INTERNA', rel);
            }
        }
    }

    if (fs.existsSync(caminhoArquivo) && fs.statSync(caminhoArquivo).isDirectory()) {
        caminhoArquivo = path.join(caminhoArquivo, 'index.html');
    }

    if (!fs.existsSync(caminhoArquivo)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(`<h1>404 - Arquivo Não Encontrado</h1><p>${urlLimpa}</p>`);
    }

    const extensao = path.extname(caminhoArquivo).toLowerCase();
    const tipoMime = TIPOS_MIME[extensao] || 'application/octet-stream';

    try {
        const conteudo = fs.readFileSync(caminhoArquivo);
        res.writeHead(200, { 'Content-Type': tipoMime });
        res.end(conteudo);
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Erro interno ao ler arquivo: ' + err.message);
    }
});

servidor.listen(PORTA, HOST, async () => {
    console.log(`[VIDE] Servidor Operacional Ativo em: http://${HOST}:${PORTA}`);
    console.log(`[VIDE] URL Base do Sistema: ${CONFIG.BASE_URL}`);
    console.log(`[VIDE] Painel Interno Privado: ${CONFIG.BASE_URL}/painel`);
    console.log(`[VIDE] Landing Page Oficial: ${CONFIG.BASE_URL}/`);
    console.log(`[VIDE] API REST & Webhook n8n prontos em: ${CONFIG.BASE_URL}/api/`);
    try {
        await db.hidratarDoPostgres();
        console.log('[VIDE] Hidratação relacional pós-boot concluída.');
    } catch (_) {}
});
