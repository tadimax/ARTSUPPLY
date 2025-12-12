// assets/js/merch.js
import {
  db,
  collection,
  getDocs,
} from "./firebase-config.js";

import {
  addToCart,
  cartCount,
  formatMoney,
} from "./cart-helpers.js";

const loadingSection = document.getElementById("merch-loading");
const errorSection = document.getElementById("merch-error");
const errorMessage = document.getElementById("merch-error-message");
const gridSection = document.getElementById("merch-grid-section");
const grid = document.getElementById("merch-grid");
const searchInput = document.getElementById("merch-search");
const merchCountEl = document.getElementById("merch-count");
const cartBadge = document.getElementById("cart-count-badge");

let allProducts = [];

function setCartBadge() {
  if (!cartBadge) return;
  const c = cartCount();
  cartBadge.textContent = c > 0 ? `(${c})` : "";
}

function render() {
  if (!grid) return;

  const term = (searchInput?.value || "").trim().toLowerCase();
  grid.innerHTML = "";

  const filtered = allProducts.filter((p) => {
    if (!term) return true;
    const t = (p.title || "").toLowerCase();
    const a = (p.artistName || "").toLowerCase();
    return t.includes(term) || a.includes(term);
  });

  if (merchCountEl) merchCountEl.textContent = `${filtered.length} products`;

  if (filtered.length === 0) {
    gridSection.style.display = "none";
    errorSection.style.display = "block";
    errorMessage.textContent = term ? "No products match your search." : "No products found.";
    return;
  }

  errorSection.style.display = "none";
  gridSection.style.display = "block";

  filtered.forEach((p) => {
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
      img.style.objectFit = "cover";
      img.style.maxHeight = "180px";
      card.appendChild(img);
    }

    const title = document.createElement("h3");
    title.textContent = p.title || "Untitled product";
    card.appendChild(title);

    const by = document.createElement("p");
    by.className = "muted";
    by.textContent = `by ${p.artistName || "Artist"}`;
    card.appendChild(by);

    const price = document.createElement("p");
    price.textContent = formatMoney(p.priceCents, (p.currency || "USD").toUpperCase());
    card.appendChild(price);

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "10px";
    row.style.alignItems = "center";

    const viewArtist = document.createElement("a");
    viewArtist.href = `artist.html?uid=${encodeURIComponent(p.artistUid)}`;
    viewArtist.textContent = "View artist";
    viewArtist.className = "btn";
    viewArtist.style.background = "transparent";
    viewArtist.style.color = "var(--text)";
    viewArtist.style.border = "1px solid rgba(255,255,255,0.18)";
    viewArtist.style.boxShadow = "none";
    row.appendChild(viewArtist);

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

    card.appendChild(row);
    grid.appendChild(card);
  });
}

async function loadProducts() {
  try {
    const ref = collection(db, "products");
    const snap = await getDocs(ref);

    allProducts = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.active === false) return;
      allProducts.push({
        id: docSnap.id,
        ...data,
      });
    });

    loadingSection.style.display = "none";
    if (allProducts.length === 0) {
      errorSection.style.display = "block";
      errorMessage.textContent = "No products found.";
      return;
    }

    setCartBadge();
    render();
  } catch (err) {
    console.error("[merch] load failed:", err);
    loadingSection.style.display = "none";
    errorSection.style.display = "block";
    errorMessage.textContent = "Could not load merch. Check console for details.";
  }
}

if (searchInput) {
  searchInput.addEventListener("input", render);
}

setCartBadge();
loadProducts();
