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
      codigo: 'FRENTE 01 // ENTRADA & CONTATO',
      status: 'DISCIPLINA ATIVA',
      titulo: 'ATENDIMENTO & TRIAGEM',
      role: 'Acolhimento e Organização Inicial de Demandas no WhatsApp',
      desc: 'Estrutura o primeiro contato para acolher mensagens rapidamente, identificar a intenção do cliente, reunir as informações essenciais e encaminhar a conversa pronta para a equipe humana dar continuidade ao atendimento.',
      sla: 'ACOLHIMENTO ÁGIL',
      stack: 'WHATSAPP & FLUXOS DIGITAIS'
    },
    {
      codigo: 'FRENTE 02 // ESTRATÉGIA & GESTÃO',
      status: 'DISCIPLINA ATIVA',
      titulo: 'COORDENAÇÃO GERAL',
      role: 'Orquestração de Projetos e Acompanhamento de Entregas',
      desc: 'Traduz os objetivos comerciais da empresa em planos de ação práticos, organizando prioridades, prazos e garantindo que cada solução entregue cumpra com rigor o escopo combinado.',
      sla: 'GESTÃO ÁGIL',
      stack: 'PLANEJAMENTO OPERACIONAL'
    },
    {
      codigo: 'FRENTE 03 // DESIGN & EXPERIÊNCIA',
      status: 'DISCIPLINA ATIVA',
      titulo: 'ARQUITETURA VISUAL',
      role: 'Design de Interfaces e Experiência de Navegação',
      desc: 'Desenvolve a arquitetura visual de páginas institucionais e comerciais, organizando as informações de forma intuitiva para transmitir credibilidade e valorizar a marca.',
      sla: 'FOCO EM USABILIDADE',
      stack: 'FIGMA & UI/UX'
    },
    {
      codigo: 'FRENTE 04 // MENSAGEM & CONTEÚDO',
      status: 'DISCIPLINA ATIVA',
      titulo: 'COMUNICAÇÃO COMERCIAL',
      role: 'Mensagem de Valor e Argumentação Estratégica',
      desc: 'Elabora argumentos claros e objetivos que comunicam os diferenciais do negócio, facilitando o entendimento do cliente em páginas, mensagens e apresentações comerciais.',
      sla: 'CLAREZA COMERCIAL',
      stack: 'COPYWRITING ESTRATÉGICO'
    },
    {
      codigo: 'FRENTE 05 // DESENVOLVIMENTO WEB',
      status: 'DISCIPLINA ATIVA',
      titulo: 'ENGENHARIA FRONT-END',
      role: 'Construção de Páginas Rápidas e Responsivas',
      desc: 'Desenvolve páginas leves em código moderno com foco em rapidez no celular, acessibilidade e fluidez de navegação, sem excesso de ferramentas pesadas.',
      sla: 'ALTA PERFORMANCE',
      stack: 'HTML5 / CSS / JAVASCRIPT'
    },
    {
      codigo: 'FRENTE 06 // PROCESSOS & APIS',
      status: 'DISCIPLINA ATIVA',
      titulo: 'INTEGRAÇÃO DE SISTEMAS',
      role: 'Conexão entre Canais de Atendimento, Formulários e CRM',
      desc: 'Conecta ferramentas digitais, webhooks e automações para que os dados comerciais circulem sem perdas entre o site, o WhatsApp e as rotinas da equipe.',
      sla: 'FLUXO CONTÍNUO',
      stack: 'APIS, WEBHOOKS & N8N'
    },
    {
      codigo: 'FRENTE 07 // DADOS & INDICADORES',
      status: 'DISCIPLINA ATIVA',
      titulo: 'INTELIGÊNCIA DE DADOS',
      role: 'Organização de Indicadores e Relatórios Comerciais',
      desc: 'Estrutura painéis simples que mostram os números reais da operação: volume de contatos recebidos, etapas com maior desistência e fontes de oportunidades, embasando decisões com segurança.',
      sla: 'VISÃO PRÁTICA',
      stack: 'PAINÉIS DE INDICADORES'
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
      { threshold: 0.05, rootMargin: "50px" }
    );

    observer.observe(container);
    // Fallback de ativação do funil
    setTimeout(() => {
      if (!executado) {
        executado = true;
        rows.forEach((row) => {
          const targetWidth = row.getAttribute('data-target-width') || '50%';
          const bar = row.querySelector('.funil-barra-progresso');
          const badge = row.querySelector('.funil-pct-badge');
          if (bar) bar.style.width = targetWidth;
          if (badge) badge.textContent = targetWidth;
        });
      }
    }, 1500);
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
    let attempts = 0;
    function tryInit() {
      if (typeof window.criarDotGrid === 'function') {
        const c1 = document.getElementById('dotgrid-solucoes');
        if (c1 && !c1.querySelector('canvas')) {
          window.criarDotGrid(c1, {
            baseColor: '#2C3A58',
            activeColor: '#00E5FF',
            shape: 'circle',
            dotSize: 5.5,
            gap: 18,
            proximity: 160,
            strength: 1.3,
            bounce: 0.6,
            tension: 0.4,
            returnDuration: 0.8,
            shockRadius: 360,
            shockStrength: 5,
            swell: 0.9,
            stretch: 0.5,
            glow: 0.75,
            fade: 0,
            intro: true
          });
        }
        const c2 = document.getElementById('dotgrid-agentes');
        if (c2 && !c2.querySelector('canvas')) {
          window.criarDotGrid(c2, {
            baseColor: '#2C3A58',
            activeColor: '#00E5FF',
            shape: 'circle',
            dotSize: 5.5,
            gap: 18,
            proximity: 160,
            strength: 1.3,
            bounce: 0.6,
            tension: 0.4,
            returnDuration: 0.8
          });
        }
      } else if (attempts++ < 60) {
        setTimeout(tryInit, 50);
      }
    }
    tryInit();
  }

  // =========================================================================
  // 7. FAQ ACORDEÃO INTERATIVO (PRINCIPAIS DÚVIDAS)
  // =========================================================================
  let lastFaqToggleTime = 0;
  let lastFaqToggledItem = null;

  function executarToggleFaq(item) {
    if (!item) return;
    const now = Date.now();
    if (lastFaqToggledItem === item && (now - lastFaqToggleTime) < 220) {
      return;
    }
    lastFaqToggleTime = now;
    lastFaqToggledItem = item;

    const isAtivo = item.classList.contains('ativo');
    const all = document.querySelectorAll('.faq-item');
    all.forEach(i => {
      if (i !== item) i.classList.remove('ativo');
    });

    if (isAtivo) {
      item.classList.remove('ativo');
    } else {
      item.classList.add('ativo');
    }

    if (typeof ScrollTrigger !== 'undefined') {
      setTimeout(() => ScrollTrigger.refresh(), 350);
    }
  }

  // Fallback global acessível via window
  window.toggleFaqItem = function(target) {
    const item = target ? target.closest('.faq-item') : null;
    executarToggleFaq(item);
  };

  function inicializarFaqAcordeao() {
    // Escuta delegada unificada que intercepta cliques em qualquer parte do botão
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.faq-pergunta');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const item = btn.closest('.faq-item');
        executarToggleFaq(item);
      }
    });
  }

  // =========================================================================
  // 8. INICIALIZAÇÃO GERAL
  // =========================================================================
  function initSecoesEspecificas() {
    inicializarFunilScrollInterativo();
    inicializarAccordionGallery();
    inicializarCrystalizedBall();
    inicializarLiveTelemetryHUD();
    inicializarFaqAcordeao();
    try { inicializarDotGrids(); } catch(e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSecoesEspecificas);
  } else {
    initSecoesEspecificas();
  }
})();
