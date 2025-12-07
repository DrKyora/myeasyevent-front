import * as lib from './library.js';

export function init() {
    console.log('Page Contact initialisée !');
    
    const inputLastName = document.querySelector("#lastName");
    const inputFirstName = document.querySelector("#firstName");
    const inputEmail = document.querySelector("#email");
    const inputMessage = document.querySelector("#message");
    const btnSendMessage = document.querySelector("#sendMail");
    const contactForm = document.querySelector('#contactForm');
    const messageCounter = document.querySelector('#messageCounter');

    class Email {
        constructor(lastName, firstName, email, message) {
            this.lastName = lastName;
            this.firstName = firstName;
            this.email = email;
            this.message = message;
        }

        async sendEmail() {
            try {
                const response = await fetch(lib.urlBackend + "API/contact.php", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        lastName: this.lastName,
                        firstName: this.firstName,
                        email: this.email,
                        message: this.message,
                        action: "sendEmail",
                    }),
                });
                return await response.json();
            } catch (error) {
                console.error("Erreur lors de l'envoi du mail :", error);
                throw error;
            }
        }
    }

    async function sendEmail() {
        // Validation du formulaire
        const validation = validateForm();
        if (!validation.isValid) {
            return;
        }

        // Récupération des données
        const formData = {
            lastName: inputLastName.value.trim(),
            firstName: inputFirstName.value.trim(),
            email: inputEmail.value.trim(),
            message: inputMessage.value.trim()
        };

        // Désactiver le bouton pendant l'envoi
        btnSendMessage.classList.add("disabled", "opacity-50", "cursor-not-allowed");
        btnSendMessage.disabled = true;
        btnSendMessage.textContent = "Envoi en cours...";

        try {
            const newMail = new Email(
                formData.lastName,
                formData.firstName,
                formData.email,
                formData.message
            );

            const response = await newMail.sendEmail();
            if (response.status === "success") {
                lib.SuccessToast.fire({ title: "Message envoyé avec succès" });
                contactForm.reset();
                
                // Réinitialiser les états de validation
                [inputLastName, inputFirstName, inputEmail, inputMessage].forEach(input => {
                    input.classList.remove("is-invalid", "is-valid");
                });
                
                // Réinitialiser le compteur
                if (messageCounter) {
                    messageCounter.textContent = "0/50 caractères minimum";
                    messageCounter.classList.remove('text-green-500');
                    messageCounter.classList.add('text-gray-500');
                }
                
                adjustTextareaHeight();
            } else {
                throw new Error(response.message || "Erreur lors de l'envoi du message");
            }
        } catch (error) {
            console.error("Erreur :", error);
            lib.ErrorToast.fire({ title: error.message || "Une erreur est survenue" });
        } finally {
            // Réactiver le bouton
            btnSendMessage.classList.remove("disabled", "opacity-50", "cursor-not-allowed");
            btnSendMessage.disabled = false;
            btnSendMessage.textContent = "Envoyer";
            updateButtonState();
        }
    }

    contactForm.addEventListener("submit", function (e) {
        e.preventDefault();
        sendEmail();
    });

    // Validation Nom
    inputLastName.addEventListener("keyup", (e) => {
        const length = e.target.value.trim().length;
        if (length >= 2) {
            e.target.classList.remove("is-invalid");
            e.target.classList.add("is-valid");
        } else {
            e.target.classList.remove("is-valid");
            e.target.classList.add("is-invalid");
        }
        updateButtonState();
    });

    inputLastName.addEventListener("blur", (e) => {
        const length = e.target.value.trim().length;
        if (length > 0 && length < 2) {
            lib.ErrorToast.fire({ title: "Le nom doit contenir au moins 2 caractères" });
        }
    });

    // Validation Prénom
    inputFirstName.addEventListener("keyup", (e) => {
        const length = e.target.value.trim().length;
        if (length >= 2) {
            e.target.classList.remove("is-invalid");
            e.target.classList.add("is-valid");
        } else {
            e.target.classList.remove("is-valid");
            e.target.classList.add("is-invalid");
        }
        updateButtonState();
    });

    inputFirstName.addEventListener("blur", (e) => {
        const length = e.target.value.trim().length;
        if (length > 0 && length < 2) {
            lib.ErrorToast.fire({ title: "Le prénom doit contenir au moins 2 caractères" });
        }
    });

    // Validation Email
    inputEmail.addEventListener("keyup", (e) => {
        if (lib.verifyMailSyntax(e.target.value.trim())) {
            e.target.classList.remove("is-invalid");
            e.target.classList.add("is-valid");
        } else {
            e.target.classList.remove("is-valid");
            e.target.classList.add("is-invalid");
        }
        updateButtonState();
    });

    inputEmail.addEventListener("blur", (e) => {
        const value = e.target.value.trim();
        if (value.length > 0 && !lib.verifyMailSyntax(value)) {
            lib.ErrorToast.fire({ title: "Adresse email invalide" });
        }
    });

    // Validation Message avec compteur
    inputMessage.addEventListener("keyup", (e) => {
        const length = e.target.value.trim().length;
        
        // Mise à jour du compteur
        if (messageCounter) {
            messageCounter.textContent = `${length}/50 caractères minimum`;
            messageCounter.classList.remove('text-gray-500', 'text-red-500', 'text-green-500');
            
            if (length === 0) {
                messageCounter.classList.add('text-gray-500');
            } else if (length < 50) {
                messageCounter.classList.add('text-red-500');
            } else {
                messageCounter.classList.add('text-green-500');
            }
        }
        
        // Validation
        if (length >= 50) {
            e.target.classList.remove("is-invalid");
            e.target.classList.add("is-valid");
        } else {
            e.target.classList.remove("is-valid");
            e.target.classList.add("is-invalid");
        }
        
        updateButtonState();
        adjustTextareaHeight();
    });

    inputMessage.addEventListener("blur", (e) => {
        const length = e.target.value.trim().length;
        if (length > 0 && length < 50) {
            lib.ErrorToast.fire({ 
                title: `Message trop court`,
                text: `${length}/50 caractères minimum`
            });
        }
    });

    // Fonction pour mettre à jour l'état du bouton
    function updateButtonState() {
        const isFormValid = 
            inputLastName.value.trim().length >= 2 &&
            inputFirstName.value.trim().length >= 2 &&
            lib.verifyMailSyntax(inputEmail.value.trim()) &&
            inputMessage.value.trim().length >= 50;

        if (isFormValid) {
            btnSendMessage.classList.remove("disabled", "opacity-50", "cursor-not-allowed");
            btnSendMessage.disabled = false;
        } else {
            btnSendMessage.classList.add("disabled", "opacity-50", "cursor-not-allowed");
            btnSendMessage.disabled = true;
        }
    }

    function validateForm() {
        let isValid = true;
        const errors = [];

        // Validation du nom
        if (!inputLastName.value.trim() || inputLastName.value.trim().length < 2) {
            inputLastName.classList.add("is-invalid");
            errors.push("Le nom doit contenir au moins 2 caractères");
            isValid = false;
        } else {
            inputLastName.classList.add("is-valid");
        }

        // Validation du prénom
        if (!inputFirstName.value.trim() || inputFirstName.value.trim().length < 2) {
            inputFirstName.classList.add("is-invalid");
            errors.push("Le prénom doit contenir au moins 2 caractères");
            isValid = false;
        } else {
            inputFirstName.classList.add("is-valid");
        }

        // Validation de l'email
        if (!inputEmail.value.trim() || !lib.verifyMailSyntax(inputEmail.value.trim())) {
            inputEmail.classList.add("is-invalid");
            errors.push("Adresse email invalide");
            isValid = false;
        } else {
            inputEmail.classList.add("is-valid");
        }

        // Validation du message
        if (!inputMessage.value.trim() || inputMessage.value.trim().length < 50) {
            inputMessage.classList.add("is-invalid");
            errors.push("Le message doit contenir au moins 50 caractères");
            isValid = false;
        } else {
            inputMessage.classList.add("is-valid");
        }

        if (!isValid) {
            lib.ErrorToast.fire({ 
                title: 'Formulaire incomplet',
                text: errors[0]
            });
        }

        return { isValid };
    }

    function adjustTextareaHeight() {
        inputMessage.style.height = 'auto';
        inputMessage.style.height = inputMessage.scrollHeight + 'px';
    }

    inputMessage.addEventListener('input', adjustTextareaHeight);
    
    // État initial
    btnSendMessage.classList.add("disabled", "opacity-50", "cursor-not-allowed");
    btnSendMessage.disabled = true;
    adjustTextareaHeight();
}