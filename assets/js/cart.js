// assets/js/cart.js
import {
  getCart,
  updateQuantity,
  clearCart,
  cartSubtotalCents,
  formatMoney,
} from "./cart-helpers.js";
import { loadStripe } from "https://cdn.jsdelivr.net/npm/@stripe/stripe-js@5/+esm";

const STRIPE_PUBLISHABLE_KEY =
  "pk_test_51SegUg2KGuXFUBFGvfem3xL6F7QTutoZc75xrCOOVZIIZwOd8A4VYnTJ9BnVlfQfpXxv53fRLY2FzSqdPplkvgNI005BEwZLLF"; // ✅ ok in frontend
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

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
    price.textContent = formatMoney(
      item.priceCents,
      (item.currency || "USD").toUpperCase()
    );
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

function setCheckoutLoading(isLoading) {
  if (!checkoutBtn) return;
  checkoutBtn.disabled = isLoading;
  checkoutBtn.textContent = isLoading ? "Processing..." : "Checkout";
}

/**
 * Fake checkout (demo mode)
 * - DOES NOT contact Stripe
 * - Creates a fake "order" record in localStorage
 * - Clears cart
 * - Redirects to a success page if you have one (optional)
 */
async function fakeCheckout() {
  if (errEl) errEl.textContent = "";

  const cart = getCart();
  if (!cart || cart.length === 0) return;

  setCheckoutLoading(true);

  try {
    // Optional: ensure Stripe SDK loads (proves key is valid),
    // but we don't actually create a real session.
    await stripePromise;

    const subtotal = cartSubtotalCents();
    const orderId = `demo_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      currency: "USD",
      subtotalCents: subtotal,
      items: cart.map((i) => ({
        productId: i.productId,
        title: i.title || "Item",
        artistName: i.artistName || "Artist",
        priceCents: i.priceCents,
        quantity: i.quantity || 1,
        imageUrl: i.imageUrl || "",
      })),
      status: "paid_demo",
      provider: "demo",
    };

    // Persist demo orders locally (so you can show a receipt page later)
    const prev = JSON.parse(localStorage.getItem("demo_orders") || "[]");
    prev.unshift(order);
    localStorage.setItem("demo_orders", JSON.stringify(prev));

    // Clear cart and re-render UI
    clearCart();
    render();

    // UX feedback (works even if you don't have a success page)
    alert(
      `✅ Demo checkout complete!\n\nOrder: ${orderId}\nTotal: ${formatMoney(
        subtotal,
        "USD"
      )}\n\n(No real payment processed.)`
    );

    // Optional redirect if you create a page later:
    // window.location.href = `order-success.html?orderId=${encodeURIComponent(orderId)}`;
  } catch (err) {
    console.error("[cart] fake checkout failed:", err);
    if (errEl) errEl.textContent = "Demo checkout failed. Try again.";
  } finally {
    setCheckoutLoading(false);
  }
}

if (clearBtn) {
  clearBtn.onclick = () => {
    clearCart();
    render();
  };
}

if (checkoutBtn) {
  checkoutBtn.onclick = fakeCheckout;
}

render();
