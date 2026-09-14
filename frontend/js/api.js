/**
 * api.js — every call to the backend goes through here, and nowhere else.
 * This means: when Person D/E's real Flask routes land, or when your
 * partner's offline.js is ready, you change code in ONE place, not
 * scattered across every screen.
 *
 * FAKE_MODE: flip to false once real backend routes exist.
 * While true, every function below returns realistic fake data instead
 * of actually calling the network, so you can build/test the whole
 * frontend without anyone else's code being ready.
 */
const FAKE_MODE = true;

// Your partner is building offline.js with smartFetch()/isOnline().
// Until that file exists in the repo, fall back to plain fetch/navigator
// so this file doesn't crash — delete this fallback once offline.js lands.
function smartFetch(url, options) {
  if (window.OfflineQueue && typeof window.OfflineQueue.smartFetch === "function") {
    return window.OfflineQueue.smartFetch(url, options);
  }
  return fetch(url, options);
}

function isOnline() {
  if (window.OfflineQueue && typeof window.OfflineQueue.isOnline === "function") {
    return window.OfflineQueue.isOnline();
  }
  return navigator.onLine;
}

function fakeDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Person D's contract: POST /api/enhance-image → { enhanced_image_url } */
async function enhanceImage(imageFile) {
  if (FAKE_MODE) {
    await fakeDelay(900);
    // In fake mode we just reuse the original photo as a stand-in "enhanced" version.
    return { enhanced_image_url: URL.createObjectURL(imageFile) };
  }
  const formData = new FormData();
  formData.append("image", imageFile);
  const res = await smartFetch("/api/enhance-image", { method: "POST", body: formData });
  return res.json();
}

/** Person E's contract: POST /api/predict-price → { predicted_price, price_range } */
async function predictPrice({ material, category, size }) {
  if (FAKE_MODE) {
    await fakeDelay(700);
    return { predicted_price: 650, price_range: [550, 750] };
  }
  const res = await smartFetch("/api/predict-price", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ material, category, size }),
  });
  return res.json();
}

/** Saves a product listing (draft, or final). Matches the Product object contract. */
async function saveProduct(product) {
  if (FAKE_MODE) {
    await fakeDelay(500);
    return { ...product, status: isOnline() ? "listed" : "draft" };
  }
  const res = await smartFetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  return res.json();
}

/** Fetches saved products for the inventory screen. */
async function getProducts() {
  if (FAKE_MODE) {
    await fakeDelay(300);
    return [
      { product_id: "demo-1", title: "Handwoven cotton stole", predicted_price: 650, enhanced_image_url: "" },
      { product_id: "demo-2", title: "Clay diya set", predicted_price: 420, enhanced_image_url: "" },
    ];
  }
  const res = await smartFetch("/api/products", { method: "GET" });
  return res.json();
}
