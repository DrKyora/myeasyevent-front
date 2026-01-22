// register.page.js
import * as lib from './library.js';

export function init() {
    console.log('Page register initialisée !');
    
    const form = document.getElementById('registerForm');
    const lastNameInput = document.getElementById('lastName');
    const firstNameInput = document.getElementById('firstName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const btnRegister = document.getElementById('registerBtn');
    
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const lastName = lastNameInput.value.trim();
        const firstName = firstNameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        // Validation
        if (!lastName || !firstName || !email || !password || !confirmPassword) {
            lib.ErrorToast.fire({ title: 'Tous les champs sont obligatoires' });
            return;
        }
        
        if (!lib.verifyMailSyntax(email)) {
            lib.ErrorToast.fire({ title: 'Adresse email invalide' });
            return;
        }
        
        if (!lib.verifyPasswordSyntax(password)) {
            lib.ErrorToast.fire({
                title: 'Mot de passe invalide',
                text: '8+ caractères, 1 minuscule, 1 majuscule, 1 chiffre, 1 spécial'
            });
            return;
        }
        
        if (password !== confirmPassword) {
            lib.ErrorToast.fire({ title: 'Les mots de passe ne correspondent pas' });
            return;
        }
        
        // Désactiver le bouton pendant le traitement
        btnRegister.disabled = true;
        btnRegister.textContent = 'Inscription en cours...';
        
        try {
            const response = await fetch(`${lib.urlBackend}API/connexions.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'subscription',
                    user: { lastName, firstName, email, password }
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                lib.SuccessToast.fire({
                    title: 'Inscription réussie !',
                    text: 'Un email de confirmation a été envoyé à votre adresse'
                });
                
                // Rediriger vers la page de vérification email
                setTimeout(() => {
                    lib.appNavigate('/login');
                }, 2000);
            } else {
                lib.ErrorToast.fire({ 
                    title: 'Erreur d\'inscription', 
                    text: data.message || 'Une erreur est survenue'
                });
            }
            
        } catch (error) {
            console.error('Erreur:', error);
            lib.ErrorToast.fire({ title: 'Erreur de connexion au serveur' });
        } finally {
            btnRegister.disabled = false;
            btnRegister.textContent = 'Inscription';
        }
    });
}

export function unmount() {
    console.log('Page register démontée');
}