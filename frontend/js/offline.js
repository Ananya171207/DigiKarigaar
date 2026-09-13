// This file handles saving products locally and syncing them to the
// server once there's a connection. Nothing here talks to the real UI --
// app.js calls addProduct() and everything else happens automatically.

const DB_NAME = 'artisan_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'products';

// Opens (or creates, the first time) the local database.
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Runs only once, the very first time -- sets up the storage "table".
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'product_id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Saves (or updates, if the same product_id already exists) one product.
async function saveProductLocally(product) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(product);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Returns every product currently saved locally, regardless of status.
async function getAllProducts() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// TEMPORARY stand-in for the real backend call. Replace the inside of
// this function with a real fetch('/api/products', {...}) once the
// Flask backend exists -- nothing else in this file needs to change.
function fakeSendToServer(product) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (navigator.onLine) resolve();
      else reject(new Error('offline'));
    }, 600);
  });
}

// Call this from app.js whenever the artisan adds a product.
// It ALWAYS saves locally first, so nothing is ever lost even if the
// network call below fails.
async function addProduct(product) {
  product.status = 'pending';
  await saveProductLocally(product);
  await tryToSync(product);
}

// Attempts to send one product to the server. On success, marks it
// synced. On failure, leaves it pending -- it'll be retried automatically.
async function tryToSync(product) {
  try {
    await fakeSendToServer(product);
    product.status = 'synced';
    await saveProductLocally(product);
  } catch (err) {
    // stays 'pending' in IndexedDB -- syncAllPending() will retry it later
  }
}

// Runs through everything still marked pending and retries sending it.
// This is what "syncs" everything the moment connectivity returns.
async function syncAllPending() {
  const products = await getAllProducts();
  const pending = products.filter((p) => p.status === 'pending');
  for (const product of pending) {
    await tryToSync(product);
  }
}

// The moment the browser detects it's back online, retry everything.
window.addEventListener('online', syncAllPending);
