/**
 * =========================================================================
 * VIDE — MOTOR DAS SEÇÕES ESPECÍFICAS
 * 1. Funil de Perdas (Preenchimento em cascata & contadores dinâmicos)
 * 2. A Suíte Integrada (Accordion 3D interativo com expansão)
 * 3. Telemetria e Dados Vivos (Esfera de Plasma 3D & HUD conectado ao backend)
 * 4. Cluster dos 7 Agentes (DepthCarousel 3D & Inspetor com especificação)
 * =========================================================================
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. DADOS OFICIAIS DOS 7 AGENTES
  // =========================================================================
  const agentesData = [
    {
      codigo: 'AGT-01 // OPERAÇÃO & ENTRADA',
      status: 'ATIVO EM TEMPO REAL',
      titulo: 'TRIAGEM COMERCIAL',
      role: 'Acolhimento e Qualificação Instantânea no WhatsApp',
      desc: 'Recebe e acolhe contatos que chegam pelos canais oficiais da empresa em menos de 20 segundos. Identifica com precisão cirúrgica a intenção de compra, filtra curiosos e classifica o nível de prioridade comercial antes de acionar a equipe humana.',
      sla: '< 20 SEGUNDOS',
      stack: 'CLOUD API & N8N'
    },
    {
      codigo: 'AGT-02 // LIDERANÇA & GOVERNANÇA',
      status: 'LÍDER DA ESTEIRA',
      titulo: 'COORDENADOR GERAL',
      role: 'Orquestração do Roadmap e Auditoria de Entregas',
      desc: 'Recebe diretrizes da Diretoria Executiva (Douglas Paz), decompõe metas comerciais em tarefas técnicas acionáveis, distribui na esteira e audita o resultado de cada entrega antes de ir para homologação final.',
      sla: 'TEMPO REAL',
      stack: 'ORQUESTRADOR NATIVO'
    },
    {
      codigo: 'AGT-03 // DESIGN & AUTORIDADE',
      status: 'ATIVO',
      titulo: 'ARQUITETO DE PRESENÇA',
      role: 'Design de Interfaces Autorais & Hierarquia de Conversão',
      desc: 'Projeta a arquitetura de informação, jornada visual do usuário e wireframes de alto padrão. Elimina o aspecto genérico de templates de IA para posicionar a marca do cliente como líder indiscutível do seu segmento.',
      sla: 'SPRINT ÁGIL',
      stack: 'FIGMA & UI/UX'
    },
    {
      codigo: 'AGT-04 // PERSUASÃO & BRANDING',
      status: 'ATIVO',
      titulo: 'COPYWRITER DE PRESTÍGIO',
      role: 'Mensagem de Valor, Storytelling e Copywriting Comercial',
      desc: 'Desenvolve argumentos de vendas fundamentados em psicologia de decisão e princípios AIDA. Escreve títulos impactantes, abordagens de WhatsApp sem atrito e propostas comerciais que convertem com tickets mais altos.',
      sla: 'SPRINT ÁGIL',
      stack: 'COPYWRITING & STORYTELLING'
    },
    {
      codigo: 'AGT-05 // CÓDIGO & PERFORMANCE',
      status: 'ATIVO',
      titulo: 'ENGENHEIRO FRONT-END',
      role: 'Desenvolvimento Web Ultra-Rápido & Motion Design',
      desc: 'Codifica interfaces modernas em HTML5, CSS3 avançado e Vanilla JavaScript puro a 60 FPS. Garante carregamento instantâneo no celular do comprador (< 1.5s) e interações fluidas sem bibliotecas pesadas.',
      sla: '< 1.5s NO CELULAR',
      stack: 'HTML5 / CSS3 / VANILLA JS'
    },
    {
      codigo: 'AGT-06 // INFRAESTRUTURA & APIS',
      status: 'ATIVO',
      titulo: 'ENGENHEIRO DE INTEGRAÇÕES',
      role: 'Conexão de Webhooks, APIs Oficiais e Automação n8n',
      desc: 'Integra a API oficial do WhatsApp Business, Webhooks seguros com assinatura criptográfica HMAC SHA-256 e fluxos n8n para fluxo de dados ininterrupto entre o site, o CRM e o celular da equipe comercial.',
      sla: 'RESILIENTE 24/7',
      stack: 'REST API & DOCKER'
    },
    {
      codigo: 'AGT-07 // TELEMETRIA & AUDITORIA',
      status: 'MONITORANDO',
      titulo: 'AUDITOR DE TELEMETRIA',
      role: 'Inteligência de Dados e Monitoramento de Gargalos',
      desc: 'Mede cada evento comercial ao vivo: tempo de resposta da equipe, taxa de desistência por etapa e faturamento recuperado. Alimenta o Cockpit Executivo com dados reais para orientar decisões da diretoria.',
      sla: 'CONTÍNUO',
      stack: 'DASHBOARD & TELEMETRIA'
    }
  ];

  window.atualizarInspetorAgente = function (idx) {
    const card = document.getElementById('agent-inspector-card');
    if (!card) return;
    const data = agentesData[idx] || agentesData[0];

    card.style.opacity = '0.35';
    card.style.transform = 'translateY(6px)';

    setTimeout(() => {
      const b = document.getElementById('insp-badge');
      const s = document.getElementById('insp-status');
      const t = document.getElementById('insp-title');
      const r = document.getElementById('insp-role');
      const d = document.getElementById('insp-desc');
      const sla = document.getElementById('insp-sla');
      const stack = document.getElementById('insp-stack');

      if (b) b.textContent = data.codigo;
      if (s) s.innerHTML = '<i class="fas fa-circle" style="font-size: 7px;"></i> ' + data.status;
      if (t) t.textContent = data.titulo;
      if (r) r.textContent = data.role;
      if (d) d.textContent = data.desc;
      if (sla) sla.textContent = data.sla;
      if (stack) stack.textContent = data.stack;

      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 180);
  };

  // =========================================================================
  // 2. FUNIL DE PERDAS INTERATIVO
  // =========================================================================
  function inicializarFunilScrollInterativo() {
    const container = document.querySelector('.funil-pipeline-container');
    if (!container) return;

    const rows = container.querySelectorAll('.funil-etapa-row');
    rows.forEach((row) => {
      const bar = row.querySelector('.funil-barra-progresso');
      if (bar) {
        bar.style.width = '0%';
      }
    });

    let executado = false;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !executado) {
            executado = true;
            rows.forEach((row, idx) => {
              const targetWidth = row.getAttribute('data-target-width') || '50%';
              const bar = row.querySelector('.funil-barra-progresso');
              const badge = row.querySelector('.funil-pct-badge');
              const targetNum = parseInt(targetWidth, 10) || 50;

              setTimeout(() => {
                if (bar) bar.style.width = targetWidth;

                if (badge) {
                  let start = 0;
                  const duration = 1200;
                  const startTime = performance.now();

                  function step(now) {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easeVal = 1 - Math.pow(1 - progress, 3);
                    const current = Math.round(start + (targetNum - start) * easeVal);
                    badge.textContent = current + '%';

                    if (progress < 1) {
                      requestAnimationFrame(step);
                    }
                  }
                  requestAnimationFrame(step);
                }
              }, idx * 140);
            });
          }
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(container);
  }

  // =========================================================================
  // 3. A SUÍTE INTEGRADA (ACCORDION DE ALTA FIDELIDADE)
  // =========================================================================
  function inicializarAccordionGallery() {
    const paineis = document.querySelectorAll('.accordion-panel');
    if (!paineis.length) return;

    paineis.forEach((panel) => {
      panel.addEventListener('mouseenter', () => {
        paineis.forEach((p) => p.classList.remove('active'));
        panel.classList.add('active');
      });

      panel.addEventListener('click', () => {
        paineis.forEach((p) => p.classList.remove('active'));
        panel.classList.add('active');
      });

      panel.addEventListener('mousemove', (e) => {
        const rect = panel.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const tiltX = -(y / rect.height) * 5;
        const tiltY = (x / rect.width) * 5;
        panel.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      });

      panel.addEventListener('mouseleave', () => {
        panel.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
      });
    });
  }

  // =========================================================================
  // 4. ESFERA DE PLASMA 3D (TELEMETRIA E DADOS VIVOS)
  // =========================================================================
  function inicializarCrystalizedBall() {
    const canvas = document.getElementById('canvas-crystalized-ball');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.clientWidth || 600;
    let height = canvas.clientHeight || 500;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    window.addEventListener('resize', () => {
      width = canvas.clientWidth || 600;
      height = canvas.clientHeight || 500;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    });

    const raio = Math.min(width, height) * 0.44;
    const totalParticulas = 460;
    const particulas = [];

    for (let i = 0; i < totalParticulas; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      particulas.push({
        x: raio * Math.sin(phi) * Math.cos(theta),
        y: raio * Math.sin(phi) * Math.sin(theta),
        z: raio * Math.cos(phi),
        tamanho: Math.random() * 2.5 + 1.2,
        brilho: Math.random() * 0.6 + 0.4
      });
    }

    let rotX = 0.0025;
    let rotY = 0.0055;
    let mouse = { x: width / 2, y: height / 2, hover: false };

    // Acoplamento de rotação com o Scroll
    window.aplicarScrollNaEsfera3D = function (velocity) {
      if (Math.abs(velocity) > 0.05) {
        rotY += velocity * 0.00004;
        rotX += velocity * 0.00002;
      }
    };

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.hover = true;
    });

    canvas.addEventListener('mouseleave', () => {
      mouse.hover = false;
    });

    function animarPlasma() {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const fl = 480;

      if (mouse.hover) {
        rotY += ((mouse.x - centerX) * 0.00008 - rotY) * 0.1;
        rotX += ((mouse.y - centerY) * 0.00008 - rotX) * 0.1;
      }

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      const projetados = [];

      particulas.forEach((p) => {
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.z * cosY + p.x * sinY;
        let y2 = p.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.y * sinX;

        p.x = x1;
        p.y = y2;
        p.z = z2;

        const scale = fl / (fl + z2);
        const projX = centerX + x1 * scale;
        const projY = centerY + y2 * scale;
        const alpha = Math.max(0.12, (z2 + raio) / (raio * 2));

        projetados.push({ x: projX, y: projY, z: z2, alpha, tamanho: p.tamanho * scale });

        ctx.beginPath();
        ctx.arc(projX, projY, p.tamanho * scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 229, 255, ${alpha * 0.9})`;
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = alpha > 0.6 ? 12 : 4;
        ctx.fill();
      });

      // Conexões estelares entre partículas próximas
      ctx.shadowBlur = 0;
      for (let i = 0; i < projetados.length; i += 3) {
        for (let j = i + 1; j < projetados.length; j += 4) {
          const dx = projetados[i].x - projetados[j].x;
          const dy = projetados[i].y - projetados[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 46) {
            ctx.beginPath();
            ctx.moveTo(projetados[i].x, projetados[i].y);
            ctx.lineTo(projetados[j].x, projetados[j].y);
            const lineAlpha = (1 - dist / 46) * 0.22 * Math.min(projetados[i].alpha, projetados[j].alpha);
            ctx.strokeStyle = `rgba(0, 229, 255, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(animarPlasma);
    }

    animarPlasma();
  }

  // =========================================================================
  // 5. HUD DE TELEMETRIA AO VIVO (Conectado ao Backend Node.js / Vercel API)
  // =========================================================================
  function inicializarLiveTelemetryHUD() {
    const logEl = document.getElementById('telemetry-hud-log-text');
    if (!logEl) return;

    const streams = [
      'LEAD QUALIFICADO NO WHATSAPP :: TICKET > R$ 8.000 :: TEMPO RESPOSTA 14s',
      'AGT-01 ENCAMINHOU FICHA COMPLETA PARA VENDEDOR HUMANO :: 0 LATÊNCIA',
      'AGT-04 DISPAROU RÉGUA ATIVA DE REATIVAÇÃO :: 3 ORÇAMENTOS RESGATADOS',
      'COCKPIT EXECUTIVO ATUALIZADO :: RECEITA PROTEGIDA HOJE: R$ 86.400,00',
      'TELEMETRIA 3D CONECTADA :: CLOUD API & N8N OPERANDO EM 100% DE CAPACIDADE'
    ];

    let index = 0;

    // Conectar ao backend para obter métricas reais se disponível
    async function sincronizarComBackend() {
      try {
        const res = await fetch('/api/telemetria/eventos');
        if (res.ok) {
          const data = await res.json();
          if (data.eventos && Array.isArray(data.eventos)) {
            data.eventos.slice().reverse().forEach(evt => {
              if (evt.mensagem && !streams.includes(evt.mensagem)) {
                streams.unshift(evt.mensagem);
              }
            });
          }
        }
      } catch (e) {}

      try {
        const res2 = await fetch('/api/status/infraestrutura');
        if (res2.ok) {
          const data = await res2.json();
          if (data.metricas) {
            streams.unshift(
              `BACKEND ONLINE :: ${data.metricas.leads_ativos} LEADS ATIVOS :: RECEITA PROTEGIDA: ${data.metricas.receita_protegida} :: LATÊNCIA ${data.servidor.latencia}`
            );
          }
        }
      } catch (e) {}
    }
    sincronizarComBackend();

    setInterval(() => {
      logEl.style.opacity = '0';
      logEl.style.transform = 'translateY(4px)';

      setTimeout(() => {
        index = (index + 1) % streams.length;
        logEl.textContent = streams[index];
        logEl.style.opacity = '1';
        logEl.style.transform = 'translateY(0)';
      }, 220);
    }, 2800);
  }

  // =========================================================================
  // 6. FUNDO ANIMADO DOTGRID (BOLINHAS CYBER)
  // =========================================================================
  function inicializarDotGrids() {
    if (!window.criarDotGrid) return;
    const c1 = document.getElementById('dotgrid-solucoes');
    if (c1) {
      window.criarDotGrid(c1, {
        baseColor: '#3a3446',
        activeColor: '#106f80',
        shape: 'circle',
        dotSize: 5,
        gap: 18,
        proximity: 140,
        strength: 1,
        bounce: 0.6,
        tension: 0.4,
        returnDuration: 0.8
      });
    }
    const c2 = document.getElementById('dotgrid-agentes');
    if (c2) {
      window.criarDotGrid(c2, {
        baseColor: '#1e293b',
        activeColor: '#00E5FF',
        shape: 'circle',
        dotSize: 5,
        gap: 18,
        proximity: 160,
        strength: 1.2,
        bounce: 0.6,
        tension: 0.4,
        returnDuration: 0.8
      });
    }
  }

  // =========================================================================
  // 7. INICIALIZAÇÃO GERAL
  // =========================================================================
  function initSecoesEspecificas() {
    inicializarFunilScrollInterativo();
    inicializarAccordionGallery();
    inicializarCrystalizedBall();
    inicializarLiveTelemetryHUD();
    try { inicializarDotGrids(); } catch(e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSecoesEspecificas);
  } else {
    initSecoesEspecificas();
  }
})();
