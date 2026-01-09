// asset/script/login.page.js
import * as lib from './library.js';

let _deviceSSE = null;

export function init() {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const btnConnect = document.getElementById('btnConnect');
  
  if (!form || !emailInput || !passwordInput || !btnConnect) return;

const onSubmit = async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const pwd = passwordInput.value;

  if (!lib.verifyMailSyntax(email)) {
    lib.ErrorToast.fire({ title: "Adresse e-mail invalide" });
    return;
  }
  
  if (!lib.verifyPasswordSyntax(pwd)) {
    lib.ErrorToast.fire({
      title: "Mot de passe invalide",
      text: "Rappel : 8+ caractères, 1 minuscule, 1 majuscule, 1 chiffre, 1 spécial",
    });
    return;
  }

  try {
    // ✅ 1. D'abord tenter avec le deviceToken existant
    const hasValidToken = await lib.tryConnexionWToken();
    
    if (hasValidToken) {
      lib.SuccessToast.fire({ title: "Connexion automatique réussie !" });
      
      if (typeof window.updateHeaderAuth === 'function') {
        window.updateHeaderAuth(true);
      }
      
      lib.appNavigate('/dashboard');
      return;
    }
    
    // ✅ 2. Si pas de token valide, continuer avec email/password
    const res = await fetch(`${lib.urlBackend}API/connexions.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: 'connectEmailPass',
        email,
        password: pwd,
      }),
    });

      const raw = await res.text();
      
      let data = null;
      try { 
        data = JSON.parse(raw);
      } catch { 
        throw new Error("Erreur serveur");
      }

      if (!res.ok || !data) {
        throw new Error("Erreur réseau");
      }

      if (data.status === 'success') {
        const session = data?.data?.session || data?.data?.tokenSession || null;

        if (session) {
          lib.setCookie('MYEASYEVENT_Session', session, 604800);
          lib.SuccessToast.fire({ title: "Connecté !" });
          
          // Mettre à jour le header
          if (typeof window.updateHeaderAuth === 'function') {
            window.updateHeaderAuth(true);
          }
          
          lib.appNavigate('/dashboard');
          return;
        }

        // Nouveau device → token device
        const deviceToken = data?.data?.token || data?.data?.deviceToken || null;

        if (deviceToken) {
          localStorage.setItem('MYEASYEVENT_Token', deviceToken);
          
          lib.SuccessToast.fire({
            title: data.message || "Un e-mail de confirmation a été envoyé",
            text: "Une fois confirmé, cette page se mettra à jour automatiquement.",
          });
          
          await waitingForConfirmDevice(deviceToken);
          return;
        }

        lib.SuccessToast.fire({ title: data.message || "Confirme ton appareil via l'e-mail reçu" });
        return;
      }

      lib.ErrorToast.fire({ title: data.message || "Identifiants incorrects" });
      
    } catch (err) {
      lib.ErrorToast.fire({ title: err?.message || "Impossible de se connecter" });
    }
  };

  form.addEventListener('submit', onSubmit);
  btnConnect.addEventListener('click', (e) => { e.preventDefault(); onSubmit(e); });
}

// --- Attente de confirmation du device (SSE) ---
async function waitingForConfirmDevice(token) {
  const form = document.getElementById('loginForm');
  const emailEl = document.getElementById('email');
  const passEl = document.getElementById('password');
  const btn = document.getElementById('btnConnect');

  // Désactiver les champs
  if (emailEl) emailEl.disabled = true;
  if (passEl) passEl.disabled = true;
  if (btn) btn.disabled = true;

  // Charger le template d'attente si disponible
  try {
    const res = await fetch('components/loginEmailCheck.html', { cache: 'no-store' });
    if (res.ok) {
      const content = await res.text();
      if (form) form.innerHTML = content;
    }
  } catch {}

  // Loader
  // Loader
  if (form) {
    try {
      const loaderRes = await fetch('components/loginLoader.html', { cache: 'no-store' });
      if (loaderRes.ok) {
        const loaderHTML = await loaderRes.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(loaderHTML, 'text/html');
        const template = doc.querySelector('#loginLoader');
        if (template) {
          const loaderContent = template.content.cloneNode(true);
          form.appendChild(loaderContent);
        }
      }
    } catch (err) {
      console.error('[login] Erreur chargement loader:', err);
    }
  }

  // SSE
  if (!('EventSource' in window)) {
    lib.ErrorToast.fire({ title: "Votre navigateur ne supporte pas la mise à jour en temps réel." });
    return;
  }

  try { localStorage.setItem('MYEASYEVENT_Token', token); } catch {}

  const url = `${lib.urlBackend}SSE/deviceValidate.php?token=${encodeURIComponent(token)}`;
  _deviceSSE = new EventSource(url);

_deviceSSE.addEventListener('validatedevice', (event) => {
  const value = (event.data || '').trim();

  try { _deviceSSE.close(); } catch {}
  _deviceSSE = null;

  if (value) {
    lib.SuccessToast.fire({ title: "Appareil confirmé" });
    
    // Attendre un peu pour laisser le backend valider le device
    setTimeout(async () => {
      const success = await lib.tryConnexionWToken();  // ✅ UTILISER LA FONCTION COMMUNE
      if (success) {
        if (typeof window.updateHeaderAuth === 'function') {
          window.updateHeaderAuth(true);
        }
        lib.appNavigate('/dashboard');
      } else {
        lib.ErrorToast.fire({ title: "Erreur lors de la connexion" });
      }
    }, 1000);
  } else {
    setTimeout(() => waitingForConfirmDevice(token), 1500);
  }
});
}

export function unmount() {
  if (_deviceSSE) {
    try { _deviceSSE.close(); } catch {}
    _deviceSSE = null;
  }
}