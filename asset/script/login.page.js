// asset/script/login.page.js
import * as lib from './library.js';

export function init() {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const btnConnect = document.getElementById('btnConnect');
  if (!form || !emailInput || !passwordInput || !btnConnect) return;

  const onSubmit = async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const pwd   = passwordInput.value;

    if (!lib.verifyMailSyntax(email)) {
      lib.ErrorToast.fire({ title: "Adresse e-mail invalide" });
      return;
    }
    if (!lib.verifyPasswordSyntax(pwd)) {
      lib.ErrorToast.fire({
        title: "Mot de passe invalide",
        text: "Rappel : 8+ caractères, 1 minuscule, 1 majuscule, 1 chiffre, 1 spécial (ex. . ! @ # …)",
      });
      return;
    }

    try {
      // 🔎 contrôle visuel
      console.log('[login] POST ->', `${lib.urlBackend}API/connexions.php`);

      const res = await fetch(`${lib.urlBackend}API/connexions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connectEmailPass',
          email,
          password: pwd,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error("Erreur réseau");

      if (data.status === 'success') {
  const session = data?.data?.session || data?.data?.tokenSession || null;

  if (session) {
    lib.setCookie('session', session, 604800);
    lib.SuccessToast.fire({ title: "Connecté !" });
    navigate('/dashboard');
    return;
  }

  // Succès SANS session → on attend la confirmation du device via SSE
  const deviceToken =
    data?.data?.token
    || data?.data?.deviceToken
    || localStorage.getItem('MYEASYEVENT_Token'); // fallback si déjà stocké

  if (deviceToken) {
    lib.SuccessToast.fire({
      title: data.message || "Un e-mail de confirmation a été envoyé",
      text: "Une fois confirmé, cette page se mettra à jour automatiquement.",
    });
    await waitingForConfirmDevice(deviceToken);
    return;
  }

  // Pas de session ni de token : on informe simplement
  lib.SuccessToast.fire({
    title: data.message || "Confirme ton appareil via l’e-mail reçu",
  });
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
let _deviceSSE = null;

async function waitingForConfirmDevice(token) {
  // Sélectionne les éléments existants du formulaire
  const form   = document.getElementById('loginForm');
  const emailEl = document.getElementById('email');
  const passEl  = document.getElementById('password');
  const btn     = document.getElementById('btnConnect');

  // 1) Désactiver les champs
  emailEl?.classList.remove('is-valid');
  if (emailEl) emailEl.disabled = true;
  if (passEl)  passEl.disabled  = true;
  if (btn)     btn.disabled     = true;

  // 2) Charger le contenu d’attente (ton composant HTML)
  try {
    const res = await fetch('components/loginEmailCheck.html', { cache: 'no-store' });
    if (res.ok) {
      const content = await res.text();
      if (form) form.innerHTML = content;
    }
  } catch {
    // si le partial n'est pas dispo, on reste silencieux
  }

  // 3) Ajouter un petit loader si besoin
  if (form) {
    const loader = document.createElement('div');
    loader.className = 'flex justify-center mt-6';
    loader.innerHTML = `
      <div class="flex flex-col items-center gap-2">
        <svg class="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"></circle>
          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4"></path>
        </svg>
        <p class="text-sm text-gray-600">En attente de la confirmation de l’appareil…</p>
      </div>`;
    form.appendChild(loader);
  }

  // 4) SSE pour écouter la validation du device
  if (!('EventSource' in window)) {
    lib.ErrorToast.fire({ title: "Votre navigateur ne supporte pas la mise à jour en temps réel." });
    return;
  }

  // sauvegarde locale du token si tu veux le réutiliser
  try { localStorage.setItem('MYEASYEVENT_Token', token); } catch {}

  // CHANGEMENT: endpoint SSE correct
  const url = `${lib.urlBackend}SSE/deviceValidate.php?token=${encodeURIComponent(token)}`;
  _deviceSSE = new EventSource(url);

  // L’API envoie un event nommé "validatedevice"
  _deviceSSE.addEventListener('validatedevice', (event) => {
    const value = (event.data || '').trim(); // contient validateDate ou vide si non validé

    try { _deviceSSE.close(); } catch {}
    _deviceSSE = null;

    if (value) {
      // Validé -> redirection
      navigate('/myeasyevent-front/');
      lib.SuccessToast.fire({ title: "Appareil confirmé" });
    } else {
      // Pas encore validé -> on relance une écoute après un court délai
      setTimeout(() => waitingForConfirmDevice(token), 1500);
    }
  });

  // (optionnel) logs/gestion erreurs
  _deviceSSE.onerror = () => {
    // Tu peux relancer après un délai si tu veux être tolérant:
    // try { _deviceSSE.close(); } catch {}
    // _deviceSSE = null;
    // setTimeout(() => waitingForConfirmDevice(token), 2000);
  };
}

// Nettoyage si on quitte la page login
export function unmount() {
  if (_deviceSSE) {
    try { _deviceSSE.close(); } catch {}
    _deviceSSE = null;
  }
}
