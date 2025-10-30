// === URL du backend (local) ===
const origin = `${location.protocol}//${location.hostname}${location.port ? ':' + location.port : ''}`;
export const urlBackend = "https://myeasyevent.be/myeasyevent-back/";


// ======================
//      COOKIES
// ======================
export function setCookie(cookieName, cookieValue, sec) {
  const today = new Date(), expires = new Date();
  expires.setTime(today.getTime() + sec * 1000);
  const cookie_content = `${cookieName}=${encodeURIComponent(cookieValue)};expires=${expires.toGMTString()}`;
  document.cookie = cookie_content;
}

export function getCookie(cookieName) {
  const name = cookieName + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1);
    if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
  }
  return false;
}

// ======================
//   INPUT VALIDATION
// ======================
export function verifyMailSyntax(emailToTest) {
  return (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,9})+$/).test(emailToTest);
}

export function verifyPasswordSyntax(passwordToTest) {
  const regex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\.\-]).{8,}$/;
  return regex.test(passwordToTest);
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

// --------------- Sessions and Login ------------
function checkSession() {
    if (
        (session =
            getCookie("MYEASYEVENT_Session") && localStorage.getItem("MYEASYEVENT_Token"))
    ) {
        checkSessionStatus((reponse) => {
            if (!reponse) {
                window.location.replace("login.html");
            } else {
                if (
                    sessionStorage.getItem("avatar") === null ||
                    sessionStorage.getItem("avatar") === "null" ||
                    sessionStorage.getItem("avatar") === "undefined"
                ) {
                    sessionStorage.setItem("avatar", reponse.avatar);
                }
                if (
                    sessionStorage.getItem("avatar") !== null &&
                    sessionStorage.getItem("avatar") !== "null" &&
                    sessionStorage.getItem("avatar") !== "undefined"
                ) {
                    let avatar = document.getElementById("navbarAvatar");
                    avatar.src =
                        urlBackend +
                        "img/avatars/" +
                        sessionStorage.getItem("avatar");
                }
            }
        });
    } else {
        window.location.replace("login.html");
    }
}
function checkSessionStatus(callback) {
    fetch(urlBackend + "API/connexions.php", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            action: "checkSession",
            session: getCookie("MYEASYEVENT_Session"),
        }),
    })
        .then((response) => {
            return response.json();
        })
        .then((response) => {
            /**Voir pour renvoyer depuis api les infos de préférences user pour l'affichage ICI */
            if (response.status == "success") {
                callback(response.data);
            } else {
                callback(false);
            }
        });
}
function logout() {
    localStorage.removeItem("MYEASYEVENT_Token");
    setCookie("MYEASYEVENT_Session", "", -1);
    /**Supprime toutes les données des session */
    sessionStorage.clear();
    window.location.replace("login.html");
}
//#endregion