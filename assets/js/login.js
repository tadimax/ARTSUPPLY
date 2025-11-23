// assets/js/login.js
import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const form = document.getElementById("login-form");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const errorEl = document.getElementById("login-error");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    try {
      await signInWithEmailAndPassword(
        auth,
        emailInput.value.trim(),
        passwordInput.value
      );
      window.location.href = "account.html";
    } catch (err) {
      console.error(err);
      errorEl.textContent = friendlyError(err);
    }
  });
}

function friendlyError(error) {
  if (error.code === "auth/user-not-found") {
    return "No account found with that email.";
  }
  if (error.code === "auth/wrong-password") {
    return "Incorrect password.";
  }
  if (error.code === "auth/too-many-requests") {
    return "Too many attempts. Please try again later.";
  }
  return "Could not log in. Please try again.";
}
