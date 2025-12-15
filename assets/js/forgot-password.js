//assets/js/forgot-password.js
import { auth } from "./firebase-config.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const form = document.getElementById("forgot-form");
const emailInput = document.getElementById("forgot-email");
const msgEl = document.getElementById("forgot-message");
const errEl = document.getElementById("forgot-error");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    msgEl.textContent = "";
    errEl.textContent = "";

    try {
      await sendPasswordResetEmail(auth, emailInput.value.trim());
      msgEl.textContent =
        "If an account exists for this email, we've sent reset instructions.";
    } catch (err) {
      console.error(err);
      errEl.textContent = "Could not send reset link. Please try again.";
    }
  });
}
