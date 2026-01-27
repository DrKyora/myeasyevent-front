import * as lib from './library.js';

if (typeof moment !== 'undefined') {
    moment.locale('fr');
}

// Variables globales
let allEvents = [];
let filteredEvents = [];
let currentPage = 1;
const eventsPerPage = 12;
let eventCardTemplate = '';

export async function init() {
    console.log('Page Événements initialisée !');
    
    // Charger le template
    await loadTemplate();
    
    // Initialisation des éléments
    initFilterModal();
    initSearch();
    initPagination();
    
    // Charger les événements
    await loadEvents();
    
    // Appliquer les filtres depuis l'URL
    applyFiltersFromURL();
}

// Charger le template de carte
async function loadTemplate() {
    try {
        const response = await fetch('./components/eventCard.html');
        eventCardTemplate = await response.text();
    } catch (error) {
        console.error('Erreur chargement template:', error);
        lib.ErrorToast.fire({ title: 'Erreur de chargement du template' });
    }
}

// Charger les événements depuis l'API
async function loadEvents() {
    try {
        const response = await fetch(`${lib.urlBackend}API/event.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'getAllEvents',
            }),
        });
        
        const data = await response.json();
        console.log('Réponse backend:', data);
        
        if (data.status === 'success' && data.data?.events) {
            allEvents = data.data.events;
            filteredEvents = [...allEvents];
        } else {
            lib.ErrorToast.fire({ title: 'Erreur lors du chargement des événements' });
        }
    } catch (error) {
        console.error('Erreur:', error);
        lib.ErrorToast.fire({ title: 'Erreur de connexion' });
    }
}

// Lire les paramètres depuis l'URL
function getFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    return {
        category: params.get('category') || '',
        date: params.get('date') || '',
        age: params.get('age') || 'all',
        distance: params.get('distance') || '0',
        search: params.get('search') || ''
    };
}

// Appliquer les filtres depuis l'URL au chargement
function applyFiltersFromURL() {
    const filters = getFiltersFromURL();
    
    // Restaurer les valeurs dans les champs de formulaire
    const categoryFilter = document.getElementById('categoryFilter');
    const dateFilter = document.getElementById('dateFilter');
    const searchInput = document.getElementById('searchEvents');
    const distanceFilter = document.getElementById('distanceFilter');
    const distanceValue = document.getElementById('distanceValue');
    
    if (categoryFilter) categoryFilter.value = filters.category;
    if (dateFilter) dateFilter.value = filters.date;
    if (searchInput) searchInput.value = filters.search;
    if (distanceFilter) {
        distanceFilter.value = filters.distance;
        if (distanceValue) distanceValue.textContent = `${filters.distance} km`;
    }
    
    // Restaurer le radio button d'âge
    const ageRadio = document.querySelector(`input[name="ageFilter"][value="${filters.age}"]`);
    if (ageRadio) ageRadio.checked = true;
    
    // Appliquer les filtres
    applyEventFilters(filters, false); // false = ne pas mettre à jour l'URL (déjà fait)
}

// Mettre à jour l'URL avec les filtres
function updateURL(filters) {
    const params = new URLSearchParams();
    
    if (filters.category) params.set('category', filters.category);
    if (filters.date) params.set('date', filters.date);
    if (filters.age && filters.age !== 'all') params.set('age', filters.age);
    if (filters.distance && filters.distance !== '0') params.set('distance', filters.distance);
    if (filters.search) params.set('search', filters.search);
    
    const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.pushState({}, '', newURL);
}

// Afficher les événements
function renderEvents() {
    const grid = document.getElementById('eventsGrid');
    
    // Calculer les événements à afficher
    const startIndex = (currentPage - 1) * eventsPerPage;
    const endIndex = startIndex + eventsPerPage;
    const eventsToShow = filteredEvents.slice(startIndex, endIndex);
    
    // Vider la grille
    grid.innerHTML = '';
    
    // Si aucun événement
    if (eventsToShow.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'col-span-full text-center py-12 flex items-center justify-center';
        const text = document.createElement('p');
        text.className = 'text-gray-500 text-lg';
        text.textContent = 'Aucun événement trouvé';
        noResults.appendChild(text);
        grid.appendChild(noResults);
        updatePagination();
        return;
    }
    
    // Créer les cartes
    eventsToShow.forEach(event => {
        const cardElement = createEventCardFromTemplate(event);
        grid.appendChild(cardElement);
    });
    
    updatePagination();
}

// Créer une carte d'événement à partir du template
function createEventCardFromTemplate(event) {
    const startDate = formatDate(event.startDate);
    const endDate = formatDate(event.endDate);
    const availablePlaces = event.maxReservation - (event.reservation || 0);
    
    // Formater l'adresse
    const formattedAddress = formatAddress(event.address);
    
    // Déterminer le badge d'âge
    const ageBadge = getAgeBadgeHTML(event.ageRestriction);
    
    // Déterminer les classes et texte des places
    const placesClass = availablePlaces > 0 ? 'text-green-600' : 'text-red-600';
    const placesText = availablePlaces > 0 ? `${availablePlaces} place(s) disponible(s)` : 'Complet';
    
    // Remplacer les placeholders
    let cardHTML = eventCardTemplate
        .replace(/{{image}}/g, './asset/img/student.jpg')
        .replace(/{{ageBadge}}/g, ageBadge)
        .replace(/{{title}}/g, escapeHtml(event.title))
        .replace(/{{userName}}/g, escapeHtml(event.userName))
        .replace(/{{address}}/g, escapeHtml(formattedAddress))
        .replace(/{{startDate}}/g, startDate)
        .replace(/{{endDate}}/g, endDate)
        .replace(/{{placesClass}}/g, placesClass)
        .replace(/{{placesText}}/g, placesText);
    
    // Créer l'élément
    const temp = document.createElement('div');
    temp.innerHTML = cardHTML;
    const cardElement = temp.firstElementChild;
    
    // Ajouter le listener pour le clic
    cardElement.addEventListener('click', () => {
        console.log('Clic sur événement:', event.id);
        window.navigate(`/event-detail?id=${event.id}`); // ✅ Navigation vers détails
    });
    
    return cardElement;
}

// Obtenir le HTML du badge d'âge
function getAgeBadgeHTML(ageRestriction) {
    if (!ageRestriction || ageRestriction === 0) {
        return '<span class="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">Tout public</span>';
    }
    return `<span class="absolute top-4 right-4 bg-burnt-sienna-500 text-white text-xs font-bold px-3 py-1 rounded-full">+${ageRestriction}</span>`;
}

// Formater une date avec Moment.js
function formatDate(dateString) {
    if (typeof moment !== 'undefined') {
        return moment(dateString).format('DD/MM/YYYY');
    } else {
        // Fallback si moment.js n'est pas chargé
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric'
        });
    }
}

// Formater l'adresse depuis l'objet
function formatAddress(address) {
    if (!address) return 'Adresse non disponible';
    
    const parts = [];
    
    // Rue et numéro
    if (address.street) {
        const street = address.streetNumber  // ✅ CORRIGÉ : streetNumber au lieu de streetNumer
            ? `${address.street} ${address.streetNumber}`
            : address.street;
        parts.push(street);
    }
    
    // Code postal et ville
    if (address.zipCode && address.city) {
        parts.push(`${address.zipCode} ${address.city}`);
    } else if (address.city) {
        parts.push(address.city);
    }
    
    // Pays
    if (address.country) {
        parts.push(address.country);
    }
    
    return parts.join(', ');
}

// Échapper le HTML pour éviter les injections
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialiser la modal des filtres
function initFilterModal() {
    const filterBtn = document.getElementById('filterBtn');
    const filterModal = document.getElementById('filterModal');
    const closeFilterModal = document.getElementById('closeFilterModal');
    const applyFilters = document.getElementById('applyFilters');
    const clearAllFilters = document.getElementById('clearAllFilters');
    const distanceFilter = document.getElementById('distanceFilter');
    const distanceValue = document.getElementById('distanceValue');
    
    const closeModal = () => {
        filterModal.classList.add('hidden');
        filterModal.classList.remove('flex');
        document.body.style.overflow = 'auto';
    };
    
    filterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        filterModal.classList.remove('hidden');
        filterModal.classList.add('flex');
    });
    
    closeFilterModal?.addEventListener('click', closeModal);
    
    filterModal?.addEventListener('click', (e) => {
        if (e.target === filterModal) closeModal();
    });
    
    distanceFilter?.addEventListener('input', (e) => {
        if (distanceValue) {
            distanceValue.textContent = `${e.target.value} km`;
        }
    });
    
    document.querySelectorAll('[data-clear]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.dataset.clear;
            
            if (target === 'categories') {
                document.getElementById('categoryFilter').value = '';
            } else if (target === 'date') {
                document.getElementById('dateFilter').value = '';
            } else if (target === 'age') {
                document.querySelector('input[name="ageFilter"][value="all"]').checked = true;
            } else if (target === 'distance') {
                document.getElementById('distanceFilter').value = 0;
                if (distanceValue) distanceValue.textContent = '0 km';
            }
        });
    });
    
    clearAllFilters?.addEventListener('click', () => {
        document.getElementById('categoryFilter').value = '';
        document.getElementById('dateFilter').value = '';
        document.querySelector('input[name="ageFilter"][value="all"]').checked = true;
        document.getElementById('distanceFilter').value = 0;
        if (distanceValue) distanceValue.textContent = '0 km';
        
        // Effacer l'URL et réafficher tous les événements
        window.history.pushState({}, '', window.location.pathname);
        filteredEvents = [...allEvents];
        currentPage = 1;
    });
    
    applyFilters?.addEventListener('click', () => {
        const filters = {
            category: document.getElementById('categoryFilter')?.value || '',
            date: document.getElementById('dateFilter')?.value || '',
            age: document.querySelector('input[name="ageFilter"]:checked')?.value || 'all',
            distance: document.getElementById('distanceFilter')?.value || '0',
            search: document.getElementById('searchEvents')?.value || ''
        };
        
        applyEventFilters(filters, true); // true = mettre à jour l'URL
        closeModal();
        lib.SuccessToast.fire({ title: 'Filtres appliqués' });
    });
}

// Appliquer les filtres
function applyEventFilters(filters, updateURLFlag = true) {
    filteredEvents = allEvents.filter(event => {
        // Filtre par recherche
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            const matchSearch = 
                event.title.toLowerCase().includes(searchTerm) ||
                event.userName.toLowerCase().includes(searchTerm) ||
                (event.address?.city && event.address.city.toLowerCase().includes(searchTerm)) ||
                (event.address?.street && event.address.street.toLowerCase().includes(searchTerm));
            
            if (!matchSearch) return false;
        }
        
        // Filtre par âge
        if (filters.age !== 'all') {
            const requiredAge = parseInt(filters.age);
            const eventAge = parseInt(event.ageRestriction) || 0;
            
            if (eventAge !== requiredAge) {
                return false;
            }
        }
        
        // Filtre par date
                // Filtre par date
        if (filters.date) {
            if (typeof moment !== 'undefined') {
                const filterDate = moment(filters.date);
                const eventStart = moment(event.startDate);
                const eventEnd = moment(event.endDate);
                
                if (filterDate.isBefore(eventStart, 'day') || filterDate.isAfter(eventEnd, 'day')) {
                    return false;
                }
            } else {
                // Fallback sans moment.js
                const filterDate = new Date(filters.date);
                const eventStart = new Date(event.startDate);
                const eventEnd = new Date(event.endDate);
                
                if (filterDate < eventStart || filterDate > eventEnd) {
                    return false;
                }
            }
        }
                
        // Filtre par catégorie
        if (filters.category && filters.category !== '') {
            if (event.category && event.category.toLowerCase() !== filters.category.toLowerCase()) {
                return false;
            }
        }
        
        return true;
    });
    
    currentPage = 1;
    
    // Mettre à jour l'URL si demandé
    if (updateURLFlag) {
        updateURL(filters);
    }
    
    renderEvents();
}

// Initialiser la recherche
function initSearch() {
    const searchInput = document.getElementById('searchEvents');
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        
        // Récupérer les filtres actuels
        const filters = getFiltersFromURL();
        filters.search = searchTerm;
        
        // Appliquer les filtres avec la recherche
        applyEventFilters(filters, true);
    });
}

// Initialiser la pagination
function initPagination() {
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    prevBtn?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderEvents();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    nextBtn?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderEvents();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

// Mettre à jour l'affichage de la pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
    const paginationNumbers = document.getElementById('paginationNumbers');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
    }
    
    if (paginationNumbers) {
        paginationNumbers.innerHTML = '';
        
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.className = `w-10 h-10 rounded-lg font-semibold transition-colors ${
                i === currentPage 
                    ? 'bg-white text-blue-dianne-500' 
                    : 'bg-transparent text-white hover:bg-blue-dianne-600'
            }`;
            
            btn.addEventListener('click', () => {
                currentPage = i;
                renderEvents();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            
            paginationNumbers.appendChild(btn);
        }
    }
}