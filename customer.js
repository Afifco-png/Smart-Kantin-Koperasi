/* ============================================================
   Smart Kantin & Koperasi — Customer Page
   Vanilla JS + localStorage
   ============================================================ */

const STORAGE_KEY = 'sk_products';
const ORDERS_KEY = 'sk_customer_orders';
let products = [];
let cart = [];
let selectedCategory = '';

/* ---------- INITIALIZATION ---------- */
function initCustomer() {
  loadProducts();
  loadCart();
  renderProducts();
  attachEventListeners();
  updateCartUI();
}

function attachEventListeners() {
  // Cart toggle
  document.getElementById('cartToggleBtn').addEventListener('click', openCart);
  document.getElementById('cartCloseBtn').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);

  // Search
  document.getElementById('searchInput').addEventListener('input', renderProducts);

  // Category filter
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.category-btn').forEach(b => {
        b.classList.remove('bg-emerald-500', 'text-white');
        b.classList.add('bg-slate-100', 'text-slate-700');
      });
      e.target.classList.add('bg-emerald-500', 'text-white');
      e.target.classList.remove('bg-slate-100', 'text-slate-700');
      selectedCategory = e.target.dataset.category;
      renderProducts();
    });
  });

  // Checkout
  document.getElementById('checkoutBtn').addEventListener('click', checkout);
  document.getElementById('clearCartBtn').addEventListener('click', clearCart);
}

/* ---------- DATA MANAGEMENT ---------- */
function loadProducts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    products = JSON.parse(raw);
  }
}

function loadCart() {
  const raw = localStorage.getItem('sk_customer_cart');
  cart = raw ? JSON.parse(raw) : [];
}

function saveCart() {
  localStorage.setItem('sk_customer_cart', JSON.stringify(cart));
}

function saveOrder(order) {
  const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  orders.push(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

/* ---------- CART OPERATIONS ---------- */
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product || product.stock <= 0) {
    showToast('Produk tidak tersedia', 'error');
    return;
  }

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    if (existing.qty < product.stock) {
      existing.qty++;
    } else {
      showToast('Stok tidak cukup', 'error');
      return;
    }
  } else {
    cart.push({
      id: productId,
      name: product.name,
      price: product.price,
      qty: 1,
      maxStock: product.stock
    });
  }

  saveCart();
  updateCartUI();
  showToast(`${product.name} ditambahkan ke keranjang`, 'success');
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartUI();
}

function updateCartQty(productId, qty) {
  const item = cart.find(item => item.id === productId);
  if (item) {
    if (qty <= 0) {
      removeFromCart(productId);
    } else if (qty <= item.maxStock) {
      item.qty = qty;
      saveCart();
      updateCartUI();
    }
  }
}

function clearCart() {
  if (!cart.length) return;
  if (confirm('Hapus semua item dari keranjang?')) {
    cart = [];
    saveCart();
    updateCartUI();
    showToast('Keranjang dikosongkan', 'info');
  }
}

/* ---------- UI UPDATES ---------- */
function renderProducts() {
  const container = document.getElementById('productsGrid');
  const empty = document.getElementById('emptyState');
  const q = (document.getElementById('searchInput').value || '').toLowerCase();

  let filtered = products;
  
  if (selectedCategory) {
    filtered = filtered.filter(p => p.category === selectedCategory);
  }
  
  filtered = filtered.filter(p => p.name.toLowerCase().includes(q));

  container.innerHTML = '';

  if (filtered.length === 0) {
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    filtered.forEach(product => {
      const inCart = cart.find(item => item.id === product.id);
      const isOutOfStock = product.stock <= 0;
      
      container.insertAdjacentHTML('beforeend', `
        <div class="product-card rounded-2xl overflow-hidden flex flex-col">
          <!-- Product Image/Icon -->
          <div class="h-48 bg-gradient-to-br ${getGradientClass(product.category)} flex items-center justify-center text-6xl relative">
            ${getProductIcon(product.category)}
            ${isOutOfStock ? '<span class="absolute top-3 right-3 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-full">HABIS</span>' : `<span class="absolute top-3 right-3 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-full">${product.stock} stok</span>`}
          </div>

          <!-- Product Info -->
          <div class="p-5 flex-1 flex flex-col">
            <div class="mb-3">
              <h3 class="font-bold text-slate-800 text-lg">${escapeHtml(product.name)}</h3>
              <p class="text-xs text-slate-500 font-medium mt-1">${escapeHtml(product.category)}</p>
            </div>

            <!-- Price -->
            <div class="mb-4 mt-auto">
              <p class="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">Rp ${product.price.toLocaleString('id-ID')}</p>
            </div>

            <!-- Add to Cart Button -->
            <button onclick="addToCart(${product.id})" 
              class="w-full px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all ${isOutOfStock ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-md hover:-translate-y-0.5 shadow-sm'}"
              ${isOutOfStock ? 'disabled' : ''}>
              ${inCart ? `✓ ${inCart.qty} ditambahkan` : '+ Tambah Keranjang'}
            </button>
          </div>
        </div>
      `);
    });
  }
}

function updateCartUI() {
  const cartItems = document.getElementById('cartItems');
  const cartEmpty = document.getElementById('cartEmpty');
  const cartBadge = document.getElementById('cartBadge');
  const subtotal = document.getElementById('subtotal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const clearCartBtn = document.getElementById('clearCartBtn');
  const checkoutSection = document.getElementById('checkoutSection');

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // Badge
  if (totalQty > 0) {
    cartBadge.textContent = totalQty;
    cartBadge.classList.remove('hidden');
  } else {
    cartBadge.classList.add('hidden');
  }

  // Subtotal
  subtotal.textContent = `Rp ${total.toLocaleString('id-ID')}`;

  // Cart items
  cartItems.innerHTML = '';
  if (cart.length === 0) {
    cartEmpty.classList.remove('hidden');
    checkoutBtn.classList.add('hidden');
    clearCartBtn.classList.add('hidden');
    checkoutSection.classList.add('hidden');
  } else {
    cartEmpty.classList.add('hidden');
    checkoutBtn.classList.remove('hidden');
    clearCartBtn.classList.remove('hidden');
    checkoutSection.classList.remove('hidden');

    cart.forEach(item => {
      cartItems.insertAdjacentHTML('beforeend', `
        <div class="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
          <div class="flex justify-between items-start gap-2 mb-3">
            <div class="flex-1">
              <p class="font-bold text-slate-800">${escapeHtml(item.name)}</p>
              <p class="text-xs text-slate-600 mt-1">Rp ${item.price.toLocaleString('id-ID')} / item</p>
            </div>
            <button onclick="removeFromCart(${item.id})" class="text-slate-400 hover:text-red-600 transition text-lg font-light">✕</button>
          </div>

          <!-- Quantity Control -->
          <div class="flex items-center gap-2 mb-3">
            <button onclick="updateCartQty(${item.id}, ${item.qty - 1})" class="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 text-sm font-semibold transition">−</button>
            <span class="flex-1 text-center font-bold text-slate-700 text-lg">${item.qty}</span>
            <button onclick="updateCartQty(${item.id}, ${item.qty + 1})" class="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 text-sm font-semibold transition" ${item.qty >= item.maxStock ? 'disabled' : ''}>+</button>
          </div>

          <!-- Subtotal -->
          <p class="text-right text-sm font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">Rp ${(item.price * item.qty).toLocaleString('id-ID')}</p>
        </div>
      `);
    });
  }
}

function checkout() {
  const buyerName = document.getElementById('buyerName').value.trim();
  
  if (!buyerName) {
    showToast('Masukkan nama Anda terlebih dahulu', 'error');
    document.getElementById('buyerName').focus();
    return;
  }

  if (cart.length === 0) {
    showToast('Keranjang kosong', 'error');
    return;
  }

  const buyerNote = document.getElementById('buyerNote').value.trim();
  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const order = {
    id: 'ORDER_' + Date.now(),
    buyerName,
    buyerNote,
    items: JSON.parse(JSON.stringify(cart)),
    total,
    timestamp: new Date().toLocaleString('id-ID'),
    status: 'pending'
  };

  saveOrder(order);
  cart = [];
  saveCart();
  document.getElementById('buyerName').value = '';
  document.getElementById('buyerNote').value = '';
  updateCartUI();
  closeCart();
  showToast('✅ Pesanan berhasil dibuat! ID: ' + order.id, 'success');
}

/* ---------- UI HELPERS ---------- */
function openCart() {
  document.getElementById('cartSidebar').classList.remove('hidden');
  document.getElementById('cartOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartSidebar').classList.add('hidden');
  document.getElementById('cartOverlay').classList.add('hidden');
  document.body.style.overflow = 'auto';
}

function getProductIcon(category) {
  const icons = {
    'Makanan': '🍜',
    'Minuman': '🥤',
    'Snack': '🍪',
    'Alat Tulis': '✏️'
  };
  return icons[category] || '📦';
}

function getGradientClass(category) {
  const gradients = {
    'Makanan': 'from-amber-100 to-orange-100',
    'Minuman': 'from-blue-100 to-cyan-100',
    'Snack': 'from-pink-100 to-rose-100',
    'Alat Tulis': 'from-purple-100 to-indigo-100'
  };
  return gradients[category] || 'from-slate-100 to-slate-200';
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  toast.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg text-white text-sm font-semibold shadow-lg ${bgColor} animate-pulse z-50`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ---------- STARTUP ---------- */
document.addEventListener('DOMContentLoaded', initCustomer);
