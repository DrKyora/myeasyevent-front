// dashboard.page.js
import * as lib from './library.js';

if (typeof moment !== 'undefined') {
    moment.locale('fr');
}

// Tracker les sections déjà chargées
const loadedSections = {
    informations: false,
    events: false,
    devices: false,
    'gestion-utilisateurs': false,
    'gestion-evenements': false,
    'statistiques': false,
    'design': false
};

export async function init() {
    Object.keys(loadedSections).forEach(key => {
        loadedSections[key] = false;
    });
    
    await new Promise(resolve => setTimeout(resolve, 50));

    // ⭐ Vérifier le rôle et afficher les onglets admin
    const userRole = sessionStorage.getItem('userRole');
    if (userRole === 'admin') {
        showAdminTabs();
    }
    
    initSidebarToggle();
    initNavigation();
    
    // ✅ Récupérer l'onglet actif sauvegardé ou utiliser 'informations' par défaut
    // Si on vient d'une autre page, forcer "informations", sinon garder la mémorisation
    const activeTab = sessionStorage.getItem('dashboardVisited') 
        ? (localStorage.getItem('dashboardActiveTab') || 'informations')
        : 'informations';
    sessionStorage.setItem('dashboardVisited', 'true');
    
    // ✅ Mettre à jour l'UI pour refléter l'onglet actif
    setActiveTab(activeTab);
    
    // ✅ Charger la section active
    await loadSection(activeTab);
}

// ⭐ Afficher les onglets admin
function showAdminTabs() {
    const adminTabs = document.querySelectorAll('[data-role="admin"]');
    adminTabs.forEach(tab => {
        tab.classList.remove('hidden');
    });
}

// ✅ Définir l'onglet actif visuellement
function setActiveTab(sectionName) {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.dashboard-section');
    
    // Retirer l'état actif de tous les items
    navItems.forEach(nav => {
        nav.classList.remove('active');
        const indicator = nav.querySelector('.nav-indicator');
        if (indicator) indicator.style.opacity = '0';
    });
    
    // Ajouter l'état actif à l'item correspondant
    const activeItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
        const activeIndicator = activeItem.querySelector('.nav-indicator');
        if (activeIndicator) activeIndicator.style.opacity = '1';
    }
    
    // Cacher toutes les sections
    sections.forEach(section => section.classList.add('hidden'));
    
    // Afficher la section correspondante
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
}

// ✅ Charger une section spécifique (lazy loading)
async function loadSection(sectionName) {
    await new Promise(resolve => requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
    }));    
    switch(sectionName) {
        case 'informations':
            await loadUserInfo();
            initUpdateInfoForm();
            initUpdateEmailForm();
            initUpdatePasswordForm();
            initPasswordToggle();
            loadedSections.informations = true;
            break;
            
        case 'events':
            await loadUserEvents();
            loadedSections.events = true;
            break;
        case 'devices':
            await loadUserDevices();
            loadedSections.devices = true;
            break;
        // ⭐ Sections admin
        case 'gestion-utilisateurs':
            await loadAdminUsers();
            loadedSections['gestion-utilisateurs'] = true;
            break;
        
        case 'gestion-design':
            await loadAdminDesign();
            loadedSections['gestion-design'] = true;
            break;
        
        case 'gestion-evenements':
            await loadAdminEvents();
            loadedSections['gestion-evenements'] = true;
            break;
        
        case 'statistiques':
            await loadAdminStats();
            loadedSections['statistiques'] = true;
            break;
        case 'gestion-design':
            await initDesignManagement();
            loadedSections['gestion-design'] = true;
            break;
    }
}
// Charger les devices associés à l'utilisateur
async function loadUserDevices() {
    try {
        const devicesContainer = document.querySelector("#devicesContainer");
        
        if (!devicesContainer) {
            console.error('Conteneur #devicesContainer non trouvé');
            return;
        }
        
        // Charger le template de carte device
        const templateResponse = await fetch('./components/deviceCard.html');
        const deviceCardTemplate = await templateResponse.text();
        
        // Récupérer les devices depuis l'API
        const response = await fetch(`${lib.urlBackend}API/device.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'getDevicesOfUser',
                session: lib.getCookie('MYEASYEVENT_Session'),
                token: localStorage.getItem('MYEASYEVENT_Token')
            }),
        });
        
        const data = await response.json();
        
        if (data.status === 'success' && data.data?.devices) {
            const devices = data.data.devices;
            const currentDeviceId = data.data.currentDeviceId || null;
            
            if (devices.length === 0) {
                devicesContainer.innerHTML = '<p class="text-gray-500 text-center py-8 col-span-full">Aucun appareil enregistré</p>';
                return;
            }
            
            // Vider le conteneur
            devicesContainer.innerHTML = '';
            
            // Afficher chaque device
            devices.forEach((device) => {
                const deviceCard = renderDeviceCard(device, currentDeviceId, deviceCardTemplate);
                devicesContainer.appendChild(deviceCard);
            });
            
        } else {
            console.error('Erreur lors du chargement des devices');
            devicesContainer.innerHTML = '<p class="text-red-500 text-center py-8 col-span-full">Erreur de chargement des appareils</p>';
        }
    } catch (error) {
        console.error('Erreur:', error);
        lib.ErrorToast.fire({ title: 'Erreur de chargement des appareils' });
    }
}
// Charger les informations de l'utilisateur connecté
async function loadUserInfo() {
    try {
        const response = await fetch(`${lib.urlBackend}API/users.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'getUser',
                session: lib.getCookie('MYEASYEVENT_Session'),
            }),
        });
        
        const data = await response.json();
        if (data.status === 'success' && data.data.user) {
            const user = data.data.user;
            
            // Pré-remplir les champs
            const lastNameInput = document.getElementById('lastName');
            const firstNameInput = document.getElementById('firstName');
            const emailInput = document.getElementById('email');
            
            if (lastNameInput) lastNameInput.value = user.lastName || '';
            if (firstNameInput) firstNameInput.value = user.firstName || '';
            if (emailInput) emailInput.value = user.email || '';
        } else {
            console.error('Erreur lors du chargement des infos utilisateur');
        }
    } catch (error) {
        console.error('Erreur:', error);
        lib.ErrorToast.fire({ title: 'Erreur de chargement des informations' });
    }
}
// ✅ Charger les événements de l'utilisateur
async function loadUserEvents() {
    try {
        // Attendre que les éléments DOM soient disponibles
        let eventsGrid, noEventsMessage, createEventBtn;
        let attempts = 0;
        
        while (attempts < 10) {
            eventsGrid = document.getElementById('userEventsGrid');
            noEventsMessage = document.getElementById('noEventsMessage');
            createEventBtn = document.getElementById('createEventBtn');
            
            if (eventsGrid && noEventsMessage && createEventBtn) {
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 50));
            attempts++;
        }
        const templateResponse = await fetch('./components/eventCard.html');
        const eventCardTemplate = await templateResponse.text();
        
        // Ajouter le gestionnaire du bouton "Créer un événement" (une seule fois)
        createEventBtn.replaceWith(createEventBtn.cloneNode(true));
        const newCreateBtn = document.getElementById('createEventBtn');
        newCreateBtn.addEventListener('click', () => {
            window.navigate('/create-event');
        });
        
        const response = await fetch(`${lib.urlBackend}API/event.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'getEventsOfUser',
                session: lib.getCookie('MYEASYEVENT_Session'),
            }),
        });
        
        const data = await response.json();
        if (data.status === 'success' && data.data?.events && data.data.events.length > 0) {
            const events = data.data.events;
            
            // Cacher le message "aucun événement"
            noEventsMessage.classList.add('hidden');
            
            // Afficher les événements
            eventsGrid.innerHTML = events.map(event => {
                return renderEventCard(event, eventCardTemplate);
            }).join('');
            
            // Ajouter les gestionnaires de clic sur les cartes
            eventsGrid.querySelectorAll('[data-event-id]').forEach(card => {
                card.addEventListener('click', () => {
                    const eventId = card.getAttribute('data-event-id');
                    window.navigate(`/event-detail?id=${eventId}&from=dashboard`);
                });
            });
        } else {
            eventsGrid.innerHTML = '';
            noEventsMessage.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Erreur:', error);
        lib.ErrorToast.fire({ title: 'Erreur de chargement des événements' });
    }
}
// Gérer la modification des informations personnelles
function initUpdateInfoForm() {
    const lastNameInput = document.getElementById('lastName');
    const firstNameInput = document.getElementById('firstName');
    const updateInfoButton = document.getElementById('updateUserProfile');
    
    updateInfoButton?.addEventListener('click', async () => {
        const lastName = lastNameInput.value.trim();
        const firstName = firstNameInput.value.trim();
        
        if (!lastName || !firstName) {
            lib.ErrorToast.fire({ title: 'Veuillez remplir tous les champs' });
            return;
        }
        
        try {
            const response = await fetch(`${lib.urlBackend}API/users.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateUserProfile',
                    session: lib.getCookie('MYEASYEVENT_Session'),
                    user: {lastName, firstName}
                }),
            });
            
            const data = await response.json();
            if (data.status === 'success') {
                lib.SuccessToast.fire({ title: 'Informations mises à jour' });
            } else {
                lib.ErrorToast.fire({ title: data.message || 'Erreur lors de la mise à jour' });
            }
        } catch (error) {
            console.error('Erreur:', error);
            lib.ErrorToast.fire({ title: 'Erreur de connexion' });
        }
    });
}

// Gérer la modification de l'email
function initUpdateEmailForm() {
    const emailInput = document.getElementById('email');
    const updateEmailButton = document.getElementById('updateUserEmail');
    
    updateEmailButton?.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        
        if (!lib.verifyMailSyntax(email)) {
            lib.ErrorToast.fire({ title: 'Adresse e-mail invalide' });
            return;
        }
        
        try {
            const response = await fetch(`${lib.urlBackend}API/users.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateUserEmail',
                    session: lib.getCookie('MYEASYEVENT_Session'),
                    email
                }),
            });
            
            const data = await response.json();
            if (data.status === 'success') {
                lib.SuccessToast.fire({ title: 'Email mis à jour' });
            } else {
                lib.ErrorToast.fire({ title: data.message || 'Erreur lors de la mise à jour' });
            }
        } catch (error) {
            console.error('Erreur:', error);
            lib.ErrorToast.fire({ title: 'Erreur de connexion' });
        }
    });
}

// Gérer la modification du mot de passe
function initUpdatePasswordForm() {
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const updatePasswordButton = document.getElementById('updateUserPassword');
    
    updatePasswordButton?.addEventListener('click', async () => {
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (!lib.verifyPasswordSyntax(newPassword)) {
            lib.ErrorToast.fire({
                title: 'Mot de passe invalide',
                text: '8+ caractères, 1 minuscule, 1 majuscule, 1 chiffre, 1 spécial'
            });
            return;
        }
        
        if (newPassword !== confirmPassword) {
            lib.ErrorToast.fire({ title: 'Les mots de passe ne correspondent pas' });
            return;
        }
        
        try {
            const response = await fetch(`${lib.urlBackend}API/users.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateUserPassword',
                    session: lib.getCookie('MYEASYEVENT_Session'),
                    newPassword
                }),
            });
            
            const data = await response.json();
            if (data.status === 'success') {
                lib.SuccessToast.fire({ title: 'Mot de passe modifié' });
                newPasswordInput.value = '';
                confirmPasswordInput.value = '';
            } else {
                lib.ErrorToast.fire({ title: data.message || 'Erreur lors de la mise à jour' });
            }
        } catch (error) {
            console.error('Erreur:', error);
            lib.ErrorToast.fire({ title: 'Erreur de connexion' });
        }
    });
}

// Gérer l'ouverture/fermeture du menu
function initSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    const toggleIcon = document.getElementById('toggleIcon');
    const sidebarTitle = document.getElementById('sidebarTitle');
    const sidebarHeader = document.querySelector('#sidebar > div:first-child');
    const navTexts = document.querySelectorAll('.nav-text');
    
    let isOpen = localStorage.getItem('sidebarOpen') !== 'false';
    
    sidebar.style.transition = 'none';
    toggleIcon.style.transition = 'none';
    
    if (!isOpen) {
        sidebar.style.width = '40px';
        sidebar.style.paddingLeft = '0';
        sidebar.style.paddingRight = '0';
        toggleIcon.style.transform = 'rotate(180deg)';
        sidebarHeader.style.justifyContent = 'center';
        sidebarTitle.style.display = 'none';
        navTexts.forEach(text => text.style.display = 'none');
        sidebar.classList.remove('absolute', 'z-11');
    } else {
    if (window.innerWidth < 768) {
        sidebar.classList.add('absolute', 'z-11');
    }
}
    
    setTimeout(() => {
        sidebar.style.transition = '';
        toggleIcon.style.transition = '';
    }, 50);
    
    toggleBtn?.addEventListener('click', () => {
        isOpen = !isOpen;
        localStorage.setItem('sidebarOpen', isOpen);
        
        if (isOpen) {
            sidebar.style.width = '300px';
            sidebar.style.paddingLeft = '';
            sidebar.style.paddingRight = '';
            if (window.innerWidth < 768) {
                sidebar.classList.add('absolute', 'z-11');
            }
            toggleIcon.style.transform = 'rotate(0deg)';
            sidebarHeader.style.justifyContent = 'space-between';
            
            setTimeout(() => {
                sidebarTitle.style.display = 'block';
                navTexts.forEach((text, index) => {
                    setTimeout(() => {
                        text.style.display = 'inline';
                    }, 50 * index);
                });
            }, 200);
        } else {
            sidebarTitle.style.display = 'none';
            navTexts.forEach(text => {
                text.style.display = 'none';
            });
            
            setTimeout(() => {
                sidebar.style.width = '40px';
                sidebar.style.paddingLeft = '0';
                sidebar.style.paddingRight = '0';
                sidebar.classList.remove('absolute', 'z-11');
                toggleIcon.style.transform = 'rotate(180deg)';
                sidebarHeader.style.justifyContent = 'center';
            }, 150);
        }
    });
}
// Gérer la navigation entre les sections
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', async () => {
            const sectionName = item.dataset.section;
            localStorage.setItem('dashboardActiveTab', sectionName);
            setActiveTab(sectionName);
            await loadSection(sectionName);
            const sidebar = document.getElementById('sidebar');
            if (window.innerWidth < 768 && sidebar.classList.contains('absolute')) {
                document.getElementById('toggleSidebar')?.click();
            }
        });
    });
}
// Gérer l'affichage/masquage des mots de passe
function initPasswordToggle() {
    const toggleButtons = document.querySelectorAll('button[type="button"]');
    
    toggleButtons.forEach(button => {
        // Vérifier si c'est un bouton avec l'icône œil (dans un parent relatif avec input password)
        const parentDiv = button.closest('.relative');
        if (!parentDiv) return;
        
        const passwordInput = parentDiv.querySelector('input[type="password"], input[type="text"]');
        if (!passwordInput) return;
        
        button.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            
            // Basculer le type
            passwordInput.type = isPassword ? 'text' : 'password';
            
            // Optionnel: changer l'icône (œil ouvert vs barré)
            const svg = button.querySelector('svg');
            if (isPassword) {
                // Œil barré (mot de passe visible)
                svg.innerHTML = `
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                `;
            } else {
                // Œil normal (mot de passe masqé)
                svg.innerHTML = `
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                `;
            }
        });
    });
}
// Fonction pour rendre une carte d'événement
function renderEventCard(event, template) {
    // Badge d'âge
    const ageBadges = {
        0: '<div class="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">Tout public</div>',
        12: '<div class="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">12+</div>',
        16: '<div class="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">16+</div>',
        18: '<div class="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">18+</div>'
    };
    
    // ✅ Calcul des places disponibles - event.reservations est un tableau
    const nbReservations = Array.isArray(event.reservations) ? event.reservations.length : 0;
    const placesDisponibles = event.maxReservation - nbReservations;
    const placesClass = placesDisponibles > 0 ? 'text-green-600' : 'text-red-600';
    const placesText = placesDisponibles > 0 
        ? `${placesDisponibles} place(s) disponible(s)` 
        : 'Complet';
    
    // Format des dates
    let startDate, endDate;
    if (typeof moment !== 'undefined') {
        startDate = moment(event.startDate).format('DD MMMM YYYY à HH:mm');
        endDate = moment(event.endDate).format('DD MMMM YYYY à HH:mm');
    } else {
        // Fallback si moment.js n'est pas chargé
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };
        startDate = formatDate(event.startDate);
        endDate = formatDate(event.endDate);
    }
    
    // Image par défaut si pas d'image
        const imageUrl = event.images && event.images.length > 0 
        ? `${lib.urlBackend}img/events/512/${event.images[0].fileName}.webp`
        : './asset/img/student.jpg';
    
    // ✅ Construction de l'adresse complète à partir de l'objet address
    let formattedAddress = 'Adresse non disponible';
    if (event.address) {
        const addr = event.address;
        const street = addr.street || '';
        const streetNumber = addr.streetNumer || ''; // Note: typo dans l'API (Numer au lieu de Number)
        const zipCode = addr.zipCode || '';
        const city = addr.city || '';
        const country = addr.country || '';
        
        formattedAddress = `${street} ${streetNumber}, ${zipCode} ${city}, ${country}`.trim();
    }
    
    return template
        .replace(/{{image}}/g, imageUrl)
        .replace(/{{ageBadge}}/g, ageBadges[event.ageRestriction] || ageBadges[0])
        .replace(/{{title}}/g, event.title)
        .replace(/{{userName}}/g, `${event.user?.firstName || ''} ${event.user?.lastName || ''}`.trim() || 'Organisateur')
        .replace(/{{address}}/g, formattedAddress)
        .replace(/{{startDate}}/g, startDate)
        .replace(/{{endDate}}/g, endDate)
        .replace(/{{placesClass}}/g, placesClass)
        .replace(/{{placesText}}/g, placesText)
        .replace('<div class="bg-white', `<div data-event-id="${event.id}" class="bg-white`);
}
/**
 * Créer une carte device à partir du template
 */
function renderDeviceCard(device, currentDeviceId, template) {
    // Formater la date de dernière utilisation
    const lastUsed = new Date(device.lastUsed);
    let lastUsedText = '';
    
    if (typeof moment !== 'undefined') {
        lastUsedText = moment(lastUsed).fromNow();
    } else {
        // Fallback si moment.js n'est pas chargé
        const diff = Date.now() - lastUsed.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            lastUsedText = "Aujourd'hui";
        } else if (days === 1) {
            lastUsedText = "Il y a 1 jour";
        } else {
            lastUsedText = `Il y a ${days} jours`;
        }
    }
    
    // Remplacer les placeholders dans le template
    let deviceHtml = template
        .replace(/{{deviceIcon}}/g, getDeviceIcon(device.model))
        .replace(/{{deviceName}}/g, device.name || 'Appareil inconnu')
        .replace(/{{deviceLastUsed}}/g, lastUsedText);
    
    // Créer un élément temporaire pour manipuler le HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = deviceHtml;
    
    const cardElement = tempDiv.firstElementChild;
    
    // Ajouter un badge si c'est l'appareil actuel
    if (device.id === currentDeviceId) {
        const badge = document.createElement('div');
        badge.className = 'absolute top-7 -right-2 bg-burnt-sienna-500 text-white text-xs px-3 py-1 rounded-full font-semibold rotate-45';
        badge.textContent = 'Cet appareil';
        cardElement.classList.add('relative');
        cardElement.appendChild(badge);
    }
    
    // Ajouter l'événement de suppression
    const deleteBtn = cardElement.querySelector('.btn-delete-device');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const result = await Swal.fire({
                title: 'Supprimer cet appareil ?',
                html: device.id === currentDeviceId 
                    ? "<p>⚠️ <strong>Vous serez déconnecté</strong> après la suppression de cet appareil.</p>"
                    : "<p>Cette action est irréversible.</p>",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Supprimer',
                cancelButtonText: 'Annuler'
            });
            
            if (result.isConfirmed) {
                await deleteDevice(device.id, device.id === currentDeviceId, cardElement);
            }
        });
    }
    
    return cardElement;
}
/**
 * Supprime un appareil
 */
async function deleteDevice(deviceId, isCurrentDevice, cardElement) {
    try {
        const response = await fetch(`${lib.urlBackend}API/device.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'deleteDevice',
                session: lib.getCookie('MYEASYEVENT_Session'),
                deviceId: deviceId,
            }),
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            lib.SuccessToast.fire({ title: 'Appareil supprimé avec succès' });
            
            // Retirer la carte du DOM
            cardElement.remove();
            
            // Si c'est l'appareil actuel, déconnecter l'utilisateur
            if (isCurrentDevice) {
                setTimeout(() => {
                    lib.logout();
                }, 1500);
            }
        } else {
            lib.ErrorToast.fire({ title: data.message || 'Erreur lors de la suppression' });
        }
    } catch (error) {
        console.error('Erreur suppression device:', error);
        lib.ErrorToast.fire({ title: 'Erreur de suppression' });
    }
}

/**
 * Retourne l'icône appropriée selon le modèle d'appareil
 */
function getDeviceIcon(model) {
    const modelLower = model?.toLowerCase() || '';
    
    if (modelLower.includes('windows')) {
        return './asset/img/icon_windows.png';
    } else if (modelLower.includes('android')) {
        return './asset/img/icon_android.png';
    } else if (modelLower.includes('ios') || modelLower.includes('iphone') || modelLower.includes('ipad')) {
        return './asset/img/icon_ios.png';
    } else if (modelLower.includes('macos') || modelLower.includes('mac os')) {
        return './asset/img/icon_mac.png';
    }
    return './asset/img/icon_default.png';
}

// ⭐ ========================================
//                    ADMIN ALL
// ⭐ ========================================

async function loadAdminUsers() {
    try {
        const usersTableBody = document.getElementById('usersTableBody');
        const usersCardsContainer = document.getElementById('usersCardsContainer');
        const noUsersMessage = document.getElementById('noUsersMessage');
        
        if (!usersTableBody || !usersCardsContainer) {
            console.error('Conteneurs utilisateurs non trouvés');
            return;
        }
        
        // Charger les templates
        const rowTemplateResponse = await fetch('./components/userRow.html');
        const userRowTemplate = await rowTemplateResponse.text();
        
        const cardTemplateResponse = await fetch('./components/userCard.html');
        const userCardTemplate = await cardTemplateResponse.text();
        
        // Récupérer les utilisateurs
        const response = await fetch(`${lib.urlBackend}API/admin/adminUsers.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'getAllUsers',
                session: lib.getCookie('MYEASYEVENT_Session'),
                token: localStorage.getItem('MYEASYEVENT_Token')
            })
        });
        
        const data = await response.json();
        
        if (response.status === 403) {
            lib.ErrorToast.fire({ title: '⛔ Accès refusé : droits admin requis' });
            return;
        }
        
        if (data.status === 'success' && data.data?.users && data.data.users.length > 0) {
            const allUsers = data.data.users;
            const itemsPerPage = 10;
            let currentPage = 1;
            const totalPages = Math.ceil(allUsers.length / itemsPerPage);
            
            // Fonction pour afficher une page
            function displayPage(page) {
                currentPage = page;
                const start = (page - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                const pageUsers = allUsers.slice(start, end);
                
                // Afficher les lignes du tableau
                usersTableBody.innerHTML = pageUsers.map(user => {
                    return renderUserRow(user, userRowTemplate);
                }).join('');
                
                // Attacher les événements
                attachUserRowEvents();
                
                // Mettre à jour la pagination
                updatePaginationButtons();
            }
            
            // Fonction pour mettre à jour les boutons de pagination
            function updatePaginationButtons() {
                const prevBtn = document.getElementById('prevPageBtn');
                const nextBtn = document.getElementById('nextPageBtn');
                const pageNumbers = document.getElementById('pageNumbers');

                // Désactiver/Activer les boutons
                prevBtn.disabled = currentPage === 1;
                nextBtn.disabled = currentPage === totalPages;

                // Gérer les classes séparément
                if (currentPage === 1) {
                    prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
                } else {
                    prevBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }

                if (currentPage === totalPages) {
                    nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
                } else {
                    nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }

                // Générer les numéros de page
                pageNumbers.innerHTML = '';
                for (let i = 1; i <= totalPages; i++) {
                    const btn = document.createElement('button');
                    btn.textContent = i;
                    btn.className = `w-10 h-10 rounded-lg font-semibold transition-colors ${
                        i === currentPage 
                            ? 'border-1 border-burnt-sienna-500 text-white' 
                            : 'bg-transparent text-white hover:bg-blue-dianne-600'
            }`;
                    btn.addEventListener('click', () => displayPage(i));
                    pageNumbers.appendChild(btn);
                }
            }
            
            // Afficher les cards (mobile)
            usersCardsContainer.innerHTML = '';
            allUsers.forEach(user => {
                const userCard = renderUserCard(user, userCardTemplate);
                usersCardsContainer.appendChild(userCard);
            });
            attachUserCardEvents();
            
            // Afficher la première page
            displayPage(1);
            
            // Événements des boutons précédent/suivant
            const prevBtn = document.getElementById('prevPageBtn');
            const nextBtn = document.getElementById('nextPageBtn');
            
            prevBtn?.addEventListener('click', () => {
                if (currentPage > 1) displayPage(currentPage - 1);
            });
            
            nextBtn?.addEventListener('click', () => {
                if (currentPage < totalPages) displayPage(currentPage + 1);
            });
            
            // Cacher le message vide
            noUsersMessage.classList.add('hidden');
            
        } else {
            usersTableBody.innerHTML = '';
            usersCardsContainer.innerHTML = '';
            noUsersMessage.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Erreur chargement utilisateurs:', error);
        lib.ErrorToast.fire({ title: 'Erreur de chargement des utilisateurs' });
    }
}
//
// Admin function USER
//
function renderUserRow(user, template) {
    const roleBadgeClass = user.isAdmin === true
        ? 'bg-burnt-sienna-500 text-white' 
        : 'bg-blue-dianne-500 text-white';
    
    const isDeactivated = user.isDeactivated === 1 || user.isDeactivated === true;
    const deactivatedText = isDeactivated ? 'Oui' : 'Non';
    const deactivateAction = isDeactivated ? 'Réactiver' : 'Désactiver';
    const toggleRoleText = user.isAdmin === true ? 'Retirer admin' : 'Promouvoir admin';
    
    // Formater la date
    let validateDate = 'N/A';
    if (user.validateDate) {
        if (typeof moment !== 'undefined') {
            validateDate = moment(user.validateDate).format('DD/MM/YYYY HH:mm');
        } else {
            validateDate = new Date(user.validateDate).toLocaleDateString('fr-FR');
        }
    }
    
    return template
        .replace(/{{userId}}/g, user.id)
        .replace(/{{firstName}}/g, user.firstName || '')
        .replace(/{{lastName}}/g, user.lastName || '')
        .replace(/{{email}}/g, user.email || '')
        .replace(/{{validateDate}}/g, validateDate)
        .replace(/{{role}}/g, user.isAdmin === true ? 'Administrateur' : 'Utilisateur')
        .replace(/{{roleBadgeClass}}/g, roleBadgeClass)
        .replace(/{{deactivatedText}}/g, deactivatedText)
        .replace(/{{deactivateAction}}/g, deactivateAction)
        .replace(/{{toggleRoleText}}/g, toggleRoleText);
}

function renderUserCard(user, template) {
    const roleBadgeClass = user.isAdmin === true 
        ? 'bg-burnt-sienna-500 text-white' 
        : 'bg-blue-dianne-500 text-white';
    
    const isDeactivated = user.isDeactivated === 1 || user.isDeactivated === true;
    const deactivatedText = isDeactivated ? 'Oui' : 'Non';  // ✅ Même que renderUserRow()
    const deactivateAction = isDeactivated ? 'Réactiver' : 'Désactiver';
    const toggleRoleText = user.isAdmin === true ? 'Retirer admin' : 'Promouvoir admin';
    
    // Formater la date
    let validateDate = 'N/A';
    if (user.validateDate) {
        if (typeof moment !== 'undefined') {
            validateDate = moment(user.validateDate).format('DD/MM/YYYY HH:mm');
        } else {
            validateDate = new Date(user.validateDate).toLocaleDateString('fr-FR');
        }
    }
    
    let cardHtml = template
        .replace(/{{userId}}/g, user.id)
        .replace(/{{firstName}}/g, user.firstName || '')
        .replace(/{{lastName}}/g, user.lastName || '')
        .replace(/{{email}}/g, user.email || '')
        .replace(/{{validateDate}}/g, validateDate)
        .replace(/{{role}}/g, user.isAdmin === true ? 'Administrateur' : 'Utilisateur')
        .replace(/{{roleBadgeClass}}/g, roleBadgeClass)
        .replace(/{{deactivatedText}}/g, deactivatedText)
        .replace(/{{deactivateAction}}/g, deactivateAction)
        .replace(/{{toggleRoleText}}/g, toggleRoleText);
    
    // Créer un élément DOM comme renderDeviceCard()
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cardHtml;
    return tempDiv.firstElementChild;
}

function attachUserRowEvents() {
    const menuButtons = document.querySelectorAll('.btn-user-menu');
    
    menuButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = btn.nextElementSibling;
            
            // Fermer les autres menus
            document.querySelectorAll('.user-menu').forEach(m => {
                if (m !== menu) m.classList.add('hidden');
            });
            
            menu.classList.toggle('hidden');
        });
    });
    
    // Fermer les menus au clic en dehors
    document.addEventListener('click', () => {
        document.querySelectorAll('.user-menu').forEach(m => m.classList.add('hidden'));
    });
    
    // Boutons Promouvoir/Retirer admin (pour ROWS du tableau)
    document.querySelectorAll('tr[data-user-id] .btn-toggle-role').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const row = btn.closest('tr');
            const userId = row.dataset.userId;
            await toggleUserRole(userId);
        });
    });
    
    // Boutons Désactiver/Réactiver (pour ROWS du tableau)
    document.querySelectorAll('tr[data-user-id] .btn-deactivate').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const row = btn.closest('tr');
            const userId = row.dataset.userId;
            await toggleUserDeactivation(userId);
        });
    });
}

function attachUserCardEvents() {
    // Boutons TOGGLE ROLE pour cards
    document.querySelectorAll('#usersCardsContainer .btn-toggle-role').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const card = btn.closest('[data-user-id]');
            const userId = card.dataset.userId;
            await toggleUserRole(userId);
        });
    });
    
    // Boutons DEACTIVATE pour cards
    document.querySelectorAll('#usersCardsContainer .btn-deactivate').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const card = btn.closest('[data-user-id]');
            const userId = card.dataset.userId;
            await toggleUserDeactivation(userId);
        });
    });
}

async function toggleUserRole(userId) {
    try {
        const result = await Swal.fire({
            title: 'Changer le rôle ?',
            html: '<p>Êtes-vous sûr de vouloir modifier le rôle de cet utilisateur ?</p>',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2c5aa0',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Confirmer',
            cancelButtonText: 'Annuler'
        });
        
        if (!result.isConfirmed) return;
        
        const response = await fetch(`${lib.urlBackend}API/admin/adminUsers.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'toggleUserRole',
                userId: userId,
                session: lib.getCookie('MYEASYEVENT_Session'),
                token: localStorage.getItem('MYEASYEVENT_Token')
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            lib.SuccessToast.fire({ title: 'Rôle modifié avec succès' });
            // Recharger la liste
            loadedSections['gestion-utilisateurs'] = false;
            await loadSection('gestion-utilisateurs');
        } else {
            lib.ErrorToast.fire({ title: data.message || 'Erreur lors de la modification' });
        }
    } catch (error) {
        console.error('Erreur:', error);
        lib.ErrorToast.fire({ title: 'Erreur serveur' });
    }
}

async function toggleUserDeactivation(userId) {
    try {
        const result = await Swal.fire({
            title: 'Modifier le statut ?',
            html: '<p>Êtes-vous sûr de vouloir changer le statut de cet utilisateur ?</p>',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Confirmer',
            cancelButtonText: 'Annuler'
        });
        
        if (!result.isConfirmed) return;
        
        const response = await fetch(`${lib.urlBackend}API/admin/adminUsers.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'toggleUserDeactivation',
                userId: userId,
                session: lib.getCookie('MYEASYEVENT_Session'),
                token: localStorage.getItem('MYEASYEVENT_Token')
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            lib.SuccessToast.fire({ title: 'Statut modifié avec succès' });
            // Recharger la liste
            loadedSections['gestion-utilisateurs'] = false;
            await loadSection('gestion-utilisateurs');
        } else {
            lib.ErrorToast.fire({ title: data.message || 'Erreur lors de la modification' });
        }
    } catch (error) {
        console.error('Erreur:', error);
        lib.ErrorToast.fire({ title: 'Erreur serveur' });
    }
}
//
// Admin function EVENT
//
async function loadAdminEvents() {
    try {
        const response = await fetch(`${lib.urlBackend}API/admin/adminEvents.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'getAllEvents',
                session: lib.getCookie('MYEASYEVENT_Session')
            })
        });
        
        const data = await response.json();
        
        if (response.status === 403) {
            lib.ErrorToast.fire({ title: '⛔ Accès refusé : droits admin requis' });
            return;
        }
    } catch (error) {
        console.error('Erreur chargement événements:', error);
        lib.ErrorToast.fire({ title: 'Erreur de chargement' });
    }
}
//
// Admin function STATS
//
async function loadAdminStats() {
    try {
        const response = await fetch(`${lib.urlBackend}API/admin/adminStats.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'getAllStats',
                session: lib.getCookie('MYEASYEVENT_Session')
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success' && data.data?.stats) {
            await displayStatistics(data.data.stats);
        }else{
            lib.ErrorToast.fire({ title: data.message || 'Erreur lors du chargement des statistiques' });
        }
    } catch (error) {
        console.error('Erreur chargement stats:', error);
        lib.ErrorToast.fire({ title: 'Erreur de chargement' });
    }
}

async function displayStatistics(stats) {
    try {
        const response = await fetch('./components/statCard.html');
        const template = await response.text();
        
        const statsCardsContainer = document.getElementById('statsCardsContainer');
        if (!statsCardsContainer) {
            console.error('Conteneur statsCardsContainer non trouvé');
            return;
        }
        
        statsCardsContainer.innerHTML = '';
        
        const svgMapping = {
            'numberOfUsers': './asset/svgs/gestion_user.svg',
            'numberOfEvents': './asset/svgs/calendar-event.svg',
            'numberOfReservations': './asset/svgs/stat_reservation.svg',
        };
        
        const labelMapping = {
            'numberOfUsers': 'Nombre d\'utilisateur inscrit',
            'numberOfEvents': 'Nombre d\'événement créer',
            'numberOfReservations': 'Nombre de réservation',
        };
        
        Object.entries(stats).forEach(([key, value]) => {
            let svgPath = svgMapping[key] || './asset/svgs/gestion_stats.svg';
            let label = labelMapping[key] || key;
            const cardHtml = template
                .replace(/{{svgPath}}/g, svgPath)
                .replace(/{{value}}/g, value)
                .replace(/{{label}}/g, label);
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cardHtml;
            statsCardsContainer.appendChild(tempDiv.firstElementChild);
        });
        
    } catch (error) {
        console.error('Erreur affichage statistiques:', error);
        lib.ErrorToast.fire({ title: 'Erreur d\'affichage des statistiques' });
    }
}
//
// Admin function design
//
async function loadAdminDesign() {
    await initDesignManagement();
}

async function initDesignManagement() {
    const addDesignBtn = document.getElementById('addDesignBtn');
    const addDesignModal = document.getElementById('addDesignModal');
    const closeDesignModal = document.getElementById('closeDesignModal');
    const addDesignForm = document.getElementById('addDesignForm');

    addDesignBtn.addEventListener('click', () => {
        addDesignModal.classList.remove('hidden');
        addDesignForm.reset();
    });

    closeDesignModal.addEventListener('click', () => {
        addDesignModal.classList.add('hidden');
    });

    addDesignModal.addEventListener('click', (e) => {
        if (e.target === addDesignModal) {
            addDesignModal.classList.add('hidden');
        }
    });

    addDesignForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await addDesign();
    });

    await loadDesigns();
}

async function loadDesigns() {
    try {
        const response = await fetch(`${lib.urlBackend}API/template.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'getAllTemplates',
                session: lib.getCookie('MYEASYEVENT_Session'),
                token: localStorage.getItem('MYEASYEVENT_Token')
            })
        });
        const data = await response.json();
        if (data.status !== 'success' || !data.data?.templates || !Array.isArray(data.data.templates)) {
            console.error('Erreur chargement designs:', data);
            return;
        }

        const designGrid = document.getElementById('designGrid');
        designGrid.innerHTML = '';

        data.data.templates.forEach(template => {
            // Prendre la première image valide (évite null et images supprimées)
            const imageFileName = Array.isArray(template.images)
                ? template.images.find(image => image && image.fileName && !image.isDeleted)?.fileName
                : null;
        
            const imageUrl = imageFileName
                ? `${lib.urlBackend}img/template/512/${imageFileName}.webp`
                : './asset/img/student.jpg';
        
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow';
            card.innerHTML = `
                <img src="${imageUrl}" alt="${template.title}" class="w-full h-48 object-cover">
                <div class="p-4">
                    <h3 class="text-lg font-semibold text-blue-dianne-500 mb-1">${template.title}</h3>
                    <p class="text-gray-600 text-sm mb-2">${template.description}</p>
                </div>
            `;
            designGrid.appendChild(card);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des designs:', error);
    }
}

async function addDesign() {
    const title = document.getElementById('designTitle').value;
    const description = document.getElementById('designDescription').value;
    const html = document.getElementById('designStructure').value;  // ← récupère designStructure
    const imageFile = document.getElementById('designImage').files[0];
    const categories = Array.from(document.getElementById('designCategories').selectedOptions).map(o => o.value);

    if (!title || !description || !html || !imageFile || categories.length === 0) {
        lib.ErrorToast.fire({ title: 'Tous les champs sont requis' });
        return;
    }

    try {
        // Convertir l'image en base64
        const imageBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
        });

        const response = await fetch(`${lib.urlBackend}API/template.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'addTemplate',
                session: lib.getCookie('MYEASYEVENT_Session'),
                template: {
                    title: title,
                    description: description,
                    html: html  // ← envoie comme 'html' au backend
                },
                images: imageBase64,
                categories: JSON.stringify(categories)
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            document.getElementById('addDesignModal').classList.add('hidden');
            await loadDesigns();
            lib.SuccessToast.fire({ title: 'Design ajouté avec succès' });
        } else {
            lib.ErrorToast.fire({ title: data.message || 'Erreur lors de l\'ajout du design' });
        }
    } catch (error) {
        console.error('Erreur lors de l\'ajout du design:', error);
        lib.ErrorToast.fire({ title: 'Erreur lors de l\'ajout du design' });
    }
}

export async function unmount() {
    localStorage.removeItem('dashboardActiveTab');
    sessionStorage.removeItem('dashboardVisited');
}