//assets/js/artist.js
import {
  auth,
  db,
  onAuthStateChanged,
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  query,
  where,
} from "./firebase-config.js";

import { deleteDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

import {
  addToCart,
  cartCount,
  formatMoney,
} from "./cart-helpers.js";

const loadingSection = document.getElementById("artist-loading");
const notFoundSection = document.getElementById("artist-not-found");
const notFoundMsg = document.getElementById("artist-not-found-message");
const profileSection = document.getElementById("artist-profile");

const avatarEl = document.getElementById("artist-avatar");
const nameEl = document.getElementById("artist-name");
const followersEl = document.getElementById("artist-followers");
const aboutEl = document.getElementById("artist-about");
const releasesEl = document.getElementById("artist-releases");
const followBtn = document.getElementById("follow-btn");

//Merch section elements 
const merchEl = document.getElementById("artist-merch");
const merchGrid = document.getElementById("artist-merch-grid");
const merchEmpty = document.getElementById("artist-merch-empty");
const cartBadge = document.getElementById("artist-cart-count");

function showLoading() {
  loadingSection.style.display = "block";
  notFoundSection.style.display = "none";
  profileSection.style.display = "none";
}

function showNotFound(message) {
  loadingSection.style.display = "none";
  profileSection.style.display = "none";
  notFoundSection.style.display = "block";
  if (notFoundMsg && message) notFoundMsg.textContent = message;
}

function showProfile() {
  loadingSection.style.display = "none";
  notFoundSection.style.display = "none";
  profileSection.style.display = "block";
}

const params = new URLSearchParams(window.location.search);
const artistUid = params.get("uid");

if (!artistUid) {
  showNotFound("No artist id found in the URL.");
  throw new Error("[artist] missing uid query parameter");
}

function setCartBadge() {
  if (!cartBadge) return;
  const c = cartCount();
  cartBadge.textContent = c > 0 ? `(${c})` : "";
}

//Releases 
function renderRelease(data) {
  const item = document.createElement("div");
  item.className = "embed-item";

  const title = document.createElement("h3");
  title.textContent = data.title || "Untitled release";
  item.appendChild(title);

  if (data.imageUrl) {
    const img = document.createElement("img");
    img.src = data.imageUrl;
    img.alt = `${data.title || "Cover"} artwork`;
    img.style.maxWidth = "180px";
    img.style.borderRadius = "12px";
    img.style.display = "block";
    img.style.marginBottom = "8px";
    item.appendChild(img);
  }

  const raw = data.raw || "";
  const audioUrl = data.audioUrl || "";

  if (raw && raw.startsWith("<iframe")) {
    const container = document.createElement("div");
    container.innerHTML = raw;
    item.appendChild(container);
  } else if (audioUrl) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = audioUrl;
    audio.style.width = "100%";
    item.appendChild(audio);
  } else if (raw) {
    const link = document.createElement("a");
    link.href = raw;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open externally";
    item.appendChild(link);
  } else {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No playback source attached.";
    item.appendChild(p);
  }

  releasesEl.appendChild(item);
}

async function loadReleases() {
  releasesEl.innerHTML = "";
  const embedsRef = collection(db, "users", artistUid, "embeds");
  const snap = await getDocs(embedsRef);

  if (snap.empty) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No releases yet.";
    releasesEl.appendChild(p);
    return;
  }

  snap.forEach((docSnap) => renderRelease(docSnap.data()));
}

//Merch 
function renderProduct(p) {
  const card = document.createElement("div");
  card.className = "artist-card";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.gap = "10px";

  if (p.imageUrl) {
    const img = document.createElement("img");
    img.src = p.imageUrl;
    img.alt = p.title || "Product image";
    img.style.width = "100%";
    img.style.borderRadius = "14px";
    img.style.maxHeight = "180px";
    img.style.objectFit = "cover";
    card.appendChild(img);
  }

  const title = document.createElement("h3");
  title.textContent = p.title || "Untitled product";
  card.appendChild(title);

  const price = document.createElement("p");
  price.textContent = formatMoney(p.priceCents, (p.currency || "USD").toUpperCase());
  card.appendChild(price);

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "10px";
  row.style.alignItems = "center";

  const addBtn = document.createElement("button");
  addBtn.textContent = "Add to cart";
  addBtn.onclick = () => {
    addToCart({
      productId: p.id,
      title: p.title,
      artistUid: p.artistUid,
      artistName: p.artistName,
      priceCents: p.priceCents,
      currency: p.currency || "usd",
      imageUrl: p.imageUrl || "",
      quantity: 1,
    });
    setCartBadge();
  };
  row.appendChild(addBtn);

  const goCart = document.createElement("a");
  goCart.href = "cart.html";
  goCart.className = "btn";
  goCart.style.background = "transparent";
  goCart.style.color = "var(--text)";
  goCart.style.border = "1px solid rgba(255,255,255,0.18)";
  goCart.style.boxShadow = "none";
  goCart.textContent = "View cart";
  row.appendChild(goCart);

  card.appendChild(row);
  merchGrid.appendChild(card);
}

async function loadMerch() {
  if (!merchEl || !merchGrid) return;

  merchGrid.innerHTML = "";

  try {
    const ref = collection(db, "products");
    const q = query(ref, where("artistUid", "==", artistUid), where("active", "==", true));
    const snap = await getDocs(q);

    if (snap.empty) {
      if (merchEmpty) merchEmpty.style.display = "block";
      return;
    }

    if (merchEmpty) merchEmpty.style.display = "none";

    snap.forEach((docSnap) => {
      renderProduct({ id: docSnap.id, ...docSnap.data() });
    });
  } catch (err) {
    console.error("[artist] load merch failed:", err);
    if (merchEmpty) {
      merchEmpty.style.display = "block";
      merchEmpty.textContent = "Merch could not be loaded.";
    }
  }
}

//Profile
let currentFollowers = 0;

async function loadArtistProfile() {
  showLoading();
  try {
    const ref = doc(db, "users", artistUid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      showNotFound("This artist profile does not exist.");
      return;
    }

    const data = snap.data();
    if (!data.isArtist) {
      showNotFound("This user is not an artist.");
      return;
    }

    const displayName = data.displayName || data.email || "Artist";
    const followers = data.followers || 0;
    const bio = data.bio || "No bio available.";

    currentFollowers = followers;

    if (nameEl) nameEl.textContent = displayName;
    if (aboutEl) aboutEl.textContent = bio;
    if (followersEl) followersEl.textContent = followers === 1 ? "1 follower" : `${followers} followers`;
    if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();

    setCartBadge();
    await loadReleases();
    await loadMerch();

    showProfile();
  } catch (err) {
    console.error("[artist] failed to load artist profile:", err);
    showNotFound("Error loading artist profile.");
  }
}

loadArtistProfile();

//Follow logic(for clout lol)
async function isFollowing(fanUid) {
  const ref = doc(db, "users", fanUid, "follows", artistUid);
  const snap = await getDoc(ref);
  return snap.exists();
}

async function setFollowersCount(newCount) {
  currentFollowers = newCount;
  if (followersEl) followersEl.textContent = newCount === 1 ? "1 follower" : `${newCount} followers`;
  await setDoc(doc(db, "users", artistUid), { followers: newCount }, { merge: true });
}

async function follow(fanUid) {
  await setDoc(doc(db, "users", fanUid, "follows", artistUid), { followedAt: new Date().toISOString() }, { merge: true });
  await setFollowersCount((currentFollowers || 0) + 1);
}

async function unfollow(fanUid) {
  await deleteDoc(doc(db, "users", fanUid, "follows", artistUid));
  await setFollowersCount(Math.max(0, (currentFollowers || 1) - 1));
}

onAuthStateChanged(auth, async (user) => {
  if (!followBtn) return;

  if (!user) {
    followBtn.textContent = "Log in to follow";
    followBtn.classList.remove("following");
    followBtn.onclick = () => (window.location.href = "login.html");
    return;
  }

  const fanUid = user.uid;

  try {
    const following = await isFollowing(fanUid);
    followBtn.textContent = following ? "Following" : "Follow";
    followBtn.classList.toggle("following", following);

    followBtn.onclick = async () => {
      const now = await isFollowing(fanUid);
      if (now) {
        await unfollow(fanUid);
        followBtn.textContent = "Follow";
        followBtn.classList.remove("following");
      } else {
        await follow(fanUid);
        followBtn.textContent = "Following";
        followBtn.classList.add("following");
      }
    };
  } catch (err) {
    console.error("[artist] follow state failed:", err);
    followBtn.textContent = "Follow";
  }
});
