// assets/js/artist-dashboard.js
import {
  auth,
  db,
  storage,
  onAuthStateChanged,
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "./firebase-config.js";

const loadingSection = document.getElementById("artist-loading");
const deniedSection = document.getElementById("artist-denied");
const deniedMessage = document.getElementById("artist-denied-message");
const dashboardSection = document.getElementById("artist-dashboard");

const artistNameSpan = document.getElementById("artist-name");
const artistEmailSpan = document.getElementById("artist-email");

const statReleases = document.getElementById("stat-releases");
const statFollowers = document.getElementById("stat-followers");

//Releases/embeds
const addEmbedForm = document.getElementById("add-embed-form");
const embedTitleInput = document.getElementById("embed-title");
const embedCodeInput = document.getElementById("embed-code");
const audioFileInput = document.getElementById("audio-file");
const imageFileInput = document.getElementById("image-file");
const embedError = document.getElementById("embed-error");
const embedStatus = document.getElementById("embed-status");
const embedSubmitBtn = document.getElementById("embed-submit-btn");
const embedList = document.getElementById("embed-list");

//Merch (NEW)
const merchForm = document.getElementById("merch-form");
const merchTitleInput = document.getElementById("merch-title");
const merchDescInput = document.getElementById("merch-description");
const merchPriceInput = document.getElementById("merch-price");
const merchImageInput = document.getElementById("merch-image");
const merchSubmitBtn = document.getElementById("merch-submit-btn");
const merchError = document.getElementById("merch-error");
const merchStatus = document.getElementById("merch-status");
const merchList = document.getElementById("merch-list");
const statProducts = document.getElementById("stat-products");

let currentUser = null;
let currentArtistDisplayName = "";

function showState(state) {
  if (loadingSection) loadingSection.style.display = state === "loading" ? "block" : "none";
  if (deniedSection) deniedSection.style.display = state === "denied" ? "block" : "none";
  if (dashboardSection) dashboardSection.style.display = state === "dashboard" ? "block" : "none";
}

//Upload helper 
async function uploadFile(file, pathPrefix) {
  const safeName = file.name.replace(/\s+/g, "_");
  const fullPath = `${pathPrefix}/${Date.now()}_${safeName}`;
  const ref = storageRef(storage, fullPath);

  await new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref, file);
    task.on("state_changed", null, reject, resolve);
  });

  return await getDownloadURL(ref);
}

//Releases UI 
function renderEmbed(docId, data) {
  if (!embedList) return;

  const item = document.createElement("div");
  item.className = "embed-item";
  item.dataset.id = docId;

  const title = document.createElement("h3");
  title.textContent = data.title || "Untitled release";
  item.appendChild(title);

  if (data.imageUrl) {
    const img = document.createElement("img");
    img.src = data.imageUrl;
    img.alt = `${data.title || "Cover"} artwork`;
    img.style.maxWidth = "140px";
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

  embedList.appendChild(item);
}

async function loadEmbeds(uid) {
  if (!embedList) return;
  embedList.innerHTML = "";

  try {
    const embedsRef = collection(db, "users", uid, "embeds");
    const q = query(embedsRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    let count = 0;
    snap.forEach((docSnap) => {
      renderEmbed(docSnap.id, docSnap.data());
      count += 1;
    });

    if (statReleases) statReleases.textContent = String(count);
  } catch (err) {
    console.error("[artist-dashboard] failed to load embeds:", err);
    if (embedError) embedError.textContent = "Could not load your releases.";
  }
}

async function handleSubmitRelease(e) {
  e.preventDefault();
  if (!currentUser) return;

  embedError.textContent = "";
  embedStatus.textContent = "";

  const title = embedTitleInput.value.trim();
  const raw = embedCodeInput.value.trim();
  const audioFile = audioFileInput.files[0];
  const coverFile = imageFileInput.files[0];

  if (!title) {
    embedError.textContent = "Please provide a title for your release.";
    return;
  }
  if (!raw && !audioFile) {
    embedError.textContent = "Add at least an audio file or an external embed / URL.";
    return;
  }

  try {
    embedSubmitBtn.disabled = true;
    embedSubmitBtn.textContent = "Uploading…";
    embedStatus.textContent = "Uploading files…";

    let audioUrl = null;
    let imageUrl = null;

    if (audioFile) audioUrl = await uploadFile(audioFile, `artists/${currentUser.uid}/audio`);
    if (coverFile) imageUrl = await uploadFile(coverFile, `artists/${currentUser.uid}/images`);

    embedStatus.textContent = "Saving release…";

    const payload = {
      title,
      createdAt: new Date().toISOString(),
    };
    if (raw) payload.raw = raw;
    if (audioUrl) payload.audioUrl = audioUrl;
    if (imageUrl) payload.imageUrl = imageUrl;

    const embedsRef = collection(db, "users", currentUser.uid, "embeds");
    await addDoc(embedsRef, payload);

    embedTitleInput.value = "";
    embedCodeInput.value = "";
    audioFileInput.value = "";
    imageFileInput.value = "";

    embedStatus.textContent = "Release saved.";
    await loadEmbeds(currentUser.uid);
  } catch (err) {
    console.error("[artist-dashboard] release save failed:", err);
    embedError.textContent = "Could not save release. Check console.";
  } finally {
    embedSubmitBtn.disabled = false;
    embedSubmitBtn.textContent = "Save release";
  }
}

//Merch (NEW) 
function formatMoney(cents, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format((cents || 0) / 100);
}

function renderProduct(p) {
  if (!merchList) return;

  const card = document.createElement("div");
  card.className = "artist-card";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.gap = "10px";

  if (p.imageUrl) {
    const img = document.createElement("img");
    img.src = p.imageUrl;
    img.alt = p.title || "Product";
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

  const active = document.createElement("p");
  active.className = "muted";
  active.textContent = p.active === false ? "Hidden" : "Active";
  card.appendChild(active);

  merchList.appendChild(card);
}

async function loadMyProducts(uid) {
  if (!merchList) return;
  merchList.innerHTML = "";

  try {
    const ref = collection(db, "products");
    const q = query(ref, where("artistUid", "==", uid), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    let count = 0;
    snap.forEach((docSnap) => {
      renderProduct({ id: docSnap.id, ...docSnap.data() });
      count += 1;
    });

    if (statProducts) statProducts.textContent = String(count);
  } catch (err) {
    console.error("[artist-dashboard] load products failed:", err);
    if (merchError) merchError.textContent = "Could not load your products.";
  }
}

function parsePriceToCents(raw) {
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  if (!isFinite(n)) return null;
  return Math.round(n * 100);
}

async function handleSubmitMerch(e) {
  e.preventDefault();
  if (!currentUser) return;

  merchError.textContent = "";
  merchStatus.textContent = "";

  const title = merchTitleInput.value.trim();
  const description = merchDescInput.value.trim();
  const priceCents = parsePriceToCents(merchPriceInput.value);
  const imgFile = merchImageInput.files[0];

  if (!title) {
    merchError.textContent = "Please enter a product name.";
    return;
  }
  if (priceCents == null || priceCents < 0) {
    merchError.textContent = "Please enter a valid price (e.g., 25.00).";
    return;
  }

  try {
    merchSubmitBtn.disabled = true;
    merchSubmitBtn.textContent = "Saving…";
    merchStatus.textContent = "Uploading image…";

    let imageUrl = "";
    if (imgFile) {
      imageUrl = await uploadFile(imgFile, `artists/${currentUser.uid}/products`);
    }

    merchStatus.textContent = "Creating product…";

    await addDoc(collection(db, "products"), {
      artistUid: currentUser.uid,
      artistName: currentArtistDisplayName || currentUser.email || "Artist",
      title,
      description,
      priceCents,
      currency: "usd",
      imageUrl,
      active: true,
      createdAt: new Date().toISOString(),
    });

    merchTitleInput.value = "";
    merchDescInput.value = "";
    merchPriceInput.value = "";
    merchImageInput.value = "";

    merchStatus.textContent = "Product saved.";
    await loadMyProducts(currentUser.uid);
  } catch (err) {
    console.error("[artist-dashboard] create product failed:", err);
    merchError.textContent = "Could not create product. Check console.";
  } finally {
    merchSubmitBtn.disabled = false;
    merchSubmitBtn.textContent = "Add product";
  }
}

//Auth gate 
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showState("denied");
    if (deniedMessage) deniedMessage.textContent = "You must be logged in as an artist to view this page.";
    return;
  }

  currentUser = user;

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) {
      showState("denied");
      deniedMessage.textContent = "No profile found. Please sign up again.";
      return;
    }

    const data = snap.data();
    if (!data.isArtist) {
      showState("denied");
      deniedMessage.textContent = "This page is only for artist accounts.";
      return;
    }

    currentArtistDisplayName = data.displayName || user.displayName || user.email || "Artist";

    showState("dashboard");
    if (artistNameSpan) artistNameSpan.textContent = currentArtistDisplayName;
    if (artistEmailSpan) artistEmailSpan.textContent = user.email || data.email || "";

    if (statFollowers) statFollowers.textContent = String(data.followers || 0);

    if (addEmbedForm) addEmbedForm.onsubmit = handleSubmitRelease;
    if (merchForm) merchForm.onsubmit = handleSubmitMerch;

    await loadEmbeds(user.uid);
    await loadMyProducts(user.uid);
  } catch (err) {
    console.error("[artist-dashboard] auth gate failed:", err);
    showState("denied");
    deniedMessage.textContent = "There was a problem loading your dashboard.";
  }
});
