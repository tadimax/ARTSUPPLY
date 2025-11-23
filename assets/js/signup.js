// assets/js/signup.js
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const form = document.getElementById("signup-form");
const emailInput = document.getElementById("signup-email");
const passwordInput = document.getElementById("signup-password");
const passwordConfirmInput = document.getElementById("signup-password-confirm");
const displayNameInput = document.getElementById("signup-display-name");
const errorEl = document.getElementById("signup-error");
const successEl = document.getElementById("signup-success");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    successEl.textContent = "";

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = passwordConfirmInput.value;
    const displayName = displayNameInput.value.trim();

    // NEW: read account type from radio buttons
    const accountTypeEl = document.querySelector(
      'input[name="account-type"]:checked'
    );
    const accountType = accountTypeEl ? accountTypeEl.value : "fan"; // default to fan

    const isArtist = accountType === "artist";
    const role = isArtist ? "artist" : "fan";

    if (password !== confirmPassword) {
      errorEl.textContent = "Passwords do not match.";
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }

      // Create Firestore profile with artist/fan info
      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        displayName: displayName || "",
        role,               // "artist" or "fan"
        isArtist,           // true if artist, false if fan
        createdAt: new Date().toISOString(),
      });

      // Optional email verification
      await sendEmailVerification(cred.user);

      successEl.textContent = "Account created! Check your email to verify.";
      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = "account.html";
      }, 1500);
    } catch (err) {
      console.error(err);
      errorEl.textContent = friendlyError(err);
    }
  });
}

function friendlyError(error) {
  if (error.code === "auth/email-already-in-use") {
    return "This email is already registered.";
  }
  if (error.code === "auth/weak-password") {
    return "Password is too weak (min 6 characters).";
  }
  return "There was a problem creating your account.";
}
