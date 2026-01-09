import * as lib from './library.js';

let currentEvent = null;

export async function init() {
    console.log('Page détail événement initialisée');
    
    // Récupérer l'ID de l'événement depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    
    if (!eventId) {
        lib.ErrorToast.fire({ title: 'ID événement manquant' });
        window.navigate('/evenements');
        return;
    }
    
    await loadEvent(eventId);
    initReservationForm();
}

async function loadEvent(eventId) {
    const loader = document.getElementById('eventLoader');
    const content = document.getElementById('eventContent');
    
    try {
        const response = await fetch(`${lib.urlBackend}API/event.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'getEventById',
                id: eventId
            })
        });
        
        const data = await response.json();
        console.log('Événement chargé:', data);
        
        if (data.status === 'success' && data.data?.event) {
            currentEvent = data.data.event;
            
            // Afficher le HTML de l'événement
            document.getElementById('eventHtml').innerHTML = currentEvent.html;
            
            loader.classList.add('hidden');
            content.classList.remove('hidden');
        } else {
            lib.ErrorToast.fire({ title: 'Événement introuvable' });
            window.navigate('/evenements');
        }
        
    } catch (error) {
        console.error('Erreur chargement événement:', error);
        lib.ErrorToast.fire({ title: 'Erreur de chargement' });
    }
}

function initReservationForm() {
    const form = document.getElementById('reservationForm');
    const backBtn = document.getElementById('backToEvents');
    
    backBtn?.addEventListener('click', () => {
        window.navigate('/evenements');
    });
    
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitReservation();
    });
}

async function submitReservation() {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const birthDate = document.getElementById('birthDate').value; // ✅ AJOUTÉ
    
    if (!firstName || !lastName || !email || !birthDate) {
        lib.ErrorToast.fire({ title: 'Veuillez remplir tous les champs' });
        return;
    }
    
    try {
        const response = await fetch(`${lib.urlBackend}API/reservation.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'addReservation',
                eventId: currentEvent.id,
                firstName: firstName,
                lastName: lastName,
                email: email,
                birthDate: birthDate
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            lib.SuccessToast.fire({ 
                title: 'Réservation confirmée !',
                text: 'Vous recevrez un email de confirmation',
                timer: 3000
            });
            
            document.getElementById('reservationForm').reset();
        } else {
            lib.ErrorToast.fire({ title: data.message || 'Erreur lors de la réservation' });
        }
        
    } catch (error) {
        console.error('Erreur réservation:', error);
        lib.ErrorToast.fire({ title: 'Erreur lors de la réservation' });
    }
}

export async function unmount() {
    console.log('Sortie page événement');
    currentEvent = null;
}