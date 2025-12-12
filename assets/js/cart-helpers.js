// assets/js/cart-helpers.js
const CART_KEY = "artsupply_cart_v1";

export function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}

export function addToCart(item) {
  const cart = getCart();
  const idx = cart.findIndex((x) => x.productId === item.productId);
  if (idx >= 0) {
    cart[idx].quantity = (cart[idx].quantity || 1) + (item.quantity || 1);
  } else {
    cart.push({ ...item, quantity: item.quantity || 1 });
  }
  setCart(cart);
  return cart;
}

export function updateQuantity(productId, qty) {
  const cart = getCart();
  const next = cart
    .map((x) => (x.productId === productId ? { ...x, quantity: qty } : x))
    .filter((x) => (x.quantity || 0) > 0);
  setCart(next);
  return next;
}

export function cartCount() {
  return getCart().reduce((sum, x) => sum + (x.quantity || 0), 0);
}

export function cartSubtotalCents() {
  return getCart().reduce((sum, x) => sum + (x.priceCents || 0) * (x.quantity || 0), 0);
}

export function formatMoney(cents, currency = "USD") {
  const value = (cents || 0) / 100;
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
}
