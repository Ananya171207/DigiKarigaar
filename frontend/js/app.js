// Step 1 code (unchanged) -- registers the service worker.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('Service worker registered:', reg.scope))
      .catch((err) => console.error('Service worker registration failed:', err));
  });
}

function updateStatus() {
  const statusEl = document.getElementById('status');
  statusEl.textContent = navigator.onLine ? 'Online' : 'Offline (using cached files)';
}
window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);
updateStatus();

// Small helper so every list renders status the same way.
function statusLabel(status) {
  return status === 'synced' ? 'Synced' : 'Pending (will sync)';
}

// --- Products ---

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const product = {
    product_id: crypto.randomUUID(),
    title: document.getElementById('title').value,
    material: document.getElementById('material').value,
  };
  await addProduct(product);
  renderProducts();
  e.target.reset();
});

async function renderProducts() {
  const list = document.getElementById('product-list');
  const products = await getAllRecords('products');
  list.innerHTML = '';
  products.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = `${p.title} (${p.material}) \u2014 ${statusLabel(p.status)}`;
    li.className = p.status;
    list.appendChild(li);
  });
}

// --- Orders ---

document.getElementById('accept-order-btn').addEventListener('click', async () => {
  const order = {
    order_id: crypto.randomUUID(),
    buyer_name: 'Test buyer',
    product_id: 'demo-product',
  };
  await acceptOrder(order);
  renderOrders();
});

async function renderOrders() {
  const list = document.getElementById('order-list');
  const orders = await getAllRecords('orders');
  list.innerHTML = '';
  orders.forEach((o) => {
    const li = document.createElement('li');
    li.textContent = `Order from ${o.buyer_name} \u2014 ${statusLabel(o.status)}`;
    li.className = o.status;
    list.appendChild(li);
  });
}

// --- Subsidy forms ---

document.getElementById('submit-form-btn').addEventListener('click', async () => {
  const form = {
    form_id: crypto.randomUUID(),
    scheme_name: 'Test scheme',
  };
  await submitSubsidyForm(form);
  renderForms();
});

async function renderForms() {
  const list = document.getElementById('form-list');
  const forms = await getAllRecords('subsidy_forms');
  list.innerHTML = '';
  forms.forEach((f) => {
    const li = document.createElement('li');
    li.textContent = `${f.scheme_name} \u2014 ${statusLabel(f.status)}`;
    li.className = f.status;
    list.appendChild(li);
  });
}

// --- Photos ---

document.getElementById('photo-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await capturePhoto(file, 'demo-product');
  renderPhotos();
  e.target.value = '';
});

async function renderPhotos() {
  const list = document.getElementById('photo-list');
  const photos = await getAllRecords('photos');
  list.innerHTML = '';
  photos.forEach((p) => {
    const li = document.createElement('li');
    li.className = p.status;
    const img = document.createElement('img');
    img.src = URL.createObjectURL(p.blob);
    img.style.width = '48px';
    img.style.verticalAlign = 'middle';
    img.style.marginRight = '8px';
    img.style.borderRadius = '4px';
    li.appendChild(img);
    li.appendChild(document.createTextNode(statusLabel(p.status)));
    list.appendChild(li);
  });
}

// Re-check every list a moment after coming back online.
window.addEventListener('online', () => setTimeout(() => {
  renderProducts();
  renderOrders();
  renderForms();
  renderPhotos();
}, 800));

// Show anything saved from a previous session on load.
renderProducts();
renderOrders();
renderForms();
renderPhotos();
