// assets/js/account.js
import {
  auth,
  db,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
} from "./firebase-config.js";

const guestSection = document.getElementById("account-guest");
const authSection = document.getElementById("account-authenticated");

const emailSpan = document.getElementById("account-email");
const displayInput = document.getElementById("account-display-name");
const form = document.getElementById("account-form");
const msgEl = document.getElementById("account-message");
const errEl = document.getElementById("account-error");

const accountTypeLabel = document.getElementById("account-type-label");
const artistToolsSection = document.getElementById("artist-tools");
const fanToolsSection = document.getElementById("fan-tools");
const artistViewToggleContainer = document.getElementById("artist-view-toggle");
const viewAsFanToggle = document.getElementById("view-as-fan-toggle");

//LocalStorage key for the optional "view as fan" mode
const VIEW_MODE_KEY = "viewMode"; // "artist" | "fan"

//Read current view mode from localStorage (default: "artist")
function getViewMode() {
  const stored = localStorage.getItem(VIEW_MODE_KEY);
  if (stored === "fan" || stored === "artist") {
    return stored;
  }
  return "artist";
}

function setViewMode(mode) {
  if (mode !== "fan" && mode !== "artist") return;
  localStorage.setItem(VIEW_MODE_KEY, mode);
}

/*Update which sections are visible based on:
  - isArtist (from Firestore)
  - viewMode (from localStorage / toggle)
 */
function updateSectionsVisibility({ isArtist, viewMode }) {
  //Fan tools are available to ANY logged-in user
  if (fanToolsSection) {
    fanToolsSection.style.display = "block";
  }

  //Artist-only tools
  if (artistToolsSection) {
    if (isArtist && viewMode !== "fan") {
      artistToolsSection.style.display = "block";
    } else {
      artistToolsSection.style.display = "none";
    }
  }

  //Toggle control visibility
  if (artistViewToggleContainer) {
    artistViewToggleContainer.style.display = isArtist ? "block" : "none";
  }

  //Toggle checked state: checked == "view as fan"
  if (viewAsFanToggle) {
    viewAsFanToggle.checked = viewMode === "fan";
  }
}

//Listen for auth state changes
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    //Not logged in
    if (guestSection) guestSection.style.display = "block";
    if (authSection) authSection.style.display = "none";
    return;
  }

  if (guestSection) guestSection.style.display = "none";
  if (authSection) authSection.style.display = "block";

  emailSpan.textContent = user.email;

  //Load Firestore profile
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  let isArtist = false;
  let displayName = "";

  if (snap.exists()) {
    const data = snap.data();
    isArtist = !!data.isArtist;
    displayName = data.displayName || "";
  }

  //Set display name input
  displayInput.value = displayName;

  //Account type label
  if (accountTypeLabel) {
    accountTypeLabel.textContent = isArtist ? "Artist" : "Fan";
  }

  //If not artist, force viewMode to "fan"
  let viewMode = getViewMode();
  if (!isArtist) {
    viewMode = "fan";
    setViewMode("fan");
  }

  updateSectionsVisibility({ isArtist, viewMode });

  //Hook up the toggle only once auth and profile are known
  if (viewAsFanToggle) {
    viewAsFanToggle.onchange = () => {
      if (!isArtist) {
        // Non-artists shouldn't be able to flip modes; just reset.
        viewAsFanToggle.checked = false;
        return;
      }
      const newMode = viewAsFanToggle.checked ? "fan" : "artist";
      setViewMode(newMode);
      updateSectionsVisibility({ isArtist, viewMode: newMode });
    };
  }
});

//Save profile changes
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msgEl.textContent = "";
    errEl.textContent = "";

    const user = auth.currentUser;
    if (!user) {
      errEl.textContent = "You must be logged in.";
      return;
    }

    try {
      const ref = doc(db, "users", user.uid);
      await setDoc(
        ref,
        {
          displayName: displayInput.value.trim(),
        },
        { merge: true }
      );
      msgEl.textContent = "Profile updated.";
    } catch (err) {
      console.error(err);
      errEl.textContent = "Could not save profile.";
    }
  });
}
