// evenements.page.js
export function init() {
    console.log('Page événements initialisée');
    
    // Récupérer tous les paramètres de l'URL
    const urlParams = new URLSearchParams(window.location.search);
    
    // Récupérer différents types de filtres
    const categoryFilter = urlParams.get('filter'); // Ex: soirees, jeux
    const dateFilter = urlParams.get('date');       // Ex: 2025-12-01
    const locationFilter = urlParams.get('location'); // Ex: bruxelles
    const priceFilter = urlParams.get('price');     // Ex: gratuit
    
    console.log('Filtres actifs:', {
        category: categoryFilter,
        date: dateFilter,
        location: locationFilter,
        price: priceFilter
    });
    
    applyFilters({
        category: categoryFilter,
        date: dateFilter,
        location: locationFilter,
        price: priceFilter
    });
}

function applyFilters(filters) {
    let events = getAllEvents(); // Votre fonction pour récupérer les événements
    
    // Appliquer le filtre de catégorie
    if (filters.category) {
        events = events.filter(event => event.category === filters.category);
    }
    
    // Appliquer le filtre de date
    if (filters.date) {
        events = events.filter(event => event.date === filters.date);
    }
    
    // Appliquer le filtre de localisation
    if (filters.location) {
        events = events.filter(event => event.location === filters.location);
    }
    
    // Appliquer le filtre de prix
    if (filters.price) {
        events = events.filter(event => event.price === filters.price);
    }
    
    displayEvents(events);
}
