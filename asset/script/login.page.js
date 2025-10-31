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

      // Parsing robuste (si le back renvoie HTML d’erreur, on le voit)
      const raw = await res.text();
      let data = null;
      try { data = JSON.parse(raw); } catch { data = null; }

      if (!res.ok || !data) {
        console.error('[login] Réponse non-JSON ou HTTP !OK:', { status: res.status, raw });
        throw new Error("Erreur réseau");
      }

      if (data.status === 'success') {
        const session = data?.data?.session || data?.data?.tokenSession || null;

        if (session) {
          lib.setCookie('session', session, 604800);
          lib.SuccessToast.fire({ title: "Connecté !" });
          lib.appNavigate('/dashboard');
          return;
        }

        // Succès SANS session → confirmation device (SSE)
        const deviceToken =
          data?.data?.token ||
          data?.data?.deviceToken ||
          localStorage.getItem('MYEASYEVENT_Token');

        if (deviceToken) {
          lib.SuccessToast.fire({
            title: data.message || "Un e-mail de confirmation a été envoyé",
            text: "Une fois confirmé, cette page se mettra à jour automatiquement.",
          });
          await waitingForConfirmDevice(deviceToken);
          return;
        }

        // Pas de session ni de token : on informe
        lib.SuccessToast.fire({ title: data.message || "Confirme ton appareil via l’e-mail reçu" });
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
  const form    = document.getElementById('loginForm');
  const emailEl = document.getElementById('email');
  const passEl  = document.getElementById('password');
  const btn     = document.getElementById('btnConnect');

  // 1) Désactiver les champs
  emailEl?.classList.remove('is-valid');
  if (emailEl) emailEl.disabled = true;
  if (passEl)  passEl.disabled  = true;
  if (btn)     btn.disabled     = true;

  // 2) Charger un contenu d’attente si dispo
  try {
    const res = await fetch('components/loginEmailCheck.html', { cache: 'no-store' });
    if (res.ok) {
      const content = await res.text();
      if (form) form.innerHTML = content;
    }
  } catch {}

  // 3) Petit loader
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

  // 4) SSE
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
      lib.appNavigate('/accueil'); // ✅ route correcte (minuscule)
    } else {
      setTimeout(() => waitingForConfirmDevice(token), 1500);
    }
  });
}

// Nettoyage si on quitte la page login
export function unmount() {
  if (_deviceSSE) {
    try { _deviceSSE.close(); } catch {}
    _deviceSSE = null;
  }
}
