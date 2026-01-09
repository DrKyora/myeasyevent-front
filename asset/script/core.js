// asset/script/core.js
import { initRouter, routes, stripBase } from './router.js';
import * as lib from './library.js';

let _currentModule = null;

/* ---------------------------------------
   Helper navigation (local + prod)
---------------------------------------- */
function go(to = '/') {
  const rel = to.startsWith('/') ? to : `/${to}`;
  const base = location.pathname.startsWith('/myeasyevent-front') ? '/myeasyevent-front' : '';
  const target = `${base}${rel}`;
  
  // Fermer le menu burger lors de la navigation
  const mainNav = document.getElementById('mainNav');
  if (mainNav && !mainNav.classList.contains('hidden')) {
    mainNav.classList.add('hidden');
  }
  
  if (typeof window.navigate === 'function') {
    window.navigate(rel); // SPA
  } else {
    location.assign(target); // fallback
  }
}

/* ---------------------------------------
   Vérifier si l'utilisateur a des tokens
---------------------------------------- */
function hasAuthTokens() {
  const session = lib.getCookie('MYEASYEVENT_Session');
  const deviceToken = localStorage.getItem('MYEASYEVENT_Token');
  return !!(session || deviceToken);
}

/* ---------------------------------------
   Fonction d'initialisation du burger menu
---------------------------------------- */
function initializeBurgerMenu() {
  const burgerBtn = document.getElementById('burgerBtn');
  const mainNav = document.getElementById('mainNav');
  
  if (!burgerBtn || !mainNav) return;
  
  burgerBtn.addEventListener('click', () => {
    mainNav.classList.toggle('hidden');
  });
  
  // Fermer le menu si clic en dehors (mobile)
  document.addEventListener('click', (e) => {
    if (!mainNav.classList.contains('hidden') && 
        !mainNav.contains(e.target) && 
        e.target !== burgerBtn && 
        !burgerBtn.contains(e.target)) {
      mainNav.classList.add('hidden');
    }
  });
  
  // Fermer le menu lors du clic sur un lien de navigation
  const navLinks = mainNav.querySelectorAll('a[data-spa]');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      mainNav.classList.add('hidden');
    });
  });
  
  console.log('[core] burger menu initialisé');
}

/* ---------------------------------------
   Mise à jour de l'affichage du header selon l'état de connexion
---------------------------------------- */
function updateHeaderAuth(isLoggedIn) {
  // Éléments mobile
  const navRegister = document.getElementById('navRegister');
  const navLogin = document.getElementById('navLogin');
  const navDashboard = document.getElementById('navDashboard');
  const navLogout = document.getElementById('navLogout');
  
  // Éléments desktop (modal)
  const userModalBtn = document.getElementById('userModalBtn');
  const notConnectedContent = document.getElementById('notConnectedContent');
  const connectedContent = document.getElementById('connectedContent');
  
  if (isLoggedIn) {
    // CONNECTÉ
    // Mobile : masquer inscription/connexion, afficher dashboard/déconnexion
    navRegister?.classList.add('hidden');
    navLogin?.classList.add('hidden');
    navDashboard?.classList.remove('hidden');
    navLogout?.classList.remove('hidden');
    
    // Desktop : afficher contenu connecté dans la modal
    notConnectedContent?.classList.add('hidden');
    connectedContent?.classList.remove('hidden');
    userModalBtn?.classList.remove('hidden');
  } else {
    // NON CONNECTÉ
    // Mobile : afficher inscription/connexion, masquer dashboard/déconnexion
    navRegister?.classList.remove('hidden');
    navLogin?.classList.remove('hidden');
    navDashboard?.classList.add('hidden');
    navLogout?.classList.add('hidden');
    
    // Desktop : afficher contenu non connecté dans la modal
    notConnectedContent?.classList.remove('hidden');
    connectedContent?.classList.add('hidden');
    userModalBtn?.classList.remove('hidden');
  }
  
  console.log('[core] header mis à jour - connecté:', isLoggedIn);
}

// Exposer globalement pour library.js
window.updateHeaderAuth = updateHeaderAuth;

/* ---------------------------------------
   Fonction d'initialisation de la modal
---------------------------------------- */
function initializeUserModal() {
  const userModal = document.getElementById('userModal');
  const userModalBtn = document.getElementById('userModalBtn');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const dashboardBtn = document.getElementById('dashboardBtn');
  const logoutBtns = document.querySelectorAll('._logout-btn');
  const arrowIcon = document.getElementById('arrow');
  const closedModal = document.getElementById('closedModal');

  if (!userModal || !userModalBtn) return;

  // Ouvrir / fermer la modal
  userModalBtn.addEventListener('click', () => {
    userModal.classList.toggle('hidden');
    arrowIcon?.classList.toggle('rotate-180');
  });

  closedModal?.addEventListener('click', () => {
    userModal.classList.add('hidden');
    arrowIcon?.classList.remove('rotate-180');
  });

  // Fermer la modal si clic en dehors
  document.addEventListener('mousedown', (e) => {
    if (!userModal.classList.contains('hidden') && 
        !userModal.contains(e.target) && 
        e.target !== userModalBtn &&
        !userModalBtn.contains(e.target)) {
      userModal.classList.add('hidden');
      arrowIcon?.classList.remove('rotate-180');
    }
  });

  // Actions - Non connecté
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      go('/login');
      userModal.classList.add('hidden');
    });
  }

  if (registerBtn) {
    registerBtn.addEventListener('click', () => {
      go('/register');
      userModal.classList.add('hidden');
    });
  }

  // Actions - Connecté
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      go('/dashboard');
      userModal.classList.add('hidden');
    });
  }

  // Déconnexion (tous les boutons)
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      lib.logout();
      userModal.classList.add('hidden');
    });
  });
  
  console.log('[core] modal utilisateur initialisée');
}

// Export explicite demandé
export function initUserModal() {
  try { initializeUserModal(); } catch {}
}

/* ---------------------------------------
   Vérification de l'authentification
---------------------------------------- */
async function checkAuthentication() {
  try {
    const user = await lib.checkUserLoginStatus();
    updateHeaderAuth(!!user);
    return !!user;
  } catch (err) {
    console.error('[core] Erreur vérification auth:', err);
    updateHeaderAuth(false);
    return false;
  }
}

/* ---------------------------------------
   Rendu principal avec protection de routes
---------------------------------------- */
export async function renderMain(templateName = 'accueil', pageTitle = '') {
  const name = String(templateName || '').trim();

  // Routes protégées
  const protectedRoutes = ['dashboard', 'create-event'];
  
  // Si c'est une route protégée, vérifier l'authentification
  if (protectedRoutes.includes(name)) {
    const isLoggedIn = hasAuthTokens();
    
    if (!isLoggedIn) {
      lib.ErrorToast.fire({ 
        title: "Accès refusé", 
        text: "Vous devez être connecté pour accéder à cette page" 
      });
      lib.appNavigate('/login');
      return;
    }
    
    // Vérifier que la session est vraiment valide
    const user = await lib.checkUserLoginStatus();
    if (!user) {
      lib.ErrorToast.fire({ 
        title: "Session expirée", 
        text: "Veuillez vous reconnecter" 
      });
      lib.appNavigate('/login');
      return;
    }
  }

  // Loader
  const oldMain = document.querySelector('main');
  if (!oldMain) {
    const loading = document.createElement('main');
    loading.id = 'loading';
    loading.innerHTML = `<div style="text-align:center; padding:2rem;">Chargement...</div>`;
    const header = document.querySelector('header');
    if (header?.parentNode) header.parentNode.insertBefore(loading, header.nextSibling);
    else document.body.appendChild(loading);
  } else {
    oldMain.innerHTML = `<div style="text-align:center; padding:2rem;">Chargement...</div>`;
  }

  try {
    // Unmount module précédent
    if (_currentModule?.unmount instanceof Function) {
      try { await _currentModule.unmount(); } catch {}
    }

    // Charger le template
    const res = await fetch(`components/${name}.html`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Template introuvable: ${name}`);

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const tpl = doc.getElementById(name) || doc.getElementById('404');

    document.querySelector('main')?.remove();

    if (!tpl) {
      const errorMain = document.createElement('main');
      errorMain.innerHTML = `<p style="text-align:center; padding:2rem; color:red;">Erreur : le template "${name}" est introuvable.</p>`;
      document.body.appendChild(errorMain);
      return;
    }

    // Insertion du contenu
    const fragment = tpl.content.cloneNode(true);
    const header = document.querySelector('header');
    if (header?.parentNode) header.parentNode.insertBefore(fragment, header.nextSibling);
    else document.body.appendChild(fragment);

    // Titre
    if (pageTitle) document.title = pageTitle;

    // JS associé
    try {
      const spec = new URL(`./${name}.page.js`, import.meta.url).href;
      const mod = await import(/* @vite-ignore */ spec);
      _currentModule = mod;
      if (mod.init instanceof Function) await mod.init();
    } catch {
      _currentModule = null;
    }
  } catch (err) {
    console.error(err);
    document.querySelector('main')?.remove();
    const errorMain = document.createElement('main');
    errorMain.innerHTML = `<p style="text-align:center; padding:2rem; color:red;">Impossible de charger "${name}".</p>`;
    document.body.appendChild(errorMain);
  }
}

/* ---------------------------------------
   Routing avec protection
---------------------------------------- */
export async function renderRoute(pathname) {
  // Séparer le pathname des query params
  const [pathOnly] = pathname.split('?');
  
  let cleanPath = stripBase(pathOnly);
  if (cleanPath !== '/' && cleanPath.endsWith('/')) cleanPath = cleanPath.slice(0, -1);
  const route = routes[cleanPath] || routes['/404'] || routes['/'];
  
  console.log(`[renderRoute] path="${pathname}" → template="${route.template}"`);
  
  // Animation de sortie
  const oldMain = document.querySelector('main');
  if (oldMain) {
    oldMain.classList.add('fade-out');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  
  window.scrollTo(0, 0);
  
  return renderMain(route.template, route.title);
}

/* ---------------------------------------
   Header & Footer
---------------------------------------- */
export async function renderHeader() {
  const wrap = document.querySelector('header') || document.createElement('header');
  wrap.innerHTML = '';
  const res = await fetch('components/header.html', { cache: 'no-store' }).catch(() => null);
  if (res?.ok) {
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const tpl = doc.getElementById('header');
    if (tpl) wrap.appendChild(tpl.content.cloneNode(true));
  }
  if (!document.querySelector('header')) document.body.prepend(wrap);

  // Vérifier l'authentification AVANT d'initialiser le header
  await checkAuthentication();

  // ✅ initialiser le burger menu et la modal après insertion du header
  setTimeout(() => {
    try {
      initializeBurgerMenu();
      initializeUserModal();
    } catch (e) {
      console.warn('[core] erreur init header', e);
    }
  }, 0);
}

export async function renderFooter() {
  const existing = document.querySelector('footer');
  if (existing) existing.remove();
  const res = await fetch('components/footer.html', { cache: 'no-store' }).catch(() => null);
  const footer = document.createElement('footer');
  if (res?.ok) {
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const tpl = doc.getElementById('footer');
    if (tpl) footer.appendChild(tpl.content.cloneNode(true));
  }
  document.body.appendChild(footer);
  // Mettre à jour l'année courante
  const yearSpan = document.querySelector('#currentYear');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
}

/* ---------------------------------------
   Auto-reconnexion au chargement
---------------------------------------- */
async function handleAutoReconnect() {
  const session = lib.getCookie('MYEASYEVENT_Session');
  const deviceToken = localStorage.getItem('MYEASYEVENT_Token');

  // Cas 1 : Pas de session mais token device présent
  if (!session && deviceToken) {
    const success = await lib.tryConnexionWToken();
    if (success && typeof window.updateHeaderAuth === 'function') {
      window.updateHeaderAuth(true);
    }
    return;
  }

  // Cas 2 : Session existe
  if (session && deviceToken) {
    const user = await lib.checkUserLoginStatus();
    
    if (user) {
      // Session valide
      if (typeof window.updateHeaderAuth === 'function') {
        window.updateHeaderAuth(true);
      }
    } else {
      // Session invalide → reconnexion avec token device
      const success = await lib.tryConnexionWToken();
      if (success && typeof window.updateHeaderAuth === 'function') {
        window.updateHeaderAuth(true);
      }
    }
    return;
  }

  // Cas 3 : Session sans token device → nettoyer
  if (session && !deviceToken) {
    lib.deleteCookie('MYEASYEVENT_Session');
    sessionStorage.clear();
  }
}

/* ---------------------------------------
   Boot
---------------------------------------- */
export async function displayCore() {
  await renderHeader();      // header + vérif auth + init burger + modal
  await renderFooter();
  
  // Auto-reconnexion au chargement
  await handleAutoReconnect();

  renderRoute(location.pathname);

  initRouter({
    skipInitial: true,
    onRouteChange: (pathname) => renderRoute(pathname),
  });
}