/* ============================================================
   Smart Kantin & Koperasi — Admin Dashboard
   Vanilla JS + localStorage
   ============================================================ */

const STORAGE_KEY         = 'sk_products';
const AUTH_KEY            = 'sk_auth';
const AUTH_ROLE_KEY       = 'sk_user_role';
const LEGACY_ADMIN_AUTH_KEY = 'sk_admin_auth';
const ADMIN_USER          = 'admin';
const ADMIN_PASS          = 'admin123';
const CUSTOMER_USER       = 'user';
const CUSTOMER_PASS       = 'user123';

function isAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === 'true' || localStorage.getItem(LEGACY_ADMIN_AUTH_KEY) === 'true';
}

function getAuthRole() {
  const role = localStorage.getItem(AUTH_ROLE_KEY);
  if (role) return role;
  if (localStorage.getItem(LEGACY_ADMIN_AUTH_KEY) === 'true') return 'admin';
  return null;
}

function signIn(role) {
  localStorage.setItem(AUTH_KEY, 'true');
  localStorage.setItem(AUTH_ROLE_KEY, role);
  localStorage.removeItem(LEGACY_ADMIN_AUTH_KEY);
}

/* ---------- LOGIN ---------- */
function initLogin() {
  if (isAuthenticated()) {
    const role = getAuthRole();
    if (role === 'user') {
      window.location.href = './customer.html';
    } else {
      window.location.href = './index.html';
    }
    return;
  }

  const form  = document.getElementById('loginForm');
  const err   = document.getElementById('loginError');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const role = document.getElementById('role').value;
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value.trim();

    if (role === 'admin' && u === ADMIN_USER && p === ADMIN_PASS) {
      signIn('admin');
      window.location.href = './index.html';
      return;
    }

    if (role === 'user' && u === CUSTOMER_USER && p === CUSTOMER_PASS) {
      signIn('user');
      window.location.href = './customer.html';
      return;
    }

    err.textContent = 'Peran, username, atau password salah.';
    err.classList.remove('hidden');
  });
}

/* ---------- DASHBOARD ---------- */
let products = [];
let orders = [];
let deleteTargetId = null;
const ORDERS_KEY = 'sk_customer_orders';

function initDashboard() {
  if (!isAuthenticated() || getAuthRole() !== 'admin') {
    window.location.href = './login.html';
    return;
  }

  products = loadProducts();
  renderTable();
  setupTabs();
  loadAndRenderOrders();

  document.getElementById('addBtn').addEventListener('click', () => openModal());
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_ROLE_KEY);
    localStorage.removeItem(LEGACY_ADMIN_AUTH_KEY);
    window.location.href = './login.html';
  });
  document.getElementById('productForm').addEventListener('submit', saveProduct);
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
  document.getElementById('searchInput').addEventListener('input', renderTable);

  // Auto refresh orders setiap 5 detik
  setInterval(loadAndRenderOrders, 5000);
}

/* ---------- TAB MANAGEMENT ---------- */
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.closest('.tab-btn').dataset.tab;
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  // Hide all sections
  document.getElementById('productsSection').classList.add('hidden');
  document.getElementById('ordersSection').classList.add('hidden');

  // Remove active state from all tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-gradient-to-r', 'from-emerald-500', 'to-emerald-600', 'text-white', 'shadow-md');
    btn.classList.add('bg-white', 'text-slate-700', 'border', 'border-slate-200', 'hover:bg-slate-100');
  });

  // Show selected section and mark tab as active
  if (tabName === 'products') {
    document.getElementById('productsSection').classList.remove('hidden');
    document.getElementById('tabProducts').classList.add('active', 'bg-gradient-to-r', 'from-emerald-500', 'to-emerald-600', 'text-white', 'shadow-md');
    document.getElementById('tabProducts').classList.remove('bg-white', 'text-slate-700', 'border', 'border-slate-200', 'hover:bg-slate-100');
  } else if (tabName === 'orders') {
    document.getElementById('ordersSection').classList.remove('hidden');
    document.getElementById('tabOrders').classList.add('active', 'bg-gradient-to-r', 'from-emerald-500', 'to-emerald-600', 'text-white', 'shadow-md');
    document.getElementById('tabOrders').classList.remove('bg-white', 'text-slate-700', 'border', 'border-slate-200', 'hover:bg-slate-100');
  }
}

/* ---------- DATA LAYER ---------- */
function loadProducts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  const seed = [
    { id: 1, name: 'Nasi Goreng',    category: 'Makanan',   price: 10000, stock: 15 },
    { id: 2, name: 'Es Teh Manis',   category: 'Minuman',   price: 3000,  stock: 30 },
    { id: 3, name: 'Roti Coklat',    category: 'Snack',     price: 5000,  stock: 0  },
    { id: 4, name: 'Pulpen Standar', category: 'Alat Tulis', price: 2500, stock: 50 },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

/* ---------- LOGIKA STATUS STOK ---------- */
function getStatus(stock) {
  if (stock <= 0)  return { label: 'Stok Habis',   cls: 'badge-empty' };
  if (stock <= 5)  return { label: 'Hampir Habis', cls: 'badge-low'   };
  return { label: 'Tersedia', cls: 'badge-ready' };
}

/* ---------- RENDER ---------- */
function renderTable() {
  const tbody = document.getElementById('productTable');
  const empty = document.getElementById('emptyState');
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();

  const list = products.filter(p => p.name.toLowerCase().includes(q));

  tbody.innerHTML = '';
  if (list.length === 0) {
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    list.forEach(p => {
      const st = getStatus(p.stock);
      tbody.insertAdjacentHTML('beforeend', `
        <tr class="hover:bg-slate-50">
          <td class="px-5 py-3 font-medium text-slate-800">${escapeHtml(p.name)}</td>
          <td class="px-5 py-3 text-slate-600">${escapeHtml(p.category)}</td>
          <td class="px-5 py-3 text-right text-slate-700">Rp ${Number(p.price).toLocaleString('id-ID')}</td>
          <td class="px-5 py-3 text-center font-semibold ${p.stock <= 0 ? 'text-red-500' : 'text-slate-700'}">${p.stock}</td>
          <td class="px-5 py-3 text-center"><span class="badge ${st.cls}">${st.label}</span></td>
          <td class="px-5 py-3 text-center whitespace-nowrap">
            <button class="btn-icon btn-edit"   onclick="openModal(${p.id})">Edit</button>
            <button class="btn-icon btn-delete" onclick="askDelete(${p.id})">Hapus</button>
          </td>
        </tr>
      `);
    });
  }

  document.getElementById('statTotal').textContent = products.length;
  document.getElementById('statReady').textContent = products.filter(p => p.stock > 0).length;
  document.getElementById('statEmpty').textContent = products.filter(p => p.stock <= 0).length;
}

/* ---------- MODAL CREATE / UPDATE ---------- */
function openModal(id = null) {
  const modal = document.getElementById('productModal');
  const title = document.getElementById('modalTitle');
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';

  if (id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    title.textContent = 'Edit Produk';
    document.getElementById('productId').value = p.id;
    document.getElementById('name').value     = p.name;
    document.getElementById('category').value = p.category;
    document.getElementById('price').value    = p.price;
    document.getElementById('stock').value    = p.stock;
  } else {
    title.textContent = 'Tambah Produk';
  }
  modal.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('productModal').classList.add('hidden');
}

function saveProduct(e) {
  e.preventDefault();
  const id    = document.getElementById('productId').value;
  const data  = {
    name:     document.getElementById('name').value.trim(),
    category: document.getElementById('category').value,
    price:    parseInt(document.getElementById('price').value, 10),
    stock:    parseInt(document.getElementById('stock').value, 10),
  };

  if (id) {
    products = products.map(p => p.id === Number(id) ? { ...p, ...data } : p);
    showToast('Produk berhasil diperbarui');
  } else {
    const newId = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
    products.push({ id: newId, ...data });
    showToast('Produk berhasil ditambahkan');
  }
  saveProducts();
  renderTable();
  closeModal();
}

/* ---------- DELETE ---------- */
function askDelete(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  deleteTargetId = id;
  document.getElementById('deleteName').textContent = p.name;
  document.getElementById('confirmModal').classList.remove('hidden');
}

function closeConfirm() {
  deleteTargetId = null;
  document.getElementById('confirmModal').classList.add('hidden');
}

function confirmDelete() {
  if (deleteTargetId == null) return;
  products = products.filter(p => p.id !== deleteTargetId);
  saveProducts();
  renderTable();
  closeConfirm();
  showToast('Produk berhasil dihapus');
}

/* ---------- UTIL ---------- */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(window.__toastT);
  window.__toastT = setTimeout(() => t.classList.add('hidden'), 2200);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[s]));
}

/* ---------- ORDERS MANAGEMENT ---------- */
function loadAndRenderOrders() {
  const raw = localStorage.getItem(ORDERS_KEY);
  orders = raw ? JSON.parse(raw) : [];
  renderOrders();
  updateOrderBadge();
}

function updateOrderBadge() {
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const badge = document.getElementById('orderBadge');
  if (pendingOrders > 0) {
    badge.textContent = pendingOrders;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function renderOrders() {
  const container = document.getElementById('ordersContainer');
  const empty = document.getElementById('ordersEmpty');

  container.innerHTML = '';

  if (orders.length === 0) {
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    orders.forEach(order => {
      const statusColor = order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
      const statusLabel = order.status === 'completed' ? '✓ Selesai' : '⏳ Menunggu';
      const itemsHtml = order.items.map(item => `
        <div class="flex justify-between text-sm text-slate-600 py-1.5 border-b border-slate-100 last:border-0">
          <span class="font-medium">${escapeHtml(item.name)} × ${item.qty}</span>
          <span class="font-semibold">Rp ${(item.price * item.qty).toLocaleString('id-ID')}</span>
        </div>
      `).join('');

      container.insertAdjacentHTML('beforeend', `
        <div class="p-6 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-transparent transition">
          <div class="flex justify-between items-start gap-4 mb-4">
            <div>
              <p class="font-bold text-slate-800 text-lg">${escapeHtml(order.buyerName)}</p>
              <p class="text-xs text-slate-500 font-mono mt-1">${order.id}</p>
              <p class="text-xs text-slate-500 mt-1">📅 ${order.timestamp}</p>
            </div>
            <span class="px-4 py-2 rounded-full text-xs font-bold ${statusColor}">${statusLabel}</span>
          </div>

          <!-- Items -->
          <div class="bg-slate-50 rounded-xl p-4 mb-4 text-sm border border-slate-200">
            ${itemsHtml}
            <div class="flex justify-between font-bold text-slate-800 pt-3 border-t border-slate-200 mt-3">
              <span>💰 Total:</span>
              <span class="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">Rp ${order.total.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <!-- Note -->
          ${order.buyerNote ? `<p class="text-sm text-slate-600 mb-4 italic px-4 py-3 bg-blue-50 rounded-lg border border-blue-200">💬 "${escapeHtml(order.buyerNote)}"</p>` : ''}

          <!-- Actions -->
          <div class="flex gap-2">
            <button onclick="updateOrderStatus('${order.id}', '${order.status === 'pending' ? 'completed' : 'pending'}')" class="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${order.status === 'pending' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}">
              ${order.status === 'pending' ? '✓ Tandai Selesai' : '↩ Kembalikan'}
            </button>
            <button onclick="deleteOrder('${order.id}')" class="px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-100 hover:bg-red-200 text-red-700 transition-all">🗑 Hapus</button>
          </div>
        </div>
      `);
    });
  }
}

function updateOrderStatus(orderId, newStatus) {
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = newStatus;
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    loadAndRenderOrders();
    showToast(`Pesanan ${newStatus === 'completed' ? 'ditandai selesai' : 'dikembalikan ke menunggu'}`);
  }
}

function deleteOrder(orderId) {
  if (confirm('Hapus pesanan ini?')) {
    orders = orders.filter(o => o.id !== orderId);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    loadAndRenderOrders();
    showToast('Pesanan berhasil dihapus');
  }
}
