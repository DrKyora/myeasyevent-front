// asset/script/core.js
import { initRouter, routes, stripBase } from './router.js';

let _currentModule = null;

/* ---------------------------------------
   Helper navigation (local + prod)
---------------------------------------- */
function go(to = '/') {
  const rel = to.startsWith('/') ? to : `/${to}`;
  const base = location.pathname.startsWith('/myeasyevent-front') ? '/myeasyevent-front' : '';
  const target = `${base}${rel}`;
  if (typeof window.navigate === 'function') {
    window.navigate(rel); // SPA
  } else {
    location.assign(target); // fallback
  }
}

/* ---------------------------------------
   Fonction d'initialisation de la modal
   (ta version réintégrée, avec navigate -> go)
---------------------------------------- */
function initializeUserModal() {
  const userModal = document.getElementById('userModal');
  const userModalBtn = document.getElementById('userModalBtn');
  const notConnectedContent = document.getElementById('notConnectedContent');
  const connectedContent = document.getElementById('connectedContent');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const dashboardBtn = document.getElementById('dashboardBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const arrowIcon = document.getElementById('arrow');

  if (!userModal || !userModalBtn) return;

  // Vérifier l'état de connexion (simulation pour l'instant)
  const isLoggedIn = typeof checkUserLoginStatus === 'function'
    ? checkUserLoginStatus()
    : false;

  // Afficher le bon contenu selon l'état de connexion
  if (isLoggedIn) {
    notConnectedContent?.classList.add('hidden');
    connectedContent?.classList.remove('hidden');
  } else {
    notConnectedContent?.classList.remove('hidden');
    connectedContent?.classList.add('hidden');
  }

  // Ouvrir / fermer la modal
  userModalBtn.addEventListener('click', () => {
    userModal.classList.toggle('hidden');
    arrowIcon.classList.toggle('rotate-180');
  });

  // Fermer la modal si clic en dehors
  document.addEventListener('mousedown', (e) => {
    if (!userModal.classList.contains('hidden') && !userModal.contains(e.target) && e.target !== userModalBtn) {
      userModal.classList.add('hidden');
      arrowIcon?.classList.remove('rotate-180');
    }
  });

  // Actions
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      go('/login');     // ← au lieu de navigate(...)
      userModal.classList.add('hidden');
    });
  }

  if (registerBtn) {
    registerBtn.addEventListener('click', () => {
      go('/register');
      userModal.classList.add('hidden');
    });
  }

  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      go('/dashboard');
      userModal.classList.add('hidden');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof logoutUser === 'function') {
        logoutUser();
      }
      userModal.classList.add('hidden');
    });
  }
}

// Export explicite demandé
export function initUserModal() {
  try { initializeUserModal(); } catch {}
}

/* ---------------------------------------
   Rendu principal
---------------------------------------- */
export async function renderMain(templateName = 'accueil', pageTitle = '') {
  const name = String(templateName || '').trim();

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
   Routing
---------------------------------------- */
export function renderRoute(pathname) {
  let cleanPath = stripBase(pathname);
  if (cleanPath !== '/' && cleanPath.endsWith('/')) cleanPath = cleanPath.slice(0, -1);
  const route = routes[cleanPath] || routes['/404'] || routes['/'];
  console.log(`[renderRoute] path="${pathname}" → template="${route.template}"`);
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

  // ✅ initialiser la modal juste après insertion du header
  setTimeout(() => {
    try {
      initializeUserModal();
      console.log('[core] modal utilisateur initialisée');
    } catch (e) {
      console.warn('[core] erreur init modal user', e);
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
  yearSpan.textContent = new Date().getFullYear();
}

/* ---------------------------------------
   Boot
---------------------------------------- */
export async function displayCore() {
  await renderHeader();      // header + init modal
  await renderFooter();

  renderRoute(location.pathname);

  initRouter({
    skipInitial: true,
    onRouteChange: (pathname) => renderRoute(pathname),
  });
}
