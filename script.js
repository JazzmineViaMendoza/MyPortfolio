const sections = ['home', 'about', 'education', 'inspiration', 'contact'];

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
    if (window.caches) caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
}

function updateArrowVisibility(targetId) {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) {
        prevBtn.style.display = targetId === 'home' ? 'none' : 'flex';
    }

    if (nextBtn) {
        nextBtn.style.display = (targetId === 'inspiration' || targetId === 'contact') ? 'none' : 'flex';
    }
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PINK = '#FF2A85';
const DARK = '#07090F';
let transitioning = false;
let lastPoint = null;

document.addEventListener('pointerdown', e => { lastPoint = { x: e.clientX, y: e.clientY }; }, true);

/* ---------- HERO: split name into letters + replay reveal ---------- */
(function splitName() {
    const el = document.getElementById('heroName');
    if (!el || el.dataset.split) return;
    const text = el.textContent.trim();
    el.textContent = '';
    [...text].forEach((chr, i) => {
        const span = document.createElement('span');
        span.className = 'ch' + (chr === ' ' ? ' sp' : '');
        span.style.setProperty('--i', i);
        span.textContent = chr === ' ' ? '\u00A0' : chr;
        el.appendChild(span);
    });
    el.dataset.split = '1';
})();

function replayHero(delaySeconds) {
    const home = document.getElementById('home');
    if (!home || reduceMotion) return;
    home.style.setProperty('--hero-delay', delaySeconds + 's');
    home.classList.remove('hero-animate');
    void home.offsetWidth;
    home.classList.add('hero-animate');
}

/* ---------- FAMILY & FRIENDS: riffle-shuffle, cut, then deal with a flip ---------- */
function replayFamilyDeck() {
    const grid = document.getElementById('familyFriendsGrid');
    if (!grid || reduceMotion) return;
    const cards = Array.from(grid.querySelectorAll('.ff-card'));
    const n = cards.length;
    if (!n) return;

    cards.forEach(c => c.getAnimations().forEach(a => a.cancel()));

    const g = grid.getBoundingClientRect();
    const gcx = g.left + g.width / 2;
    const gcy = g.top + g.height / 2;

    grid.classList.add('shuffling');

    const DEAL_START = 2250;
    const DEAL_GAP = 190;
    const DEAL_DUR = 800;
    const TOTAL = DEAL_START + (n - 1) * DEAL_GAP + DEAL_DUR;
    const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';
    const half = n / 2;

    const anims = cards.map((card, i) => {
        const r = card.getBoundingClientRect();
        const px = gcx - (r.left + r.width / 2);
        const py = gcy - (r.top + r.height / 2);
        const w = r.width, h = r.height;
        const side = i < half ? -1 : 1;
        const tilt = ((i * 37) % 9 - 4) * 0.5;

        card.style.position = 'relative';
        card.style.zIndex = String(n - i);

        const T = (x, y, rot, ry, sc) =>
            `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg) rotateY(${ry}deg) scale(${sc})`;
        const kf = (ms, tf, extra = {}) => ({ offset: ms / TOTAL, transform: tf, easing: EASE, ...extra });

        const pile = T(px, py - i * 3, tilt, 180, 1);
        const ds = DEAL_START + i * DEAL_GAP;

        const frames = [
            kf(0,    T(px, py + 40, tilt, 180, 0.8), { opacity: 0 }),
            kf(350,  pile, { opacity: 1 }),
            // riffle: split the pile into two halves
            kf(780,  T(px + side * w * 0.6, py - 10 - (i % 2) * 6, side * -9 + tilt, 180, 1)),
            // riffle: interleave the halves
            kf(1120, T(px + side * w * 0.07, py - i * 5, side * -2, 180, 1)),
            kf(1320, T(px, py - i * 3, tilt, 180, 1)),
            // cut: top half slides off and drops back under
            kf(1620, T(px + (i >= half ? w * 0.5 : 0), py - h * (i >= half ? 0.18 : 0), i >= half ? 7 : tilt, 180, 1)),
            kf(1960, T(px, py + (i >= half ? 6 : -i * 3), tilt, 180, 1)),
            kf(ds,   pile),
            // deal: arc through the air, flipping face-up
            kf(ds + DEAL_DUR * 0.45, T(px * 0.4, py * 0.4 - h * 0.28, side * 10, 90, 1.1)),
            kf(ds + DEAL_DUR, T(0, 0, 0, 0, 1)),
        ];
        // card i holds its pile pose until its own deal start; keep offsets monotonic
        const cleaned = [];
        frames.forEach(f => {
            if (!cleaned.length || f.offset >= cleaned[cleaned.length - 1].offset) cleaned.push(f);
        });
        const last = cleaned[cleaned.length - 1];
        if (last.offset < 1) cleaned.push({ offset: 1, transform: last.transform, easing: 'linear' });

        return card.animate(cleaned, { duration: TOTAL, delay: 260, fill: 'both' });
    });

    Promise.all(anims.map(a => a.finished.catch(() => null))).then(() => {
        if (anims.some(a => a.playState === 'idle')) return; // cancelled by a newer replay
        anims.forEach(a => a.cancel());
        cards.forEach(c => { c.style.position = ''; c.style.zIndex = ''; });
        grid.classList.remove('shuffling');
    });
}

/* ---------- PAGE TRANSITIONS ---------- */
const overlay = document.createElement('div');
overlay.id = 'pageTransition';
document.body.appendChild(overlay);

const TRANSITION_FOR = {
    home: 'diagonal',
    about: 'blinds',
    education: 'iris',
    inspiration: 'curtains',
    contact: 'slats'
};

function layer(style) {
    const d = document.createElement('div');
    d.className = 'pt-layer';
    Object.assign(d.style, style);
    overlay.appendChild(d);
    return d;
}

function anim(el, frames, opts) {
    return el.animate(frames, { fill: 'forwards', ...opts }).finished;
}

function showLabel(text) {
    const l = document.createElement('div');
    l.className = 'pt-label';
    l.textContent = text;
    overlay.appendChild(l);
    return l;
}

const runners = {
    // vertical blinds grow up, then fold away downward
    async blinds(swap, o, label) {
        const N = 9, ease = 'cubic-bezier(0.7, 0, 0.2, 1)';
        const strips = Array.from({ length: N }, (_, i) => layer({
            left: (i * 100 / N) + '%', width: (100 / N + 0.25) + '%', top: 0, height: '100%',
            background: i % 2 ? PINK : DARK, transformOrigin: 'bottom', transform: 'scaleY(0)'
        }));
        await Promise.all(strips.map((s, i) => anim(s, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
            { duration: 330, delay: i * 28, easing: ease })));
        const lab = showLabel(label);
        lab.animate([{ opacity: 0, transform: 'scale(0.85)' }, { opacity: 1, transform: 'none' }], { duration: 220, fill: 'forwards' });
        swap();
        await new Promise(r => setTimeout(r, 260));
        lab.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
        strips.forEach(s => s.style.transformOrigin = 'top');
        await Promise.all(strips.map((s, i) => anim(s, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }],
            { duration: 330, delay: (N - 1 - i) * 28, easing: ease })));
    },

    // circular iris closes from the click point, then opens back toward it
    async iris(swap, o, label) {
        const R = '150vmax', ease = 'cubic-bezier(0.7, 0, 0.2, 1)';
        const at = `at ${o.x}px ${o.y}px`;
        const a = layer({ inset: 0, background: PINK, clipPath: `circle(0px ${at})` });
        const b = layer({ inset: 0, background: DARK, clipPath: `circle(0px ${at})` });
        await Promise.all([
            anim(a, [{ clipPath: `circle(0px ${at})` }, { clipPath: `circle(${R} ${at})` }], { duration: 560, easing: ease }),
            anim(b, [{ clipPath: `circle(0px ${at})` }, { clipPath: `circle(${R} ${at})` }], { duration: 560, delay: 110, easing: ease })
        ]);
        const lab = showLabel(label);
        lab.animate([{ opacity: 0, letterSpacing: '0.4em' }, { opacity: 1, letterSpacing: '0.08em' }], { duration: 260, fill: 'forwards' });
        swap();
        await new Promise(r => setTimeout(r, 300));
        lab.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
        await Promise.all([
            anim(b, [{ clipPath: `circle(${R} ${at})` }, { clipPath: `circle(0px ${at})` }], { duration: 520, easing: ease }),
            anim(a, [{ clipPath: `circle(${R} ${at})` }, { clipPath: `circle(0px ${at})` }], { duration: 520, delay: 90, easing: ease })
        ]);
    },

    // theatre curtains meet in the middle, then part again
    async curtains(swap, o, label) {
        const ease = 'cubic-bezier(0.76, 0, 0.24, 1)';
        const L = layer({ left: 0, top: 0, width: '50.2%', height: '100%', background: `linear-gradient(90deg, ${DARK}, #1a0f22)` });
        const R = layer({ right: 0, top: 0, width: '50.2%', height: '100%', background: `linear-gradient(270deg, ${DARK}, #1a0f22)` });
        const seam = layer({ left: '50%', top: 0, width: '3px', height: '100%', background: PINK, boxShadow: `0 0 24px ${PINK}`, transform: 'translateX(-50%) scaleY(0)' });
        await Promise.all([
            anim(L, [{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }], { duration: 520, easing: ease }),
            anim(R, [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], { duration: 520, easing: ease }),
            anim(seam, [{ transform: 'translateX(-50%) scaleY(0)' }, { transform: 'translateX(-50%) scaleY(1)' }], { duration: 520, delay: 200, easing: ease })
        ]);
        const lab = showLabel(label);
        lab.animate([{ opacity: 0, transform: 'scale(1.2)' }, { opacity: 1, transform: 'none' }], { duration: 240, fill: 'forwards' });
        swap();
        await new Promise(r => setTimeout(r, 280));
        lab.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
        await Promise.all([
            anim(seam, [{ opacity: 1 }, { opacity: 0 }], { duration: 160 }),
            anim(L, [{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }], { duration: 560, delay: 60, easing: ease }),
            anim(R, [{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], { duration: 560, delay: 60, easing: ease })
        ]);
    },

    // horizontal slats slide in from alternating sides and exit the opposite way
    async slats(swap, o, label) {
        const N = 7, ease = 'cubic-bezier(0.7, 0, 0.2, 1)';
        const slats = Array.from({ length: N }, (_, i) => layer({
            top: (i * 100 / N) + '%', height: (100 / N + 0.3) + '%', left: 0, width: '100%',
            background: i % 2 ? PINK : DARK
        }));
        await Promise.all(slats.map((s, i) => anim(s,
            [{ transform: `translateX(${i % 2 ? 100 : -100}%)` }, { transform: 'translateX(0)' }],
            { duration: 380, delay: i * 45, easing: ease })));
        const lab = showLabel(label);
        lab.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 240, fill: 'forwards' });
        swap();
        await new Promise(r => setTimeout(r, 280));
        lab.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
        await Promise.all(slats.map((s, i) => anim(s,
            [{ transform: 'translateX(0)' }, { transform: `translateX(${i % 2 ? -100 : 100}%)` }],
            { duration: 380, delay: i * 45, easing: ease })));
    },

    // slanted pink + dark panels sweep across (used when returning Home)
    async diagonal(swap, o, label) {
        const ease = 'cubic-bezier(0.7, 0, 0.2, 1)';
        const mk = bg => layer({ top: 0, left: '-30%', width: '160%', height: '100%', background: bg, transform: 'translateX(-110%) skewX(-18deg)' });
        const a = mk(PINK), b = mk(DARK);
        await Promise.all([
            anim(a, [{ transform: 'translateX(-110%) skewX(-18deg)' }, { transform: 'translateX(0) skewX(-18deg)' }], { duration: 520, easing: ease }),
            anim(b, [{ transform: 'translateX(-110%) skewX(-18deg)' }, { transform: 'translateX(0) skewX(-18deg)' }], { duration: 520, delay: 110, easing: ease })
        ]);
        swap();
        await new Promise(r => setTimeout(r, 120));
        await Promise.all([
            anim(a, [{ transform: 'translateX(0) skewX(-18deg)' }, { transform: 'translateX(110%) skewX(-18deg)' }], { duration: 520, delay: 90, easing: ease }),
            anim(b, [{ transform: 'translateX(0) skewX(-18deg)' }, { transform: 'translateX(110%) skewX(-18deg)' }], { duration: 520, easing: ease })
        ]);
    }
};

function setActiveNav(targetId) {
    document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll(`.nav-link[data-target="${targetId}"]`).forEach(nav => nav.classList.add('active'));
}

function applyTab(targetId) {
    document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active-tab', 'sec-in'));
    setActiveNav(targetId);

    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        targetSection.classList.add('active-tab');
        void targetSection.offsetWidth;
        targetSection.classList.add('sec-in');
    }

    // Always default Achievements to "All Schools" & "All" categories when clicked
    if (targetId === 'education') {
        const allSchoolBtn = document.querySelector('.ach-edu-item[data-school-filter="all"]');
        const allCatBtn = document.querySelector('.ach-pill[data-cat-filter="all"]');
        if (allCatBtn && !allCatBtn.classList.contains('active')) allCatBtn.click();
        if (allSchoolBtn) allSchoolBtn.click();
    }

    if (targetId === 'inspiration') replayFamilyDeck();
    if (targetId === 'home') replayHero(0.2);

    updateArrowVisibility(targetId);
}

function switchTab(targetId, origin) {
    const current = document.querySelector('.tab-section.active-tab');
    const sameTab = current && current.id === targetId;

    if (transitioning) return;
    if (sameTab || reduceMotion || !document.getElementById(targetId)) {
        applyTab(targetId);
        return;
    }

    const link = document.querySelector(`.nav-link[data-target="${targetId}"]`);
    const label = (link && link.textContent.trim()) || targetId;
    const o = origin || lastPoint || { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    transitioning = true;
    document.body.classList.add('pt-running');
    setActiveNav(targetId);

    const run = runners[TRANSITION_FOR[targetId]] || runners.blinds;
    run(() => applyTab(targetId), o, label)
        .catch(() => applyTab(targetId))
        .finally(() => {
            overlay.innerHTML = '';
            document.body.classList.remove('pt-running');
            transitioning = false;
            setTimeout(() => {
                const sec = document.getElementById(targetId);
                if (sec) sec.classList.remove('sec-in');
            }, 1000);
        });
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('data-target');
        if (targetId) switchTab(targetId);
    });
});

function isLightboxOpen() {
    const lb = document.getElementById('lightbox');
    return !!lb && lb.classList.contains('open');
}

function step(direction) {
    if (isLightboxOpen()) return;
    const activeSec = document.querySelector('.tab-section.active-tab');
    if (!activeSec) return;

    if (activeSec.id === 'contact') {
        if (direction < 0) switchTab('inspiration');
        return;
    }

    const nextIndex = sections.indexOf(activeSec.id) + direction;
    if (nextIndex >= 0 && nextIndex < sections.length) {
        switchTab(sections[nextIndex]);
    }
}

document.getElementById('nextBtn').addEventListener('click', () => step(1));
document.getElementById('prevBtn').addEventListener('click', () => step(-1));

document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
});

let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].screenX - touchStartX;
    const dy = e.changedTouches[0].screenY - touchStartY;
    const swipeThreshold = 50;

    if (Math.abs(dx) > swipeThreshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
        step(dx < 0 ? 1 : -1);
    }
}, { passive: true });

updateArrowVisibility('home');

// Landing: monogram intro, then the hero reveals as the halves open
(function landing() {
    const intro = document.getElementById('intro');
    if (reduceMotion) {
        if (intro) intro.remove();
        return;
    }
    replayHero(1.45);
    setTimeout(() => { if (intro) intro.remove(); }, 2500);
})();

// --- Achievements Filter + 3D JV Card Flip + Family & Friends Zoom + Lightbox ---
document.addEventListener('DOMContentLoaded', () => {
    const schoolButtons = Array.from(document.querySelectorAll('.ach-edu-item'));
    const catButtons = Array.from(document.querySelectorAll('.ach-pill'));
    const certCards = Array.from(document.querySelectorAll('.ach-cert-card'));
    const ffCards = Array.from(document.querySelectorAll('.ff-card.zoomable-photo'));

    const lightbox = document.getElementById('lightbox');
    const lbImg = document.getElementById('lightboxImg');
    const lbTitle = document.getElementById('lightboxTitle');
    const lbMeta = document.getElementById('lightboxMeta');
    const lbClose = document.getElementById('lightboxClose');
    const lbZoomBtn = document.getElementById('lightboxZoomBtn');

    let activeSchool = 'all';
    let activeCat = 'all';
    let lastFocus = null;
    let isMaximized = false;

    function applyAchievementFilters() {
        let visibleIndex = 0;

        certCards.forEach(card => {
            const schoolMatch = activeSchool === 'all' || card.getAttribute('data-school') === activeSchool;
            const catMatch = activeCat === 'all' || card.getAttribute('data-cat') === activeCat;
            const isVisible = schoolMatch && catMatch;

            card.classList.toggle('hidden-card', !isVisible);
            card.classList.remove('cert-flip-in');

            if (isVisible) {
                card.style.setProperty('--stagger', visibleIndex++);
                void card.offsetWidth; // Force reflow so 3D flip replays cleanly
                card.classList.add('cert-flip-in');
            }
        });

        const grid = document.getElementById('achievementsGrid');
        if (grid) grid.classList.toggle('all-mode', activeSchool === 'all');

        const emptyMsg = document.getElementById('achEmpty');
        if (emptyMsg) emptyMsg.hidden = visibleIndex > 0;
    }

    // Ensure "All Schools" is active on initial load
    schoolButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-school-filter') === 'all'));
    applyAchievementFilters();

    schoolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            schoolButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeSchool = btn.getAttribute('data-school-filter') || 'all';
            applyAchievementFilters();
        });
    });

    catButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            catButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCat = btn.getAttribute('data-cat-filter') || 'all';
            applyAchievementFilters();
        });
    });

    function syncZoomButtonLabel() {
        if (!lbZoomBtn) return;
        lbZoomBtn.textContent = isMaximized ? 'Exit Zoom -' : 'Zoom +';
        lbZoomBtn.setAttribute('aria-pressed', String(isMaximized));
    }

    function setMaximized(state) {
        if (!lightbox) return;
        isMaximized = Boolean(state);
        lightbox.classList.toggle('maximized', isMaximized);
        syncZoomButtonLabel();
    }

    function openPreview({ src, alt, title, meta, maximizeByDefault = false }) {
        if (!lightbox || !lbImg || !src) return;
        lbImg.src = src;
        lbImg.alt = alt || title || 'Preview';
        if (lbTitle) lbTitle.textContent = title || '';
        if (lbMeta) lbMeta.textContent = meta || '';

        lastFocus = document.activeElement;
        setMaximized(maximizeByDefault);
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
        (lbZoomBtn || lbClose)?.focus({ preventScroll: true });
    }

    function closeLightbox() {
        if (!lightbox) return;
        setMaximized(false);
        lightbox.classList.remove('open');
        lightbox.setAttribute('aria-hidden', 'true');
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }

    certCards.forEach(card => {
        const openCert = () => {
            const img = card.querySelector('img');
            if (!img) return;
            const title = card.querySelector('.ach-cert-caption h4')?.textContent || img.alt || 'Certificate';
            const meta = card.querySelector('.ach-cert-caption p')?.textContent || '';
            openPreview({
                src: img.currentSrc || img.src,
                alt: img.alt || title,
                title,
                meta,
                maximizeByDefault: false
            });
        };

        card.addEventListener('click', openCert);
        card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openCert();
            }
        });
    });

    ffCards.forEach(card => {
        const handleOpen = () => {
            const img = card.querySelector('img');
            if (!img) return;
            const title = card.getAttribute('data-title') || card.querySelector('h3')?.textContent || '';
            const meta = card.getAttribute('data-meta') || card.querySelector('p')?.textContent || '';
            openPreview({
                src: img.currentSrc || img.src,
                alt: img.alt || title,
                title,
                meta,
                maximizeByDefault: true
            });
        };

        card.addEventListener('click', handleOpen);
        card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpen();
            }
        });
    });

    if (lbZoomBtn) {
        lbZoomBtn.addEventListener('click', e => {
            e.stopPropagation();
            setMaximized(!isMaximized);
        });
    }

    if (lbImg) {
        lbImg.addEventListener('click', e => {
            e.stopPropagation();
            setMaximized(!isMaximized);
        });
    }

    if (lightbox) {
        lightbox.addEventListener('click', e => {
            if (e.target === lightbox || e.target === lbClose || e.target.closest('.lightbox-figure') === null) {
                closeLightbox();
            }
        });
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && isLightboxOpen()) closeLightbox();
    });
});

// --- Personal Information: auto-fit so nothing overflows or needs scrolling ---
(function () {
    const about = document.getElementById('about');
    if (!about) return;

    const MIN_SCALE = 0.45;
    const STEP = 0.03;

    function overflows() {
        if (about.scrollHeight > about.clientHeight + 1) return true;

        const boxes = about.querySelectorAll(
            '.about-left-col, .about-right-col, .left-info-card, .profile-bio-card, .skills-main-box, .bio-text, .skills-list, .pi-card'
        );
        for (const el of boxes) {
            if (el.scrollHeight > el.clientHeight + 1) return true;
        }

        for (const li of about.querySelectorAll('.specs-list li')) {
            if (li.scrollWidth > li.clientWidth + 1) return true;
        }
        return false;
    }

    function fitAbout() {
        let scale = 1;
        about.style.setProperty('--fit', scale);
        while (scale > MIN_SCALE && overflows()) {
            scale = Math.round((scale - STEP) * 100) / 100;
            about.style.setProperty('--fit', scale);
        }
    }

    let raf = 0;
    function scheduleFit() {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(fitAbout);
    }

    fitAbout();
    window.addEventListener('load', scheduleFit);
    window.addEventListener('resize', scheduleFit);
    window.addEventListener('orientationchange', scheduleFit);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleFit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleFit);
})();