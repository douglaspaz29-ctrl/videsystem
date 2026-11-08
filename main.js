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

      gsap.from('.hero-editorial-text, .hero-editorial-lead, .cockpit-hero-sub, .cockpit-meta-chips', {
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
  function initHeroExoapeScrollKinematics() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    const heroStage = document.querySelector('.hero-stage');
    if (!heroStage) return;

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const titleRows = document.querySelectorAll('.hero-monumental-title .row');

    const mm = gsap.matchMedia();

    // DESKTOP: Experiência Cinematográfica Completa (992px+)
    mm.add('(min-width: 992px)', () => {
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.hero-stage',
          start: 'top top',
          end: '+=90%', // Pinned scroll runway para controle total pelo mousewheel
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        }
      });

      // 1. CAMADA DE FUNDO (Cenário Vivo & Vídeo Cósmico):
      //    Deslocamento lento contínuo (+18%) e variação sutil de escala (1.0 -> 1.25)
      heroTl.to('.hero-ambient-video-wrap', {
        yPercent: 18,
        ease: 'none'
      }, 0);

      heroTl.to('#hero-bg-video', {
        scale: 1.25,
        opacity: 0.12,
        ease: 'none'
      }, 0);

      // 2. HALO CIANO ATMOSFÉRICO:
      //    Deriva lenta e profunda no horizonte
      heroTl.to('.hero-cyan-halo', {
        yPercent: 30,
        xPercent: 12,
        scale: 1.30,
        opacity: 0.04,
        ease: 'none'
      }, 0);

      // 3. ANIMAÇÃO TIPOGRÁFICA VINCULADA AO SCROLL (SCROLL-DRIVEN TYPOGRAPHY):
      //    As linhas do título monumental funcionam como camadas com VELOCIDADES DIFERENTES,
      //    deslocando-se em trajetórias divergentes e desacopladas no espaço 3D.
      if (titleRows.length >= 3) {
        // Linha 1 ("ENGENHARIA"): Ascensão veloz (-135%), deriva para a esquerda (-8%) e leve rotação (-2.5°)
        heroTl.to(titleRows[0], {
          yPercent: -135,
          xPercent: -8,
          rotation: -2.5,
          ease: 'none'
        }, 0);
        heroTl.to(titleRows[0], {
          opacity: 0,
          ease: 'power1.in',
          duration: 0.65
        }, 0);

        // Linha 2 ("DE PRECISÃO"): Ascensão intermediária (-100%), deriva para a direita (+8%) e rotação contrária (+2.0°)
        heroTl.to(titleRows[1], {
          yPercent: -100,
          xPercent: 8,
          rotation: 2.0,
          ease: 'none'
        }, 0);
        heroTl.to(titleRows[1], {
          opacity: 0,
          ease: 'power1.in',
          duration: 0.78
        }, 0);

        // Linha 3 ("& ESCALA DIGITAL."): Ascensão em ritmo cadenciado (-70%) com expansão sutil de tracking
        heroTl.to(titleRows[2], {
          yPercent: -70,
          xPercent: -3,
          letterSpacing: '0.04em',
          ease: 'none'
        }, 0);
        heroTl.to(titleRows[2], {
          opacity: 0,
          ease: 'power1.in',
          duration: 0.88
        }, 0);
      } else {
        // Fallback para container único
        heroTl.to('.hero-title-container', {
          yPercent: -100,
          scale: 0.94,
          opacity: 0,
          ease: 'none'
        }, 0);
      }

      // 4. BLOCO EDITORIAL (530px):
      //    Ascensão suave em velocidade independente (-140%) com dissolução aos 40% da rolagem
      heroTl.to('.hero-editorial-col', {
        yPercent: -140,
        ease: 'none'
      }, 0);
      heroTl.to('.hero-editorial-col', {
        opacity: 0,
        ease: 'power1.out',
        duration: 0.40
      }, 0);

      // 5. HALLMARK DA MARCA & METADADOS SUPERIORES:
      //    Dissolução aos 30% da rolagem
      heroTl.to('.hero-brand-hallmark, .hero-meta-top', {
        yPercent: -80,
        opacity: 0,
        ease: 'none',
        duration: 0.30
      }, 0);

      // 6. BARRA INFERIOR E INDICADOR DE ROLAGEM:
      //    Desaparece no primeiro toque de rolagem (15%)
      heroTl.to('.hero-bottom-bar', {
        yPercent: -50,
        opacity: 0,
        ease: 'none',
        duration: 0.15
      }, 0);
    });

    // TABLET: Calibração Equilibrada (769px a 991px)
    mm.add('(min-width: 769px) and (max-width: 991px)', () => {
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.hero-stage',
          start: 'top top',
          end: '+=70%',
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        }
      });

      heroTl.to('.hero-ambient-video-wrap', { yPercent: 15, ease: 'none' }, 0);
      heroTl.to('#hero-bg-video', { scale: 1.18, opacity: 0.15, ease: 'none' }, 0);
      heroTl.to('.hero-cyan-halo', { yPercent: 22, scale: 1.20, opacity: 0.05, ease: 'none' }, 0);

      if (titleRows.length >= 3) {
        heroTl.to(titleRows[0], { yPercent: -100, xPercent: -5, ease: 'none' }, 0);
        heroTl.to(titleRows[0], { opacity: 0, ease: 'power1.in', duration: 0.65 }, 0);

        heroTl.to(titleRows[1], { yPercent: -75, xPercent: 5, ease: 'none' }, 0);
        heroTl.to(titleRows[1], { opacity: 0, ease: 'power1.in', duration: 0.78 }, 0);

        heroTl.to(titleRows[2], { yPercent: -50, xPercent: -2, ease: 'none' }, 0);
        heroTl.to(titleRows[2], { opacity: 0, ease: 'power1.in', duration: 0.88 }, 0);
      } else {
        heroTl.to('.hero-title-container', { yPercent: -80, opacity: 0, ease: 'none' }, 0);
      }

      heroTl.to('.hero-editorial-col', { yPercent: -100, opacity: 0, ease: 'none', duration: 0.45 }, 0);
      heroTl.to('.hero-brand-hallmark, .hero-meta-top', { yPercent: -60, opacity: 0, ease: 'none', duration: 0.35 }, 0);
      heroTl.to('.hero-bottom-bar', { yPercent: -35, opacity: 0, ease: 'none', duration: 0.20 }, 0);
    });

    // SMARTPHONE: Calibração Compacta com Pinning Curto (<= 768px)
    mm.add('(max-width: 768px)', () => {
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.hero-stage',
          start: 'top top',
          end: '+=50%',
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        }
      });

      heroTl.to('.hero-ambient-video-wrap', { yPercent: 10, ease: 'none' }, 0);
      heroTl.to('#hero-bg-video', { scale: 1.12, opacity: 0.18, ease: 'none' }, 0);

      if (titleRows.length >= 3) {
        heroTl.to(titleRows[0], { yPercent: -70, xPercent: -3, ease: 'none' }, 0);
        heroTl.to(titleRows[0], { opacity: 0, ease: 'power1.in', duration: 0.65 }, 0);

        heroTl.to(titleRows[1], { yPercent: -50, xPercent: 3, ease: 'none' }, 0);
        heroTl.to(titleRows[1], { opacity: 0, ease: 'power1.in', duration: 0.78 }, 0);

        heroTl.to(titleRows[2], { yPercent: -35, ease: 'none' }, 0);
        heroTl.to(titleRows[2], { opacity: 0, ease: 'power1.in', duration: 0.88 }, 0);
      } else {
        heroTl.to('.hero-title-container', { yPercent: -50, opacity: 0, ease: 'none' }, 0);
      }

      heroTl.to('.hero-editorial-col', { yPercent: -60, opacity: 0, ease: 'none', duration: 0.50 }, 0);
      heroTl.to('.hero-brand-hallmark, .hero-meta-top', { opacity: 0, ease: 'none', duration: 0.35 }, 0);
      heroTl.to('.hero-bottom-bar', { opacity: 0, ease: 'none', duration: 0.15 }, 0);
    });
  }

  // =========================================================================
  // 3. SCROLL-TRIGGERED SECTION HEADLINES (Efeito Reveal Universal em Todas as Seções)
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

      // Revelação suave do card ao entrar na tela
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
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    // 1. SEÇÃO 02 // FUNIL DE PERDAS: Entrada em Cascata das Linhas
    const funilContainer = document.querySelector('.funil-pipeline-container');
    if (funilContainer) {
      gsap.from('.funil-etapa-row', {
        y: 45,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: funilContainer,
          start: 'top 82%',
          once: true
        }
      });
    }

    // 2. A SUÍTE INTEGRADA: Elevação 3D dos Painéis Accordion
    const accordionGallery = document.querySelector('.accordion-gallery-wrapper');
    if (accordionGallery) {
      gsap.from('.accordion-panel', {
        y: 65,
        opacity: 0,
        scale: 0.94,
        duration: 0.95,
        stagger: 0.12,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: accordionGallery,
          start: 'top 80%',
          once: true
        }
      });
    }

    // 3. WORK IN MOTION / CLUSTER LIST
    const motionSection = document.querySelector('.section-motion');
    if (motionSection) {
      gsap.from('.motion-visual-wrapper', {
        scale: 0.9,
        opacity: 0.3,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: motionSection,
          start: 'top 75%',
          once: true
        }
      });

      gsap.from('.agent-item', {
        x: 35,
        opacity: 0,
        duration: 0.75,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.agents-cluster-list',
          start: 'top 82%',
          once: true
        }
      });
    }

    // 4. TELEMETRIA SWISS (Métricas Grid)
    const telemetryGrid = document.querySelector('.telemetry-grid');
    if (telemetryGrid) {
      gsap.from('.telemetry-card', {
        y: 50,
        opacity: 0,
        duration: 0.85,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: telemetryGrid,
          start: 'top 82%',
          once: true
        }
      });
    }

    // 5. TELEMETRIA E DADOS VIVOS (Esfera 3D & HUD)
    const inteligenciaSection = document.getElementById('inteligencia');
    if (inteligenciaSection) {
      // Entrada da Esfera e do HUD
      gsap.from('#canvas-crystalized-ball', {
        scale: 0.75,
        opacity: 0,
        duration: 1.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.crystalized-ball-container',
          start: 'top 80%',
          once: true
        }
      });

      gsap.from('.telemetry-hud-container', {
        y: 35,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.telemetry-hud-container',
          start: 'top 90%',
          once: true
        }
      });

      // GIRO 3D DA ESFERA ACOPLADO DIRETAMENTE AO SCROLL DO USUÁRIO
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
      gsap.from('.agent-inspector-glass-card', {
        x: -60,
        opacity: 0,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: splitShowcase,
          start: 'top 80%',
          once: true
        }
      });

      gsap.from('.depth-carousel-wrapper', {
        x: 60,
        opacity: 0,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: splitShowcase,
          start: 'top 80%',
          once: true
        }
      });
    }
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
  function initEngine() {
    setupAssetResilience();
    initLenisSmoothScroll();
    initHeroMaskReveal();
    initHeroExoapeScrollKinematics();
    initScrollMaskHeadlines();
    initPortfolioFluidParallax();
    initCustomSectionsScroll();
    initMagneticPhysics();
    initNavbarThemeInversion();
    initAcceleratingTicker();
    initCustomCursor();
    setupScrollCalibration();
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
