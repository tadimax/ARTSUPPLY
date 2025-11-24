// assets/js/auth.js
import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  doc,
  getDoc,
  setDoc,
} from "./firebase-config.js";

export function initAuthHeader() {
  onAuthStateChanged(auth, (user) => {
    if (!user) return;
    ensureUserProfile(user);
  });
}

async function ensureUserProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // Use merge:true so we *do not* wipe out role + isArtist written during signup
    await setDoc(
      ref,
      {
        email: user.email,
        displayName: user.displayName || "",
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }
}

export async function logout() {
  await signOut(auth);
  window.location.href = "login.html";
}
