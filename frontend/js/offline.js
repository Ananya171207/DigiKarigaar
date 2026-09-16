// Handles saving products, orders, subsidy forms, and photos locally,
// and syncing all of them to the server once there's a connection.
// app.js calls addProduct() / acceptOrder() / submitSubsidyForm() /
// capturePhoto() -- everything else happens automatically.

const DB_NAME = 'artisan_offline_db';
const DB_VERSION = 2; // bumped: added orders, subsidy_forms, photos stores
const STORE_NAMES = ['products', 'orders', 'subsidy_forms', 'photos'];

// Opens (or creates/upgrades) the local database. Each store uses its
// own id field as the key -- product_id, order_id, form_id, photo_id.
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const keyPaths = {
        products: 'product_id',
        orders: 'order_id',
        subsidy_forms: 'form_id',
        photos: 'photo_id',
      };
      STORE_NAMES.forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: keyPaths[name] });
        }
      });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Saves (or updates) one record in the given store.
async function saveRecordLocally(storeName, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Returns every record currently saved in the given store.
async function getAllRecords(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const OFFLINE_API_BASE =
  "http://127.0.0.1:5000";

async function sendRecordToServer(
  storeName,
  record
) {
  if (!navigator.onLine) {
    throw new Error(
      "No network connection"
    );
  }

  if (storeName === "products") {
    const response =
      await fetch(
        `${OFFLINE_API_BASE}/api/products`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify(
            record
          )
        }
      );

    if (!response.ok) {
      throw new Error(
        `Product sync failed: ${response.status}`
      );
    }

    return response.json();
  }

  /*
   * Routes for photos, subsidy forms and
   * orders will be connected separately.
   */
  throw new Error(
    `Sync route not configured for ${storeName}`
  );
}

// Shared sync logic used by all four data types below.
async function trySyncRecord(
  storeName,
  record
) {
  try {
    await sendRecordToServer(
      storeName,
      record
    );

    record.status = "synced";

    await saveRecordLocally(
      storeName,
      record
    );

    return true;

  } catch (error) {
    record.status = "pending";

    await saveRecordLocally(
      storeName,
      record
    );

    console.warn(
      `${storeName} remains pending:`,
      error.message
    );

    return false;
  }
}

// --- Products ---
async function addProduct(product) {
  product.status = 'pending';
  await saveRecordLocally('products', product);
  await trySyncRecord('products', product);
}

// --- Orders ---
async function acceptOrder(order) {
  order.status = 'pending';
  await saveRecordLocally('orders', order);
  await trySyncRecord('orders', order);
}

// --- Subsidy forms ---
async function submitSubsidyForm(form) {
  form.status = 'pending';
  await saveRecordLocally('subsidy_forms', form);
  await trySyncRecord('subsidy_forms', form);
}

// --- Photos ---
// Blobs/Files can be stored directly in IndexedDB, so the raw photo
// itself is saved locally -- not just a filename or a broken link.
async function capturePhoto(file, productId) {
  const photo = {
    photo_id: crypto.randomUUID(),
    product_id: productId,
    blob: file,
    status: 'pending',
  };
  await saveRecordLocally('photos', photo);
  await trySyncRecord('photos', photo);
  return photo;
}

// Runs through every store and retries anything still marked pending.
async function syncAllPending() {
  for (const storeName of STORE_NAMES) {
    const records = await getAllRecords(storeName);
    const pending = records.filter((r) => r.status === 'pending');
    for (const record of pending) {
      await trySyncRecord(storeName, record);
    }
  }
}

// The moment the browser detects it's back online, retry everything.
window.addEventListener('online', syncAllPending);
