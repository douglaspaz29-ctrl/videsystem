/**
 * =========================================================================
 * VIDE — HIGH-END EDITORIAL MOTION & INTERACTION ENGINE
 * Standard: Awwwards Site of the Year / Exoape Editorial Excellence
 * Stack: GSAP 3 + ScrollTrigger + Lenis Smooth Scroll
 * Zero Pill Policy: 8px Buttons, 6px Badges, 14px Cards
 * =========================================================================
 */

(function () {
  'use strict';

  if (window.__VIDE_MAIN_INITIALIZED__) return;
  window.__VIDE_MAIN_INITIALIZED__ = true;

  // 0. OFICIALMENTE REGISTRAR PLUGINS DO GSAP
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  // Referência Global do Motor
  let lenisInstance = null;

  // =========================================================================
  // 1. LENIS SMOOTH SCROLL & GSAP TICKER INTEGRATION (120 FPS PARITY)
  // =========================================================================
  function initLenisSmoothScroll() {
    if (typeof Lenis === 'undefined') {
      console.warn('VIDE Motion: Lenis library not detected. Running on native momentum.');
      return;
    }

    lenisInstance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.6,
      infinite: false,
    });

    // Barra de progresso superior e sincronização do ScrollTrigger
    const progressBar = document.getElementById('scroll-progress-bar');

    lenisInstance.on('scroll', (e) => {
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.update();
      }

      // Atualizar barra de progresso no topo
      if (progressBar) {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const progress = total > 0 ? (window.scrollY / total) : 0;
        progressBar.style.width = Math.min(100, Math.max(0, progress * 100)) + '%';
      }
    });

    // Sincronizar Lenis com o Ticker do GSAP (Sem conflitos de Frame)
    if (typeof gsap !== 'undefined') {
      gsap.ticker.add((time) => {
        lenisInstance.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) {
        lenisInstance.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }

    // Scroll Suave para Âncoras
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId && targetId !== '#') {
          const targetEl = document.querySelector(targetId);
          if (targetEl && lenisInstance) {
            e.preventDefault();
            lenisInstance.scrollTo(targetEl, { offset: -60, duration: 1.2 });
          }
        }
      });
    });
  }

  // =========================================================================
  // 2. HERO DISPLAY TITLES CUT-MASK REVEAL (0.05s Stagger ao Carregar)
  //    Padrão Editorial: subindo de trás de máscara de corte
  // =========================================================================
  function initHeroMaskReveal() {
    if (typeof gsap === 'undefined') return;

    const heroTitles = document.querySelectorAll(
      '.hero-monumental-title, .hero-title-container h1, .cockpit-hero-title, [data-hero-reveal]'
    );

    if (!heroTitles.length) return;

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const allInnersToAnimate = [];

    heroTitles.forEach((titleEl) => {
      const rows = titleEl.querySelectorAll('.row');
      if (rows.length) {
        rows.forEach((row) => wrapTextInMasks(row, allInnersToAnimate));
      } else {
        wrapTextInMasks(titleEl, allInnersToAnimate);
      }
    });

    if (allInnersToAnimate.length) {
      if (prefersReducedMotion) {
        gsap.set(allInnersToAnimate, { yPercent: 0, rotate: 0, opacity: 1 });
      } else {
        // Estado Inicial: escondido atrás da máscara de corte com leve rotação editorial
        gsap.set(allInnersToAnimate, {
          yPercent: 125,
          rotate: 3.5,
          opacity: 0,
          transformOrigin: '0% 100%'
        });

        // Entrada com Stagger de exatamente 0.05s
        gsap.to(allInnersToAnimate, {
          yPercent: 0,
          rotate: 0,
          opacity: 1,
          duration: 1.15,
          ease: 'power4.out',
          stagger: 0.05,
          delay: 0.15,
          clearProps: 'transformOrigin'
        });
      }
    }

    // Revelação dos Elementos Filhos do Hero na Carga (Sem colisão com os containers de scrub)
    if (!prefersReducedMotion) {
      gsap.from('.hero-meta-top > *, .cockpit-hero-tag', {
        y: -18,
        opacity: 0,
        duration: 0.85,
        ease: 'power3.out',
        delay: 0.22,
        stagger: 0.06
      });

      gsap.from('.hero-brand-official-img', {
        y: 15,
        scale: 0.96,
        opacity: 0,
        duration: 0.95,
        ease: 'power3.out',
        delay: 0.28
      });

      gsap.from('.hero-editorial-text, .hero-editorial-lead, .hero-editorial-subtitle, .cockpit-hero-sub, .cockpit-meta-chips', {
        y: 20,
        opacity: 0,
        duration: 1.0,
        ease: 'power3.out',
        delay: 0.35,
        stagger: 0.08
      });

      gsap.from('.scroll-indicator, .hero-bottom-bar .mono-tag', {
        y: 16,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        delay: 0.50,
        stagger: 0.06
      });
    }

    // Helper: Envelopar palavras em span com overflow: hidden
    function wrapTextInMasks(container, collection) {
      const childNodes = Array.from(container.childNodes);
      container.innerHTML = '';

      childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const words = node.textContent.trim().split(/\s+/);
          words.forEach((word, idx) => {
            if (!word) return;
            const maskWrap = document.createElement('span');
            maskWrap.className = 'hero-mask-wrap inline-mask';
            const maskInner = document.createElement('span');
            maskInner.className = 'hero-mask-inner';
            maskInner.textContent = word;

            maskWrap.appendChild(maskInner);
            container.appendChild(maskWrap);

            if (idx < words.length - 1) {
              container.appendChild(document.createTextNode(' '));
            }

            collection.push(maskInner);
          });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const subText = node.textContent.trim();
          const subWords = subText.split(/\s+/);
          node.innerHTML = '';
          subWords.forEach((word, sIdx) => {
            if (!word) return;
            const maskWrap = document.createElement('span');
            maskWrap.className = 'hero-mask-wrap inline-mask';
            const maskInner = document.createElement('span');
            maskInner.className = 'hero-mask-inner';
            maskInner.textContent = word;

            maskWrap.appendChild(maskInner);
            node.appendChild(maskWrap);

            if (sIdx < subWords.length - 1) {
              node.appendChild(document.createTextNode(' '));
            }

            collection.push(maskInner);
          });
          container.appendChild(node);
          container.appendChild(document.createTextNode(' '));
        }
      });
    }
  }

  // =========================================================================
  // 2.1 EXOAPE HERO SCROLL KINEMATICS & SCROLL-DRIVEN TYPOGRAPHY
  //     Referência Direta: https://www.exoape.com/
  //     - Parallax com velocidades de rolagem diferentes (camadas totalmente desacopladas)
  //     - Animação tipográfica vinculada ao scroll (Scroll-Driven Typography por linha)
  //     - Imagem de fundo em escala e translação lenta com viewport pinning
  //     - Sincronização e congelamento instantâneo via GSAP scrub
  // =========================================================================
  // 2.1 EXOAPE HERO SCROLL CHOREOGRAPHY (Coreografia entre Camadas Desacopladas)
  //     Referência Direta: https://www.exoape.com/ & Gravação IMG_4230.mov
  //     Sequência Cinemática:
  //     1. O título começa ocupando a área principal do Hero.
  //     2. Conforme você rola, as letras se deslocam verticalmente e perdem opacidade.
  //     3. O fundo permanece visualmente presente com movimento muito mais discreto.
  //     4. O título sai da composição antes de o fundo desaparecer (aos 48% da rolagem).
  //     5. Ao retornar a rolagem, o título recupera sua posição perfeitamente.
  // =========================================================================
  function initHeroExoapeScrollKinematics() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    const heroStage = document.querySelector('.hero-stage');
    if (!heroStage) return;

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const mm = gsap.matchMedia();

    // DESKTOP & NOTEBOOK (992px+)
    mm.add('(min-width: 992px)', () => {
      // 1. PINNING DO FUNDO: Mantém o cenário cósmico ancorado no viewport durante toda a altura da seção hero (180vh)
      ScrollTrigger.create({
        trigger: '.hero-stage',
        start: 'top top',
        end: 'bottom bottom',
        pin: '.hero-ambient-video-wrap',
        pinSpacing: false
      });

      // 2. TIMELINE MASTER DE COREOGRAFIA ENTRE CAMADAS VINCULADA AO SCROLL
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.hero-stage',
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          invalidateOnRefresh: true,
        }
      });

      // CAMADA A: FUNDO (Movimento contínuo, lento e discreto ao longo de toda a esteira 0 -> 1.0)
      heroTl.to('#hero-bg-media, #hero-bg-video, .hero-ambient-photo, .hero-ambient-video', {
        yPercent: 18,
        scale: 1.20,
        opacity: 0.16,
        ease: 'none',
        duration: 1.0
      }, 0);

      heroTl.to('.hero-cyan-halo', {
        yPercent: 25,
        scale: 1.22,
        opacity: 0.05,
        ease: 'none',
        duration: 1.0
      }, 0);

      // CAMADA B: TÍTULO MONUMENTAL (Deslocamento vertical acelerado + Perda progressiva de opacidade)
      // O título sai da composição antes do fundo desaparecer:
      // Seu movimento vertical sobe de forma contínua e sua opacidade vai a 0 aos 48% da rolagem!
      heroTl.to('.hero-title-container', {
        yPercent: -45,
        ease: 'none',
        duration: 0.75
      }, 0);

      heroTl.to('.hero-title-container', {
        opacity: 0,
        ease: 'power1.in',
        duration: 0.70 // O título permanece nítido e dissolve suavemente perto de 70%
      }, 0);

      // CAMADA C: BLOCO EDITORIAL & SUBTÍTULO
      // Permanece legível e presente, dissolvendo suavemente apenas ao final do Hero (75%)
      heroTl.to('.hero-editorial-col, .hero-editorial-subtitle', {
        yPercent: -35,
        opacity: 0,
        ease: 'power1.in',
        duration: 0.75
      }, 0);

      // CAMADA D: MARCA HALLMARK VIDE & METADADOS SUPERIORES
      // Dissolvem suavemente aos 25% da rolagem
      heroTl.to('.hero-brand-hallmark, .hero-meta-top', {
        yPercent: -35,
        opacity: 0,
        ease: 'none',
        duration: 0.25
      }, 0);

      // CAMADA E: INDICADOR DE ROLAGEM
      // Dissolve imediatamente no primeiro toque da rolagem (12%)
      heroTl.to('.hero-bottom-bar', {
        opacity: 0,
        ease: 'none',
        duration: 0.12
      }, 0);
    });

    // TABLET (769px a 991px)
    mm.add('(min-width: 769px) and (max-width: 991px)', () => {
      ScrollTrigger.create({
        trigger: '.hero-stage',
        start: 'top top',
        end: 'bottom bottom',
        pin: '.hero-ambient-video-wrap',
        pinSpacing: false
      });

      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.hero-stage',
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          invalidateOnRefresh: true,
        }
      });

      heroTl.to('#hero-bg-media, #hero-bg-video, .hero-ambient-photo, .hero-ambient-video', {
        yPercent: 15,
        scale: 1.16,
        opacity: 0.18,
        ease: 'none',
        duration: 1.0
      }, 0);

      heroTl.to('.hero-cyan-halo', {
        yPercent: 20,
        scale: 1.18,
        opacity: 0.06,
        ease: 'none',
        duration: 1.0
      }, 0);

      heroTl.to('.hero-title-container', {
        yPercent: -55,
        ease: 'none',
        duration: 0.55
      }, 0);

      heroTl.to('.hero-title-container', {
        opacity: 0,
        ease: 'power1.in',
        duration: 0.48
      }, 0);

      heroTl.to('.hero-editorial-col, .hero-editorial-subtitle', {
        yPercent: -30,
        opacity: 0,
        ease: 'power1.in',
        duration: 0.75
      }, 0);

      heroTl.to('.hero-brand-hallmark, .hero-meta-top', {
        yPercent: -25,
        opacity: 0,
        ease: 'none',
        duration: 0.25
      }, 0);

      heroTl.to('.hero-bottom-bar', {
        opacity: 0,
        ease: 'none',
        duration: 0.12
      }, 0);
    });

    // SMARTPHONE (<= 768px)
    mm.add('(max-width: 768px)', () => {
      ScrollTrigger.create({
        trigger: '.hero-stage',
        start: 'top top',
        end: 'bottom bottom',
        pin: '.hero-ambient-video-wrap',
        pinSpacing: false
      });

      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.hero-stage',
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          invalidateOnRefresh: true,
        }
      });

      heroTl.to('#hero-bg-media, #hero-bg-video, .hero-ambient-photo, .hero-ambient-video', {
        yPercent: 10,
        scale: 1.12,
        opacity: 0.20,
        ease: 'none',
        duration: 1.0
      }, 0);

      heroTl.to('.hero-title-container', {
        yPercent: -40,
        opacity: 0,
        ease: 'power1.in',
        duration: 0.45
      }, 0);

      heroTl.to('.hero-editorial-col, .hero-editorial-subtitle', {
        yPercent: -25,
        opacity: 0,
        ease: 'power1.in',
        duration: 0.75
      }, 0);

      heroTl.to('.hero-brand-hallmark, .hero-meta-top', {
        opacity: 0,
        ease: 'none',
        duration: 0.25
      }, 0);

      heroTl.to('.hero-bottom-bar', {
        opacity: 0,
        ease: 'none',
        duration: 0.12
      }, 0);
    });
  }

  // =========================================================================
  function initScrollMaskHeadlines() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    // Selecionar todos os títulos de seção (incluindo as 4 seções estratégicas)
    const downstreamHeadlines = document.querySelectorAll(
      '.section-headline, .motion-headline, .manifesto-headline, .footer-colossal-title a, ' +
      '.secao-funil-interativo h2, .secao-accordion-solucoes h2, .secao-crystalized-showcase h2, .secao-web-threads h2, ' +
      '[data-scroll-reveal]'
    );

    downstreamHeadlines.forEach((headline) => {
      if (headline.closest('.hero-stage')) return;

      const inners = [];
      const childNodes = Array.from(headline.childNodes);
      headline.innerHTML = '';

      childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const words = node.textContent.trim().split(/\s+/);
          words.forEach((word, idx) => {
            if (!word) return;
            const maskWrap = document.createElement('span');
            maskWrap.className = 'scroll-mask-wrap inline-mask';
            const maskInner = document.createElement('span');
            maskInner.className = 'scroll-mask-inner';
            maskInner.textContent = word;

            maskWrap.appendChild(maskInner);
            headline.appendChild(maskWrap);

            if (idx < words.length - 1) headline.appendChild(document.createTextNode(' '));
            inners.push(maskInner);
          });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const subWords = node.textContent.trim().split(/\s+/);
          node.innerHTML = '';
          subWords.forEach((word, sIdx) => {
            if (!word) return;
            const maskWrap = document.createElement('span');
            maskWrap.className = 'scroll-mask-wrap inline-mask';
            const maskInner = document.createElement('span');
            maskInner.className = 'scroll-mask-inner';
            maskInner.textContent = word;

            maskWrap.appendChild(maskInner);
            node.appendChild(maskWrap);

            if (sIdx < subWords.length - 1) node.appendChild(document.createTextNode(' '));
            inners.push(maskInner);
          });
          headline.appendChild(node);
          headline.appendChild(document.createTextNode(' '));
        }
      });

      if (inners.length) {
        gsap.set(inners, {
          yPercent: 120,
          rotate: 3.0,
          opacity: 0,
          transformOrigin: '0% 100%'
        });

        ScrollTrigger.create({
          trigger: headline,
          start: 'top 88%',
          once: true,
          onEnter: () => {
            gsap.to(inners, {
              yPercent: 0,
              rotate: 0,
              opacity: 1,
              duration: 1.05,
              ease: 'power4.out',
              stagger: 0.05, // Stagger de 0.05s rigorosamente aplicado
              clearProps: 'transformOrigin'
            });
          }
        });
      }
    });

    // Marcadores de etapa com fade in suave
    gsap.utils.toArray('.marcador-etapa-cinematico, .mono-tag').forEach((el) => {
      if (el.closest('.hero-stage')) return;
      gsap.from(el, {
        y: 16,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 90%',
          once: true
        }
      });
    });
  }

  // =========================================================================
  // 4. PARALLAX FLUIDO EM PORTFÓLIO (Deslocamento Diferencial Mídia vs Texto)
  // =========================================================================
  function initPortfolioFluidParallax() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    const cards = document.querySelectorAll('.project-card');

    cards.forEach((card, idx) => {
      const media = card.querySelector('.card-image-box img, .card-image-box video');
      const meta = card.querySelector('.card-meta-info');

      // Diretriz Douglas (VIDE): Seção Soluções em Ação (.section-featured) com escala 1/4 (0.25)
      // sincronizada com o mouse scroll até expandir para o tamanho total (1.0)
      const isFeatured = card.closest('.section-featured');

      if (isFeatured) {
        gsap.fromTo(
          card,
          {
            scale: 0.25,
            opacity: 0.75,
            transformOrigin: 'center center'
          },
          {
            scale: 1.0,
            opacity: 1.0,
            ease: 'power1.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 95%',
              end: 'top 25%',
              scrub: 0.8,
              invalidateOnRefresh: true
            }
          }
        );
      } else {
        // Revelação suave padrão para demais páginas (ex: work.html)
        gsap.from(card, {
          y: 60,
          opacity: 0,
          duration: 0.95,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 86%',
            once: true
          }
        });
      }

      // 1. Parallax na Mídia de Fundo: desliza de -15% a +15% com escala ampliada
      if (media) {
        gsap.fromTo(
          media,
          { yPercent: -15, scale: 1.18 },
          {
            yPercent: 15,
            scale: 1.18,
            ease: 'none',
            scrollTrigger: {
              trigger: card,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.0,
              invalidateOnRefresh: true
            }
          }
        );
      }

      // 2. Parallax Diferencial no Texto em Primeiro Plano: desliza em sentido oposto (+8% a -8%)
      if (meta) {
        gsap.fromTo(
          meta,
          { yPercent: 8 },
          {
            yPercent: -8,
            ease: 'none',
            scrollTrigger: {
              trigger: card,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.2,
              invalidateOnRefresh: true
            }
          }
        );
      }

      // 3. Stagger vertical assimétrico na segunda coluna
      if (idx % 2 === 1) {
        card.classList.add('stagger-down');
      }
    });
  }

  // =========================================================================
  // 5. INTERAÇÕES DE SCROLL NAS 4 SEÇÕES ESPECÍFICAS
  // =========================================================================
  function initCustomSectionsScroll() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      ensureAllCardsVisible();
      return;
    }

    // 1. SEÇÃO 02 // FUNIL DE PERDAS: Entrada suave com clearProps (nunca oculta os cards)
    const funilContainer = document.querySelector('.funil-pipeline-container');
    if (funilContainer) {
      gsap.fromTo('.funil-etapa-row', 
        { y: 30, opacity: 0.3 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.06,
          ease: 'power2.out',
          clearProps: 'all',
          scrollTrigger: {
            trigger: funilContainer,
            start: 'top 95%',
            once: true
          }
        }
      );
    }

    // 2. A SUÍTE INTEGRADA: Painéis Accordion
    const accordionGallery = document.querySelector('.accordion-gallery-wrapper');
    if (accordionGallery) {
      gsap.fromTo('.accordion-panel', 
        { y: 35, opacity: 0.4 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power2.out',
          clearProps: 'all',
          scrollTrigger: {
            trigger: accordionGallery,
            start: 'top 95%',
            once: true
          }
        }
      );
    }

    // 3. WORK IN MOTION / CLUSTER LIST (Nunca deixa os 7 agentes ocultos)
    const motionSection = document.querySelector('.section-motion');
    if (motionSection) {
      gsap.fromTo('.motion-visual-wrapper', 
        { scale: 0.96, opacity: 0.6 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.75,
          ease: 'power2.out',
          clearProps: 'all',
          scrollTrigger: {
            trigger: motionSection,
            start: 'top 92%',
            once: true
          }
        }
      );

      gsap.fromTo('.agent-item', 
        { x: 20, opacity: 0.4 },
        {
          x: 0,
          opacity: 1,
          duration: 0.55,
          stagger: 0.05,
          ease: 'power2.out',
          clearProps: 'all',
          scrollTrigger: {
            trigger: motionSection,
            start: 'top 92%',
            once: true
          }
        }
      );
    }

    // 4. TELEMETRIA SWISS // CHOREOGRAFIA INTERATIVA SINCRONIZADA AO SCROLL (DOUGLAS DIRECTIVE)
    function inicializarTelemetriaScrollSync() {
      const section = document.querySelector('.section-telemetry');
      const cards = document.querySelectorAll('.section-telemetry .telemetry-card');
      if (!section || cards.length < 4) return;

      if (window.innerWidth < 992) {
        gsap.set(cards, { clearProps: 'transform' });
        return;
      }

      function getDeltas() {
        const r0 = cards[0].getBoundingClientRect();
        const r1 = cards[1].getBoundingClientRect();
        const r2 = cards[2].getBoundingClientRect();
        const r3 = cards[3].getBoundingClientRect();

        const distX1 = r1.left - r0.left;
        const distX2 = r3.left - r2.left;
        const yOffset = Math.min(window.innerHeight * 0.22, 175);

        return { distX1, distX2, yOffset };
      }

      let d = getDeltas();

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=140%',
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: () => {
            d = getDeltas();
          }
        }
      });

      // Posição inicial (2x2 nos 4 cantos):
      // Card 0 (Ágil): Superior Esquerdo (x: 0, y: -yOffset)
      // Card 1 (Contínua): Inferior Esquerdo (x: -distX1, y: yOffset) -> alinhado verticalmente abaixo de Ágil
      // Card 2 (Organizado): Superior Direito (x: distX2, y: -yOffset) -> alinhado verticalmente acima de Claros
      // Card 3 (Claros): Inferior Direito (x: 0, y: yOffset)
      //
      // Movimento síncrono com o scroll:
      // Todos convergem suavemente e se organizam um ao lado do outro (1x4)
      tl.fromTo(cards[0], 
        { x: 0, y: -d.yOffset, scale: 0.97 },
        { x: 0, y: 0, scale: 1, ease: 'power1.out', duration: 1 },
        0
      );

      tl.fromTo(cards[1], 
        { x: -d.distX1, y: d.yOffset, scale: 0.97 },
        { x: 0, y: 0, scale: 1, ease: 'power1.out', duration: 1 },
        0
      );

      tl.fromTo(cards[2], 
        { x: d.distX2, y: -d.yOffset, scale: 0.97 },
        { x: 0, y: 0, scale: 1, ease: 'power1.out', duration: 1 },
        0
      );

      tl.fromTo(cards[3], 
        { x: 0, y: d.yOffset, scale: 0.97 },
        { x: 0, y: 0, scale: 1, ease: 'power1.out', duration: 1 },
        0
      );
    }

    try {
      inicializarTelemetriaScrollSync();
    } catch (e) {
      console.warn('Telemetria ScrollSync aviso:', e);
    }

    // 5. TELEMETRIA E DADOS VIVOS (Esfera 3D & HUD)
    const inteligenciaSection = document.getElementById('inteligencia');
    if (inteligenciaSection) {
      gsap.fromTo('#canvas-crystalized-ball', 
        { scale: 0.88, opacity: 0.5 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out',
          clearProps: 'all',
          scrollTrigger: {
            trigger: '.crystalized-ball-container',
            start: 'top 95%',
            once: true
          }
        }
      );

      gsap.fromTo('.telemetry-hud-container', 
        { y: 20, opacity: 0.5 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          clearProps: 'all',
          scrollTrigger: {
            trigger: '.telemetry-hud-container',
            start: 'top 95%',
            once: true
          }
        }
      );

      ScrollTrigger.create({
        trigger: inteligenciaSection,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          if (window.aplicarScrollNaEsfera3D) {
            window.aplicarScrollNaEsfera3D(self.getVelocity());
          }
        }
      });
    }

    // 6. 08 // ESTRUTURA OPERACIONAL EM 3D (Split Stage dos 7 Agentes)
    const splitShowcase = document.querySelector('.agentes-split-showcase');
    if (splitShowcase) {
      gsap.fromTo('.agent-inspector-glass-card', 
        { x: -25, opacity: 0.5 },
        {
          x: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power2.out',
          clearProps: 'all',
          scrollTrigger: {
            trigger: splitShowcase,
            start: 'top 95%',
            once: true
          }
        }
      );

      gsap.fromTo('.depth-carousel-wrapper', 
        { x: 25, opacity: 0.5 },
        {
          x: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power2.out',
          clearProps: 'all',
          scrollTrigger: {
            trigger: splitShowcase,
            start: 'top 95%',
            once: true
          }
        }
      );
    }

    // Garantia final de visibilidade
    setTimeout(ensureAllCardsVisible, 350);
    setTimeout(ensureAllCardsVisible, 1200);
  }

  // =========================================================================
  // 6. MAGNETIC HOVER PHYSICS EM BOTÕES & ELEMENTOS INTERATIVOS
  // =========================================================================
  function initMagneticPhysics() {
    if (typeof gsap === 'undefined') return;
    if (window.matchMedia('(hover: none)').matches) return;

    const magneticElements = document.querySelectorAll(
      '.btn-vide, .tech-badge, .menu-toggle, .card-action-arrow, .filter-pill, [data-magnetic]'
    );

    magneticElements.forEach((el) => {
      const innerChild = el.querySelector('span, .btn-arrow, i, .dot') || el.firstElementChild;

      const xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });

      let childXTo = null;
      let childYTo = null;

      if (innerChild && innerChild.nodeType === Node.ELEMENT_NODE) {
        childXTo = gsap.quickTo(innerChild, 'x', { duration: 0.28, ease: 'power3.out' });
        childYTo = gsap.quickTo(innerChild, 'y', { duration: 0.28, ease: 'power3.out' });
      }

      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - (rect.left + rect.width / 2);
        const relY = e.clientY - (rect.top + rect.height / 2);

        xTo(relX * 0.34);
        yTo(relY * 0.34);

        if (childXTo && childYTo) {
          childXTo(relX * 0.52);
          childYTo(relY * 0.52);
        }
      });

      el.addEventListener('mouseleave', () => {
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.75,
          ease: 'elastic.out(1.15, 0.4)',
          overwrite: 'auto'
        });

        if (innerChild && innerChild.nodeType === Node.ELEMENT_NODE) {
          gsap.to(innerChild, {
            x: 0,
            y: 0,
            duration: 0.65,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        }
      });
    });
  }

  // =========================================================================
  // 7. INVERSÃO DE TEMA DA NAVBAR NO SCROLL (Exoape Light / Dark Detection)
  // =========================================================================
  function initNavbarThemeInversion() {
    const header = document.querySelector('.site-header');
    if (!header || typeof ScrollTrigger === 'undefined') return;

    ScrollTrigger.create({
      start: 'top -40',
      onUpdate: (self) => {
        if (self.scroll() > 40) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }
    });

    const lightSections = document.querySelectorAll('.light-section, [data-theme="light"]');
    lightSections.forEach((section) => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top 50px',
        end: 'bottom 50px',
        onEnter: () => header.classList.add('light-theme'),
        onEnterBack: () => header.classList.add('light-theme'),
        onLeave: () => header.classList.remove('light-theme'),
        onLeaveBack: () => header.classList.remove('light-theme'),
      });
    });
  }

  // =========================================================================
  // 8. TICKER DINÂMICO QUE ACELERA COM O SCROLL (Velocity-Aware)
  // =========================================================================
  function initAcceleratingTicker() {
    const track = document.querySelector('.ticker-track');
    if (!track) return;

    let pos = 0;
    const baseSpeed = 1.0;

    function tick() {
      let speed = baseSpeed;

      if (lenisInstance && Math.abs(lenisInstance.velocity) > 0.1) {
        speed += Math.min(Math.abs(lenisInstance.velocity) * 0.35, 6.0);
      }

      pos -= speed;
      track.style.transform = 'translate3d(' + pos + 'px, 0, 0)';

      const halfWidth = track.scrollWidth / 2;
      if (Math.abs(pos) >= halfWidth) {
        pos = 0;
      }

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  // =========================================================================
  // 9. CURSOR MAGNÉTICO INTERATIVO
  // =========================================================================
  function initCustomCursor() {
    if (window.matchMedia('(hover: none)').matches) return;

    let cursor = document.getElementById('custom-cursor');
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.id = 'custom-cursor';
      cursor.className = 'custom-cursor';
      document.body.appendChild(cursor);
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;
    let isMoving = false;
    let moveTimeout;

    window.addEventListener(
      'mousemove',
      (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (!isMoving) {
          isMoving = true;
          requestAnimationFrame(renderCursor);
        }

        clearTimeout(moveTimeout);
        moveTimeout = setTimeout(() => {
          isMoving = false;
        }, 1200);
      },
      { passive: true }
    );

    function renderCursor() {
      const dx = mouseX - cursorX;
      const dy = mouseY - cursorY;

      cursorX += dx * 0.24;
      cursorY += dy * 0.24;

      cursor.style.transform = 'translate3d(' + cursorX + 'px, ' + cursorY + 'px, 0)';

      if (isMoving || Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) {
        requestAnimationFrame(renderCursor);
      }
    }

    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest(
        '[data-cursor], a, button, .project-card, .agent-item, .card-image-box, .telemetry-card, .accordion-panel'
      );

      if (target) {
        cursor.classList.add('active');
        const customText = target.getAttribute('data-cursor');
        const defaultText = target.classList.contains('project-card') ? 'EXPLORAR' : 'VER';
        cursor.setAttribute('data-cursor-text', customText || defaultText);
      } else {
        cursor.classList.remove('active');
        cursor.removeAttribute('data-cursor-text');
      }
    }, { passive: true });
  }

  // =========================================================================
  // 10. REFRESH E RECALIBRAÇÃO DE SCROLL (Garante Posição Precisa de Disparo)
  // =========================================================================
  function setupScrollCalibration() {
    window.addEventListener('load', () => {
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    });

    setTimeout(() => {
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    }, 450);
  }

  // =========================================================================
  // 10.1 AUTO-RECUPERAÇÃO DE ATIVOS (Resiliência Dual-Path: /assets/ e Raiz)
  // =========================================================================
  function setupAssetResilience() {
    document.querySelectorAll('img[src^="assets/"]').forEach((img) => {
      img.addEventListener('error', function onImgError() {
        const currentSrc = this.getAttribute('src');
        if (currentSrc && currentSrc.startsWith('assets/')) {
          this.removeEventListener('error', onImgError);
          this.src = currentSrc.replace(/^assets\//, '');
        }
      });
    });

    document.querySelectorAll('video').forEach((vid) => {
      const poster = vid.getAttribute('poster');
      if (poster && poster.startsWith('assets/')) {
        const testImg = new Image();
        testImg.onerror = () => { vid.poster = poster.replace(/^assets\//, ''); };
        testImg.src = poster;
      }
    });
  }

  // =========================================================================
  // 11. INICIALIZAÇÃO MASTER
  // =========================================================================
    // =========================================================================
  // 10.5 SELETOR DE CENÁRIOS DO HERO (CROSSFADE DINÂMICO)
  // =========================================================================
  function initHeroPhotoSwitcher() {
    const buttons = document.querySelectorAll('.photo-switch-btn');
    const heroMedia = document.getElementById('hero-bg-media');
    if (!buttons.length || !heroMedia) return;

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const imgName = btn.getAttribute('data-img');
        if (!imgName) return;

        if (typeof gsap !== 'undefined') {
          gsap.to(heroMedia, {
            opacity: 0.05,
            scale: 0.95,
            duration: 0.22,
            ease: 'power2.in',
            onComplete: () => {
              heroMedia.src = 'assets/' + imgName;
              heroMedia.onerror = function () {
                this.src = imgName;
              };
              gsap.to(heroMedia, {
                opacity: 0.85,
                scale: 1,
                duration: 0.45,
                ease: 'power2.out'
              });
            }
          });
        } else {
          heroMedia.src = 'assets/' + imgName;
        }
      });
    });
  }

  
  // =========================================================================
  // 10.6 CLUSTER DOS 7 AGENTES ESPECIALISTAS (SHOWCASE INTERATIVO & HUD MOTION)
  // =========================================================================
  function initCluster7AgentesInterativo() {
    const clusterItems = document.querySelectorAll('#cluster-agents-list .agent-item, .agents-cluster-list .agent-item');
    const hudOverlay = document.getElementById('motion-hud-overlay');
    const hudBadge = document.getElementById('motion-hud-badge');
    const hudTitle = document.getElementById('motion-hud-title');
    const hudRole = document.getElementById('motion-hud-role');
    const hudFaz = document.getElementById('motion-hud-faz');
    const hudAge = document.getElementById('motion-hud-age');
    const hudSim = document.getElementById('motion-hud-sim');
    const scanline = document.getElementById('motion-scanline');
    const visualStage = document.getElementById('motion-visual-stage') || document.querySelector('.motion-visual-wrapper');
    const motionTitle = document.getElementById('motion-agent-title');
    const motionDesc = document.getElementById('motion-agent-desc');

    if (!clusterItems.length || !hudTitle) return;

    const clusterAgentesData = [
      {
        index: "01",
        code: "ETAPA 01 // ACOLHIMENTO IMEDIATO",
        title: "Triagem & Recepção Relâmpago",
        role: "Primeiro contato ágil e estruturado via WhatsApp",
        faz: "Acolhe contatos recebidos em canais digitais instantaneamente, evitando que o potencial cliente esfrie ou procure concorrentes por falta de resposta.",
        age: "Conversa com cordialidade em linguagem natural, identifica o nome, a necessidade e a urgência, organizando os dados para o consultor humano dar prosseguimento.",
        sim: "> Lead entra no WhatsApp :: Mensagem acolhida em tempo real :: Dados essenciais registrados :: Equipe notificada com histórico",
        resumoGeral: "A primeira impressão da sua empresa acontece aqui. Uma recepção imediata e organizada retém a atenção do cliente e eleva a taxa de continuidade do atendimento."
      },
      {
        index: "02",
        code: "ETAPA 02 // FILTRO DE PERFIL",
        title: "Qualificador de Oportunidades",
        role: "Análise prévia de orçamento, ramo e momento de compra",
        faz: "Separa contatos casuais de compradores reais antes de sobrecarregar a agenda dos consultores ou da diretoria executiva.",
        age: "Aplica critérios objetivos de qualificação em poucas perguntas cordiais, atribuindo score e prioridade imediata aos contatos mais maduros.",
        sim: "> Informações de demanda coletadas :: Perfil classificado como ALTO VALOR :: Encaminhado com dossiê ao vendedor",
        resumoGeral: "Direciona a energia da sua equipe para as conversas que têm real potencial de fechamento, aumentando a produtividade de cada vendedor."
      },
      {
        index: "03",
        code: "ETAPA 03 // AGENDA & PRESENÇA",
        title: "Agendamento & Confirmação Ativa",
        role: "Gestão inteligente de consultas, reuniões e comparecimento",
        faz: "Coordena a agenda comercial e protege a produtividade da equipe, minimizando faltas e cancelamentos de última hora.",
        age: "Oferece horários livres em tempo real, envia confirmações ativas com opções de remarcação e orientações prévias antes do encontro.",
        sim: "> Horário sincronizado na agenda do Google/CRM :: Confirmação disparada 24h e 2h antes :: Presença confirmada pelo cliente",
        resumoGeral: "Elimina a perda de tempo com agendamentos manuais e protege a rotina dos consultores contra faltas inesperadas."
      },
      {
        index: "04",
        code: "ETAPA 04 // RESGATE DE PROPOSTAS",
        title: "Blindagem de Follow-up",
        role: "Recuperação de orçamentos e conversas sem resposta",
        faz: "Evita que propostas comerciais enviadas se percam no silêncio e no esquecimento da correria diária dos clientes.",
        age: "Dispara cadências planejadas de acompanhamento em intervalos adequados, reabrindo conversas com abordagens elegantes e contextuais.",
        sim: "> Proposta enviada há 48h sem resposta :: Mensagem personalizada de resgate disparada :: Cliente responde e reativa negociação",
        resumoGeral: "Resgata oportunidades que normalmente seriam dadas como perdidas, aumentando o faturamento sem necessidade de novos investimentos em tráfego."
      },
      {
        index: "05",
        code: "ETAPA 05 // AUDITORIA & ROI",
        title: "Inteligência de Dados & Telemetria",
        role: "Visão panorâmica em tempo real dos gargalos do funil",
        faz: "Substitui o 'achismo' por indicadores visíveis de onde cada cliente veio e por quais motivos compras deixaram de acontecer.",
        age: "Registra cada etapa do atendimento em painéis de gestão, identificando canais mais lucrativos e horários de maior conversão.",
        sim: "> Origem de tráfego auditada :: Tempo de atendimento tabulado :: Motivos de perda consolidados para ajuste da diretoria",
        resumoGeral: "Oferece ao empresário dados sólidos para saber exatamente onde cortar custos e onde investir para acelerar o crescimento."
      },
      {
        index: "06",
        code: "ETAPA 06 // RELACIONAMENTO & SATISFAÇÃO",
        title: "Retenção & Pós-Venda",
        role: "Acompanhamento da satisfação e fidelização da carteira",
        faz: "Garante que o cliente atendido continue satisfeito e permaneça leal à sua empresa por muito mais tempo.",
        age: "Coleta feedback de atendimento após a compra, orienta sobre os próximos passos e identifica oportunidades de novos serviços.",
        sim: "> Pesquisa de satisfação pós-venda realizada :: Avaliação positiva registrada :: Indicação de serviço complementar apresentada",
        resumoGeral: "Um cliente satisfeito volta a comprar e recomenda seu negócio. Essa etapa constrói a base de reputação e recorrência da marca."
      },
      {
        index: "07",
        code: "ETAPA 07 // MONETIZAÇÃO DA BASE",
        title: "Reativação de Base Inativa",
        role: "Geração de novas receitas com clientes que já compraram",
        faz: "Cria um canal previsível de faturamento a partir do patrimônio mais valioso da empresa: sua própria carteira de clientes.",
        age: "Mapeia momentos oportunos (revisões, ciclos de recompra, datas sazonais) e envia convites exclusivos para clientes inativos.",
        sim: "> Clientes inativos há mais de 90 dias segmentados :: Condição especial disparada :: 14 novos atendimentos reabertos",
        resumoGeral: "Vender para quem já confia na sua empresa custa uma fração do valor de adquirir um novo cliente. Essa etapa monetiza a sua base."
      }
    ];

    let currentIndex = 0;
    let autoRotateTimer = null;

    function ativarAgente(idx, isUserClick) {
      if (idx < 0 || idx >= clusterAgentesData.length) return;
      currentIndex = idx;
      const data = clusterAgentesData[idx];

      clusterItems.forEach((btn, i) => {
        if (i === idx) {
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');
        } else {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        }
      });

      if (typeof gsap !== 'undefined') {
        if (scanline) {
          gsap.fromTo(scanline, 
            { top: '0%', opacity: 1 }, 
            { top: '100%', opacity: 0, duration: 0.65, ease: 'power2.out' }
          );
        }

        if (visualStage) {
          gsap.fromTo(visualStage, 
            { scale: 0.988, borderColor: '#00E5FF' }, 
            { scale: 1, borderColor: 'rgba(0, 229, 255, 0.35)', duration: 0.45, ease: 'power2.out' }
          );
        }

        gsap.to(hudOverlay, {
          opacity: 0.15,
          y: -8,
          duration: 0.15,
          ease: 'power2.in',
          onComplete: () => {
            if (hudBadge) hudBadge.textContent = data.code;
            if (hudTitle) hudTitle.textContent = data.title;
            if (hudRole) hudRole.textContent = data.role;
            if (hudFaz) hudFaz.textContent = data.faz;
            if (hudAge) hudAge.textContent = data.age;
            if (hudSim) hudSim.textContent = data.sim;

            if (motionDesc && data.resumoGeral) {
              motionDesc.textContent = data.resumoGeral;
            }

            gsap.to(hudOverlay, {
              opacity: 1,
              y: 0,
              duration: 0.32,
              ease: 'power2.out'
            });
          }
        });
      } else {
        if (hudBadge) hudBadge.textContent = data.code;
        if (hudTitle) hudTitle.textContent = data.title;
        if (hudRole) hudRole.textContent = data.role;
        if (hudFaz) hudFaz.textContent = data.faz;
        if (hudAge) hudAge.textContent = data.age;
        if (hudSim) hudSim.textContent = data.sim;
        if (motionDesc && data.resumoGeral) motionDesc.textContent = data.resumoGeral;
      }

      if (isUserClick) {
        clearInterval(autoRotateTimer);
      }
    }

    clusterItems.forEach((item, index) => {
      item.addEventListener('click', () => {
        ativarAgente(index, true);
      });
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          ativarAgente(index, true);
        }
      });
    });

    autoRotateTimer = setInterval(() => {
      const next = (currentIndex + 1) % clusterAgentesData.length;
      ativarAgente(next, false);
    }, 7000);

    const sec = document.getElementById('cluster-7-agentes') || document.querySelector('.section-motion');
    if (sec) {
      sec.addEventListener('mouseenter', () => clearInterval(autoRotateTimer));
    }
  }

  
  // =========================================================================
  // ATIVAÇÃO DINÂMICA DA TEXTURA DE TIRAS EXCLUSIVAMENTE A PARTIR DE SOLUÇÕES EM AÇÃO
  // Na página 1 (Hero), a textura permanece 100% invisível (fundo preto puro)
  // =========================================================================
  function initTirasTextureTrigger() {
    const featuredSec = document.querySelector('.section-featured');
    if (!featuredSec) {
      document.body.classList.add('tiras-active');
      return;
    }

    const checkTirasScroll = () => {
      const rect = featuredSec.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.90) {
        document.body.classList.add('tiras-active');
      } else {
        document.body.classList.remove('tiras-active');
      }
    };

    checkTirasScroll();
    window.addEventListener('scroll', checkTirasScroll, { passive: true });

    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.create({
        trigger: featuredSec,
        start: 'top 90%',
        onEnter: () => document.body.classList.add('tiras-active'),
        onLeaveBack: () => document.body.classList.remove('tiras-active'),
        onEnterBack: () => document.body.classList.add('tiras-active')
      });
    }
  }

  // =========================================================================
  // GUARDA DE SEGURANÇA: GARANTE VISIBILIDADE DE TODOS OS CARDS E CAIXAS
  // =========================================================================
  function ensureAllCardsVisible() {
    const criticalElements = document.querySelectorAll(
      '.funil-etapa-row, .agent-item, .accordion-panel, .telemetry-card, .depth-card-item, .agent-inspector-glass-card'
    );
    criticalElements.forEach((el) => {
      el.style.opacity = '1';
      el.style.visibility = 'visible';
    });
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  }

  function initEngine() {
    setupAssetResilience();
    initLenisSmoothScroll();
    initHeroMaskReveal();
    initHeroExoapeScrollKinematics();
    initHeroPhotoSwitcher();
    initTirasTextureTrigger();
    initCluster7AgentesInterativo();
    initScrollMaskHeadlines();
    initPortfolioFluidParallax();
    initCustomSectionsScroll();
    initMagneticPhysics();
    initNavbarThemeInversion();
    initAcceleratingTicker();
    initCustomCursor();
    setupScrollCalibration();
    ensureAllCardsVisible();
    window.addEventListener("load", ensureAllCardsVisible);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEngine);
  } else {
    initEngine();
  }

  window.VIDE_ENGINE = {
    getLenis: () => lenisInstance,
    refreshScroll: () => {
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    }
  };
})();
