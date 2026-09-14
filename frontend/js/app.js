/**
 * app.js — the one file that ties every screen and every teammate's
 * module together. This is YOUR integration layer.
 */

// ---- Register the service worker so cached screens/assets work offline ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then((reg) => console.log("Service worker registered:", reg.scope))
      .catch((err) => console.error("Service worker registration failed:", err));
  });
}

// ---- Language list (grows to 100s later; UI just loops over this array) ----
const LANGUAGES = [
  { code: "hi-IN", short: "hi", label: "हिंदी", greeting: "नमस्ते" },
  { code: "en-IN", short: "en", label: "English", greeting: "Hello" },
  { code: "bn-IN", short: "bn", label: "বাংলা", greeting: "নমস্কার" },
  { code: "ta-IN", short: "ta", label: "தமிழ்", greeting: "வணக்கம்" },
];

// Questions match field_ids Person F's form schema / your Product object expect.
const PRODUCT_QUESTIONS = [
  { field_id: "material", prompt: "Yeh kis cheez se bana hai?" },
  { field_id: "category", prompt: "Yeh kis category mein aata hai?" },
  { field_id: "size", prompt: "Iska size ya lambai kitni hai?" },
];

// ---- Shared state: every screen reads/writes through this one object ----
const state = {
  screen: "lang",
  previewLangCode: null,
  language: null,          // full LANGUAGES entry once confirmed
  photoFile: null,
  photoPreviewUrl: null,
  enhancedImageUrl: null,
  answers: {},
  product: null,
  error: null,
};

// ---- Screen switching ----
const screenHistory = [];

function showScreen(name, options) {
  const opts = options || {};
  if (!opts.isBack && state.screen && state.screen !== name) {
    screenHistory.push(state.screen);
  }
  document.querySelectorAll(".screen").forEach((el) => {
    el.hidden = el.dataset.screen !== name;
  });
  const topbar = document.getElementById("topbar");
  topbar.hidden = name === "lang";
  document.getElementById("backBtn").hidden = name === "lang" || name === "home";
  state.screen = name;
}

const TOPBAR_DEFAULTS = {
  home: ["Digi-Karigar", "Aapka AI manager"],
  photo: ["Product ki photo", "Ek saaf photo lijiye"],
  enhance: ["Photo saaf kar diya", "Auto brightness & contrast"],
  qa: ["Thodi si jaankari", ""],
  listing: ["Aapki listing taiyaar hai", "Review karein"],
  inventory: ["Mera saaman", "Your products & orders"],
};

document.getElementById("backBtn").addEventListener("click", () => {
  const prev = screenHistory.pop() || "home";
  showScreen(prev, { isBack: true });
  const defaults = TOPBAR_DEFAULTS[prev];
  if (defaults) setTopbar(defaults[0], defaults[1]);
});

function setTopbar(title, sub) {
  document.getElementById("topbarTitle").textContent = title;
  document.getElementById("topbarSub").textContent = sub || "";
}

// isOnline() comes from offline.js (loaded before app.js in index.html)
function updateOnlineDot() {
  const dot = document.getElementById("onlineDot");
  dot.classList.toggle("offline", !isOnline());
}

// ==================== SCREEN: language ====================
function renderLanguageGrid() {
  const grid = document.getElementById("langGrid");
  grid.innerHTML = "";
  LANGUAGES.forEach((lang) => {
    const btn = document.createElement("button");
    btn.className = "lang-btn" + (state.previewLangCode === lang.code ? " previewing" : "");
    btn.textContent = lang.label;
    btn.onclick = () => onLanguageTap(lang);
    grid.appendChild(btn);
  });
}

function onLanguageTap(lang) {
  if (state.previewLangCode === lang.code) {
    state.language = lang;
    setTopbar("Digi-Karigar", "Aapka AI manager");
    updateOnlineDot();
    document.getElementById("homeGreeting").textContent = "Namaste! Aaj naya product jodna hai?";
    showScreen("home");
  } else {
    state.previewLangCode = lang.code;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(lang.greeting);
      utter.lang = lang.code;
      window.speechSynthesis.speak(utter);
    }
    renderLanguageGrid();
  }
}

// ==================== SCREEN: home ====================
document.getElementById("addProductBtn").addEventListener("click", () => {
  state.photoFile = null;
  state.photoPreviewUrl = null;
  state.enhancedImageUrl = null;
  state.answers = {};
  setTopbar("Product ki photo", "Ek saaf photo lijiye");
  document.getElementById("photoPreview").hidden = true;
  document.getElementById("photoPlaceholder").hidden = false;
  document.getElementById("enhanceBtn").disabled = true;
  showScreen("photo");
});

document.querySelectorAll("[data-nav]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.nav;
    if (target === "inventory") {
      renderInventory();
      setTopbar("Mera saaman", "Your products & orders");
    }
    if (target === "home") {
      setTopbar("Digi-Karigar", "Aapka AI manager");
    }
    showScreen(target);
  });
});

// ==================== SCREEN: photo ====================
document.getElementById("photoInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  state.photoFile = file;
  state.photoPreviewUrl = URL.createObjectURL(file);
  const img = document.getElementById("photoPreview");
  img.src = state.photoPreviewUrl;
  img.hidden = false;
  document.getElementById("photoPlaceholder").hidden = true;
  document.getElementById("enhanceBtn").disabled = false;
});

document.getElementById("enhanceBtn").addEventListener("click", async () => {
  setTopbar("Photo saaf kar raha hoon", "Ek second...");
  const result = await enhanceImage(state.photoFile);
  state.enhancedImageUrl = result.enhanced_image_url;
  document.getElementById("originalImg").src = state.photoPreviewUrl;
  document.getElementById("enhancedImg").src = state.enhancedImageUrl;
  setTopbar("Photo saaf kar diya", "Auto brightness & contrast");
  showScreen("enhance");
});

document.getElementById("skipPhotoBtn").addEventListener("click", () => {
  state.enhancedImageUrl = null;
  startQAFlow();
});

document.getElementById("continueToQABtn").addEventListener("click", startQAFlow);

// ==================== SCREEN: qa (hands off to Person C's module) ====================
function startQAFlow() {
  setTopbar("Thodi si jaankari", "");
  document.getElementById("qaStatus").textContent = "Tap to start talking to your AI manager";
  document.getElementById("qaLiveTranscript").textContent = "";
  document.getElementById("qaDots").innerHTML = PRODUCT_QUESTIONS
    .map(() => '<div class="dot"></div>')
    .join("");
  showScreen("qa");
}

document.getElementById("qaStartBtn").addEventListener("click", async () => {
  const langCode = state.language ? state.language.code : "hi-IN";
  document.getElementById("qaStatus").textContent = "Sun raha hoon...";

  try {
    const answers = await startVoiceFlow(langCode ? PRODUCT_QUESTIONS : PRODUCT_QUESTIONS, langCode, onQAProgress);
    state.answers = answers;
    await generateListing();
  } catch (err) {
    state.error = "Voice samajh nahi aaya. Type karke try karein.";
    document.getElementById("qaManualFallback").hidden = false;
  }
});

function onQAProgress(index, total, liveText) {
  const dots = document.querySelectorAll("#qaDots .dot");
  dots.forEach((d, i) => {
    d.classList.toggle("done", i < index);
    d.classList.toggle("active", i === index);
  });
  document.getElementById("qaStatus").textContent = PRODUCT_QUESTIONS[index]
    ? PRODUCT_QUESTIONS[index].prompt
    : "";
  document.getElementById("qaLiveTranscript").textContent = liveText || "";
}

document.getElementById("qaManualSubmitBtn").addEventListener("click", async () => {
  // Very simple fallback parser: expects "material: cotton, size: large"
  const raw = document.getElementById("qaManualInput").value;
  const answers = {};
  raw.split(",").forEach((pair) => {
    const [key, ...rest] = pair.split(":");
    if (key && rest.length) answers[key.trim()] = rest.join(":").trim();
  });
  state.answers = answers;
  await generateListing();
});

// ==================== Build the listing (description + price) ====================
async function generateListing() {
  setTopbar("Kaam ho raha hai", "Listing taiyaar kar raha hoon");
  showScreen("qa"); // keep qa screen visible with a "working" status while this runs
  document.getElementById("qaStatus").textContent = "Ek minute...";

  const { material, category, size } = state.answers;
  const priceResult = await predictPrice({ material, category, size });

  const description = buildDescriptionFromAnswers(state.answers);

  state.product = {
    product_id: crypto.randomUUID(),
    artisan_id: "demo-artisan", // TODO: replace with real logged-in artisan id
    title: buildTitleFromAnswers(state.answers),
    description,
    material: material || "",
    category: category || "",
    raw_image_url: state.photoPreviewUrl || "",
    enhanced_image_url: state.enhancedImageUrl || "",
    predicted_price: priceResult.predicted_price,
    language: state.language ? state.language.short : "hi",
    status: "draft",
    created_at: new Date().toISOString(),
  };
  state.priceRange = priceResult.price_range;

  renderListingScreen();
  showScreen("listing");
}

// NOTE: this is a simple template placeholder, not real AI-generated text.
// No teammate currently owns "description generation" in the contract —
// flag this gap to your team; either Person C's module extends to cover it,
// or someone adds a small NLP step here later.
function buildDescriptionFromAnswers(answers) {
  const parts = [];
  if (answers.material) parts.push(`Made from ${answers.material}`);
  if (answers.size) parts.push(`size ${answers.size}`);
  return parts.length ? parts.join(", ") + "." : "Handmade product.";
}

function buildTitleFromAnswers(answers) {
  return [answers.category, answers.material].filter(Boolean).join(" - ") || "Handmade product";
}

// ==================== SCREEN: listing ====================
function renderListingScreen() {
  const p = state.product;
  const img = document.getElementById("listingImg");
  if (p.enhanced_image_url) { img.src = p.enhanced_image_url; img.hidden = false; }
  document.getElementById("listingTitle").textContent = p.title;
  document.getElementById("listingDescription").textContent = p.description;
  const [low, high] = state.priceRange || [p.predicted_price, p.predicted_price];
  document.getElementById("listingPrice").textContent = `₹${low} – ₹${high}`;
  document.getElementById("listingError").hidden = true;
  setTopbar("Aapki listing taiyaar hai", "Review karein");
}

document.getElementById("descSpeakBtn").addEventListener("click", () => {
  speakText(state.product.description);
});
document.getElementById("priceSpeakBtn").addEventListener("click", () => {
  const [low, high] = state.priceRange || [];
  speakText(`Keemat: ${low} se ${high} rupaye.`);
});
function speakText(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = state.language ? state.language.code : "hi-IN";
  window.speechSynthesis.speak(utter);
}

document.getElementById("editAnswersBtn").addEventListener("click", startQAFlow);

// saveProduct() lives in api.js — it should call the backend when online
// and fall back to offline.js's local queue (e.g. addProduct/getAllRecords)
// when isOnline() is false, so this call site doesn't need to branch itself.
document.getElementById("confirmListingBtn").addEventListener("click", async () => {
  const saved = await saveProduct(state.product);
  state.product = saved;
  renderDoneScreen();
  showScreen("done");
});

// ==================== SCREEN: done ====================
function renderDoneScreen() {
  const online = isOnline();
  setTopbar(online ? "Ho gaya" : "Save ho gaya", "");
  document.getElementById("doneIcon").innerHTML = online
    ? '<div class="success-icon">&#10003;</div>'
    : '<div class="offline-icon">&#8987;</div>';
  document.getElementById("doneMessage").textContent = online
    ? "Live now on B2B buyers, ONDC, and connected marketplaces."
    : "Saved on your phone — will publish automatically when you're back online.";
}

document.getElementById("createAnotherBtn").addEventListener("click", () => {
  document.getElementById("addProductBtn").click();
});

// ==================== SCREEN: inventory ====================
// getProducts() (api.js) should merge synced + still-pending local records
// so a product added offline shows up here right away.
async function renderInventory() {
  const products = await getProducts();
  const grid = document.getElementById("inventoryGrid");
  grid.innerHTML = products
    .map((p) => {
      const pendingBadge = p.status && p.status !== "synced" ? '<span class="pending-badge">Pending</span>' : "";
      return `<div class="thumb">&#128247;<span>₹${p.predicted_price}</span>${pendingBadge}</div>`;
    })
    .join("") + '<button class="thumb" onclick="document.getElementById(\'addProductBtn\').click()">+</button>';
}

// ==================== Boot ====================
renderLanguageGrid();
showScreen("lang");
updateOnlineDot();
window.addEventListener("online", updateOnlineDot);
window.addEventListener("offline", updateOnlineDot);

// Once connectivity returns, give any offline-queued products a chance to
// sync and refresh the inventory view if it's currently open.
window.addEventListener("online", () => {
  setTimeout(() => {
    if (state.screen === "inventory") renderInventory();
  }, 800);
});