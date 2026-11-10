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
const moduloAgentesDir = fs.existsSync(path.join(__dirname, '03_AGENTES_DE_IA_E_TRIAGEM')) 
    ? './03_AGENTES_DE_IA_E_TRIAGEM' 
    : './equipe_digital_vide';

const CONFIG = require(`${moduloAgentesDir}/config_ambiente`);
const PORTA = CONFIG.PORTA;
const HOST = CONFIG.HOST;
const DIRETORIO_RAIZ = __dirname;

const { executarFluxoTriagemParaCoordenador } = require(`${moduloAgentesDir}/conexao_triagem_coordenador`);
const { obterProjetoPorId, listarProjetos } = require(`${moduloAgentesDir}/agente_02_coordenador/repositorio_projetos_tarefas`);
const {
    autorizarProjetoComercialmente,
    interpretarComandoDiretora,
    conferirEntrega
} = require(`${moduloAgentesDir}/agente_02_coordenador/executor_coordenador`);
const { seguranca } = require(`${moduloAgentesDir}/seguranca`);
const { db } = require(`${moduloAgentesDir}/banco_dados`);
const { whatsAppService } = require(`${moduloAgentesDir}/whatsapp_business_integration`);
const { storageService } = require(`${moduloAgentesDir}/storage_service`);

const TIPOS_MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
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
                inteligencia_artificial: {
                    gemini: CONFIG.GEMINI_API_KEY ? 'CONECTADO_API_EXTERNA' : 'AGUARDANDO_CHAVE (Fallback Cognitivo Ativo)',
                    openai: CONFIG.OPENAI_API_KEY ? 'CONECTADO_API_EXTERNA' : 'DESATIVADO'
                },
                automacao_n8n: {
                    url_configurada: CONFIG.N8N_URL,
                    tipo: CONFIG.N8N_URL.includes('localhost') ? 'LOCAL' : 'REMOTO_NUVEM'
                }
            }
        };
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payloadStatus, null, 2));
    }

    // 1. GET /api/projetos — Lista todos os projetos completos com suas tarefas
    if (urlLimpa === '/api/projetos' && req.method === 'GET') {
        const indice = listarProjetos();
        const projetosCompletos = indice.map(p => obterProjetoPorId(p.id_projeto)).filter(Boolean);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ sucesso: true, projetos: projetosCompletos }));
    }

    // 2. GET /api/projetos/:id — Retorna detalhes de um projeto específico
    if (urlLimpa.startsWith('/api/projetos/') && req.method === 'GET') {
        const idProjeto = decodeURIComponent(urlLimpa.replace('/api/projetos/', ''));
        const projeto = obterProjetoPorId(idProjeto);
        if (!projeto) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: 'Projeto não encontrado' }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ sucesso: true, projeto }));
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

    // 4. POST /api/coordenador/comando ou /api/coordenador/instrucao — Chat e comandos executivos da Diretoria
    if ((urlLimpa === '/api/coordenador/comando' || urlLimpa === '/api/coordenador/instrucao') && req.method === 'POST') {
        try {
            const body = await lerCorpoJson(req);
            const comando = body.comando || body.instrucao || '';
            const resposta = interpretarComandoDiretora(comando);
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

    // 5. POST /api/coordenador/aprovar-projeto — Aprovação formal de contratação (PROTEGIDO)
    if (urlLimpa === '/api/coordenador/aprovar-projeto' && req.method === 'POST') {
        const adminAuth = verificarAutenticacaoAdmin(req);
        if (!adminAuth) {
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: false, erro: 'Acesso não autorizado. Token de Diretoria obrigatório.' }));
        }

        try {
            const body = await lerCorpoJson(req);
            const idProjeto = body.idProjeto;
            const servicoNome = body.servicoNome || 'Escopo Comercial Homologado';
            const projetoAtualizado = autorizarProjetoComercialmente(idProjeto, servicoNome);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ sucesso: true, projeto: projetoAtualizado }));
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
        if (fs.existsSync(path.join(DIRETORIO_RAIZ, '01_SITE_OFICIAL_LANDING_PAGE'))) {
            res.writeHead(302, { 'Location': '/01_SITE_OFICIAL_LANDING_PAGE/index.html' });
        } else {
            res.writeHead(302, { 'Location': '/landing_page/index.html' });
        }
        return res.end();
    }

    if (urlLimpa === '/central' || urlLimpa === '/central/' || urlLimpa === '/central_de_comando.html') {
        res.writeHead(302, { 'Location': '/painel_interno/central_de_comando.html' });
        return res.end();
    }

    if (urlLimpa === '/painel' || urlLimpa === '/painel/' || urlLimpa === '/console') {
        if (fs.existsSync(path.join(DIRETORIO_RAIZ, '02_PAINEL_E_FERRAMENTA_INTERNA'))) {
            res.writeHead(302, { 'Location': '/02_PAINEL_E_FERRAMENTA_INTERNA/index.html' });
        } else {
            res.writeHead(302, { 'Location': '/painel_interno/index.html' });
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
            caminhoArquivo = path.join(DIRETORIO_RAIZ, '01_SITE_OFICIAL_LANDING_PAGE', urlLimpa.replace('/landing_page/', ''));
        } else if (urlLimpa.startsWith('/painel_interno/')) {
            caminhoArquivo = path.join(DIRETORIO_RAIZ, '02_PAINEL_E_FERRAMENTA_INTERNA', urlLimpa.replace('/painel_interno/', ''));
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

servidor.listen(PORTA, HOST, () => {
    console.log(`[VIDE] Servidor Operacional Ativo em: http://${HOST}:${PORTA}`);
    console.log(`[VIDE] URL Base do Sistema: ${CONFIG.BASE_URL}`);
    console.log(`[VIDE] Painel Interno Privado: ${CONFIG.BASE_URL}/painel`);
    console.log(`[VIDE] Landing Page Oficial: ${CONFIG.BASE_URL}/`);
    console.log(`[VIDE] API REST & Webhook n8n prontos em: ${CONFIG.BASE_URL}/api/`);
});
