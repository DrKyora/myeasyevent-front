// asset/script/library.js
import { APP_BASE, toAppPath } from './router.js';

// === URL du backend (local / prod) ===
let _urlBackend = '';

switch (true) {
  case window.location.hostname === 'localhost':
  case window.location.hostname === '127.0.0.1':
  case window.location.hostname === '::1':
  case window.location.hostname === '[::1]':
    _urlBackend = 'https://localhost/myeasyevent-back/';
    break;
  default:
    _urlBackend = 'https://myeasyevent.be/myeasyevent-back/';
    break;
}

export const urlBackend = _urlBackend;

// ======================
//      COOKIES
// ======================
export function setCookie(cookieName, cookieValue, sec) {
  const today = new Date(), expires = new Date();
  expires.setTime(today.getTime() + sec * 1000);
  
  // Toujours utiliser "/" comme path pour que le cookie soit accessible partout
  const cookie_content = `${cookieName}=${encodeURIComponent(cookieValue)};expires=${expires.toGMTString()};path=/`;
  
  document.cookie = cookie_content;
  console.log('[setCookie]', cookieName, 'créé avec succès');
}

export function getCookie(cookieName) {
  const name = cookieName + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  console.log('[getCookie]', cookieName, 'non trouvé'); // Debug
  return false;
}

export function deleteCookie(cookieName) {
  setCookie(cookieName, "", -1);
  console.log('[deleteCookie]', cookieName, 'supprimé'); // Debug
}

// ======================
//   INPUT VALIDATION
// ======================
export function verifyMailSyntax(emailToTest) {
  return (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,9})+$/).test(emailToTest);
}

export function verifyPasswordSyntax(passwordToTest) {
  return (/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\.\-]).{8,}$/).test(passwordToTest);
}

export function verifyPhoneSyntax(numberToTest) {
  return (/^(((\+|00)32[ ]?(?:\(0\)[ ]?)?)|0){1}(4(60|[789]\d)\/?(\s?\d{2}\.?){2}(\s?\d{2})|(\d\/?\s?\d{3}|\d{2}\/?\s?\d{2})(\.?\s?\d{2}){2})$/)
    .test(numberToTest);
}

// ======================
//      TOASTS
// ======================
export const SuccessToast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: "#9cffd0",
  icon: "success",
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
    toast.onclick = Swal.close;
  },
});

export const ErrorToast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: "#ff9c9c",
  icon: "error",
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

// ======================
//   SESSION & AUTH
// ======================

/**
 * Vérifie si l'utilisateur est connecté (session valide)
 * @returns {Promise<Object|null>} Les données utilisateur si connecté, null sinon
 */
export async function checkUserLoginStatus() {
  const session = getCookie("MYEASYEVENT_Session");
  
  if (!session) {
    console.log('[checkUserLoginStatus] Pas de session trouvée');
    return null;
  }

  try {
    console.log('[checkUserLoginStatus] Vérification session...');
    
    const res = await fetch(`${urlBackend}API/connexions.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({
        action: "checkSession",
        session: session,
      }),
    });

    const data = await res.json();
    console.log('[checkUserLoginStatus] Réponse:', data);
    
    if (data.status === "success" && data.data?.user) {
  // ⭐ Convertir isAdmin (booléen) en role (string)
  const role = data.data.user.isAdmin ? 'admin' : 'user';
  sessionStorage.setItem("userRole", role);
  console.log('✅ Rôle stocké:', role); // Debug
  
  return data.data.user;
}
    
    return null;
  } catch (err) {
    console.error("[checkUserLoginStatus] Erreur:", err);
    return null;
  }
}

/**
 * Tente une connexion avec le token device stocké
 * @returns {Promise<boolean>} true si connexion réussie, false sinon
 */
export async function tryConnexionWToken() {
  const deviceToken = localStorage.getItem('MYEASYEVENT_Token');
  
  if (!deviceToken) {
    return false;
  }

  try {
    const res = await fetch(`${urlBackend}API/connexions.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: 'connectWToken',
        token: deviceToken,
      }),
    });

    console.log(res);

    const data = await res.json();

    if (data.status === 'success' && data.data?.session) {
      setCookie('MYEASYEVENT_Session', data.data.session, 604800);
      return true;
    }
    
    // Token invalide ou expiré → le supprimer
    localStorage.removeItem('MYEASYEVENT_Token');
    return false;
    
  } catch (err) {
    console.error('[tryConnexionWToken] Erreur:', err);
    return false;
  }
}

/**
 * Déconnecte l'utilisateur
 */
export function logout() {
  deleteCookie("MYEASYEVENT_Session");
  localStorage.removeItem('MYEASYEVENT_Token');
  sessionStorage.clear();
  
  // Rafraîchir le header
  if (typeof window.updateHeaderAuth === 'function') {
    window.updateHeaderAuth(false);
  }
  
  appNavigate('/accueil');
  SuccessToast.fire({ title: "Déconnecté avec succès" });
}

// ======================
//   NAVIGATION UNIVERSELLE
// ======================
export function appNavigate(to = '/') {
  const rel = toAppPath(to);
  const target = `${APP_BASE}${rel}`;
  console.log('[appNavigate] Navigation vers:', target);
  
  if (typeof window.navigate === 'function') {
    window.navigate(rel);
  } else {
    location.assign(target);
  }
}