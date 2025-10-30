// asset/script/router.js

// Base dynamique : utile pour local ET en ligne
export const APP_BASE = window.location.pathname.startsWith('/myeasyevent-front')
  ? '/myeasyevent-front'
  : '';

export const routes = {
  '/accueil':          { template: 'accueil',          title: 'Accueil - My Easy Event' },
  '/evenements':       { template: 'evenements',       title: 'Événements - My Easy Event' },
  '/dashboard':        { template: 'dashboard',        title: 'Dashboard - My Easy Event' },
  '/contact':          { template: 'contact',          title: 'Contact - My Easy Event' },
  '/login':            { template: 'login',            title: 'Connexion - My Easy Event' },
  '/register':         { template: 'register',         title: 'Inscription - My Easy Event' },
  '/cgu':              { template: 'cgu',              title: 'Conditions Générales d\'Utilisation - My Easy Event' },
  '/privacy-policy':   { template: 'privacy-policy',   title: 'Politique de Confidentialité - My Easy Event' },
  '/mentions-legales': { template: 'mentions-legales', title: 'Mentions Légales - My Easy Event' },
  '/404':              { template: '404',              title: '404 - Page non trouvée' },
  '/':                 { template: 'accueil',          title: 'Accueil - My Easy Event' },
};

// Supprime le prefixe /myeasyevent-front en local
export function stripBase(path) {
  return APP_BASE && path.startsWith(APP_BASE)
    ? path.slice(APP_BASE.length) || '/'
    : path;
}

// Ajoute le prefixe en local
export function withBase(path) {
  return `${APP_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function initRouter({ onRouteChange, skipInitial = true } = {}) {
  // Permet la navigation via JS : navigate('/login')
  window.navigate = (to) => {
    const rel = to.startsWith('/') ? to : `/${to}`;
    const target = withBase(rel);
    if (location.pathname === target) return;
    history.pushState({}, '', target);
    onRouteChange?.(target);
  };

  // Intercepte les clics sur <a data-spa>
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-spa]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;

    const url = new URL(href, location.origin);
    if (url.origin !== location.origin) return; // lien externe

    e.preventDefault();
    const appRel = stripBase(url.pathname);
    window.navigate(appRel);
  });

  // Gestion du bouton précédent/suivant
  window.addEventListener('popstate', () => {
    onRouteChange?.(location.pathname);
  });

  if (!skipInitial) onRouteChange?.(location.pathname);
}
