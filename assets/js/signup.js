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

    //Read selected account type directly from THIS form
    const formData = new FormData(form);
    const rawAccountType = formData.get("account-type");

    if (!rawAccountType) {
      errorEl.textContent = "Please select an account type (fan or artist).";
      return;
    }

    const accountType = String(rawAccountType).toLowerCase().trim();
    const isArtist = accountType === "artist";
    const role = isArtist ? "artist" : "fan";

    console.log("[signup] accountType:", accountType, "isArtist:", isArtist, "role:", role);

    if (password !== confirmPassword) {
      errorEl.textContent = "Passwords do not match.";
      return;
    }

    try {
      //1)Create Auth user
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      console.log("[signup] auth user created:", cred.user.uid);

      //2) Update display name (Auth profile)
      if (displayName) {
        await updateProfile(cred.user, { displayName });
        console.log("[signup] updated auth profile displayName");
      }

      //3)Write Firestore profile (dont forgrt this is critical Tadi)
      const userDocRef = doc(db, "users", cred.user.uid);
      const profileData = {
        email,
        displayName: displayName || "",
        role,         // "artist" or "fan"
        isArtist,     // true/false
        createdAt: new Date().toISOString(),
      };

      console.log("[signup] writing profile to Firestore:", userDocRef.path, profileData);

      try {
        await setDoc(userDocRef, profileData);
        console.log("[signup] successfully wrote profile doc");
      } catch (firestoreErr) {
        console.error("[signup] Firestore setDoc FAILED:", firestoreErr);
        errorEl.textContent = firestoreFriendlyError(firestoreErr);
        //Don't proceed to email verification or redirect if profile write failed
        return;
      }

      //4) Optional email verification
      try {
        await sendEmailVerification(cred.user);
        console.log("[signup] sent email verification");
      } catch (verifyErr) {
        console.warn("[signup] sendEmailVerification failed:", verifyErr);
        //Not fatal for account creation; we still continue
      }

      successEl.textContent = "Account created! Check your email to verify.";
      setTimeout(() => {
        window.location.href = "account.html";
      }, 1500);
    } catch (err) {
      console.error("[signup] auth/overall error:", err);
      errorEl.textContent = friendlyError(err);
    }
  });
}

function friendlyError(error) {
  if (!error || !error.code) {
    return "There was a problem creating your account.";
  }

  if (error.code === "auth/email-already-in-use") {
    return "This email is already registered.";
  }
  if (error.code === "auth/weak-password") {
    return "Password is too weak (min 6 characters).";
  }
  if (error.code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }
  if (error.code === "auth/operation-not-allowed") {
    return "Email/password sign-in is not enabled for this project.";
  }
  if (error.code === "auth/network-request-failed") {
    return "Network error. Check your connection and try again.";
  }

  return `Unexpected error: ${error.code}`;
}

function firestoreFriendlyError(error) {
  if (!error || !error.code) {
    return "Could not save your profile to the database.";
  }

  if (error.code === "permission-denied") {
    return "You are not allowed to create a profile. Check Firestore rules.";
  }
  if (error.code === "unavailable") {
    return "Database is temporarily unavailable. Try again in a moment.";
  }

  return `Database error: ${error.code}`;
}
