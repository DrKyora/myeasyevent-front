// accueil.page.js
import * as lib from './library.js';

let currentSlide = 0;
let autoPlayInterval = null;

export function init() {
    initCarousel();
    initEventFilterButtons();
}

function initCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    const prevBtn = document.getElementById('prevSlide');
    const nextBtn = document.getElementById('nextSlide');
    
    if (!slides.length) return;
    
    function showSlide(index) {
        // Boucler le carousel
        if (index >= slides.length) {
            currentSlide = 0;
        } else if (index < 0) {
            currentSlide = slides.length - 1;
        } else {
            currentSlide = index;
        }
        
        // Mettre à jour les slides
        slides.forEach((slide, i) => {
            if (i === currentSlide) {
                slide.classList.add('active');
            } else {
                slide.classList.remove('active');
            }
        });
        
        // Mettre à jour les dots
        dots.forEach((dot, i) => {
            if (i === currentSlide) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
    
    function nextSlide() {
        showSlide(currentSlide + 1);
    }
    
    function prevSlide() {
        showSlide(currentSlide - 1);
    }
    
    // Auto-play
    function startAutoPlay() {
        autoPlayInterval = setInterval(nextSlide, 5000);
    }
    
    function resetAutoPlay() {
        clearInterval(autoPlayInterval);
        startAutoPlay();
    }
    
    // Event listeners
    prevBtn?.addEventListener('click', () => {
        prevSlide();
        resetAutoPlay();
    });
    
    nextBtn?.addEventListener('click', () => {
        nextSlide();
        resetAutoPlay();
    });
    
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showSlide(index);
            resetAutoPlay();
        });
    });
    
    startAutoPlay();
}

function initEventFilterButtons() {
    const filterButtons = document.querySelectorAll('.event-filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            // Naviguer vers la page événements avec le filtre
            lib.appNavigate(`/evenements?filter=${filter}`);
            console.log(`[accueil] Filtre appliqué : ${filter}`);
        });
    });
}

export function unmount() {
    // Nettoyer l'auto-play quand on quitte la page
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }
}