/**
 * =====================================================================
 * DEPTH CAROUSEL VANILLA ENGINE (ReactBits Spec Adapted for VIDE)
 * 3D Depth Layering // Spread 90px // Tilt 22deg // Perspective 1400px
 * =====================================================================
 */

(function () {
    class DepthCarouselInstance {
        constructor(wrapper) {
            this.wrapper = wrapper;
            this.stage = wrapper.querySelector('.depth-carousel-stage');
            this.cards = Array.from(wrapper.querySelectorAll('.depth-card-item'));
            if (!this.cards.length) return;

            this.activeIndex = 0;
            this.total = this.cards.length;

            this.depth = parseInt(wrapper.getAttribute('data-depth')) || 220;
            this.spread = parseInt(wrapper.getAttribute('data-spread')) || 90;
            this.tilt = parseInt(wrapper.getAttribute('data-tilt')) || 22;

            this.btnPrev = wrapper.querySelector('[data-depth-prev]');
            this.btnNext = wrapper.querySelector('[data-depth-next]');
            this.dotsContainer = wrapper.querySelector('.depth-dots-container');

            this.setupDots();
            this.bindEvents();
            this.update();
        }

        setupDots() {
            if (!this.dotsContainer) return;
            this.dotsContainer.innerHTML = '';
            this.cards.forEach((_, idx) => {
                const dot = document.createElement('div');
                dot.className = `depth-dot ${idx === 0 ? 'is-active' : ''}`;
                dot.addEventListener('click', () => {
                    this.activeIndex = idx;
                    this.update();
                });
                this.dotsContainer.appendChild(dot);
            });
        }

        bindEvents() {
            if (this.btnPrev) {
                this.btnPrev.addEventListener('click', () => {
                    this.activeIndex = (this.activeIndex - 1 + this.total) % this.total;
                    this.update();
                });
            }
            if (this.btnNext) {
                this.btnNext.addEventListener('click', () => {
                    this.activeIndex = (this.activeIndex + 1) % this.total;
                    this.update();
                });
            }

            this.cards.forEach((card, idx) => {
                card.addEventListener('click', () => {
                    if (this.activeIndex !== idx) {
                        this.activeIndex = idx;
                        this.update();
                    }
                });
            });

            // Interação com o scroll / roda do mouse no carrossel 3D
            let wheelTimer = null;
            this.wrapper.addEventListener('wheel', (e) => {
                if (Math.abs(e.deltaY) > 20 && !wheelTimer) {
                    if (e.deltaY > 0) {
                        this.activeIndex = (this.activeIndex + 1) % this.total;
                    } else {
                        this.activeIndex = (this.activeIndex - 1 + this.total) % this.total;
                    }
                    this.update();
                    wheelTimer = setTimeout(() => { wheelTimer = null; }, 320);
                }
            }, { passive: true });
        }

        update() {
            this.cards.forEach((card, idx) => {
                let offset = idx - this.activeIndex;
                if (offset > this.total / 2) offset -= this.total;
                if (offset < -this.total / 2) offset += this.total;

                const absOffset = Math.abs(offset);
                const isActive = offset === 0;

                card.classList.toggle('is-active', isActive);

                if (absOffset > 3) {
                    card.style.opacity = '0';
                    card.style.pointerEvents = 'none';
                    card.style.transform = `translateX(${offset * 120}px) translateZ(-500px) scale(0.6)`;
                } else {
                    card.style.opacity = `${Math.max(0.2, 1 - absOffset * 0.28)}`;
                    card.style.pointerEvents = 'auto';

                    const tx = offset * this.spread;
                    const tz = -absOffset * this.depth;
                    const ry = -Math.sign(offset) * this.tilt * (absOffset > 0 ? 1 : 0);
                    const scale = 1 - absOffset * 0.08;
                    const blur = absOffset * 3;

                    card.style.filter = blur > 0 ? `blur(${blur}px)` : 'none';
                    card.style.zIndex = `${10 - absOffset}`;
                    card.style.transform = `translateX(${tx}px) translateZ(${tz}px) rotateY(${ry}deg) scale(${scale})`;
                }
            });

            if (this.dotsContainer) {
                const dots = this.dotsContainer.querySelectorAll('.depth-dot');
                dots.forEach((dot, idx) => {
                    dot.classList.toggle('is-active', idx === this.activeIndex);
                });
            }

            if (window.atualizarInspetorAgente) {
                window.atualizarInspetorAgente(this.activeIndex);
            }
        }
    }

    function inicializarDepthCarousel() {
        document.querySelectorAll('[data-depth-carousel]').forEach(el => new DepthCarouselInstance(el));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarDepthCarousel);
    } else {
        inicializarDepthCarousel();
    }
})();
