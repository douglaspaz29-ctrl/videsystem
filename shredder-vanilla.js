/**
 * =====================================================================
 * REACT BITS — SHREDDER (VANILLA JAVASCRIPT RUNTIME FOR VIDE)
 * Componente Oficial: Shredder (React Bits / DavidHDev)
 * 
 * Physics Engine:
 * - High-speed Roller Slit Feeding & Mechanical Tug
 * - Sliced Canvas Strips with Sinusoidal Curl & Flutter Wave Physics
 * - 2D Spring Physics (Hooke's law with damping decay)
 * - Pointer Drag-to-Feed with autoFeed threshold & bite detection
 * - Real-time Answer Dossier reveal upon question shredding
 * =====================================================================
 */

(function () {
  'use strict';

  // Constantes de física originais do React Bits Shredder
  const FOLLOW = 30;
  const SETTLE = 16;
  const TUG = 2.4;
  const TUG_DECAY = 0.14;
  const SLIT = 6;
  const OVER = 40;
  const SLIVER = 2;
  const STACK_K = 320;
  const STACK_C = 22;
  const STAGGER = 0.035;
  const ENTER = 22;
  const HYSTERESIS = 8;
  const DEG = Math.PI / 180;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const ease = (from, to, dt, tau) => from + (to - from) * (1 - Math.exp(-dt / tau));
  const smooth = t => {
    const u = clamp(t, 0, 1);
    return u * u * (3 - 2 * u);
  };
  const pick = (lo, hi) => lo + Math.random() * (hi - lo);
  const side = () => (Math.random() < 0.5 ? -1 : 1);
  const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const spring = (p, v, target, dt, omega) => {
    const offset = p - target;
    const term = v + omega * offset;
    const decay = Math.exp(-omega * dt);
    return [target + (offset + term * dt) * decay, (v - omega * term * dt) * decay];
  };

  // Base de Conhecimento Oficial — 11 Dúvidas Estratégicas VIDE
  const FAQ_DATA = [
    {
      id: 1,
      num: "DÚVIDA 01",
      name: "O que é a VIDE e em que ela se diferencia?",
      fullTitle: "1. O que é a VIDE e em que ela se diferencia de uma agência tradicional ou empresa de software?",
      category: "CONCEITO & MODELO",
      answer: "A VIDE conecta estratégia de marketing, presença digital, automação comercial e inteligência de dados em um sistema único de crescimento. Diferente de uma agência convencional focada apenas em publicidade ou de empresas que apenas vendem licenças de software, nós estruturamos e conectamos toda a rotina comercial da sua empresa — desde a atração qualificada até o atendimento e a análise de indicadores —, garantindo organização, previsibilidade e evitando que oportunidades valiosas sejam perdidas no dia a dia."
    },
    {
      id: 2,
      num: "DÚVIDA 02",
      name: "Preciso contratar todas as 4 frentes de uma vez?",
      fullTitle: "2. A minha empresa precisa contratar todas as quatro frentes de atuação de uma vez?",
      category: "CONTRATAÇÃO MODULAR",
      answer: "Não. As quatro frentes da VIDE — Estratégia de Marketing, Presença e Experiências Digitais, Automação Comercial e Atendimento, e Inteligência Comercial e Dados — funcionam de forma modular e independente. Você pode contratar frentes pontuais conforme a necessidade imediata da sua operação (como a reformulação de um site profissional ou a organização do acolhimento no WhatsApp) ou optar pela operação integrada conforme a maturidade do negócio."
    },
    {
      id: 3,
      num: "DÚVIDA 03",
      name: "A automação substitui atendentes humanos?",
      fullTitle: "3. A automação de atendimento substitui os vendedores e atendentes humanos da minha equipe?",
      category: "OPERAÇÃO & EQUIPE",
      answer: "De forma alguma. A automação não substitui o fator humano; ela o valoriza e o protege da sobrecarga operacional. O sistema atua nos primeiros instantes para realizar o acolhimento imediato, responder dúvidas frequentes e organizar a triagem inicial do interessado. Quando o cliente demonstra intenção real de contratação, a conversa é transferida para o vendedor humano com o contexto e o resumo das informações já organizados na tela."
    },
    {
      id: 4,
      num: "DÚVIDA 04",
      name: "Para quais portes de negócios a VIDE é recomendada?",
      fullTitle: "4. Para quais tipos e portes de negócios as soluções da VIDE são recomendadas?",
      category: "PERFIL DE EMPRESA",
      answer: "Nossas soluções são voltadas principalmente para pequenas e médias empresas, consultorias, escritórios de serviços qualificados (advocacia, engenharia, arquitetura), clínicas e empresas B2B que já possuem produtos ou serviços validados e contatos ativos, mas sentem gargalos como desorganização no WhatsApp, demora no envio de orçamentos ou falta de clareza sobre quais ações realmente trazem retorno."
    },
    {
      id: 5,
      num: "DÚVIDA 05",
      name: "Preciso trocar o número de WhatsApp ou ferramentas?",
      fullTitle: "5. Preciso trocar o número de WhatsApp da minha empresa ou trocar as ferramentas que já utilizamos?",
      category: "INFRAESTRUTURA",
      answer: "Não. As soluções da VIDE são desenvolvidas para se conectar diretamente aos números de WhatsApp comercial e às ferramentas que sua empresa já utiliza no cotidiano (como CRMs, planilhas, sistemas de gestão e contas de e-mail). Toda a sua carteira de contatos, histórico de conversas e identidade visual permanecem 100% sob o controle do seu negócio."
    },
    {
      id: 6,
      num: "DÚVIDA 06",
      name: "Como é o processo de implantação após o fechamento?",
      fullTitle: "6. Como é estruturado o processo de implantação da VIDE após o fechamento?",
      category: "METODOLOGIA & ETAPAS",
      answer: "Trabalhamos em um fluxo transparente de quatro etapas: 1) Diagnóstico aprofundado e mapeamento dos gargalos operacionais; 2) Planejamento estratégico de mensagem, presença e regras de automação; 3) Desenvolvimento técnico com criação visual e configuração dos fluxos; e 4) Homologação com testes práticos, treinamento da sua equipe e entrega dos painéis de acompanhamento."
    },
    {
      id: 7,
      num: "DÚVIDA 07",
      name: "Qual é o prazo médio de entrega dos projetos?",
      fullTitle: "7. Qual é o prazo médio para o desenvolvimento e entrega dos projetos?",
      category: "CRONOGRAMA",
      answer: "Os prazos são definidos conforme o escopo aprovado: projetos pontuais de Presença Digital ou landing pages comerciais costumam ser entregues entre 10 e 20 dias úteis. Projetos integrados que envolvem fluxos avançados de automação comercial e painéis de dados demandam entre 20 e 35 dias úteis, garantindo uma bateria rigorosa de testes antes da virada de chave operacional."
    },
    {
      id: 8,
      num: "DÚVIDA 08",
      name: "A VIDE desenvolve textos, roteiros e copywriting?",
      fullTitle: "8. A VIDE também desenvolve os textos, roteiros e conteúdos do site e das automações?",
      category: "COPYWRITING & CONTEÚDO",
      answer: "Sim. Não entregamos estruturas visuais vazias ou textos genéricos. Nossa equipe elabora toda a arquitetura da informação, redação estratégica comercial (copywriting) e os roteiros de acolhimento para o WhatsApp, garantindo uma comunicação clara, elegante e alinhada ao posicionamento de autoridade da sua marca."
    },
    {
      id: 9,
      num: "DÚVIDA 09",
      name: "Como os dados ajudam no dia a dia do empresário?",
      fullTitle: "9. Como a frente de Inteligência Comercial e Dados ajuda no dia a dia do empresário?",
      category: "TELEMETRIA & GESTÃO",
      answer: "Consolidando dados que hoje ficam dispersos em planilhas ou conversas soltas. Criamos painéis práticos de gestão que mostram de onde vêm os contatos mais qualificados, quais os horários de maior pico, tempo médio de primeiro atendimento e os reais motivos de perda de propostas. Isso permite ao empresário tomar decisões baseadas em evidências concretas, não em intuição."
    },
    {
      id: 10,
      num: "DÚVIDA 10",
      name: "Como funciona a Sessão de Diagnóstico Comercial?",
      fullTitle: "10. Como funciona a primeira conversa e a Sessão de Diagnóstico Comercial?",
      category: "DIAGNÓSTICO INICIAL",
      answer: "É uma reunião focada e objetiva onde avaliamos como sua empresa atrai, atende e acompanha interessados atualmente. Mapeamos os pontos de atrito na jornada do cliente e apresentamos uma análise prática com as recomendações de maior impacto para o seu faturamento, sem termos complicados e sem qualquer compromisso de contratação."
    },
    {
      id: 11,
      num: "DÚVIDA 11",
      name: "A VIDE oferece suporte e acompanhamento contínuo?",
      fullTitle: "11. A VIDE oferece suporte e acompanhamento após a conclusão do projeto?",
      category: "SUPORTE & CONTINUIDADE",
      answer: "Sim. Realizamos um período dedicado de acompanhamento assistido pós-lançamento para garantir a total estabilidade das integrações, calibrar respostas com base no comportamento dos clientes e tirar dúvidas da equipe. Além disso, oferecemos modelos de suporte contínuo e evolução estratégica para empresas que buscam crescimento permanente."
    }
  ];

  // Gerador de textura offscreen para corte em tiras
  const renderCardTexture = (item, W, H) => {
    const scale = Math.min(2.5, window.devicePixelRatio || 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(W * scale);
    canvas.height = Math.ceil(H * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Fundo do card estilo cyber VIDE
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#101626');
    grad.addColorStop(1, '#080C14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Borda do card
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    // Número / Tag
    ctx.font = '800 10px monospace, "JetBrains Mono", sans-serif';
    ctx.fillStyle = '#00E5FF';
    ctx.fillText(`${item.num} // ${item.category}`, 16, 20);

    // Título da dúvida
    ctx.font = '700 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    const words = item.name.split(' ');
    let line = '';
    let y = 38;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > W - 110 && n > 0) {
        ctx.fillText(line, 16, y);
        line = words[n] + ' ';
        y += 18;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 16, y);

    // Indicador sutil
    ctx.font = '600 9px monospace, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('TRITURAR INCERTEZA ➔', W - 130, H - 14);

    return { tex: canvas, scale };
  };

  const shape = (st, len, time, tear) => {
    const pts = st.pts;
    pts.length = 0;
    let x = st.ax;
    let y = st.ay;
    const steps = Math.ceil(len / SLIVER);
    const swing = (3 + 9 * st.rA) * tear;
    const pace = time * (1.6 + st.rA * 2.2) + st.rA * 6.2832;
    for (let j = 0; j <= steps; j += 1) {
      const d = Math.min(j * SLIVER, len);
      const a = st.th + st.curl * d + st.amp * Math.sin(d * st.freq + st.wave);
      const flutter = swing * Math.sin(d * 0.045 + pace);
      pts.push(x + flutter * Math.cos(a), y - flutter * Math.sin(a), a);
      const h = Math.min(SLIVER, len - d);
      x += Math.sin(a) * h;
      y += Math.cos(a) * h;
    }
  };

  const middle = pts => {
    let y = 0;
    for (let j = 1; j < pts.length; j += 3) y += pts[j];
    return (y * 3) / pts.length;
  };

  const paintStrip = (ctx, st, len, dpr) => {
    const { tex, ts } = st.feed;
    if (!tex) return;
    const pts = st.pts;
    const wc = st.w * st.core;
    const half = wc / 2;
    const sx = (st.x + (st.w - wc) / 2) * ts;
    const v0 = (st.H - len) * ts;
    ctx.globalAlpha = st.alpha;
    for (let j = 0; j + 3 < pts.length; j += 3) {
      const d = (j / 3) * SLIVER;
      const h = Math.min(SLIVER, len - d);
      if (h <= 0) break;
      const ca = Math.cos(pts[j + 2]);
      const sa = Math.sin(pts[j + 2]);
      ctx.setTransform(dpr * ca, -dpr * sa, dpr * sa, dpr * ca, dpr * (pts[j] + OVER), dpr * pts[j + 1]);
      ctx.drawImage(tex, sx, v0 + d * ts, wc * ts, (h + 0.5) * ts, -half, 0, wc, h + 0.4);
    }
    ctx.globalAlpha = 1;
  };

  class VanillaShredder {
    constructor(container, options = {}) {
      this.container = container;
      this.options = Object.assign({
        items: FAQ_DATA,
        width: 480,
        height: 520,
        inset: 14,
        gap: 12,
        slitHeight: 10,
        fallHeight: 150,
        feedSpeed: 210,
        bite: 18,
        stripWidth: 10,
        curl: 1.1,
        autoFeed: true,
        dragTilt: 6,
        lift: 1.02,
        onShred: null
      }, options);

      this.activeItems = [...this.options.items];
      this.slitEl = null;
      this.canvasEl = null;
      this.listEl = null;
      this.counterEl = null;
      this.slotMap = new Map();
      this.itemMap = new Map();

      this.sim = {
        raf: 0,
        last: 0,
        t: 0,
        drag: null,
        feeds: [],
        strips: [],
        shifts: new Map(),
        tops: new Map(),
        dpr: 1
      };

      this.buildDOM();
      this.initEvents();
    }

    buildDOM() {
      this.container.innerHTML = `
        <div class="shredder" id="shredder-box">
          <div class="shredder-hud-header">
            <span class="shredder-counter" id="shredder-counter">DÚVIDAS ATIVAS: ${this.activeItems.length} / ${this.options.items.length}</span>
            <button type="button" class="shredder-reset-btn" id="shredder-reset-btn">
              <i class="fas fa-rotate-left"></i> RESTAURAR TODAS
            </button>
          </div>

          <ul class="shredder__list" id="shredder-list"></ul>

          <div class="shredder__slit" id="shredder-slit">
            <div class="shredder__slit-roller"></div>
          </div>

          <div class="shredder__fall">
            <canvas class="shredder__canvas" id="shredder-canvas"></canvas>
            <div class="shredder-fall-label">TRITURADOR MECÂNICO DE DÚVIDAS</div>
          </div>
        </div>

        <div class="shredder-answer-modal" id="shredder-answer-modal">
          <div class="shredder-answer-badge" id="shredder-ans-badge">
            <i class="fas fa-circle-check"></i> RESPOSTA OFICIAL SELECIONADA
          </div>
          <h3 class="shredder-answer-title" id="shredder-ans-title">
            ${this.activeItems[0].fullTitle}
          </h3>
          <p class="shredder-answer-text" id="shredder-ans-text">
            ${this.activeItems[0].answer}
          </p>
        </div>
      `;

      this.root = this.container.querySelector('#shredder-box');
      this.listEl = this.container.querySelector('#shredder-list');
      this.slitEl = this.container.querySelector('#shredder-slit');
      this.canvasEl = this.container.querySelector('#shredder-canvas');
      this.counterEl = this.container.querySelector('#shredder-counter');

      this.resizeCanvas();
      this.renderSlots();
    }

    resizeCanvas() {
      if (!this.canvasEl) return;
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      this.sim.dpr = dpr;
      const rect = this.canvasEl.getBoundingClientRect();
      const w = (rect.width || (this.options.width + OVER * 2));
      const h = (rect.height || this.options.fallHeight);
      this.canvasEl.width = Math.ceil(w * dpr);
      this.canvasEl.height = Math.ceil(h * dpr);
    }

    renderSlots() {
      this.listEl.innerHTML = '';
      this.slotMap.clear();
      this.itemMap.clear();

      this.activeItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'shredder__slot';
        li.dataset.key = item.id;

        const card = document.createElement('div');
        card.className = 'shredder__item';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        card.innerHTML = `
          <div class="shredder-item-info">
            <span class="shredder-item-num">${item.num} // ${item.category}</span>
            <span class="shredder-item-title">${item.name}</span>
          </div>
          <button type="button" class="shredder-action-trigger" title="Triturar dúvida">
            <i class="fas fa-bolt"></i> Triturar
          </button>
        `;

        li.appendChild(card);
        this.listEl.appendChild(li);

        this.slotMap.set(item.id, li);
        this.itemMap.set(item.id, card);

        // Pointerdown no card para arrastar
        card.addEventListener('pointerdown', (e) => {
          if (e.target.closest('.shredder-action-trigger')) return;
          this.beginDrag(item, card, li, e);
        });

        // Clique para selecionar e ver resposta instantaneamente
        card.addEventListener('click', (e) => {
          if (e.target.closest('.shredder-action-trigger')) return;
          this.displayAnswer(item);
        });

        // Botão rápido "Triturar"
        const trigger = card.querySelector('.shredder-action-trigger');
        if (trigger) {
          trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.shredItemInstantly(item, card, li);
          });
        }
      });

      this.updateCounter();
    }

    updateCounter() {
      if (this.counterEl) {
        this.counterEl.textContent = `DÚVIDAS ATIVAS: ${this.activeItems.length} / ${this.options.items.length}`;
      }
    }

    displayAnswer(item) {
      const badge = this.container.querySelector('#shredder-ans-badge');
      const title = this.container.querySelector('#shredder-ans-title');
      const text = this.container.querySelector('#shredder-ans-text');
      const modal = this.container.querySelector('#shredder-answer-modal');

      if (badge) badge.innerHTML = `<i class="fas fa-check-circle"></i> ESCLARECIMENTO // ${item.category}`;
      if (title) title.textContent = item.fullTitle;
      if (text) text.textContent = item.answer;

      if (modal) {
        modal.style.borderColor = '#00E5FF';
        modal.style.boxShadow = '0 16px 45px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 229, 255, 0.25)';
        setTimeout(() => {
          modal.style.borderColor = '';
          modal.style.boxShadow = '';
        }, 1200);
      }
    }

    metrics() {
      const root = this.root;
      const r = root.getBoundingClientRect();
      const k = r.width / root.offsetWidth || 1;
      const lip = this.options.height - this.options.fallHeight - this.options.slitHeight;
      return {
        left: r.left,
        top: r.top,
        k,
        rw: root.offsetWidth,
        lip,
        exit: lip + this.options.slitHeight
      };
    }

    at(el, m) {
      const r = el.getBoundingClientRect();
      return { x: (r.left - m.left) / m.k, y: (r.top - m.top) / m.k };
    }

    local(e, m) {
      return { x: (e.clientX - m.left) / m.k, y: (e.clientY - m.top) / m.k };
    }

    run() {
      if (this.sim.raf) return;
      this.sim.last = performance.now();
      this.sim.raf = requestAnimationFrame(this.step.bind(this));
    }

    beginDrag(item, el, slot, e) {
      if (e.button !== 0 || this.sim.drag) return;
      try { el.setPointerCapture(e.pointerId); } catch(err) {}

      const m = this.metrics();
      const sp = this.at(slot, m);
      const W = slot.offsetWidth;
      const H = slot.offsetHeight;
      const p = this.local(e, m);

      const d = {
        key: item.id,
        item,
        el,
        slot,
        W,
        H,
        rx: sp.x,
        ry: sp.y,
        tx: sp.x,
        ty: sp.y,
        vx: 0,
        vy: 0,
        tilt: 0,
        lift: 1,
        gx: p.x - sp.x,
        gy: p.y - sp.y,
        px: p.x,
        py: p.y,
        ox: p.x,
        oy: p.y,
        moved: false,
        phase: 'drag',
        id: e.pointerId,
        texData: renderCardTexture(item, W, H)
      };

      this.sim.drag = d;
      slot.dataset.active = '';
      el.dataset.state = 'drag';

      this.displayAnswer(item);
      this.run();
    }

    shredItemInstantly(item, el, slot) {
      if (this.sim.feeds.some(f => f.key === item.id)) return;

      const m = this.metrics();
      const sp = this.at(slot, m);
      const W = slot.offsetWidth || 440;
      const H = slot.offsetHeight || 60;

      const d = {
        key: item.id,
        item,
        el,
        slot,
        W,
        H,
        rx: sp.x,
        ry: sp.y,
        tilt: 0,
        lift: 1,
        texData: renderCardTexture(item, W, H)
      };

      this.displayAnswer(item);
      this.feedIntoSlit(d, m);
    }

    feedIntoSlit(d, m) {
      const n = Math.max(1, Math.round(d.W / Math.max(4, this.options.stripWidth)));
      const sw = Math.floor(d.W / n);

      const f = {
        key: d.key,
        item: d.item,
        el: d.el,
        slot: d.slot,
        W: d.W,
        H: d.H,
        rx: d.rx,
        ry: m.lip - 4,
        tx: (m.rw - d.W) / 2,
        tilt: 0,
        lift: 1,
        v: this.options.feedSpeed * TUG,
        age: 0,
        tex: d.texData.tex,
        ts: d.texData.scale,
        consumed: false,
        strips: n
      };

      d.el.dataset.state = 'feed';
      this.sim.feeds.push(f);

      for (let i = 0; i < n; i += 1) {
        this.sim.strips.push({
          feed: f,
          x: i * sw,
          w: i === n - 1 ? d.W - sw * (n - 1) : sw,
          H: d.H,
          phase: 'attached',
          curl: side() * pick(0.35, 0.9) * DEG * this.options.curl,
          amp: pick(1.5, 4) * DEG * this.options.curl,
          freq: (Math.PI * 2) / pick(34, 60),
          wave: pick(0, Math.PI * 2),
          rA: Math.random(),
          rB: Math.random(),
          speed: 0,
          splay: 0,
          core: 1,
          rest: 0,
          alpha: 1,
          th: 0,
          ax: 0,
          ay: 0,
          vx: 0,
          vy: 0,
          hang: 0,
          pts: []
        });
      }

      this.run();
    }

    collapse(f) {
      f.consumed = true;
      f.el.style.visibility = 'hidden';
      delete f.slot.dataset.active;
      f.slot.dataset.gone = '';
      f.slot.style.display = 'none';

      this.activeItems = this.activeItems.filter(i => i.id !== f.key);
      this.updateCounter();

      if (typeof this.options.onShred === 'function') {
        this.options.onShred(f.item);
      }
    }

    step(now) {
      try {
        this.tick(now);
      } catch (err) {
        this.sim.raf = 0;
        console.error('Shredder step error:', err);
      }
    }

    tick(now) {
      const s = this.sim;
      const root = this.root;
      const canvas = this.canvasEl;
      if (!root || !canvas) {
        s.raf = 0;
        return;
      }

      const dt = clamp((now - s.last) / 1000, 0, 0.05);
      s.last = now;
      s.t += dt;
      const m = this.metrics();
      const d = s.drag;

      // Movimentação do card arrastado
      if (d) {
        const ceiling = m.lip + this.options.bite - d.H;
        d.tx = d.px - d.gx;
        d.ty = Math.min(d.py - d.gy, ceiling);

        const omega = d.phase === 'drag' ? FOLLOW : SETTLE;
        [d.rx, d.vx] = spring(d.rx, d.vx, d.tx, dt, omega);
        [d.ry, d.vy] = spring(d.ry, d.vy, d.ty, dt, omega);

        const lean = clamp(d.vx * 0.012, -this.options.dragTilt, this.options.dragTilt);
        d.tilt = ease(d.tilt, lean, dt, 0.09);
        d.lift = ease(d.lift, this.options.lift, dt, 0.12);

        const sp = this.at(d.slot, m);
        d.el.style.transform = `translate(${d.rx - sp.x}px, ${d.ry - sp.y}px) rotate(${d.tilt}deg) scale(${d.lift})`;

        const over = d.ry + d.H - m.lip;
        if (over >= this.options.bite - 0.5) {
          s.drag = null;
          this.feedIntoSlit(d, m);
        }
      }

      // Processamento das alimentações ativas no rolete mecânico
      let pulling = false;
      for (let i = s.feeds.length - 1; i >= 0; i -= 1) {
        const f = s.feeds[i];
        if (!f.consumed) {
          pulling = true;
          f.age += dt;
          f.v = this.options.feedSpeed * (1 + (TUG - 1) * Math.exp(-f.age / TUG_DECAY));
          f.ry += f.v * dt;
          f.rx = ease(f.rx, f.tx, dt, 0.1);

          const sp = this.at(f.slot, m);
          if (f.ry >= m.lip) {
            this.collapse(f);
          } else {
            const jitter = Math.sin(s.t * 150) * 0.5;
            f.el.style.transform = `translate(${f.rx - sp.x + jitter}px, ${f.ry - sp.y}px) scale(${f.lift})`;
          }
        } else {
          f.ry += f.v * dt;
          if (f.strips === 0) s.feeds.splice(i, 1);
        }
      }

      // Renderização no Canvas das Tiras de Papel
      const ctx = canvas.getContext('2d');
      const dpr = s.dpr;
      let moving = false;

      if (s.strips.length) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      for (let i = s.strips.length - 1; i >= 0; i -= 1) {
        const st = s.strips[i];
        const f = st.feed;
        let len = st.H;

        if (st.phase === 'attached') {
          const top = f.ry - m.exit;
          st.hang = top + st.H;
          if (st.hang <= 0) {
            moving = true;
            continue;
          }
          st.ax = f.rx + st.x + st.w / 2;
          st.th = Math.sin(s.t * 6 + st.wave) * 0.03 * smooth(st.hang / 40);

          if (top >= 0) {
            st.phase = 'free';
            st.ay = top;
            st.vy = f.v;
            st.vx = pick(-20, 20);
            st.speed = 150 + st.rA * 230;
            st.splay = (st.rA - 0.5) * 320;
            st.rest = side() * pick(0.15, 0.6);
            f.strips -= 1;
          } else {
            st.ay = 0;
            len = st.hang;
          }
        }

        if (st.phase === 'free') {
          const tear = Math.pow(clamp(middle(st.pts) / this.options.fallHeight, 0, 1), 1.2);
          const breath = 0.85 + 0.15 * Math.sin(s.t * (1 + st.rB * 2) + st.rA * 6.2832);
          st.vy = ease(st.vy, st.speed * breath, dt, 0.25);
          st.vx = ease(st.vx, st.splay * tear + (st.ax - m.rw / 2) * 0.25, dt, 0.4);
          st.ax += st.vx * dt;
          st.ay += st.vy * dt;
          st.th = ease(st.th, st.rest, dt, 0.5);
          st.core = 1 - smooth(tear / 0.85) * (0.8 - st.rA * 0.16);
          shape(st, st.H, s.t, tear);
          st.alpha = 1 - smooth((tear - 0.6) / 0.4);

          if (st.alpha <= 0.01 || st.pts[1] > this.options.fallHeight) {
            this.sim.strips.splice(i, 1);
            continue;
          }
        } else {
          st.core = 1;
          shape(st, len, s.t, 0);
          st.alpha = 1;
        }

        paintStrip(ctx, st, len, dpr);
        moving = true;
      }

      // Vibração mecânica no bocal do triturador
      if (this.slitEl) {
        this.slitEl.style.transform = pulling ? `translate(${Math.sin(s.t * 140) * 0.6}px, ${Math.cos(s.t * 97) * 0.4}px)` : '';
      }

      if (s.drag || s.feeds.length || moving) {
        s.raf = requestAnimationFrame(this.step.bind(this));
      } else {
        s.raf = 0;
      }
    }

    initEvents() {
      // Eventos globais de pointer para o arrasto
      window.addEventListener('pointermove', (e) => {
        const d = this.sim.drag;
        if (!d || d.id !== e.pointerId) return;
        const p = this.local(e, this.metrics());
        d.px = p.x;
        d.py = p.y;
      });

      window.addEventListener('pointerup', (e) => {
        const d = this.sim.drag;
        if (!d || d.id !== e.pointerId) return;
        this.endDrag(d);
      });

      window.addEventListener('pointercancel', (e) => {
        const d = this.sim.drag;
        if (!d || d.id !== e.pointerId) return;
        this.endDrag(d);
      });

      // Botão de reset / restaurar todas
      const resetBtn = this.container.querySelector('#shredder-reset-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.restoreAll();
        });
      }

      window.addEventListener('resize', () => {
        this.resizeCanvas();
      });
    }

    endDrag(d) {
      const m = this.metrics();
      const over = d.ry + d.H - m.lip;
      if (over >= this.options.bite - 0.5) {
        this.sim.drag = null;
        this.feedIntoSlit(d, m);
      } else {
        // Retorna suavemente para a posição inicial
        d.phase = 'return';
        d.el.style.transform = '';
        delete d.el.dataset.state;
        delete d.slot.dataset.active;
        this.sim.drag = null;
      }
    }

    restoreAll() {
      this.activeItems = [...this.options.items];
      this.renderSlots();
      this.displayAnswer(this.activeItems[0]);
    }
  }

  // =========================================================================
  // INICIALIZAÇÃO AUTOMÁTICA DO TRITURADOR DE DÚVIDAS
  // =========================================================================
  function initFaqShredder() {
    const mountPoint = document.getElementById('faq-shredder-mount');
    if (!mountPoint) return;

    window.faqShredderInstance = new VanillaShredder(mountPoint, {
      items: FAQ_DATA,
      width: 480,
      height: 520,
      onShred: (item) => {
        console.log(`[VIDE Shredder] Dúvida triturada com sucesso: ${item.name}`);
      }
    });
  }

  window.VanillaShredder = VanillaShredder;
  window.FAQ_DATA = FAQ_DATA;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFaqShredder);
  } else {
    initFaqShredder();
  }
})();
