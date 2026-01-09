// create-event.page.js
import * as lib from './library.js';

let selectedTemplate = null;
let currentTemplateData = {};
let editorHandlersInitialized = false;
let originalTemplateHtml = '';
let addressValidated = false; // ✅ AJOUTÉ

export async function init() {
    console.log('Page Création d\'événement initialisée !');
    
    // Initialiser les gestionnaires
    initTemplateSelectionHandlers();
    initTemplateSelectorModal();
}

// ========================================
// ÉTAPE 1 : SÉLECTION DU TEMPLATE
// ========================================

async function loadTemplates() {
    const loader = document.getElementById('templatesLoader');
    const grid = document.getElementById('templatesGrid');
    const noTemplatesMsg = document.getElementById('noTemplatesMessage');
    
    try {
        const response = await fetch(`${lib.urlBackend}API/template.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'getAllTemplates',
                session: lib.getCookie('MYEASYEVENT_Session')
            })
        });
        
        const data = await response.json();
        console.log('Templates reçus:', data);
        
        if (data.status === 'success' && data.data?.templates && data.data.templates.length > 0) {
            const templates = data.data.templates;
            
            loader.classList.add('hidden');
            grid.classList.remove('hidden');
            
            grid.innerHTML = templates.map(template => `
                <div class="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow template-card" data-template-id="${template.id}">
                    <div class="aspect-video bg-gray-200 flex items-center justify-center overflow-hidden">
                        ${template.images && template.images[0] 
                            ? `<img src="${lib.urlBackend}${template.images[0].url}" alt="${template.title}" class="w-full h-full object-cover" />`
                            : `<svg class="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>`
                        }
                    </div>
                    <div class="p-4">
                        <h3 class="text-lg font-bold text-blue-dianne-500 mb-2">${template.title}</h3>
                        <p class="text-sm text-gray-600 line-clamp-2">${template.description || 'Aucune description'}</p>
                        ${template.categories && template.categories.length > 0 
                            ? `<div class="mt-3 flex flex-wrap gap-2">
                                ${template.categories.map(cat => `
                                    <span class="px-2 py-1 bg-burnt-sienna-100 text-burnt-sienna-700 text-xs rounded-full">${cat.name}</span>
                                `).join('')}
                              </div>`
                            : ''
                        }
                    </div>
                </div>
            `).join('');
            
        } else {
            loader.classList.add('hidden');
            noTemplatesMsg.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('Erreur chargement templates:', error);
        loader.classList.add('hidden');
        lib.ErrorToast.fire({ title: 'Erreur de chargement des templates' });
    }
}

function initTemplateSelectionHandlers() {
    const backBtn = document.getElementById('backToDashboard');
    const grid = document.getElementById('templatesGrid');
    
    backBtn?.addEventListener('click', () => {
        window.navigate('/dashboard');
    });
    
    grid?.addEventListener('click', async (e) => {
        const card = e.target.closest('.template-card');
        if (!card) return;
        
        const templateId = card.getAttribute('data-template-id');
        await loadTemplateForEditing(templateId);
    });
}

async function loadTemplateForEditing(templateId) {
    try {        
        const response = await fetch(`${lib.urlBackend}API/template.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'getTemplateById',
                session: lib.getCookie('MYEASYEVENT_Session'),
                id: templateId
            })
        });
        
        const data = await response.json();
        console.log('Template complet:', data);
        
        if (data.status === 'success' && data.data?.template) {
            selectedTemplate = data.data.template;
            showEditorStep();
            loadTemplatePreview(selectedTemplate.html);
        } else {
            lib.ErrorToast.fire({ title: 'Impossible de charger le template' });
        }
        
    } catch (error) {
        console.error('Erreur chargement template:', error);
        lib.ErrorToast.fire({ title: 'Erreur de chargement' });
    }
}

// ========================================
// ÉTAPE 2 : ÉDITION DU TEMPLATE
// ========================================

function showEditorStep() {
    document.getElementById('templateSelectionStep').classList.add('hidden');
    document.getElementById('templateEditorStep').classList.remove('hidden');

    if (!editorHandlersInitialized) {
        initEditorHandlers();
        editorHandlersInitialized = true;
    }
}

function loadTemplatePreview(htmlTemplate) {
    const preview = document.getElementById('templatePreview');
    
    originalTemplateHtml = htmlTemplate || '';
    
    // ✅ Champs d'adresse séparés
    currentTemplateData = {
        title: 'Titre de l\'événement',
        description: '',
        startDate: '',
        endDate: '',
        street: '',
        streetNumber: '',
        zipCode: '',
        city: '',
        country: 'France',
        capacity: 100,
        minAge: 0,
        image: '',
        titleColor: '#1e3a5f'
    };
    
    updatePreview();
}

function updatePreview() {
    const preview = document.getElementById('templatePreview');
    let html = originalTemplateHtml;
    
    // ✅ Formater l'adresse complète
    const fullAddress = `${currentTemplateData.streetNumber} ${currentTemplateData.street}, ${currentTemplateData.zipCode} ${currentTemplateData.city}, ${currentTemplateData.country}`.trim();
    
    html = html.replace(/{{title}}/g, currentTemplateData.title || 'Titre de l\'événement');
    html = html.replace(/{{description}}/g, currentTemplateData.description || '');
    html = html.replace(/{{address}}/g, fullAddress || 'Adresse non définie');
    html = html.replace(/{{titleColor}}/g, currentTemplateData.titleColor || '#1e3a5f');
    html = html.replace(/{{image}}/g, currentTemplateData.image || '');
    
    if (currentTemplateData.startDate) {
        const startDate = new Date(currentTemplateData.startDate);
        const formattedStart = startDate.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        }) + ' à ' + startDate.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        html = html.replace(/{{startDate}}/g, formattedStart);
    } else {
        html = html.replace(/{{startDate}}/g, '');
    }
    
    if (currentTemplateData.endDate) {
        const endDate = new Date(currentTemplateData.endDate);
        const formattedEnd = endDate.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        }) + ' à ' + endDate.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        html = html.replace(/{{endDate}}/g, formattedEnd);
    } else {
        html = html.replace(/{{endDate}}/g, '');
    }
    
    preview.innerHTML = html;
}

function initEditorHandlers() {
    const form = document.getElementById('eventEditorForm');
    const btnSave = document.getElementById('btnSave');
    const btnPublish = document.getElementById('btnPublish');
    const btnValidateAddress = document.getElementById('btnValidateAddress');
    const closePanel = document.getElementById('closeEditorPanel');
    const editorPanel = document.getElementById('editorPanel');
    
    form?.addEventListener('input', (e) => {
        const field = e.target.id;
        
        switch(field) {
            case 'editTitle':
                currentTemplateData.title = e.target.value;
                break;
            case 'editDescription':
                currentTemplateData.description = e.target.value;
                break;
            case 'editStartDate':
                currentTemplateData.startDate = e.target.value;
                break;
            case 'editEndDate':
                currentTemplateData.endDate = e.target.value;
                break;
            case 'editStreet':
                currentTemplateData.street = e.target.value;
                addressValidated = false;
                break;
            case 'editStreetNumber':
                currentTemplateData.streetNumber = e.target.value;
                addressValidated = false;
                break;
            case 'editZipCode':
                currentTemplateData.zipCode = e.target.value;
                addressValidated = false;
                break;
            case 'editCity':
                currentTemplateData.city = e.target.value;
                addressValidated = false;
                break;
            case 'editCountry':
                currentTemplateData.country = e.target.value;
                addressValidated = false;
                break;
            case 'editCapacity':
                currentTemplateData.capacity = e.target.value;
                break;
            case 'editMinAge':
                currentTemplateData.minAge = e.target.value;
                break;
            case 'editTitleColor':
                currentTemplateData.titleColor = e.target.value;
                break;
        }
        
        updatePreview();
    });
    
    document.getElementById('editImage')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                currentTemplateData.image = event.target.result;
                updatePreview();
            };
            reader.readAsDataURL(file);
        }
    });
    
    // ✅ Bouton validation d'adresse
    btnValidateAddress?.addEventListener('click', async () => {
        await validateAddressWithGoogle();
    });
    
    closePanel?.addEventListener('click', () => {
        editorPanel.classList.add('translate-x-full');
    });
    
    btnSave?.addEventListener('click', () => {
        console.log('Sauvegarde du brouillon non implémentée');
    });
    
    btnPublish?.addEventListener('click', async () => {
        await publishEvent();
    });
}

// ✅ Fonction de validation d'adresse avec Google API
async function validateAddressWithGoogle() {
    const statusEl = document.getElementById('addressValidationStatus');
    const btnValidate = document.getElementById('btnValidateAddress');
    
    if (!currentTemplateData.street || !currentTemplateData.streetNumber || 
        !currentTemplateData.zipCode || !currentTemplateData.city || !currentTemplateData.country) {
        lib.ErrorToast.fire({ title: 'Veuillez remplir tous les champs d\'adresse' });
        return;
    }
    
    try {
        btnValidate.disabled = true;
        btnValidate.textContent = 'Vérification...';
        statusEl.textContent = 'Vérification en cours...';
        statusEl.className = 'text-xs mt-2 text-blue-600';
        
        const fullAddress = `${currentTemplateData.streetNumber} ${currentTemplateData.street}, ${currentTemplateData.zipCode} ${currentTemplateData.city}, ${currentTemplateData.country}`;
        
        const response = await fetch(`${lib.urlBackend}API/addressValidation.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'validateAddress',
                fullAddress: fullAddress,
                regionCode: currentTemplateData.country === 'France' ? 'FR' : 'BE',
                session: lib.getCookie('MYEASYEVENT_Session')
            })
        });
        
        const data = await response.json();
        console.log('Validation adresse:', data);
        
        if (data.status === 'success' && data.data?.validation?.result?.verdict?.addressComplete) {
            const validatedAddress = data.data.validation.result.address.postalAddress;
            
            if (validatedAddress.addressLines && validatedAddress.addressLines[0]) {
                const parts = validatedAddress.addressLines[0].split(' ');
                currentTemplateData.streetNumber = parts[0] || currentTemplateData.streetNumber;
                currentTemplateData.street = parts.slice(1).join(' ') || currentTemplateData.street;
            }
            
            currentTemplateData.zipCode = validatedAddress.postalCode || currentTemplateData.zipCode;
            currentTemplateData.city = validatedAddress.locality || currentTemplateData.city;
            
            document.getElementById('editStreetNumber').value = currentTemplateData.streetNumber;
            document.getElementById('editStreet').value = currentTemplateData.street;
            document.getElementById('editZipCode').value = currentTemplateData.zipCode;
            document.getElementById('editCity').value = currentTemplateData.city;
            
            addressValidated = true;
            statusEl.textContent = '✓ Adresse validée et corrigée !';
            statusEl.className = 'text-xs mt-2 text-green-600 font-semibold';
            btnValidate.textContent = '✓ Adresse validée';
            btnValidate.className = 'w-full px-4 py-2 bg-green-500 text-white rounded-lg cursor-default';
            
            lib.SuccessToast.fire({ title: 'Adresse validée !', timer: 2000 });
            updatePreview();
            
        } else {
            addressValidated = false;
            statusEl.textContent = '⚠ Adresse introuvable ou invalide';
            statusEl.className = 'text-xs mt-2 text-orange-600';
            btnValidate.textContent = '✓ Vérifier l\'adresse';
            btnValidate.disabled = false;
            
            lib.ErrorToast.fire({ title: 'Adresse non valide', text: 'Vérifiez les informations saisies' });
        }
        
    } catch (error) {
        console.error('Erreur validation adresse:', error);
        statusEl.textContent = '❌ Erreur de validation';
        statusEl.className = 'text-xs mt-2 text-red-600';
        btnValidate.textContent = '✓ Vérifier l\'adresse';
        btnValidate.disabled = false;
        
        lib.ErrorToast.fire({ title: 'Erreur de validation d\'adresse' });
    }
}

// ========================================
// ✅ MODAL SÉLECTEUR DE TEMPLATES
// ========================================

let templatesListLoaded = false;
function initTemplateSelectorModal() {
    const modal = document.getElementById('templateSelectorModal');
    const closeBtn = document.getElementById('closeTemplateModal');
    
    document.addEventListener('click', async (e) => {
        const btnDesign = e.target.closest('#btnDesign');
        if (!btnDesign) return;
        
        const isVisible = modal && !modal.classList.contains('hidden');
        
        if (isVisible) {
            modal.classList.add('hidden');
        } else {
            if (!templatesListLoaded) {
                await loadTemplateSelectorList();
                templatesListLoaded = true;
            }
            if (modal) modal.classList.remove('hidden');
        }
    });
    
    closeBtn?.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
}

async function loadTemplateSelectorList() {
    const list = document.getElementById('templateSelectorList');
    
    try {
        const response = await fetch(`${lib.urlBackend}API/template.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'getAllTemplates',
                session: lib.getCookie('MYEASYEVENT_Session')
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success' && data.data?.templates && data.data.templates.length > 0) {
            const templates = data.data.templates;
            
            list.innerHTML = templates.map(template => `
                <div class="border border-gray-200 rounded-lg p-3 hover:border-blue-dianne-500 cursor-pointer transition-colors template-selector-item" data-template-id="${template.id}">
                    <div class="flex items-center gap-3">
                        <div class="w-16 h-16 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                            ${template.images && template.images[0] 
                                ? `<img src="${lib.urlBackend}${template.images[0].url}" alt="${template.title}" class="w-full h-full object-cover" />`
                                : `<svg class="w-8 h-8 text-gray-400 m-auto mt-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>`
                            }
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 class="font-semibold text-sm text-blue-dianne-500 truncate">${template.title}</h4>
                            <p class="text-xs text-gray-500 truncate">${template.description || 'Aucune description'}</p>
                        </div>
                    </div>
                </div>
            `).join('');
            
            list.querySelectorAll('.template-selector-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const templateId = item.getAttribute('data-template-id');
                    await changeTemplate(templateId);
                });
            });
            
        } else {
            list.innerHTML = '<p class="text-gray-500 text-center py-4">Aucun template disponible</p>';
        }
        
    } catch (error) {
        console.error('Erreur chargement templates:', error);
        list.innerHTML = '<p class="text-red-500 text-center py-4">Erreur de chargement</p>';
    }
}

async function changeTemplate(templateId) {
    try {
        const response = await fetch(`${lib.urlBackend}API/template.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'getTemplateById',
                session: lib.getCookie('MYEASYEVENT_Session'),
                id: templateId
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success' && data.data?.template) {
            selectedTemplate = data.data.template;
            showEditorStep();
            loadTemplatePreview(selectedTemplate.html);
            document.getElementById('templateSelectorModal').classList.add('hidden');
            lib.SuccessToast.fire({ title: 'Template chargé !', timer: 1500 });
        }
        
    } catch (error) {
        console.error('Erreur changement template:', error);
        lib.ErrorToast.fire({ title: 'Erreur lors du changement' });
    }
}

// ========================================
// PUBLICATION
// ========================================

async function publishEvent() {
    // Validation
    if (!currentTemplateData.title || !currentTemplateData.startDate || !currentTemplateData.endDate || 
        !currentTemplateData.street || !currentTemplateData.city) {
        lib.ErrorToast.fire({ title: 'Veuillez remplir tous les champs obligatoires' });
        return;
    }
    
    // ✅ Vérifier que l'adresse a été validée
    if (!addressValidated) {
        lib.ErrorToast.fire({ 
            title: 'Adresse non validée', 
            text: 'Veuillez cliquer sur "Vérifier l\'adresse" avant de publier' 
        });
        return;
    }
    
    if (new Date(currentTemplateData.endDate) <= new Date(currentTemplateData.startDate)) {
        lib.ErrorToast.fire({ title: 'La date de fin doit être après la date de début' });
        return;
    }
    
    try {
        const finalHtml = generateFinalHtml();
        
        const eventData = {
            title: currentTemplateData.title,
            description: currentTemplateData.description || 'Pas de description',
            html: finalHtml,
            street: currentTemplateData.street,
            streetNumber: currentTemplateData.streetNumber,
            zipCode: currentTemplateData.zipCode,
            city: currentTemplateData.city,
            country: currentTemplateData.country,
            startDate: currentTemplateData.startDate,
            endDate: currentTemplateData.endDate,
            publishDate: new Date().toISOString(),
            openReservation: currentTemplateData.startDate,
            maxReservation: parseInt(currentTemplateData.capacity) || null,
            price: 0,
            ageRestriction: currentTemplateData.minAge.toString(),
            isOnline: true,
            isDeleted: false
        };
        
        const response = await fetch(`${lib.urlBackend}API/event.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'addEvent',
                event: eventData,
                images: [],
                categories: [],
                session: lib.getCookie('MYEASYEVENT_Session')
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            lib.SuccessToast.fire({ 
                title: 'Événement publié avec succès !',
                timer: 2000
            });
            
            setTimeout(() => {
                window.navigate('/dashboard');
            }, 2000);
        } else {
            lib.ErrorToast.fire({ title: data.message || 'Erreur lors de la publication' });
        }
        
    } catch (error) {
        console.error('Erreur publication:', error);
        lib.ErrorToast.fire({ title: 'Erreur de publication' });
    }
}

function generateFinalHtml() {
    let html = originalTemplateHtml;
    
    const fullAddress = `${currentTemplateData.streetNumber} ${currentTemplateData.street}, ${currentTemplateData.zipCode} ${currentTemplateData.city}, ${currentTemplateData.country}`.trim();
    
    html = html.replace(/{{title}}/g, currentTemplateData.title || '');
    html = html.replace(/{{description}}/g, currentTemplateData.description || '');
    html = html.replace(/{{address}}/g, fullAddress);
    html = html.replace(/{{titleColor}}/g, currentTemplateData.titleColor || '#1e3a5f');
    html = html.replace(/{{image}}/g, currentTemplateData.image || '');
    
    if (currentTemplateData.startDate) {
        const startDate = new Date(currentTemplateData.startDate);
        const formattedStart = startDate.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        }) + ' à ' + startDate.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        html = html.replace(/{{startDate}}/g, formattedStart);
    }
    
    if (currentTemplateData.endDate) {
        const endDate = new Date(currentTemplateData.endDate);
        const formattedEnd = endDate.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        }) + ' à ' + endDate.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        html = html.replace(/{{endDate}}/g, formattedEnd);
    }
    
    return html;
}

export async function unmount() {
    console.log('Sortie de la page création d\'événement');
    selectedTemplate = null;
    currentTemplateData = {};
}