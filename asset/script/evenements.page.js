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
let viewMode = 'list';
let mapInstance = null;
let mapInfoWindow = null;
let mapScriptPromise = null;
let googleMapsMapId = null;
let mapGeocoder = null;
let mapMarkers = [];
let geocodeCache = new Map();
let userLocation = lib.getSavedLocation();

export async function init() {
    viewMode = 'list';
    // Réinitialiser la carte (elle peut persister du dernier passage)
    mapInstance = null;
    mapInfoWindow = null;
    mapMarkers = [];
    geocodeCache.clear();
    // Charger le template
    await loadTemplate();
    
    // Initialisation des éléments
    initFilterModal();
    initSearch();
    initPagination();
    initViewToggle();
    initMapModal();  // NOUVEAU: Initialiser la modale mobile
    
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

// Afficher les événements (liste ou carte selon le mode)
function renderEvents() {
    const listSection = document.getElementById('eventsListSection');
    const mapSection = document.getElementById('eventsMapSection');
    const pagination = document.getElementById('eventsPagination');

    if (listSection) {
        listSection.classList.toggle('hidden', viewMode !== 'list');
    }

    if (pagination) {
        pagination.classList.toggle('hidden', viewMode !== 'list');
    }

    if (mapSection) {
        mapSection.classList.toggle('hidden', viewMode !== 'map');
    }

    syncViewToggleButtons();

    if (viewMode === 'map') {
        renderMapView();
        return;
    }

    renderListEvents();
}

// Afficher les événements en liste
function renderListEvents() {
    const grid = document.getElementById('eventsGrid');

    if (!grid) {
        return;
    }

    const startIndex = (currentPage - 1) * eventsPerPage;
    const endIndex = startIndex + eventsPerPage;
    const eventsToShow = filteredEvents.slice(startIndex, endIndex);

    grid.innerHTML = '';

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

    eventsToShow.forEach(event => {
        const cardElement = createEventCardFromTemplate(event);
        grid.appendChild(cardElement);
    });

    updatePagination();
}

// Initialiser le toggle list/carte
function initViewToggle() {
    const listViewBtn = document.getElementById('listViewBtn');
    const mapViewBtn = document.getElementById('mapViewBtn');

    listViewBtn?.addEventListener('click', () => {
        if (viewMode !== 'list') {
            viewMode = 'list';
            renderEvents();
        }
    });

    mapViewBtn?.addEventListener('click', () => {
        if (viewMode !== 'map') {
            viewMode = 'map';
            renderEvents();
        }
    });

    syncViewToggleButtons();
}

// Synchroniser l'apparence des boutons toggle
function syncViewToggleButtons() {
    const listViewBtn = document.getElementById('listViewBtn');
    const mapViewBtn = document.getElementById('mapViewBtn');

    if (listViewBtn) {
        listViewBtn.classList.toggle('bg-blue-dianne-500', viewMode === 'list');
        listViewBtn.classList.toggle('text-white', viewMode === 'list');
        listViewBtn.classList.toggle('text-blue-dianne-500', viewMode !== 'list');
    }

    if (mapViewBtn) {
        mapViewBtn.classList.toggle('bg-blue-dianne-500', viewMode === 'map');
        mapViewBtn.classList.toggle('text-white', viewMode === 'map');
        mapViewBtn.classList.toggle('text-blue-dianne-500', viewMode !== 'map');
    }
}


// ===== NOUVELLE FONCTIONNALITÉ: Liste + Modale Mobile pour la carte =====

// Rendre la liste des événements pour la vue carte (desktop)
async function renderMapEventsList() {
    const listContainer = document.getElementById('mapEventsListContainer');
    const listCount = document.getElementById('mapListCount');
    
    if (!listContainer || !listCount) return;

    const eventsToShow = [...filteredEvents];
    
    if (eventsToShow.length === 0) {
        listContainer.innerHTML = '<p class="p-4 text-center text-gray-500">Aucun événement</p>';
        listCount.textContent = '0 événement';
        return;
    }

    // Charger le template de l'item
    let itemTemplate = '';
    try {
        const templateResponse = await fetch('./components/mapEventItem.html');
        itemTemplate = await templateResponse.text();
    } catch (error) {
        console.error('Erreur chargement template:', error);
        return;
    }
    
    listContainer.innerHTML = '';
    
    eventsToShow.forEach(event => {
        const imageUrl = event.images?.length > 0 
            ? `${lib.urlBackend}img/events/512/${event.images[0].fileName}.webp`
            : './asset/img/student.jpg';
        
        const startDate = typeof moment !== 'undefined'
            ? moment(event.startDate).format('DD MMMM HH:mm')
            : new Date(event.startDate).toLocaleDateString('fr-FR');
        
        const itemHtml = itemTemplate
            .replace(/{{eventId}}/g, event.id)
            .replace(/{{image}}/g, imageUrl)
            .replace(/{{title}}/g, event.title)
            .replace(/{{address}}/g, formatAddress(event.address))
            .replace(/{{startDate}}/g, startDate);
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = itemHtml;
        const item = tempDiv.firstElementChild;
        
        // Clic sur l'item = zoom sur le marqueur (desktop)
        item.addEventListener('click', () => {
            zoomToEvent(event);
            highlightEventItem(event.id);
        });
        
        listContainer.appendChild(item);
    });
    
    listCount.textContent = `${eventsToShow.length} événement${eventsToShow.length > 1 ? 's' : ''}`;
}

// Zoom sur un événement spécifique
async function zoomToEvent(event) {
    const addressLabel = formatAddress(event.address);
    const location = await geocodeEventAddress(event, addressLabel);
    
    if (location && mapInstance) {
        mapInstance.setCenter(location);
        mapInstance.setZoom(15);
        
        // Ouvrir l'infowindow
        mapInfoWindow.setContent(buildMarkerContent(event, addressLabel));
        mapInfoWindow.setPosition(location);
        mapInfoWindow.open({ map: mapInstance });
    }
}

// Mettre en évidence l'item dans la liste
function highlightEventItem(eventId) {
    document.querySelectorAll('.map-event-item').forEach(item => {
        item.classList.remove('bg-blue-100', 'border-l-4', 'border-l-blue-dianne-500');
    });
    
    const activeItem = document.querySelector(`[data-event-id="${eventId}"]`);
    if (activeItem) {
        activeItem.classList.add('bg-blue-100', 'border-l-4', 'border-l-blue-dianne-500');
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Afficher la modale mobile pour un événement
function openMapEventModal(event, addressLabel) {
    const modal = document.getElementById('mapEventModal');
    const title = document.getElementById('modalEventTitle');
    const content = document.getElementById('mapEventModalContent');
    const viewDetailBtn = document.getElementById('viewEventDetail');
    
    if (!modal || !title || !content || !viewDetailBtn) return;
    
    // Remplir les infos
    title.textContent = event.title;
    
    const imageUrl = event.images?.length > 0 
        ? `${lib.urlBackend}img/events/512/${event.images[0].fileName}.webp`
        : './asset/img/student.jpg';
    
    const startDate = typeof moment !== 'undefined'
        ? moment(event.startDate).format('DD MMMM YYYY HH:mm')
        : new Date(event.startDate).toLocaleDateString('fr-FR');
    
    const endDate = typeof moment !== 'undefined'
        ? moment(event.endDate).format('DD MMMM YYYY HH:mm')
        : new Date(event.endDate).toLocaleDateString('fr-FR');
    
    const nbReservations = Array.isArray(event.reservations) ? event.reservations.length : 0;
    const placesDisponibles = event.maxReservation - nbReservations;
    const placesClass = placesDisponibles > 0 ? 'text-green-600' : 'text-red-600';
    const placesText = placesDisponibles > 0 ? `${placesDisponibles} place(s)` : 'Complet';
    
    const ageBadges = {
        0: 'Tout public',
        12: '12+',
        16: '16+',
        18: '18+'
    };
    const ageBadge = ageBadges[event.ageRestriction] || 'Tout public';
    
    content.innerHTML = `
        <div class="p-4">
            <img src="${imageUrl}" alt="${event.title}" class="w-full h-64 object-cover rounded-lg mb-4">
            
            <div class="space-y-3">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-dianne-500">${ageBadge}</span>
                    <span class="${placesClass} font-semibold text-sm">${placesText}</span>
                </div>
                
                <div>
                    <h4 class="text-sm font-semibold text-gray-600">Organisateur</h4>
                    <p class="text-sm text-gray-900">${event.user?.firstName || ''} ${event.user?.lastName || ''}</p>
                </div>
                
                <div>
                    <h4 class="text-sm font-semibold text-gray-600">Lieu</h4>
                    <p class="text-sm text-gray-900">${addressLabel}</p>
                </div>
                
                <div>
                    <h4 class="text-sm font-semibold text-gray-600">Date et heure</h4>
                    <p class="text-sm text-gray-900">Du ${startDate}</p>
                    <p class="text-sm text-gray-900">Au ${endDate}</p>
                </div>
            </div>
        </div>
    `;
    
    // Mettre à jour le bouton "Voir détails"
    viewDetailBtn.onclick = () => {
        modal.classList.add('hidden');
        window.navigate(`/event-detail?id=${event.id}&from=map`);
    };
    
    // Afficher la modale
    modal.classList.remove('hidden');
}

// Initialiser la modale mobile
function initMapModal() {
    const modal = document.getElementById('mapEventModal');
    const closeBtn = document.getElementById('closeMapEventModal');
    
    if (!modal || !closeBtn) return;
    
    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    // Fermer aussi si clic sur le backdrop
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

// Afficher les événements sur la carte
async function renderMapView() {
    const mapElement = document.getElementById('eventsMap');
    const mapStatus = document.getElementById('mapStatus');

    if (!mapElement || !mapStatus) {
        return;
    }

    // Charger Google Maps si pas déjà chargé
    const apiReady = await ensureGoogleMapsLoaded();
    if (!apiReady || !window.google?.maps) {
        mapStatus.textContent = 'La carte Google Maps nécessite une clé API. Veuillez configurer la clé dans le backend.';
        return;
    }

    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));  // 2 frames pour que le DOM soit prêt

    // S'assurer que le conteneur a une hauteur explicite (Google Maps l'exige)
    if (mapElement.offsetHeight === 0 || !mapElement.style.height) {
        mapElement.style.height = '600px';
    }


    if (!mapInstance) {
        mapInstance = new google.maps.Map(mapElement, {
            center: { lat: 48.8566, lng: 2.3522 },
            zoom: 5,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            mapId: googleMapsMapId || undefined,
        });
        mapInfoWindow = new google.maps.InfoWindow();
    } else {
        // Réappliquer la hauteur si elle a été perdue
        if (mapElement.offsetHeight === 0 || !mapElement.style.height) {
            mapElement.style.height = '600px';
        }
        google.maps.event.trigger(mapInstance, 'resize');
    }

    clearMapMarkers();

    const eventsToShow = [...filteredEvents];

    if (eventsToShow.length === 0) {
        mapStatus.textContent = 'Aucun événement à afficher sur la carte.';
        mapInstance.setCenter({ lat: 48.8566, lng: 2.3522 });
        mapInstance.setZoom(5);
        return;
    }

    mapStatus.textContent = 'Géocodage des événements...';
    
    // ✅ NOUVEAU: Afficher la liste d'événements (desktop)
    await renderMapEventsList();

    const markerData = await Promise.all(eventsToShow.map(async event => {
        const addressLabel = formatAddress(event.address);
        const location = await geocodeEventAddress(event, addressLabel);
        return location ? { event, location, addressLabel } : null;
    }));

    const validMarkers = markerData.filter(Boolean);

    if (validMarkers.length === 0) {
        mapStatus.textContent = 'Impossible de positionner les événements sur la carte.';
        mapInstance.setCenter({ lat: 48.8566, lng: 2.3522 });
        mapInstance.setZoom(5);
        return;
    }
    const bounds = new google.maps.LatLngBounds();

        const isMobileView = window.innerWidth < 768;

    validMarkers.forEach(({ event, location, addressLabel }) => {
    const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstance,
        position: location,
        title: event.title,
    });

    marker.addEventListener('click', () => {
        mapInstance.setCenter(location);
        mapInstance.setZoom(15);
        mapInfoWindow.setContent(buildMarkerContent(event, addressLabel));
        mapInfoWindow.open({ map: mapInstance, anchor: marker });
        highlightEventItem(event.id);
    });

    mapMarkers.push(marker);
    bounds.extend(location);
    });
    mapInfoWindow.addListener('closeclick', () => {
        document.querySelectorAll('.map-event-item').forEach(item => {
            item.classList.remove('bg-blue-100', 'border-l-4', 'border-l-blue-dianne-500');
        });
    });

    if (validMarkers.length === 1) {
        mapInstance.setCenter(validMarkers[0].location);
        mapInstance.setZoom(12);
    } else {
        mapInstance.fitBounds(bounds);
    }

    mapStatus.textContent = `${validMarkers.length} événement(s) positionné(s) sur la carte.`;
}

// Nettoyer les marqueurs de la carte
function clearMapMarkers() {
    mapMarkers.forEach(marker => {
        if (typeof marker.setMap === 'function') {
            marker.setMap(null);
            return;
        }

        marker.map = null;
    });
    mapMarkers = [];
}

// Charger le script Google Maps avec clé depuis le backend
async function ensureGoogleMapsLoaded() {
    if (window.google?.maps) {
        return true;
    }

    if (!mapScriptPromise) {
        mapScriptPromise = new Promise(async (resolve, reject) => {
            try {
                const apiKey = await getGoogleMapsApiKeyFromBackend();

                if (!apiKey) {
                    reject(new Error('Clé API Google Maps non disponible'));
                    return;
                }

                const callbackName = '__myeasyeventMapsInit';

                // Evite les collisions si la fonction existe déjà
                if (window[callbackName]) {
                    delete window[callbackName];
                }

                window[callbackName] = () => {
                    delete window[callbackName];
                    resolve(true);
                };

                const script = document.createElement('script');
                script.src =
                    'https://maps.googleapis.com/maps/api/js'
                    + '?key=' + encodeURIComponent(apiKey)
                    + '&v=weekly'
                    + '&libraries=marker'
                    + '&loading=async'
                    + '&callback=' + callbackName;

                script.async = true;
                script.defer = false;  // Important: ne pas utiliser defer avec callback async

                script.onerror = () => {
                    if (window[callbackName]) {
                        delete window[callbackName];
                    }
                    mapScriptPromise = null;
                    reject(new Error('Impossible de charger Google Maps'));
                };

                document.head.appendChild(script);
            } catch (error) {
                mapScriptPromise = null;
                reject(error);
            }
        });
    }

    try {
        await mapScriptPromise;
        return !!window.google?.maps;
    } catch (error) {
        console.error('Erreur chargement Google Maps:', error);
        return false;
    }
}

// Récupérer la clé API depuis le backend
async function getGoogleMapsApiKeyFromBackend() {
    try {
        const session = lib.getCookie('MYEASYEVENT_Session');
        
        const response = await fetch(`${lib.urlBackend}API/googleMaps.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'getGoogleMapsApiKey',
                session: session
            }),
        });
        const data = await response.json();

        if (data.status === 'success' && data.data?.apiKey) {
            googleMapsMapId = data.data?.mapId || null;
            return data.data.apiKey;
        }
    } catch (error) {
        console.error('Erreur récupération clé API:', error);
    }

    return null;
}

// Obtenir le code région depuis le pays
function getRegionCode(country) {
    const value = (country || '').toString().trim().toLowerCase();
    if (value.includes('belg')) return 'be';
    if (value.includes('fr')) return 'fr';
    return '';
}

// Géocoder une adresse via le backend
async function geocodeEventAddress(event, addressLabel) {
    const normalizedAddress = (addressLabel || '').trim();

    if (!normalizedAddress || normalizedAddress === 'Adresse non disponible') {
        return null;
    }

    const cacheKey = `${normalizedAddress}|${event?.address?.country || ''}`;

    if (geocodeCache.has(cacheKey)) {
        return geocodeCache.get(cacheKey);
    }

    try {
        const session = lib.getCookie('MYEASYEVENT_Session');
        
        const response = await fetch(`${lib.urlBackend}API/googleMaps.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'geocodeAddress',
                address: normalizedAddress,
                regionCode: getRegionCode(event?.address?.country) || 'FR',
                streetNumber: event?.address?.streetNumber || '',
                street: event?.address?.street || '',
                zipCode: event?.address?.zipCode || '',
                city: event?.address?.city || '',
                country: event?.address?.country || '',
                session: session
            }),
        });

        const data = await response.json();

        if (data.status === 'success' && data.data?.lat && data.data?.lng) {
            const location = { lat: data.data.lat, lng: data.data.lng };
            geocodeCache.set(cacheKey, location);
            return location;
        }
    } catch (error) {
        console.error('Erreur géocodage:', error);
    }

    return null;
}

// Créer le contenu d'une infowindow sur la carte
function buildMarkerContent(event, addressLabel) {
    const title = escapeHtml(event.title || 'Événement');
    const place = escapeHtml(addressLabel || 'Adresse non disponible');
    const startDate = escapeHtml(formatDate(event.startDate));
    const endDate = escapeHtml(formatDate(event.endDate));

    return `
        <div class="max-w-xs p-2">
            <h3 class="text-lg font-semibold text-blue-dianne-500 mb-1">${title}</h3>
            <p class="text-sm text-gray-600 mb-1">${place}</p>
            <p class="text-sm text-gray-500 mb-3">Du ${startDate} au ${endDate}</p>
            <button onclick="window.navigate('/event-detail?id=${encodeURIComponent(event.id)}')" class="inline-flex items-center rounded-lg bg-burnt-sienna-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-burnt-sienna-600">
                Voir le détail
            </button>
        </div>
    `;
}

// Créer une carte d'événement à partir du template
function createEventCardFromTemplate(event) {
    const imageUrl = event.images && event.images.length > 0 
            ? `${lib.urlBackend}img/events/512/${event.images[0].fileName}.webp`
            : './asset/img/student.jpg';
    const startDate = formatDate(event.startDate);
    const endDate = formatDate(event.endDate);
    const nbReservations = Array.isArray(event.reservations) ? event.reservations.length : 0;
    const placesDisponibles = event.maxReservation - nbReservations;
    
    // Formater l'adresse
    const formattedAddress = formatAddress(event.address);
    
    // Déterminer le badge d'âge
    const ageBadge = getAgeBadgeHTML(event.ageRestriction);
    
    // Déterminer les classes et texte des places
    const placesClass = placesDisponibles > 0 ? 'text-green-600' : 'text-red-600';
    const placesText = placesDisponibles > 0 ? `${placesDisponibles} place(s) disponible(s)` : 'Complet';
    
    // Remplacer les placeholders
    let cardHTML = eventCardTemplate
        .replace(/{{image}}/g, imageUrl)
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
        window.navigate(`/event-detail?id=${event.id}&from=events`);
    });
    
    return cardElement;
}

// Obtenir le HTML du badge d'âge
function getAgeBadgeHTML(ageRestriction) {
    const ageBadges = {
        0: '<span class="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">Tout public</span>',
        12: '<span class="absolute top-4 right-4 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">12+</span>',
        16: '<span class="absolute top-4 right-4 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">16+</span>',
        18: '<span class="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">18+</span>'
    };
    return ageBadges[ageRestriction] || ageBadges[0];
}

// Formater une date avec Moment.js
function formatDate(dateString) {
    if (typeof moment !== 'undefined') {
        return moment(dateString).format('DD/MM/YYYY');
    } else {
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
    
    if (address.street) {
        const street = address.streetNumber
            ? `${address.streetNumber} ${address.street}`
            : address.street;
        parts.push(street);
    }
    
    if (address.zipCode && address.city) {
        parts.push(`${address.zipCode} ${address.city}`);
    } else if (address.city) {
        parts.push(address.city);
    }
    
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
    
        distanceFilter?.addEventListener('change', (e) => {
        const selectedDistance = parseInt(e.target.value);
        
        if (distanceValue) {
            distanceValue.textContent = `${selectedDistance} km`;
        }
        
        // Si distance > 0 et pas de localisation, demander
        if (selectedDistance > 0 && !userLocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    lib.saveLocation(userLocation);
                    distanceValue.textContent = `${selectedDistance} km ✓`;
                    lib.SuccessToast.fire({ title: 'Localisation activée !' });
                },
                (error) => {
                    e.target.value = 0;
                    if (distanceValue) distanceValue.textContent = '0 km';
                    lib.ErrorToast.fire({ title: 'Accès à la localisation refusé' });
                }
            );
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
        
        window.history.pushState({}, '', window.location.pathname);
        filteredEvents = [...allEvents];
        currentPage = 1;
        renderEvents();
    });
    
    applyFilters?.addEventListener('click', () => {
        const filters = {
            category: document.getElementById('categoryFilter')?.value || '',
            date: document.getElementById('dateFilter')?.value || '',
            age: document.querySelector('input[name="ageFilter"]:checked')?.value || 'all',
            distance: document.getElementById('distanceFilter')?.value || '0',
            search: document.getElementById('searchEvents')?.value || ''
        };
        
        applyEventFilters(filters, true);
        closeModal();
        lib.SuccessToast.fire({ title: 'Filtres appliqués' });
    });
}

// Appliquer les filtres
function applyEventFilters(filters, updateURLFlag = true) {
    filteredEvents = allEvents.filter(event => {
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            const matchSearch = 
                event.title.toLowerCase().includes(searchTerm) ||
                event.userName.toLowerCase().includes(searchTerm) ||
                (event.address?.city && event.address.city.toLowerCase().includes(searchTerm)) ||
                (event.address?.street && event.address.street.toLowerCase().includes(searchTerm));
            
            if (!matchSearch) return false;
        }
        
        if (filters.age !== 'all') {
            const requiredAge = parseInt(filters.age);
            const eventAge = parseInt(event.ageRestriction) || 0;
            
            if (eventAge !== requiredAge) {
                return false;
            }
        }
        
        if (filters.date) {
            if (typeof moment !== 'undefined') {
                const filterDate = moment(filters.date);
                const eventStart = moment(event.startDate);
                const eventEnd = moment(event.endDate);
                
                if (filterDate.isBefore(eventStart, 'day') || filterDate.isAfter(eventEnd, 'day')) {
                    return false;
                }
            } else {
                const filterDate = new Date(filters.date);
                const eventStart = new Date(event.startDate);
                const eventEnd = new Date(event.endDate);
                
                if (filterDate < eventStart || filterDate > eventEnd) {
                    return false;
                }
            }
        }
        
        if (filters.category && filters.category !== '') {
            if (event.category && event.category.toLowerCase() !== filters.category.toLowerCase()) {
                return false;
            }
        }
                if (filters.distance && filters.distance !== '0' && userLocation) {
            // Géocoder l'événement si pas déjà fait
            if (!event._geocoded) {
                const addressLabel = formatAddress(event.address);
                // Utiliser le cache existant ou demander au backend
                const cacheKey = `${addressLabel}|${event?.address?.country || ''}`;
                if (geocodeCache.has(cacheKey)) {
                    event._geocoded = geocodeCache.get(cacheKey);
                }
            }
            
            if (event._geocoded) {
                const distance = lib.getDistanceKm(
                    userLocation.lat, 
                    userLocation.lng, 
                    event._geocoded.lat, 
                    event._geocoded.lng
                );
                if (distance > parseInt(filters.distance)) {
                    return false;
                }
            }
        }
        
        return true;
    });
    
    currentPage = 1;
    
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
        const filters = getFiltersFromURL();
        filters.search = searchTerm;
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
    if (viewMode === 'map') {
        return;
    }

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
                    ? 'border-1 border-burnt-sienna-500 text-white' 
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



