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

function replayFamilyDeck() {
    const inspSection = document.getElementById('inspiration');
    if (!inspSection) return;
    inspSection.classList.remove('deck-animate');
    void inspSection.offsetWidth; // Force reflow so animation replays cleanly
    inspSection.classList.add('deck-animate');
}

function switchTab(targetId) {
    document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active-tab'));
    document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));

    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        targetSection.classList.add('active-tab');
    }

    document.querySelectorAll(`.nav-link[data-target="${targetId}"]`).forEach(nav => {
        nav.classList.add('active');
    });

    // Always default Achievements to "All Schools" & "All" categories when clicked
    if (targetId === 'education') {
        const allSchoolBtn = document.querySelector('.ach-edu-item[data-school-filter="all"]');
        const allCatBtn = document.querySelector('.ach-pill[data-cat-filter="all"]');
        if (allCatBtn && !allCatBtn.classList.contains('active')) allCatBtn.click();
        if (allSchoolBtn) allSchoolBtn.click();
    }

    // Trigger Mom Spotlight + Deck-of-Cards transition on Family & Friends
    if (targetId === 'inspiration') {
        replayFamilyDeck();
    }

    updateArrowVisibility(targetId);
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