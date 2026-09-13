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

// --- Step 2: the test form for adding products ---

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const product = {
    // Generated on-device so it works with zero connection, and so
    // retrying never creates a duplicate on the server later.
    product_id: crypto.randomUUID(),
    title: document.getElementById('title').value,
    material: document.getElementById('material').value,
  };

  await addProduct(product);   // from offline.js
  renderProducts();
  e.target.reset();
});

// Redraws the product list from whatever is currently in IndexedDB.
async function renderProducts() {
  const list = document.getElementById('product-list');
  const products = await getAllProducts();  // from offline.js
  list.innerHTML = '';
  products.forEach((p) => {
    const li = document.createElement('li');
    const badge = p.status === 'synced' ? 'Synced' : 'Pending (will sync)';
    li.textContent = `${p.title} (${p.material}) \u2014 ${badge}`;
    li.className = p.status;
    list.appendChild(li);
  });
}

// Re-check the list a moment after coming back online, so synced
// statuses show up once syncAllPending() (in offline.js) finishes.
window.addEventListener('online', () => setTimeout(renderProducts, 800));

renderProducts(); // show anything saved from a previous session on load
