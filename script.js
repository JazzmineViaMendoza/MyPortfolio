const sections = ['home', 'about', 'education', 'inspiration'];

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
    if (window.caches) caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
}

function updateArrowVisibility(targetId) {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (targetId === 'home') {
        prevBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'flex';
    }

    if (targetId === 'contact') {
        nextBtn.style.display = 'none';
    } else {
        nextBtn.style.display = 'flex';
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
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('data-target');
        switchTab(targetId);
    });
});

function step(direction) {
    const activeSec = document.querySelector('.tab-section.active-tab');
    if (!activeSec) return;

    if (activeSec.id === 'contact') {
        if (direction < 0) switchTab('home');
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

// --- Achievements Filter Controller ---
document.addEventListener('DOMContentLoaded', () => {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const grid = document.getElementById('achievementsGrid');
    const certCards = Array.from(document.querySelectorAll('.cert-card'));

    if (!certCards.length) return;

    function renderAchievements(filter) {
        if (grid) {
            grid.classList.toggle('academic-layout', filter === 'academic');
            grid.classList.toggle('extra-layout', filter === 'extracurricular');
        }

        certCards.forEach(card => {
            const category = card.getAttribute('data-category');
            if (filter === 'all' || category === filter) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const currentFilter = btn.getAttribute('data-filter');
            renderAchievements(currentFilter);
        });
    });

    renderAchievements('all');
});