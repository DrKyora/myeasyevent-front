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

    console.log('[login] 🔄 Tentative connexion avec:', email);

    if (!lib.verifyMailSyntax(email)) {
      console.log('[login] ❌ Email invalide');
      lib.ErrorToast.fire({ title: "Adresse e-mail invalide" });
      return;
    }
    
    if (!lib.verifyPasswordSyntax(pwd)) {
      console.log('[login] ❌ Password invalide');
      lib.ErrorToast.fire({
        title: "Mot de passe invalide",
        text: "Rappel : 8+ caractères, 1 minuscule, 1 majuscule, 1 chiffre, 1 spécial",
      });
      return;
    }

    try {
      console.log('[login] 📤 POST ->', `${lib.urlBackend}API/connexions.php`);

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

      console.log('[login] 📥 Status:', res.status, '| OK:', res.ok);

      const raw = await res.text();
      console.log('[login] 📄 Raw response (100 premiers chars):', raw.substring(0, 100));
      
      let data = null;
      try { 
        data = JSON.parse(raw);
        console.log('[login] ✅ Data parsé:', data);
      } catch { 
        console.error('[login] ❌ Réponse non-JSON:', raw);
        throw new Error("Erreur serveur");
      }

      if (!res.ok || !data) {
        console.error('[login] ❌ Erreur réseau');
        throw new Error("Erreur réseau");
      }

      console.log('[login] 📊 Status API:', data.status);

      if (data.status === 'success') {
        console.log('[login] ✅ SUCCESS - data.data:', data.data);
        
        const session = data?.data?.session || data?.data?.tokenSession || null;

        if (session) {
          console.log('[login] 🎫 Session reçue:', session.substring(0, 30) + '...');
          console.log('[login] 🍪 Création cookie MYEASYEVENT_Session...');
          
          lib.setCookie('MYEASYEVENT_Session', session, 604800);
          
          console.log('[login] 🔍 Vérification cookie:', lib.getCookie('MYEASYEVENT_Session') ? '✅ OK' : '❌ FAIL');
          
          lib.SuccessToast.fire({ title: "Connecté !" });
          
          // Mettre à jour le header
          if (typeof window.updateHeaderAuth === 'function') {
            window.updateHeaderAuth(true);
          }
          
          console.log('[login] 🚀 Navigation vers /dashboard');
          lib.appNavigate('/dashboard');
          return;
        }

        // Nouveau device → token device
        const deviceToken = data?.data?.token || data?.data?.deviceToken || null;

        if (deviceToken) {
          console.log('[login] 📲 Token device reçu, stockage dans localStorage...');
          localStorage.setItem('MYEASYEVENT_Token', deviceToken);
          
          lib.SuccessToast.fire({
            title: data.message || "Un e-mail de confirmation a été envoyé",
            text: "Une fois confirmé, cette page se mettra à jour automatiquement.",
          });
          
          await waitingForConfirmDevice(deviceToken);
          return;
        }

        console.warn('[login] ⚠️ Pas de session ni de token device');
        lib.SuccessToast.fire({ title: data.message || "Confirme ton appareil via l'e-mail reçu" });
        return;
      }

      console.log('[login] ❌ Erreur:', data.message);
      lib.ErrorToast.fire({ title: data.message || "Identifiants incorrects" });
      
    } catch (err) {
      console.error('[login] 💥 Exception:', err);
      lib.ErrorToast.fire({ title: err?.message || "Impossible de se connecter" });
    }
  };

  form.addEventListener('submit', onSubmit);
  btnConnect.addEventListener('click', (e) => { e.preventDefault(); onSubmit(e); });
}

// --- Connexion avec token device après validation ---
async function connectWithToken(deviceToken) {
  console.log('[login] 🔑 Connexion avec token device...');
  
  try {
    const res = await fetch(`${lib.urlBackend}API/connexions.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: 'connectWToken',
        token: deviceToken,
      }),
    });

    const data = await res.json();
    console.log('[login] 📥 Response connectWToken:', data);

    if (data.status === 'success' && data.data?.session) {
      console.log('[login] 🎫 Session reçue:', data.data.session.substring(0, 30) + '...');
      console.log('[login] 🍪 Création cookie...');
      
      lib.setCookie('MYEASYEVENT_Session', data.data.session, 604800);
      
      console.log('[login] 🔍 Vérification cookie:', lib.getCookie('MYEASYEVENT_Session') ? '✅ OK' : '❌ FAIL');
      
      // Mettre à jour le header
      if (typeof window.updateHeaderAuth === 'function') {
        window.updateHeaderAuth(true);
      }
      
      console.log('[login] 🚀 Navigation vers dashboard');
      lib.appNavigate('/dashboard');
    } else {
      console.error('[login] ❌ Pas de session dans la réponse');
      lib.ErrorToast.fire({ title: "Erreur lors de la connexion" });
    }
  } catch (err) {
    console.error('[login] 💥 Erreur connectWToken:', err);
    lib.ErrorToast.fire({ title: "Impossible de se connecter" });
  }
}

// --- Attente de confirmation du device (SSE) ---
async function waitingForConfirmDevice(token) {
  const form = document.getElementById('loginForm');
  const emailEl = document.getElementById('email');
  const passEl = document.getElementById('password');
  const btn = document.getElementById('btnConnect');

  console.log('[login] ⏳ Attente validation device...');

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
  if (form) {
    const loader = document.createElement('div');
    loader.className = 'flex justify-center mt-6';
    loader.innerHTML = `
      <div class="flex flex-col items-center gap-2">
        <svg class="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"></circle>
          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4"></path>
        </svg>
        <p class="text-sm text-gray-600">En attente de la confirmation de l'appareil…</p>
      </div>`;
    form.appendChild(loader);
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
    console.log('[login] 📧 SSE validatedevice reçu:', value);

    try { _deviceSSE.close(); } catch {}
    _deviceSSE = null;

    if (value) {
      console.log('[login] ✅ Device validé ! Connexion avec token...');
      lib.SuccessToast.fire({ title: "Appareil confirmé" });
      
      // Attendre un peu pour laisser le backend valider le device
      console.log('[login] ⏱️ Attente 1s pour synchronisation backend...');
      setTimeout(() => {
        connectWithToken(token);
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