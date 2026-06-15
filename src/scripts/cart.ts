export interface CartItem {
  id: string;
  title: string;
  price: number;
  shippingPrice: number; // 0 for digital items
  type: 'book' | 'article-collection';
  quantity: number;
  image?: string;
}

const CART_KEY = 'toisetaijat_cart';

export function getItems(): CartItem[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

function save(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: getCount(items) }));
}

export function addItem(item: CartItem) {
  const items = getItems();
  const existing = items.find(i => i.id === item.id);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    items.push(item);
  }
  save(items);
}

export function removeItem(id: string) {
  save(getItems().filter(i => i.id !== id));
}

export function updateQuantity(id: string, qty: number) {
  if (qty <= 0) { removeItem(id); return; }
  const items = getItems();
  const item = items.find(i => i.id === id);
  if (item) { item.quantity = qty; save(items); }
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: 0 }));
}

export function getCount(items?: CartItem[]): number {
  return (items || getItems()).reduce((sum, i) => sum + i.quantity, 0);
}

/** Shipping = max shippingPrice among physical books. Digital = 0. */
export function getShipping(items?: CartItem[]): number {
  const list = items || getItems();
  const bookItems = list.filter(i => i.type === 'book');
  if (bookItems.length === 0) return 0;
  return Math.max(...bookItems.map(i => i.shippingPrice));
}

export function getSubtotal(items?: CartItem[]): number {
  return (items || getItems()).reduce((sum, i) => sum + i.price * i.quantity, 0);
}

/** Finnish reduced VAT rate for books and digital publications (13.5% from 1.1.2026, was 14%) */
export const ALV_RATE = 0.135;

/** VAT amount included in a given price (alv sis.) */
export function getVat(amount: number): number {
  return Math.round(amount * ALV_RATE / (1 + ALV_RATE) * 100) / 100;
}

/** Price excluding VAT */
export function getExVat(amount: number): number {
  return Math.round(amount / (1 + ALV_RATE) * 100) / 100;
}
