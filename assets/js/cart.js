// assets/js/cart.js
import {
  getCart,
  updateQuantity,
  clearCart,
  cartSubtotalCents,
  formatMoney,
} from "./cart-helpers.js";

const emptyEl = document.getElementById("cart-empty");
const itemsEl = document.getElementById("cart-items");
const listEl = document.getElementById("cart-list");
const subtotalEl = document.getElementById("cart-subtotal");
const clearBtn = document.getElementById("clear-cart-btn");
const checkoutBtn = document.getElementById("checkout-btn");
const errEl = document.getElementById("cart-error");

function render() {
  const cart = getCart();

  if (!cart || cart.length === 0) {
    if (itemsEl) itemsEl.style.display = "none";
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";
  if (itemsEl) itemsEl.style.display = "block";

  listEl.innerHTML = "";

  cart.forEach((item) => {
    const row = document.createElement("div");
    row.className = "artist-card";
    row.style.display = "grid";
    row.style.gridTemplateColumns = "80px 1fr auto";
    row.style.gap = "12px";
    row.style.alignItems = "center";

    const imgWrap = document.createElement("div");
    if (item.imageUrl) {
      const img = document.createElement("img");
      img.src = item.imageUrl;
      img.alt = item.title || "Product image";
      img.style.width = "80px";
      img.style.height = "80px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "14px";
      imgWrap.appendChild(img);
    }
    row.appendChild(imgWrap);

    const mid = document.createElement("div");

    const title = document.createElement("h3");
    title.textContent = item.title || "Item";
    mid.appendChild(title);

    const by = document.createElement("p");
    by.className = "muted";
    by.textContent = `by ${item.artistName || "Artist"}`;
    mid.appendChild(by);

    const price = document.createElement("p");
    price.textContent = formatMoney(item.priceCents, (item.currency || "USD").toUpperCase());
    mid.appendChild(price);

    row.appendChild(mid);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.flexDirection = "column";
    right.style.gap = "8px";
    right.style.alignItems = "flex-end";

    const qtyRow = document.createElement("div");
    qtyRow.style.display = "flex";
    qtyRow.style.gap = "8px";
    qtyRow.style.alignItems = "center";

    const minus = document.createElement("button");
    minus.textContent = "−";
    minus.onclick = () => {
      updateQuantity(item.productId, (item.quantity || 1) - 1);
      render();
    };

    const qty = document.createElement("span");
    qty.textContent = String(item.quantity || 1);

    const plus = document.createElement("button");
    plus.textContent = "+";
    plus.onclick = () => {
      updateQuantity(item.productId, (item.quantity || 1) + 1);
      render();
    };

    qtyRow.appendChild(minus);
    qtyRow.appendChild(qty);
    qtyRow.appendChild(plus);

    right.appendChild(qtyRow);

    const remove = document.createElement("a");
    remove.href = "#";
    remove.className = "muted";
    remove.textContent = "Remove";
    remove.onclick = (e) => {
      e.preventDefault();
      updateQuantity(item.productId, 0);
      render();
    };

    right.appendChild(remove);

    row.appendChild(right);
    listEl.appendChild(row);
  });

  const subtotal = cartSubtotalCents();
  subtotalEl.textContent = formatMoney(subtotal, "USD");
}

async function checkoutStripeTest() {
  errEl.textContent = "";

  const cart = getCart();
  if (!cart.length) return;

  // IMPORTANT:
  // This requires a backend endpoint that uses Stripe SECRET KEY to create a Checkout Session.
  // Your frontend must NEVER contain the secret key.
  //
  // Expected backend response:
  // { "sessionId": "cs_test_..." }
  try {
    const res = await fetch("/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.sessionId) throw new Error("Missing sessionId in response");

    // Publishable key only (pk_test_...)
    const stripe = Stripe("pk_test_REPLACE_ME");
    const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
    if (error) throw error;
  } catch (err) {
    console.error("[cart] checkout failed:", err);
    errEl.textContent =
      "Checkout is not configured yet. You need a backend / Cloud Function at /create-checkout-session and a Stripe publishable key.";
  }
}

if (clearBtn) {
  clearBtn.onclick = () => {
    clearCart();
    render();
  };
}

if (checkoutBtn) {
  checkoutBtn.onclick = checkoutStripeTest;
}

render();
