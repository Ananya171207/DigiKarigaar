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
const FAKE_MODE = false;

const API_BASE = "http://127.0.0.1:5000";

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

/** Small helper so every real call fails loudly and predictably instead of
 * crashing on res.json() when the server returns a non-JSON error page
 * (which is exactly what produced your "Unexpected end of JSON input"). */
async function parseJsonOrThrow(res, label) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${label} failed: ${res.status} ${text}`);
  }
  return res.json();
}

/** Person D's contract: POST /api/enhance-image → { enhanced_image_url } */
async function enhanceImage(imageFile) {
  const formData = new FormData();

  formData.append("image", imageFile);

  const res = await smartFetch(
    `${API_BASE}/api/enhance-image`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    const text = await res.text();

    throw new Error(
      `Image enhancement failed: ${res.status} ${text}`
    );
  }

  const data = await res.json();

  // Flask returns /uploads/filename.jpg
  // Convert it to the backend URL
  if (
    data.enhanced_image_url &&
    data.enhanced_image_url.startsWith("/")
  ) {
    data.enhanced_image_url =
      `${API_BASE}${data.enhanced_image_url}`;
  }

  return data;
}

/** Person E's contract: POST /api/predict-price → { predicted_price, price_range } */
async function predictPrice({ material, category, size }) {
  if (FAKE_MODE) {
    await fakeDelay(700);
    return { predicted_price: 650, price_range: [550, 750] };
  }
  const res = await smartFetch(`${API_BASE}/api/predict-price`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ material, category, size }),
  });
  return parseJsonOrThrow(res, "Price prediction");
}

/** Saves a product listing (draft, or final). Matches the Product object contract. */
async function saveProduct(product) {
  if (FAKE_MODE) {
    await fakeDelay(500);
    return { ...product, status: isOnline() ? "listed" : "draft" };
  }
  const res = await smartFetch(`${API_BASE}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  return parseJsonOrThrow(res, "Save product");
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
  const res = await smartFetch(`${API_BASE}/api/products`, { method: "GET" });
  return parseJsonOrThrow(res, "Load products");
}

async function getSubsidySchemes() {
  const res = await smartFetch(`${API_BASE}/api/subsidy-schemes`);
  return parseJsonOrThrow(res, "Load subsidy schemes");
}

async function getKarigarFormSchema() {
  const res = await smartFetch(`${API_BASE}/api/karigar-form-schema`);
  return parseJsonOrThrow(res, "Load form schema");
}

/** Single definition — the file previously defined this twice; the second
 * copy silently won and dropped both API_BASE and error handling. */
async function submitSubsidyApplication(applicationData) {
  const res = await smartFetch(`${API_BASE}/api/subsidy-application`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(applicationData),
  });
  return parseJsonOrThrow(res, "Submit subsidy application");
}

async function getB2BChannels() {
  const res = await smartFetch(`${API_BASE}/api/b2b-channels`);
  return parseJsonOrThrow(res, "Load B2B channels");
}

async function getMarketplaceListingSchema() {
  const res = await smartFetch(`${API_BASE}/api/marketplace-listing-schema`, {
    method: "GET",
  });
  return parseJsonOrThrow(res, "Load marketplace listing schema");
}

async function getMarketplaceRegistrationSchema() {
  const res = await smartFetch(`${API_BASE}/api/marketplace-registration-schema`, {
    method: "GET",
  });
  return parseJsonOrThrow(res, "Load marketplace registration schema");
}

async function submitB2BListing(listingData) {
  const res = await smartFetch(`${API_BASE}/api/b2b-listing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(listingData),
  });
  return parseJsonOrThrow(res, "Submit B2B listing");
}

async function submitMarketplaceRegistration(registrationData) {
  const res = await smartFetch(`${API_BASE}/api/marketplace-registration`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(registrationData),
  });
  return parseJsonOrThrow(res, "Submit marketplace registration");
}
