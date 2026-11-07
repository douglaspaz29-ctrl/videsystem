const http = require('http');
const fs = require('fs');
const path = require('path');

// Handlers Headless & Back-end Exoape Architecture
const contactHandler = require('./api/contact.js');
const workHandler = require('./api/work.js');
const studioHandler = require('./api/studio.js');
const newsHandler = require('./api/news.js');
const storyblokHandler = require('./api/storyblok.js');
const mediaHandler = require('./api/media.js');

const PORT = 8080;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(urlObj.pathname);

  // 1. API Telemetria Infraestrutura
  if (req.method === 'GET' && pathname === '/api/status/infraestrutura') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    return res.end(JSON.stringify({
      status: 'ONLINE',
      servidor: {
        status: 'ONLINE // OPERACIONAL',
        uptime: '99.98%',
        latencia: '12ms',
        ambiente: 'PRODUÇÃO VIDE OS',
        cluster: 'Bento Cockpit v9.5'
      },
      agentes: {
        total: 7,
        ativos: 7,
        lider: 'AGT-02 Coordenador Geral',
        status_cluster: 'SINCRONIZADO'
      },
      metricas: {
        leads_ativos: 184,
        receita_protegida: 'R$ 54.200',
        taxa_conversao: '38.4%',
        tempo_resposta_medio: '1.4s'
      },
      timestamp: new Date().toISOString()
    }));
  }

  // 1.1 API Funil de Perdas e Métricas
  if (req.method === 'GET' && pathname === '/api/funil/metricas') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    return res.end(JSON.stringify({
      etapas: [
        { id: '01', nome: 'DESCOBERTA', percentual: 100, perda: 'Anúncios caros sem posicionamento', solucao: 'Posicionamento de Valor Nobre' },
        { id: '02', nome: 'INTERESSE', percentual: 75, perda: 'Sites lentos e templates genéricos', solucao: 'Páginas Autorais de Alta Velocidade' },
        { id: '03', nome: 'PRIMEIRO CONTATO', percentual: 50, perda: 'Demora de horas para acolher no chat', solucao: 'Resposta Instantânea < 30 seg' },
        { id: '04', nome: 'ATENDIMENTO', percentual: 32, perda: 'Vendedor sem contexto e sem histórico', solucao: 'Transição Humana com Ficha Pronta' },
        { id: '05', nome: 'PROPOSTA', percentual: 18, perda: 'Contato esfria sem follow-up ativo', solucao: 'Régua Ativa de Reativação' },
        { id: '06', nome: 'FECHAMENTO', percentual: 12, perda: 'Sem telemetria para aprender o porquê', solucao: 'Dashboard Executivo em Tempo Real' }
      ],
      resumo: {
        conversao_global: '12.0%',
        oportunidades_protegidas_mes: 312,
        receita_recuperada_total: 'R$ 142.800,00',
        sla_resposta_medio: '18 segundos'
      },
      timestamp: new Date().toISOString()
    }));
  }

  // 1.2 API Telemetria Eventos ao Vivo
  if (req.method === 'GET' && pathname === '/api/telemetria/eventos') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    return res.end(JSON.stringify({
      eventos: [
        { id: 'EVT-904', tipo: 'QUALIFICACAO', mensagem: 'LEAD QUALIFICADO NO WHATSAPP :: TICKET > R$ 8.000 :: TEMPO RESPOSTA 14s', autor: 'AGT-01', tempo: 'Agora' },
        { id: 'EVT-903', tipo: 'TRANSICAO', mensagem: 'AGT-01 ENCAMINHOU FICHA COMPLETA PARA VENDEDOR HUMANO :: 0 LATÊNCIA', autor: 'AGT-01', tempo: '1m atrás' },
        { id: 'EVT-902', tipo: 'REATIVACAO', mensagem: 'AGT-04 DISPAROU RÉGUA ATIVA DE REATIVAÇÃO :: 3 ORÇAMENTOS RESGATADOS', autor: 'AGT-04', tempo: '3m atrás' },
        { id: 'EVT-901', tipo: 'COCKPIT', mensagem: 'COCKPIT EXECUTIVO ATUALIZADO :: RECEITA PROTEGIDA HOJE: R$ 86.400,00', autor: 'AGT-07', tempo: '5m atrás' },
        { id: 'EVT-900', tipo: 'INFRA', mensagem: 'TELEMETRIA 3D CONECTADA :: CLOUD API & N8N OPERANDO EM 100% DE CAPACIDADE', autor: 'AGT-06', tempo: '8m atrás' }
      ],
      status_rede: 'ONLINE',
      latencia_media: '14ms',
      cluster_operacional: true,
      timestamp: new Date().toISOString()
    }));
  }

  // 2. API Coordenador Instrução
  if (req.method === 'POST' && pathname === '/api/coordenador/instrucao') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let parsed = {};
      try { parsed = JSON.parse(body); } catch(e) {}
      const instrucao = parsed.instrucao || 'Diretriz executiva';
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(JSON.stringify({
        sucesso: true,
        instrucao_recebida: instrucao,
        emissor: 'AGT-02 COORDENADOR',
        parecer: `Diretriz "${instrucao}" homologada pelo Coordenador Geral. Roadmap operacional alinhado e tarefas distribuídas no cluster.`,
        timestamp: new Date().toISOString()
      }));
    });
    return;
  }

  // 2.1 API Contact & Leads (Acolhimento da Esteira)
  if (pathname.startsWith('/api/contact')) {
    return contactHandler(req, res);
  }

  // 2.2 API Work & Case Studies (Headless Projects)
  if (pathname.startsWith('/api/work')) {
    return workHandler(req, res);
  }

  // 2.3 API Studio & Manifesto (Governança & Filosofia)
  if (pathname.startsWith('/api/studio')) {
    return studioHandler(req, res);
  }

  // 2.4 API News & Editorial (Inteligência Comercial)
  if (pathname.startsWith('/api/news')) {
    return newsHandler(req, res);
  }

  // 2.5 API Storyblok CMS Parity (Arquitetura Nativa da Exoape)
  if (pathname.startsWith('/api/storyblok') || pathname.startsWith('/cdn/stories')) {
    return storyblokHandler(req, res);
  }

  // 2.6 API Media Optimization & Video Streaming
  if (pathname.startsWith('/api/media')) {
    return mediaHandler(req, res);
  }

  // 2.7 API Health & Explorer Geral
  if (pathname === '/api' || pathname === '/api/' || pathname === '/api/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    return res.end(JSON.stringify({
      nome: 'VIDE Sovereign Architecture — Back-end Exoape & Multi-Agent API',
      status: 'ONLINE // OPERACIONAL',
      versao: '2.4.0',
      diretoria: 'Douglas — Diretor Executivo da VIDE',
      stack_referencia: {
        frontend: 'Nuxt / HTML5 Motion Canvas (GSAP + Lenis)',
        cms_backend: 'Storyblok Headless Content Delivery Engine',
        edge_api: 'Vercel Serverless / Node.js High-Concurrency Engine'
      },
      endpoints: [
        { metodo: 'POST', rota: '/api/contact', desc: 'Acolhimento de leads e envio prioritário para WhatsApp / AGT-01' },
        { metodo: 'GET', rota: '/api/contact/leads', desc: 'Auditoria dos leads cadastrados na esteira' },
        { metodo: 'GET', rota: '/api/work', desc: 'Catálogo headless dos 14 projetos e estudos de caso com mídias' },
        { metodo: 'GET', rota: '/api/studio', desc: 'Manifesto, metodologia, governança de Douglas e prêmios internacionais' },
        { metodo: 'GET', rota: '/api/news', desc: 'Feed editorial de inteligência comercial e telemetria' },
        { metodo: 'GET', rota: '/api/storyblok/cdn/stories/:slug', desc: 'Motor Storyblok nativo com árvore de componentes JSON' },
        { metodo: 'GET', rota: '/api/media/catalog', desc: 'Catálogo de streaming de vídeo 60fps e imagens em alta definição' },
        { metodo: 'GET', rota: '/api/status/infraestrutura', desc: 'Status do servidor, cluster dos 7 agentes e métricas vivas' },
        { metodo: 'GET', rota: '/api/funil/metricas', desc: 'Benchmark das etapas de perda e receita protegida' },
        { metodo: 'GET', rota: '/api/telemetria/eventos', desc: 'Stream de eventos em tempo real para a esfera 3D e HUD' },
        { metodo: 'POST', rota: '/api/coordenador/instrucao', desc: 'Submissão de diretrizes para o AGT-02 Coordenador Geral' }
      ],
      timestamp: new Date().toISOString()
    }, null, 2));
  }

  // 3. Roteamento de Páginas & Arquivos Estáticos
  let relativePath = pathname;
  if (relativePath === '/') {
    relativePath = '/index.html';
  } else if (relativePath === '/central_de_comando' || relativePath === '/central_de_comando/') {
    relativePath = '/central_de_comando.html';
  } else if (relativePath === '/work' || relativePath === '/work/') {
    relativePath = '/work.html';
  } else if (relativePath === '/studio' || relativePath === '/studio/') {
    relativePath = '/studio.html';
  } else if (relativePath === '/news' || relativePath === '/news/') {
    relativePath = '/news.html';
  } else if (relativePath === '/contact' || relativePath === '/contact/') {
    relativePath = '/contact.html';
  }

  let full = path.join(__dirname, relativePath);

  // Se for diretório, tenta index.html dentro dele
  if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
    const candidate = path.join(full, 'index.html');
    if (fs.existsSync(candidate)) {
      full = candidate;
    }
  }

  const ext = path.extname(full);
  if (fs.existsSync(full) && fs.statSync(full).isFile()) {
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(full).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found: ' + pathname);
  }
});

server.listen(PORT, () => {
  console.log(`VIDE EXOAPE Experience running at http://localhost:${PORT}`);
});
