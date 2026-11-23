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

// --- 3-School Auto-Transition Showcase + Lightbox (with Maximize/Zoom) ---
document.addEventListener('DOMContentLoaded', () => {
    const columns = Array.from(document.querySelectorAll('.school-column'));
    const ffCards = Array.from(document.querySelectorAll('.ff-card.zoomable-photo'));
    const lightbox = document.getElementById('lightbox');
    const lbImg = document.getElementById('lightboxImg');
    const lbTitle = document.getElementById('lightboxTitle');
    const lbMeta = document.getElementById('lightboxMeta');
    const lbClose = document.getElementById('lightboxClose');
    const lbZoomBtn = document.getElementById('lightboxZoomBtn');

    let lastFocus = null;
    let isMaximized = false;

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

    function syncColumnMeta(col, slide) {
        const schoolNameEl = col.querySelector('.meta-school-name');
        const yearCatEl = col.querySelector('.meta-year-cat');
        const captionBox = col.querySelector('.school-meta-caption');
        if (!schoolNameEl || !yearCatEl || !slide) return;

        const schoolName = slide.getAttribute('data-school-name') || '';
        const year = slide.getAttribute('data-year') || '';
        const category = slide.getAttribute('data-category') || '';

        if (captionBox) captionBox.classList.add('fading');
        setTimeout(() => {
            schoolNameEl.textContent = schoolName;
            yearCatEl.textContent = [year, category].filter(Boolean).join(' • ');
            if (captionBox) captionBox.classList.remove('fading');
        }, 160);
    }

    columns.forEach((col, colIndex) => {
        const slides = Array.from(col.querySelectorAll('.showcase-slide'));
        const frame = col.querySelector('.school-showcase-frame');
        if (!slides.length) return;

        let currentIndex = slides.findIndex(s => s.classList.contains('active'));
        if (currentIndex < 0) currentIndex = 0;

        function showSlide(nextIdx) {
            slides[currentIndex].classList.remove('active');
            currentIndex = (nextIdx + slides.length) % slides.length;
            slides[currentIndex].classList.add('active');
            syncColumnMeta(col, slides[currentIndex]);
        }

        if (slides.length > 1) {
            setTimeout(() => {
                setInterval(() => {
                    if (!isLightboxOpen()) {
                        showSlide(currentIndex + 1);
                    }
                }, 3200);
            }, colIndex * 700);
        }

        if (frame) {
            frame.setAttribute('tabindex', '0');
            frame.setAttribute('role', 'button');

            const openCurrentSlide = () => {
                const activeSlide = slides[currentIndex];
                const img = activeSlide?.querySelector('img');
                if (!img) return;

                openPreview({
                    src: img.currentSrc || img.src,
                    alt: img.alt,
                    title: img.alt || 'Certificate Preview',
                    meta: [
                        activeSlide.getAttribute('data-school-name'),
                        activeSlide.getAttribute('data-year'),
                        activeSlide.getAttribute('data-category')
                    ].filter(Boolean).join(' • '),
                    maximizeByDefault: false
                });
            };

            frame.addEventListener('click', openCurrentSlide);
            frame.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openCurrentSlide();
                }
            });
        }
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