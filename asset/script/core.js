// asset/script/core.js
import { routes, stripBase, initRouter } from './router.js';

let _currentModule = null;

function clean(name = 'accueil') {
  const s = String(name).split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
  return s && /^[\w-]+$/.test(s) ? s : 'accueil';
}

// -------------------- HEADER --------------------
export async function renderHeader() {
  const res = await fetch('components/header.html');
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tpl = doc.getElementById('header');
  document.querySelector('header')?.remove();
  if (!tpl) return console.error('Aucun template trouvé pour le header');
  document.body.prepend(tpl.content.cloneNode(true));
}

// -------------------- FOOTER --------------------
export async function renderFooter() {
  const res = await fetch('components/footer.html');
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tpl = doc.getElementById('footer');
  document.querySelector('footer')?.remove();
  if (!tpl) return console.error('Aucun template trouvé pour le footer');
  document.body.appendChild(tpl.content.cloneNode(true));
}

// -------------------- MAIN ---------------------
export async function renderMain(templateName = 'accueil', pageTitle = '') {
  const name = clean(templateName);

  // Afficher un petit indicateur pendant le chargement
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
    if (_currentModule?.unmount instanceof Function) {
      try { await _currentModule.unmount(); } catch {}
    }

    const res = await fetch(`components/${name}.html`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const tpl = doc.getElementById(name) || doc.getElementById('404');

    // Remplace l'ancien contenu
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
    if (header?.parentNode) {
      header.parentNode.insertBefore(fragment, header.nextSibling);
    } else {
      document.body.appendChild(fragment);
    }

    if (pageTitle) document.title = pageTitle;

    // === Import dynamique du JS de la page (UNE SEULE FOIS) ===
    try {
      const spec = new URL(`./${name}.page.js`, import.meta.url).href;
      const mod = await import(/* @vite-ignore */ spec);
      _currentModule = mod;
      if (mod.init instanceof Function) {
        await mod.init();
      }
    } catch (e) {
      console.warn(`[renderMain] aucun module JS pour ${name}`, e?.message || e);
      _currentModule = null; // pas de JS spécifique pour cette page
    }

  } catch (err) {
    console.error(err);
    document.querySelector('main')?.remove();
    const errorMain = document.createElement('main');
    errorMain.innerHTML = `<p style="text-align:center; padding:2rem; color:red;">Impossible de charger la page "${name}".</p>`;
    document.body.appendChild(errorMain);
  }
}




// -------------------- ROUTING ------------------
export function renderRoute(pathname) {
  let cleanPath = stripBase(pathname);
  if (cleanPath !== '/' && cleanPath.endsWith('/')) cleanPath = cleanPath.slice(0, -1);
  const route = routes[cleanPath] || routes['/404'] || routes['/'];
  console.log(`[renderRoute] path="${pathname}" → template="${route.template}"`);
  return renderMain(route.template, route.title);
}




export async function displayCore() {
  await renderHeader();
  initUserModal();           // la modal dépend du DOM du header
  await renderFooter();

  // Rendu initial unique
  renderRoute(window.location.pathname);

  // Le router notifie uniquement les changements de route
  initRouter({
    skipInitial: true,
    onRouteChange: (pathname) => renderRoute(pathname),
  });
}

// --------------- MODAL UTILISATEUR ------------
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

  const isLoggedIn = (typeof checkUserLoginStatus === 'function') ? checkUserLoginStatus() : false;

  if (notConnectedContent && connectedContent) {
    if (isLoggedIn) {
      notConnectedContent.classList.add('hidden');
      connectedContent.classList.remove('hidden');
    } else {
      notConnectedContent.classList.remove('hidden');
      connectedContent.classList.add('hidden');
    }
  }

  userModalBtn.addEventListener('click', () => {
    userModal.classList.toggle('hidden');
    arrowIcon?.classList.toggle('rotate-180');
  });

  document.addEventListener('mousedown', (e) => {
    if (!userModal.classList.contains('hidden') && !userModal.contains(e.target) && e.target !== userModalBtn) {
      userModal.classList.add('hidden');
      arrowIcon?.classList.remove('rotate-180');
    }
  });

  const go = (path) => {
    if (window.navigate) {
      navigate(path);
    } else {
      history.pushState({}, '', path);
      renderRoute(location.pathname);
    }
    userModal.classList.add('hidden');
  };

  loginBtn?.addEventListener('click',   () => go('/login'));
  registerBtn?.addEventListener('click',() => go('/register'));
  dashboardBtn?.addEventListener('click', () => go('/dashboard'));
  logoutBtn?.addEventListener('click', () => {
    if (typeof logoutUser === 'function') logoutUser();
    userModal.classList.add('hidden');
  });
}

// Export pratique si tu veux l'appeler ailleurs
export function initUserModal() {
  initializeUserModal();
}