// dashboard.page.js
import * as lib from './library.js';

// Tracker les sections déjà chargées
const loadedSections = {
    informations: false,
    events: false,
    'gestion-utilisateurs': false,
    'gestion-evenements': false,
    'statistiques': false
};

export async function init() {
    console.log('Page dashboard initialisée !');
    
    // ✅ RÉINITIALISER les flags de sections chargées à chaque visite
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
    console.log('✅ Onglets admin affichés');
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
    // Si déjà chargée, ne rien faire
    if (loadedSections[sectionName]) {
        console.log(`Section ${sectionName} déjà chargée`);
        return;
    }
    
    // Attendre que le DOM soit complètement mis à jour
    await new Promise(resolve => requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
    }));
    
    console.log(`Chargement de la section ${sectionName}...`);
    
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
        
        // ⭐ Sections admin
        case 'gestion-utilisateurs':
            await loadAdminUsers();
            loadedSections['gestion-utilisateurs'] = true;
            break;
        
        case 'gestion-evenements':
            await loadAdminEvents();
            loadedSections['gestion-evenements'] = true;
            break;
        
        case 'statistiques':
            await loadAdminStats();
            loadedSections['statistiques'] = true;
            break;
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
            console.log('Utilisateur connecté:', data.data.user);
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
        
        if (!eventsGrid || !noEventsMessage || !createEventBtn) {
            console.error('Éléments DOM non trouvés après 500ms');
            return;
        }
        
        console.log('✅ Éléments DOM trouvés');
        
        // Charger le template de carte
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
        console.log('Données événements:', data);
        
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
                    console.log('Événement cliqué:', eventId);
                });
            });
        } else {
            console.log('Aucun événement - affichage du message');
            // Afficher le message "aucun événement"
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
            
            // ✅ Sauvegarder l'onglet actif
            localStorage.setItem('dashboardActiveTab', sectionName);
            
            // Mettre à jour l'UI
            setActiveTab(sectionName);
            
            // Charger la section
            await loadSection(sectionName);
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
    const startDate = moment(event.startDate).format('DD MMMM YYYY à HH:mm');
    const endDate = moment(event.endDate).format('DD MMMM YYYY à HH:mm');
    
    // Image par défaut si pas d'image
    const imageUrl = event.image || '/asset/img/default-event.jpg';
    
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
// ⭐ ========================================
//    FONCTIONS ADMIN (protégées backend)
// ⭐ ========================================

async function loadAdminUsers() {
    console.log('Chargement gestion utilisateurs...');
    
    try {
        const response = await fetch(`${lib.urlBackend}API/admin/users.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'getAllUsers',
                session: lib.getCookie('MYEASYEVENT_Session')
            })
        });
        
        const data = await response.json();
        
        if (response.status === 403) {
            lib.ErrorToast.fire({ title: '⛔ Accès refusé : droits admin requis' });
            return;
        }
        
        if (data.status === 'success') {
            console.log('Utilisateurs chargés:', data.data);
            // TODO: Afficher la liste des utilisateurs
        }
    } catch (error) {
        console.error('Erreur chargement utilisateurs:', error);
        lib.ErrorToast.fire({ title: 'Erreur de chargement' });
    }
}

async function loadAdminEvents() {
    console.log('Chargement gestion événements...');
    
    try {
        const response = await fetch(`${lib.urlBackend}API/admin/events.php`, {
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
        
        if (data.status === 'success') {
            console.log('Événements chargés:', data.data);
            // TODO: Afficher la liste des événements
        }
    } catch (error) {
        console.error('Erreur chargement événements:', error);
        lib.ErrorToast.fire({ title: 'Erreur de chargement' });
    }
}

async function loadAdminStats() {
    console.log('Chargement statistiques...');
    
    try {
        const response = await fetch(`${lib.urlBackend}API/admin/stats.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'getStats',
                session: lib.getCookie('MYEASYEVENT_Session')
            })
        });
        
        const data = await response.json();
        
        if (response.status === 403) {
            lib.ErrorToast.fire({ title: '⛔ Accès refusé : droits admin requis' });
            return;
        }
        
        if (data.status === 'success') {
            console.log('Statistiques chargées:', data.data);
            // TODO: Afficher les graphiques/stats
        }
    } catch (error) {
        console.error('Erreur chargement stats:', error);
        lib.ErrorToast.fire({ title: 'Erreur de chargement' });
    }
}
export async function unmount() {
    console.log('Sortie du dashboard - reset onglet actif');
    localStorage.removeItem('dashboardActiveTab');
    sessionStorage.removeItem('dashboardVisited');
}