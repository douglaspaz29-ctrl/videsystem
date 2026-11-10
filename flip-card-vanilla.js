/**
 * =====================================================================
 * REACT BITS — FLIPCARD (VANILLA RUNTIME PORT FOR VIDE)
 * Componente: FlipCard (React Bits / DavidHDev)
 * Spec: 3D Perspective, Spring Tilt, Dynamic Cursor Glare, Pointer Drag & Flip-on-Click
 * =====================================================================
 */

(function () {
  'use strict';

  const AGENTES_DATA = [
    {
      index: "01",
      code: "ETAPA 01 // ACOLHIMENTO IMEDIATO",
      title: "Triagem & Recepção Relâmpago",
      role: "Primeiro contato ágil e estruturado via WhatsApp",
      img: "assets/arte_rosto_cibernetico.png",
      badge: "AGT-01 // ATIVO 24/7",
      faz: "Acolhe contatos recebidos em canais digitais instantaneamente, evitando que o potencial cliente esfrie ou procure concorrentes por falta de resposta.",
      age: "Conversa com cordialidade em linguagem natural, identifica o nome, a necessidade e a urgência, organizando os dados para o consultor humano dar prosseguimento.",
      sim: "> Lead entra no WhatsApp :: Mensagem acolhida em tempo real :: Dados essenciais registrados :: Equipe notificada com histórico",
      impacto: "A primeira impressão da sua empresa acontece aqui. Uma recepção imediata e organizada retém a atenção do cliente e eleva a taxa de continuidade do atendimento em até 3x."
    },
    {
      index: "02",
      code: "ETAPA 02 // FILTRO DE PERFIL",
      title: "Qualificador de Oportunidades",
      role: "Análise prévia de orçamento, ramo e momento de compra",
      img: "assets/vide_perfil_duplo.png",
      badge: "AGT-02 // ATIVO 24/7",
      faz: "Separa contatos casuais de compradores reais antes de sobrecarregar a agenda dos consultores ou da diretoria executiva.",
      age: "Aplica critérios objetivos de qualificação em poucas perguntas cordiais, atribuindo score e prioridade imediata aos contatos mais maduros.",
      sim: "> Informações de demanda coletadas :: Perfil classificado como ALTO VALOR :: Encaminhado com dossiê ao vendedor",
      impacto: "Direciona a energia da sua equipe para as conversas que têm real potencial de fechamento, aumentando a produtividade e a taxa de conversão final."
    },
    {
      index: "03",
      code: "ETAPA 03 // AGENDA & PRESENÇA",
      title: "Agendamento & Confirmação Ativa",
      role: "Gestão inteligente de reuniões e combate ao no-show",
      img: "assets/vide_busto_cosmico.jpg",
      badge: "AGT-03 // ATIVO 24/7",
      faz: "Coordena a agenda comercial e protege a produtividade da equipe, minimizando faltas e cancelamentos de última hora.",
      age: "Oferece horários livres em tempo real, envia confirmações ativas com opções de remarcação e orientações prévias antes do encontro.",
      sim: "> Horário sincronizado na agenda :: Confirmação disparada 24h e 2h antes :: Presença confirmada pelo cliente",
      impacto: "Elimina a perda de tempo com agendamentos manuais e protege a rotina dos consultores contra faltas inesperadas, blindando a receita da agenda."
    },
    {
      index: "04",
      code: "ETAPA 04 // RESGATE DE PROPOSTAS",
      title: "Blindagem de Follow-up",
      role: "Recuperação de orçamentos e conversas sem resposta",
      img: "assets/arte_perfil_duplo_conexao.png",
      badge: "AGT-04 // ATIVO 24/7",
      faz: "Evita que propostas comerciais enviadas se percam no silêncio e no esquecimento da correria diária dos clientes.",
      age: "Dispara cadências planejadas de acompanhamento em intervalos adequados, reabrindo conversas com abordagens elegantes e contextuais.",
      sim: "> Proposta enviada há 48h sem resposta :: Mensagem personalizada de resgate disparada :: Cliente responde e reativa negociação",
      impacto: "Resgata oportunidades que normalmente seriam dadas como perdidas, aumentando o faturamento sem necessidade de novos investimentos em tráfego."
    },
    {
      index: "05",
      code: "ETAPA 05 // AUDITORIA & ROI",
      title: "Inteligência de Dados & Telemetria",
      role: "Visão panorâmica em tempo real dos gargalos do funil",
      img: "assets/vide_androide_telemetria.jpg",
      badge: "AGT-05 // ATIVO 24/7",
      faz: "Substitui o 'achismo' por indicadores visíveis de onde cada cliente veio e por quais motivos compras deixaram de acontecer.",
      age: "Registra cada etapa do atendimento em painéis de gestão, identificando canais mais lucrativos e horários de maior conversão.",
      sim: "> Origem de tráfego auditada :: Tempo de atendimento tabulado :: Motivos de perda consolidados para ajuste da diretoria",
      impacto: "Oferece ao empresário dados sólidos para saber exatamente onde cortar custos e onde investir para acelerar o crescimento sustentável."
    },
    {
      index: "06",
      code: "ETAPA 06 // RELACIONAMENTO & SATISFAÇÃO",
      title: "Retenção & Pós-Venda",
      role: "Acompanhamento da satisfação e fidelização da carteira",
      img: "assets/arte_escultura_fluida.png",
      badge: "AGT-06 // ATIVO 24/7",
      faz: "Garante que o cliente atendido continue satisfeito e permaneça leal à sua empresa por muito mais tempo.",
      age: "Coleta feedback de atendimento após a compra, orienta sobre os próximos passos e identifica oportunidades de novos serviços.",
      sim: "> Pesquisa de satisfação pós-venda realizada :: Avaliação positiva registrada :: Indicação de serviço complementar apresentada",
      impacto: "Transforma compradores pontuais em clientes fiéis e promotores da marca, gerando receita recorrente com custo de aquisição zero."
    },
    {
      index: "07",
      code: "ETAPA 07 // NOVAS VENDAS",
      title: "Reativação de Base Inativa",
      role: "Geração de novas oportunidades na carteira antiga",
      img: "assets/hero_monumento_vide.png",
      badge: "AGT-07 // ATIVO 24/7",
      faz: "Mapeia clientes que já compraram no passado mas deixaram de interagir, reativando o relacionamento com ofertas assertivas.",
      age: "Dispara campanhas personalizadas com base no histórico de compra anterior e no momento ideal de recompra de cada cliente.",
      sim: "> Cliente sem compras há 90 dias identificado :: Mensagem de benefício exclusivo disparada :: Novo pedido formalizado",
      impacto: "Monetiza o maior ativo da sua empresa: a base de contatos já construída, destravando receita imediata com alta margem de lucro."
    }
  ];

  class VanillaFlipCard {
    constructor(element, options = {}) {
      this.el = element;
      this.options = Object.assign({
        axis: 'y',
        flipOnClick: true,
        draggable: true,
        dragDistance: 0,
        tilt: true,
        tiltMax: 12,
        glare: true,
        glareOpacity: 0.22,
        hoverScale: 1.03,
        perspective: 1100,
        onFlipChange: null
      }, options);

      this.rotor = this.el.querySelector('.flip-card__rotor');
      this.glare = this.el.querySelector('.flip-card__glare');
      this.isFlipped = false;
      this.isDragging = false;
      this.startX = 0;
      this.startY = 0;
      this.currentX = 0;
      this.currentY = 0;
      this.currentTurn = 0;
      this.hasMoved = false;

      this.initEvents();
    }

    initEvents() {
      // 1. Hover Tilt & Dynamic Glare
      this.el.addEventListener('mousemove', (e) => {
        if (this.isDragging || !this.options.tilt) return;
        const rect = this.el.getBoundingClientRect();
        const px = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        const py = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

        const tiltX = (0.5 - py) * 2 * this.options.tiltMax;
        const tiltY = (px - 0.5) * 2 * this.options.tiltMax;

        this.el.style.setProperty('--fc-gx', `${px * 100}%`);
        this.el.style.setProperty('--fc-gy', `${py * 100}%`);
        this.el.style.setProperty('--fc-sheen', '1');

        if (this.rotor) {
          const baseTurn = this.isFlipped ? 180 : 0;
          if (this.options.axis === 'x') {
            this.rotor.style.transform = `perspective(${this.options.perspective}px) scale(${this.options.hoverScale}) rotateY(${tiltY}deg) rotateX(${baseTurn + tiltX}deg)`;
          } else {
            this.rotor.style.transform = `perspective(${this.options.perspective}px) scale(${this.options.hoverScale}) rotateX(${tiltX}deg) rotateY(${baseTurn + tiltY}deg)`;
          }
        }
      });

      this.el.addEventListener('mouseleave', () => {
        this.el.style.setProperty('--fc-sheen', '0');
        if (this.rotor && !this.isDragging) {
          const baseTurn = this.isFlipped ? 180 : 0;
          this.rotor.style.transform = this.options.axis === 'x' 
            ? `rotateX(${baseTurn}deg)` 
            : `rotateY(${baseTurn}deg)`;
        }
      });

      // 2. Pointer Down (Drag & Click Detection)
      this.el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.hasMoved = false;
        this.isDragging = false;
        try { this.el.setPointerCapture(e.pointerId); } catch(err) {}
      });

      this.el.addEventListener('pointermove', (e) => {
        if (!this.startX && !this.startY) return;
        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;
        const dist = this.options.axis === 'x' ? dy : dx;

        if (Math.abs(dist) > 8 && this.options.draggable) {
          this.hasMoved = true;
          this.isDragging = true;
          this.el.classList.add('is-dragging');
          const span = this.options.dragDistance > 0 ? this.options.dragDistance : (this.options.axis === 'x' ? this.el.offsetHeight : this.el.offsetWidth);
          const deg = (this.isFlipped ? 180 : 0) + (this.options.axis === 'x' ? -1 : 1) * (dist / span) * 180;
          if (this.rotor) {
            this.rotor.style.transform = this.options.axis === 'x'
              ? `perspective(${this.options.perspective}px) scale(${this.options.hoverScale}) rotateX(${deg}deg)`
              : `perspective(${this.options.perspective}px) scale(${this.options.hoverScale}) rotateY(${deg}deg)`;
          }
        }
      });

      const handleRelease = (e) => {
        if (this.isDragging) {
          this.el.classList.remove('is-dragging');
          const dx = e.clientX - this.startX;
          const dy = e.clientY - this.startY;
          const dist = this.options.axis === 'x' ? dy : dx;
          if (Math.abs(dist) > 60) {
            this.toggleFlip();
          } else {
            this.updateTransform();
          }
        } else if (!this.hasMoved && this.options.flipOnClick) {
          this.toggleFlip();
        }
        this.startX = 0;
        this.startY = 0;
        this.isDragging = false;
        this.hasMoved = false;
        try { if (this.el.hasPointerCapture(e.pointerId)) this.el.releasePointerCapture(e.pointerId); } catch(err) {}
      };

      this.el.addEventListener('pointerup', (e) => {
        handleRelease(e);
        this._lastPointerUpTime = Date.now();
      });
      this.el.addEventListener('pointercancel', handleRelease);

      // Suporte a click padrão (caso pointerup não tenha disparado ou clique acessível)
      this.el.addEventListener('click', (e) => {
        if (e.target.closest('#fc-return-btn')) return;
        const now = Date.now();
        if (this._lastPointerUpTime && (now - this._lastPointerUpTime) < 300) {
          return; // Já manipulado pelo pointerup
        }
        if (this.options.flipOnClick && !this.isDragging) {
          this.toggleFlip();
        }
      });

      // Teclado (Acessibilidade)
      this.el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleFlip();
        }
      });
    }

    toggleFlip() {
      this.isFlipped = !this.isFlipped;
      this.el.classList.toggle('is-flipped', this.isFlipped);
      this.el.setAttribute('aria-pressed', this.isFlipped ? 'true' : 'false');
      this.updateTransform();
      if (typeof this.options.onFlipChange === 'function') {
        this.options.onFlipChange(this.isFlipped);
      }
    }

    setFlipped(state) {
      if (this.isFlipped === state) return;
      this.isFlipped = state;
      this.el.classList.toggle('is-flipped', this.isFlipped);
      this.el.setAttribute('aria-pressed', this.isFlipped ? 'true' : 'false');
      this.updateTransform();
    }

    updateTransform() {
      if (!this.rotor) return;
      const baseTurn = this.isFlipped ? 180 : 0;
      this.rotor.style.transform = this.options.axis === 'x' 
        ? `rotateX(${baseTurn}deg)` 
        : `rotateY(${baseTurn}deg)`;
    }
  }

  // =========================================================================
  // GERENCIADOR MASTER DO CLUSTER DOS 7 AGENTES COM FLIPCARD
  // =========================================================================
  let flipCardInstance = null;
  let activeAgentIndex = 0;

  function renderAgentFlipCardContent(data) {
    const frontVisual = document.getElementById('fc-front-img');
    const frontBadge = document.getElementById('fc-front-badge');
    const frontTitle = document.getElementById('fc-front-title');
    const frontRole = document.getElementById('fc-front-role');

    const backTitle = document.getElementById('fc-back-title');
    const backFaz = document.getElementById('fc-back-faz');
    const backAge = document.getElementById('fc-back-age');
    const backSim = document.getElementById('fc-back-sim');
    const backImpacto = document.getElementById('fc-back-impacto');

    if (frontVisual) frontVisual.src = data.img;
    if (frontBadge) frontBadge.textContent = data.code;
    if (frontTitle) frontTitle.textContent = data.title;
    if (frontRole) frontRole.textContent = data.role;

    if (backTitle) backTitle.textContent = data.title;
    if (backFaz) backFaz.textContent = data.faz;
    if (backAge) backAge.textContent = data.age;
    if (backSim) backSim.textContent = data.sim;
    if (backImpacto) backImpacto.textContent = data.impacto;
  }

  function ativarAgenteCluster(index, resetFlip = true) {
    if (index < 0 || index >= AGENTES_DATA.length) return;
    activeAgentIndex = index;
    const data = AGENTES_DATA[index];

    // Atualiza a lista da direita
    const items = document.querySelectorAll('.agents-cluster-list .agent-item');
    items.forEach((item, idx) => {
      if (idx === index) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Se estiver virado para trás e resetFlip for true, desvira suavemente para a frente
    if (flipCardInstance && resetFlip && flipCardInstance.isFlipped) {
      flipCardInstance.setFlipped(false);
      setTimeout(() => {
        renderAgentFlipCardContent(data);
      }, 250);
    } else {
      renderAgentFlipCardContent(data);
    }
  }

  function initSectionVFlipCard() {
    const cardEl = document.getElementById('agente-flipcard');
    if (!cardEl) return;

    flipCardInstance = new VanillaFlipCard(cardEl, {
      axis: 'y',
      flipOnClick: true,
      draggable: true,
      tilt: true,
      tiltMax: 12,
      glare: true,
      glareOpacity: 0.22,
      hoverScale: 1.03,
      perspective: 1100
    });

    // Conecta o botão de retorno no verso do card
    const returnBtn = document.getElementById('fc-return-btn');
    if (returnBtn) {
      returnBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (flipCardInstance) flipCardInstance.setFlipped(false);
      });
    }

    // Carrega o primeiro agente
    ativarAgenteCluster(0, false);

    // Conecta os itens da lista da direita ao FlipCard da esquerda
    const items = document.querySelectorAll('.agents-cluster-list .agent-item');
    items.forEach((item) => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-index'), 10);
        ativarAgenteCluster(idx, true);
      });
    });
  }

  window.VanillaFlipCard = VanillaFlipCard;
  window.ativarAgenteCluster = ativarAgenteCluster;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSectionVFlipCard);
  } else {
    initSectionVFlipCard();
  }
})();
