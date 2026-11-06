const sections = ['home', 'about', 'education', 'inspiration'];

// Service Worker Registration for PWA support (relative path fix for GitHub Pages)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Registered!'))
            .catch(err => console.log('Service Worker Registration Failed:', err));
    });
}

function updateArrowVisibility(targetId) {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // Hide left arrow on Home (first tab), show on others
    if (targetId === 'home') {
        prevBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'flex';
    }

    // Hide right arrow on Contact (last tab), show on others
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

// Navbar Link Click Handlers
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('data-target');
        switchTab(targetId);
    });
});

// Next Arrow Logic
document.getElementById('nextBtn').addEventListener('click', () => {
    const activeSec = document.querySelector('.tab-section.active-tab');
    const currentIndex = sections.indexOf(activeSec.id);
    if (currentIndex < sections.length - 1) {
        switchTab(sections[currentIndex + 1]);
    }
});

// Previous Arrow Logic
document.getElementById('prevBtn').addEventListener('click', () => {
    const activeSec = document.querySelector('.tab-section.active-tab');
    const currentIndex = sections.indexOf(activeSec.id);
    if (currentIndex > 0) {
        switchTab(sections[currentIndex - 1]);
    }
});

// Keyboard Arrow Key Support
document.addEventListener('keydown', (e) => {
    const activeSec = document.querySelector('.tab-section.active-tab');
    const currentIndex = sections.indexOf(activeSec.id);
    if (e.key === 'ArrowRight' && currentIndex < sections.length - 1) {
        switchTab(sections[currentIndex + 1]);
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        switchTab(sections[currentIndex - 1]);
    }
});

// Touch Swipe Support for Smartphones
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const activeSec = document.querySelector('.tab-section.active-tab');
    const currentIndex = sections.indexOf(activeSec.id);

    if (touchEndX < touchStartX - swipeThreshold) {
        if (currentIndex < sections.length - 1) {
            switchTab(sections[currentIndex + 1]);
        }
    }
    if (touchEndX > touchStartX + swipeThreshold) {
        if (currentIndex > 0) {
            switchTab(sections[currentIndex - 1]);
        }
    }
}

// Initialize state on load
updateArrowVisibility('home');