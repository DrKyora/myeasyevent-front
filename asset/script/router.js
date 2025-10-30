// router.js - Mini routeur SPA vanilla
import { renderMain } from "./core.js";

export const routes = {
    '/accueil': { template: 'accueil', title: 'Accueil - My Easy Event' },
    '/evenements': { template: 'evenements', title: 'Événements - My Easy Event' },
    '/dashboard': { template: 'dashboard', title: 'dashboard - My Easy Event' },
    '/contact': { template: 'contact', title: 'Contact - My Easy Event' },
    '/login': { template: 'login', title: 'Connexion - My Easy Event' },
    '/register': { template: 'register', title: 'Inscription - My Easy Event' },
    '/404': { template: '404', title: '404 - Page non trouvée' },
    '/cgu': { template: 'cgu', title: 'Conditions Générales d\'Utilisation - My Easy Event' },
    '/privacy-policy': { template: 'privacy-policy', title: 'Politique de Confidentialité - My Easy Event' },
    '/mentions-legales': { template: 'mentions-legales', title: 'Mentions Légales - My Easy Event' },
    '/': { template: 'accueil', title: 'Accueil - My Easy Event' }, // Route par défaut
};

// -------------------- ROUTER --------------------
export function initRouter({ onRouteChange, skipInitial = false } = {}) {
  // Fonction de navigation (utilisée par la modal et ailleurs)
  function navigate(pathname) {
    if (typeof pathname !== 'string') return;
    if (pathname === window.location.pathname) return;
    history.pushState({}, '', pathname);
    onRouteChange?.(pathname);
  }

  // Expose la fonction navigate globalement (utile pour la modal utilisateur)
  window.navigate = navigate;

  // Intercepter les clics sur les liens internes data-spa
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-spa]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return; // lien externe

    e.preventDefault();
    navigate(url.pathname);
  });

  // Gestion du bouton retour / avant du navigateur
  window.addEventListener('popstate', () => {
    onRouteChange?.(window.location.pathname);
  });

  // Premier rendu (si non déjà fait par displayCore)
  if (!skipInitial) {
    onRouteChange?.(window.location.pathname);
  }
}
