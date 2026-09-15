/**
 * app.js
 * Main UI integration layer.
 *
 * Existing:
 * - language
 * - photo
 * - image enhancement
 * - product voice Q&A
 * - listing
 * - inventory
 *
 * Added:
 * - subsidy scheme selection
 * - visible PM Vishwakarma form
 * - regional-language labels
 * - voice-assisted field filling
 * - retake photo (enhance screen)
 * - profile screen
 */


// ==========================================================
// SERVICE WORKER
// ==========================================================

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then((reg) =>
        console.log("Service worker registered:", reg.scope)
      )
      .catch((err) =>
        console.error("Service worker registration failed:", err)
      );
  });
}


// ==========================================================
// LANGUAGES
// ==========================================================

const LANGUAGES = [
  {
    code: "hi-IN",
    short: "hi",
    label: "हिंदी",
    greeting: "नमस्ते"
  },
  {
    code: "en-IN",
    short: "en",
    label: "English",
    greeting: "Hello"
  },
  {
    code: "bn-IN",
    short: "bn",
    label: "বাংলা",
    greeting: "নমস্কার"
  },
  {
    code: "ta-IN",
    short: "ta",
    label: "தமிழ்",
    greeting: "வணக்கம்"
  },
];


// ==========================================================
// PRODUCT QUESTIONS
// ==========================================================

const PRODUCT_QUESTIONS = [
  {
    field_id: "material",
    prompt: "What material is this made from?",
    prompt_hi: "यह किस सामग्री से बना है?",
    prompt_bn: "এটি কোন উপাদান দিয়ে তৈরি?",
    prompt_ta: "இது எந்தப் பொருளால் செய்யப்பட்டது?"
  },
  {
    field_id: "category",
    prompt: "Which category does this product belong to?",
    prompt_hi: "यह उत्पाद किस श्रेणी में आता है?",
    prompt_bn: "এই পণ্যটি কোন বিভাগে পড়ে?",
    prompt_ta: "இந்தத் தயாரிப்பு எந்த வகையைச் சேர்ந்தது?"
  },
  {
    field_id: "size",
    prompt: "What is its size or length?",
    prompt_hi: "इसका आकार या लंबाई कितनी है?",
    prompt_bn: "এর আকার বা দৈর্ঘ্য কত?",
    prompt_ta: "இதன் அளவு அல்லது நீளம் என்ன?"
  }
];

function localizedProductQuestions() {
  const language = currentLanguage();

  return PRODUCT_QUESTIONS.map((question) => ({
    ...question,
    prompt:
      question[`prompt_${language}`] ||
      question.prompt
  }));
}

// ==========================================================
// SHARED STATE
// ==========================================================

const state = {

  screen: "lang",

  previewLangCode: null,

  language: null,

  photoFile: null,
  photoPreviewUrl: null,
  enhancedImageUrl: null,

  answers: {},

  product: null,

  error: null,

  priceRange: null,


  // ==============================
  // SUBSIDY STATE
  // ==============================

  subsidySchemes: null,

  selectedSubsidyScheme: null,

  subsidyFormSchema: null,

  subsidyAnswers: {},

  subsidySectionIndex: 0,

  subsidyVoiceFieldIndex: 0,

  subsidyVisibleFields: [],

  subsidyResult: null,
};


// ==========================================================
// SCREEN NAVIGATION
// ==========================================================

const screenHistory = [];


function showScreen(name, options) {

  const opts = options || {};

  if (
    !opts.isBack &&
    state.screen &&
    state.screen !== name
  ) {
    screenHistory.push(state.screen);
  }


  document.querySelectorAll(".screen").forEach((el) => {

    el.hidden =
      el.dataset.screen !== name;

  });


  const topbar =
    document.getElementById("topbar");

  topbar.hidden =
    name === "lang";


  document.getElementById("backBtn").hidden =
    name === "lang" ||
    name === "home";

  const globalNav =
    document.getElementById("globalNav");

  if (globalNav) {
    globalNav.hidden = name === "lang";

    globalNav
      .querySelectorAll("[data-nav]")
      .forEach((navButton) => {
        navButton.classList.toggle(
          "active",
          navButton.dataset.nav === name
        );
      });
  }

  if (name === "profile") {
    syncProfileLanguageDropdown();
  }

  state.screen = name;
}


// ==========================================================
// TOP BAR
// ==========================================================

const TOPBAR_DEFAULTS = {

  home: [
    "Digi-Karigar",
    "Aapka AI manager"
  ],

  photo: [
    "Product ki photo",
    "Ek saaf photo lijiye"
  ],

  enhance: [
    "Photo saaf kar diya",
    "Auto brightness & contrast"
  ],

  qa: [
    "Thodi si jaankari",
    ""
  ],

  listing: [
    "Aapki listing taiyaar hai",
    "Review karein"
  ],

  inventory: [
    "Mera saaman",
    "Your products & orders"
  ],

  subsidy: [
    "Government Schemes",
    "Artisan support"
  ],

  subsidyForm: [
    "PM Vishwakarma",
    "Guided application"
  ],

  profile: [
    "Aapki profile",
    "Account & settings"
  ],
};


document
  .getElementById("backBtn")
  .addEventListener("click", () => {

    const prev =
      screenHistory.pop() || "home";

    showScreen(
      prev,
      { isBack: true }
    );


    const defaults =
      TOPBAR_DEFAULTS[prev];

    if (defaults) {

      setTopbar(
        defaults[0],
        defaults[1]
      );

    }

  });


function setTopbar(title, sub) {

  document
    .getElementById("topbarTitle")
    .textContent = title;

  document
    .getElementById("topbarSub")
    .textContent = sub || "";

}


// ==========================================================
// CONNECTIVITY
// ==========================================================

function updateOnlineDot() {

  const dot =
    document.getElementById("onlineDot");

  dot.classList.toggle(
    "offline",
    !isOnline()
  );

}


// ==========================================================
// LOCALIZATION HELPERS
// ==========================================================

function currentLanguage() {

  return state.language
    ? state.language.short
    : "en";

}


function isHindi() {

  return currentLanguage() === "hi";

}


function localText(
  object,
  normalKey,
  hindiKey
) {

  if (!object) return "";

  const language = currentLanguage();

  const languageKeys = {
    en: normalKey,
    hi: hindiKey || `${normalKey}_hi`,
    bn: `${normalKey}_bn`,
    ta: `${normalKey}_ta`
  };

  const selectedKey =
    languageKeys[language] || normalKey;

  return (
    object[selectedKey] ||
    object[normalKey] ||
    ""
  );

}


function localizedList(object, normalKey) {

  if (!object) return [];

  const language = currentLanguage();
  const selectedKey =
    language === "en"
      ? normalKey
      : `${normalKey}_${language}`;

  return object[selectedKey] || object[normalKey] || [];

}


function uiText(english, hindi, bengali, tamil) {

  const values = {
    en: english,
    hi: hindi,
    bn: bengali,
    ta: tamil
  };

  return values[currentLanguage()] || english;

}

function setLanguageElement(
  id,
  english,
  hindi,
  bengali,
  tamil
) {
  const element =
    document.getElementById(id);

  if (!element) return;

  element.textContent =
    uiText(
      english,
      hindi,
      bengali,
      tamil
    );
}


function syncProfileLanguageDropdown() {
  const dropdown =
    document.getElementById(
      "profileLanguageSelect"
    );

  if (dropdown && state.language) {
    dropdown.value =
      state.language.code;
  }
}


function applyAppLanguage() {
  document.documentElement.lang =
    currentLanguage();

  setLanguageElement(
    "homeGreeting",
    "Namaste! What would you like to do today?",
    "नमस्ते! आज आप क्या करना चाहते हैं?",
    "নমস্কার! আজ আপনি কী করতে চান?",
    "வணக்கம்! இன்று நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்?"
  );

  setLanguageElement(
    "homeNavLabel",
    "Home",
    "होम",
    "হোম",
    "முகப்பு"
  );

  setLanguageElement(
    "profileNavLabel",
    "Profile",
    "प्रोफ़ाइल",
    "প্রোফাইল",
    "சுயவிவரம்"
  );

  setLanguageElement(
    "profileLanguageLabel",
    "Language",
    "भाषा",
    "ভাষা",
    "மொழி"
  );

  setLanguageElement(
    "profilePhoneLabel",
    "Phone number",
    "फ़ोन नंबर",
    "ফোন নম্বর",
    "தொலைபேசி எண்"
  );

  setLanguageElement(
    "profilePayoutLabel",
    "Bank / payout details",
    "बैंक / भुगतान विवरण",
    "ব্যাংক / পেমেন্টের বিবরণ",
    "வங்கி / பணப்பரிவர்த்தனை விவரங்கள்"
  );

  setLanguageElement(
    "profileSub",
    "Digi-Karigar member",
    "Digi-Karigar सदस्य",
    "Digi-Karigar সদস্য",
    "Digi-Karigar உறுப்பினர்"
  );

  setLanguageElement(
    "logoutBtn",
    "Log out",
    "लॉग आउट",
    "লগ আউট",
    "வெளியேறு"
  );

  setLanguageElement(
    "photoPlaceholder",
    "Tap to take or choose a photo",
    "फोटो लेने या चुनने के लिए टैप करें",
    "ছবি তুলতে বা বেছে নিতে ট্যাপ করুন",
    "புகைப்படம் எடுக்க அல்லது தேர்வு செய்யத் தட்டவும்"
  );

  setLanguageElement(
    "enhanceBtn",
    "Enhance & continue",
    "फोटो सुधारें और आगे बढ़ें",
    "ছবি উন্নত করে এগিয়ে যান",
    "படத்தை மேம்படுத்தித் தொடரவும்"
  );

  setLanguageElement(
    "skipPhotoBtn",
    "Skip for this demo",
    "इस डेमो के लिए छोड़ें",
    "এই ডেমোর জন্য এড়িয়ে যান",
    "இந்த டெமோவில் தவிர்க்கவும்"
  );

  setLanguageElement(
    "retakePhotoBtn",
    "Retake photo",
    "फोटो दोबारा लें",
    "আবার ছবি তুলুন",
    "மீண்டும் படம் எடுக்கவும்"
  );

  setLanguageElement(
    "continueToQABtn",
    "Continue",
    "आगे बढ़ें",
    "এগিয়ে যান",
    "தொடரவும்"
  );

  setLanguageElement(
    "qaStatus",
    "Tap to start talking to your AI manager",
    "अपने AI मैनेजर से बात करने के लिए टैप करें",
    "আপনার AI ম্যানেজারের সঙ্গে কথা বলতে ট্যাপ করুন",
    "உங்கள் AI மேலாளருடன் பேசத் தட்டவும்"
  );

  setLanguageElement(
    "confirmListingBtn",
    "Yes, list it",
    "हाँ, इसे लिस्ट करें",
    "হ্যাঁ, তালিকাভুক্ত করুন",
    "ஆம், பட்டியலிடவும்"
  );

  setLanguageElement(
    "editAnswersBtn",
    "Change my answers",
    "मेरे उत्तर बदलें",
    "আমার উত্তর পরিবর্তন করুন",
    "என் பதில்களை மாற்றவும்"
  );

  setLanguageElement(
    "applySubsidyBtn",
    "Check Government Subsidy",
    "सरकारी सब्सिडी देखें",
    "সরকারি ভর্তুকি দেখুন",
    "அரசு மானியத்தைப் பார்க்கவும்"
  );

  setLanguageElement(
    "listOnMarketplaceBtn",
    "List on Marketplace",
    "मार्केटप्लेस पर लिस्ट करें",
    "মার্কেটপ্লেসে তালিকাভুক্ত করুন",
    "சந்தையில் பட்டியலிடவும்"
  );

  setLanguageElement(
    "startSubsidyFormBtn",
    "Start Application",
    "आवेदन शुरू करें",
    "আবেদন শুরু করুন",
    "விண்ணப்பத்தைத் தொடங்கவும்"
  );

  setLanguageElement(
    "subsidyVoicePrompt",
    "Tap the microphone and answer",
    "माइक्रोफ़ोन टैप करके उत्तर दें",
    "মাইক্রোফোনে ট্যাপ করে উত্তর দিন",
    "மைக்ரோஃபோனைத் தட்டி பதிலளிக்கவும்"
  );

  setLanguageElement(
    "subsidyNextBtn",
    "Next",
    "अगला",
    "পরবর্তী",
    "அடுத்து"
  );

  setLanguageElement(
    "createAnotherBtn",
    "Create another listing",
    "एक और लिस्टिंग बनाएँ",
    "আরেকটি লিস্টিং তৈরি করুন",
    "மற்றொரு பட்டியலை உருவாக்கவும்"
  );

  const homeCardTranslations = {
    home_subsidy: {
      en: "Government Subsidy",
      hi: "सरकारी सब्सिडी",
      bn: "সরকারি ভর্তুকি",
      ta: "அரசு மானியம்"
    },

    home_marketplace: {
      en: "Sell on Marketplace",
      hi: "मार्केटप्लेस पर बेचें",
      bn: "মার্কেটপ্লেসে বিক্রি করুন",
      ta: "சந்தையில் விற்கவும்"
    },

    home_inventory: {
      en: "Manage Inventory",
      hi: "इन्वेंटरी प्रबंधित करें",
      bn: "ইনভেন্টরি পরিচালনা করুন",
      ta: "சரக்குகளை நிர்வகிக்கவும்"
    }
  };

  document
    .querySelectorAll("[data-i18n]")
    .forEach((element) => {
      const translations =
        homeCardTranslations[
        element.dataset.i18n
        ];

      if (translations) {
        element.textContent =
          translations[currentLanguage()] ||
          translations.en;
      }
    });

  document
    .querySelectorAll(
      "[data-i18n-secondary]"
    )
    .forEach((element) => {
      const translations =
        homeCardTranslations[
        element.dataset.i18nSecondary
        ];

      if (translations) {
        const secondaryLanguage =
          currentLanguage() === "en"
            ? "hi"
            : "en";

        element.textContent =
          translations[secondaryLanguage];
      }
    });
  syncProfileLanguageDropdown();
}
// ==========================================================
// SCREEN: LANGUAGE
// ==========================================================

function renderLanguageGrid() {

  const grid =
    document.getElementById("langGrid");

  grid.innerHTML = "";


  LANGUAGES.forEach((lang) => {

    const btn =
      document.createElement("button");

    btn.className =
      "lang-btn" +
      (
        state.previewLangCode ===
          lang.code

          ? " previewing"
          : ""
      );

    btn.textContent =
      lang.label;


    btn.onclick = () =>
      onLanguageTap(lang);


    grid.appendChild(btn);

  });

}


function onLanguageTap(lang) {

  if (
    state.previewLangCode === lang.code
  ) {

    state.language = lang;
    state.previewLangCode = lang.code;

    try {
      localStorage.setItem(
        "digikarigar_language",
        lang.code
      );
    } catch (error) {
      console.warn(
        "Language preference could not be saved."
      );
    }

    // Update all visible text to the selected language
    applyAppLanguage();

    // Update the top bar
    setTopbar(
      "Digi-Karigar",
      uiText(
        "Your AI manager",
        "आपका AI मैनेजर",
        "আপনার AI ম্যানেজার",
        "உங்கள் AI மேலாளர்"
      )
    );

    updateOnlineDot();

    showScreen("home");

  } else {

    // First tap previews and speaks the language
    state.previewLangCode = lang.code;

    if (window.speechSynthesis) {

      window.speechSynthesis.cancel();

      const utter =
        new SpeechSynthesisUtterance(
          lang.greeting
        );

      utter.lang = lang.code;

      window.speechSynthesis.speak(
        utter
      );
    }

    renderLanguageGrid();
  }
}


// ==========================================================
// SCREEN: HOME
// ==========================================================

document
  .getElementById("addProductBtn")
  .addEventListener("click", () => {

    state.photoFile = null;

    state.photoPreviewUrl = null;

    state.enhancedImageUrl = null;

    state.answers = {};


    setTopbar(
      "Product ki photo",
      "Ek saaf photo lijiye"
    );


    document
      .getElementById("photoPreview")
      .hidden = true;


    document
      .getElementById("photoPlaceholder")
      .hidden = false;


    document
      .getElementById("enhanceBtn")
      .disabled = true;


    showScreen("photo");

  });


// ==========================================================
// NORMAL NAVIGATION BUTTONS (Inventory / Home / Profile)
// ==========================================================

document
  .querySelectorAll("[data-nav]")
  .forEach((btn) => {

    btn.addEventListener(
      "click",
      () => {

        const target =
          btn.dataset.nav;


        if (
          target ===
          "inventory"
        ) {

          renderInventory();

        }


        const defaults =
          TOPBAR_DEFAULTS[target];

        if (defaults) {

          setTopbar(
            defaults[0],
            defaults[1]
          );

        }


        // Keep the active nav icon in sync across whichever
        // nav row is currently visible (home/inventory/done/profile
        // each render their own <nav>).
        document
          .querySelectorAll(
            `[data-nav]`
          )
          .forEach((navBtn) => {

            navBtn.classList.toggle(
              "active",
              navBtn.dataset.nav === target
            );

          });


        showScreen(target);

      }
    );

  });


// ==========================================================
// SCREEN: PHOTO
// ==========================================================

document
  .getElementById("photoInput")
  .addEventListener(
    "change",
    (e) => {

      const file =
        e.target.files[0];

      if (!file) return;


      state.photoFile =
        file;


      state.photoPreviewUrl =
        URL.createObjectURL(file);


      const img =
        document.getElementById(
          "photoPreview"
        );


      img.src =
        state.photoPreviewUrl;

      img.hidden =
        false;


      document
        .getElementById(
          "photoPlaceholder"
        )
        .hidden = true;


      document
        .getElementById(
          "enhanceBtn"
        )
        .disabled = false;

    }
  );


// ==========================================================
// IMAGE ENHANCEMENT
// ==========================================================

document
  .getElementById("enhanceBtn")
  .addEventListener(
    "click",
    async () => {

      setTopbar(
        "Photo saaf kar raha hoon",
        "Ek second..."
      );


      const result =
        await enhanceImage(
          state.photoFile
        );


      state.enhancedImageUrl =
        result.enhanced_image_url;


      document
        .getElementById(
          "originalImg"
        )
        .src =
        state.photoPreviewUrl;


      document
        .getElementById(
          "enhancedImg"
        )
        .src =
        state.enhancedImageUrl;


      setTopbar(
        "Photo saaf kar diya",
        "Auto brightness & contrast"
      );


      showScreen("enhance");

    }
  );


document
  .getElementById("skipPhotoBtn")
  .addEventListener(
    "click",
    () => {

      state.enhancedImageUrl =
        null;

      startQAFlow();

    }
  );


document
  .getElementById(
    "continueToQABtn"
  )
  .addEventListener(
    "click",
    startQAFlow
  );


// Retake photo: go back to the photo screen with the current
// selection cleared, instead of continuing with a bad enhance.
document
  .getElementById(
    "retakePhotoBtn"
  )
  .addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "photoPreview"
        )
        .hidden = true;


      document
        .getElementById(
          "photoPlaceholder"
        )
        .hidden = false;


      document
        .getElementById(
          "enhanceBtn"
        )
        .disabled = true;


      setTopbar(
        "Product ki photo",
        "Ek saaf photo lijiye"
      );


      showScreen(
        "photo",
        { isBack: true }
      );

    }
  );


// ==========================================================
// PRODUCT QA
// ==========================================================

function startQAFlow() {

  setTopbar(
    "Thodi si jaankari",
    ""
  );


  document
    .getElementById(
      "qaStatus"
    )
    .textContent =
    "Tap to start talking to your AI manager";


  document
    .getElementById(
      "qaLiveTranscript"
    )
    .textContent = "";


  document
    .getElementById(
      "qaDots"
    )
    .innerHTML =
    PRODUCT_QUESTIONS
      .map(
        () =>
          '<div class="dot"></div>'
      )
      .join("");


  showScreen("qa");


}


// ==========================================================
// PRODUCT VOICE
// ==========================================================

document
  .getElementById("qaStartBtn")
  .addEventListener(
    "click",
    async () => {

      const langCode =
        state.language
          ? state.language.code
          : "hi-IN";


      document
        .getElementById(
          "qaStatus"
        )
        .textContent =
        "Sun raha hoon...";


      try {

        const answers =
          await startVoiceFlow(

            localizedProductQuestions(),

            langCode,

            onQAProgress

          );


        state.answers =
          answers;


        await generateListing();

      }

      catch (err) {

        console.error(err);


        state.error =
          "Voice samajh nahi aaya. Type karke try karein.";


        document
          .getElementById(
            "qaManualFallback"
          )
          .hidden = false;

      }

    }
  );


function onQAProgress(
  index,
  total,
  liveText
) {

  const dots =
    document.querySelectorAll(
      "#qaDots .dot"
    );


  dots.forEach(
    (d, i) => {

      d.classList.toggle(
        "done",
        i < index
      );

      d.classList.toggle(
        "active",
        i === index
      );

    }
  );


  const translatedQuestions =
    localizedProductQuestions();

  document
    .getElementById(
      "qaStatus"
    )
    .textContent =
    translatedQuestions[index]
      ? translatedQuestions[index].prompt
      : "";

  document
    .getElementById(
      "qaLiveTranscript"
    )
    .textContent =
    liveText || "";

}


// ==========================================================
// PRODUCT MANUAL FALLBACK
// ==========================================================

document
  .getElementById(
    "qaManualSubmitBtn"
  )
  .addEventListener(
    "click",
    async () => {

      const raw =
        document
          .getElementById(
            "qaManualInput"
          )
          .value;


      const answers = {};


      raw
        .split(",")
        .forEach((pair) => {

          const [
            key,
            ...rest
          ] =
            pair.split(":");


          if (
            key &&
            rest.length
          ) {

            answers[
              key.trim()
            ] =
              rest
                .join(":")
                .trim();

          }

        });


      state.answers =
        answers;


      await generateListing();

    }
  );


// ==========================================================
// PRODUCT LISTING GENERATION
// ==========================================================

async function generateListing() {

  setTopbar(
    "Kaam ho raha hai",
    "Listing taiyaar kar raha hoon"
  );


  showScreen("qa");


  document
    .getElementById(
      "qaStatus"
    )
    .textContent =
    "Ek minute...";


  const {
    material,
    category,
    size
  } =
    state.answers;


  const priceResult =
    await predictPrice({

      material,
      category,
      size

    });


  const description =
    buildDescriptionFromAnswers(
      state.answers
    );


  state.product = {

    product_id:
      crypto.randomUUID(),

    artisan_id:
      "demo-artisan",

    title:
      buildTitleFromAnswers(
        state.answers
      ),

    description,

    material:
      material || "",

    category:
      category || "",

    raw_image_url:
      state.photoPreviewUrl || "",

    enhanced_image_url:
      state.enhancedImageUrl || "",

    predicted_price:
      priceResult.predicted_price,

    language:
      state.language
        ? state.language.short
        : "hi",

    status:
      "draft",

    created_at:
      new Date().toISOString(),

  };


  state.priceRange =
    priceResult.price_range;


  renderListingScreen();

  showScreen("listing");

}


function buildDescriptionFromAnswers(
  answers
) {

  const parts = [];


  if (answers.material) {

    parts.push(
      `Made from ${answers.material}`
    );

  }


  if (answers.size) {

    parts.push(
      `size ${answers.size}`
    );

  }


  return parts.length

    ? parts.join(", ") + "."

    : "Handmade product.";

}


function buildTitleFromAnswers(
  answers
) {

  return [

    answers.category,

    answers.material

  ]
    .filter(Boolean)
    .join(" - ")

    || "Handmade product";

}


// ==========================================================
// SCREEN: LISTING
// ==========================================================

function renderListingScreen() {

  const p =
    state.product;


  const img =
    document.getElementById(
      "listingImg"
    );


  if (
    p.enhanced_image_url
  ) {

    img.src =
      p.enhanced_image_url;

    img.hidden =
      false;

  }


  document
    .getElementById(
      "listingTitle"
    )
    .textContent =
    p.title;


  document
    .getElementById(
      "listingDescription"
    )
    .textContent =
    p.description;


  const [
    low,
    high
  ] =
    state.priceRange ||
    [
      p.predicted_price,
      p.predicted_price
    ];


  document
    .getElementById(
      "listingPrice"
    )
    .textContent =
    `₹${low} – ₹${high}`;


  document
    .getElementById(
      "listingError"
    )
    .hidden =
    true;


  setTopbar(
    "Aapki listing taiyaar hai",
    "Review karein"
  );

}


// ==========================================================
// SPEECH OUTPUT
// ==========================================================

document
  .getElementById(
    "descSpeakBtn"
  )
  .addEventListener(
    "click",
    () => {

      speakText(
        state.product.description
      );

    }
  );


document
  .getElementById(
    "priceSpeakBtn"
  )
  .addEventListener(
    "click",
    () => {

      const [
        low,
        high
      ] =
        state.priceRange || [];


      speakText(
        `Keemat: ${low} se ${high} rupaye.`
      );

    }
  );


function speakText(text) {

  if (
    !window.speechSynthesis ||
    !text
  ) {
    return;
  }


  window
    .speechSynthesis
    .cancel();


  const utter =
    new SpeechSynthesisUtterance(
      text
    );


  utter.lang =
    state.language
      ? state.language.code
      : "hi-IN";


  window
    .speechSynthesis
    .speak(utter);

}


// ==========================================================
// EDIT PRODUCT ANSWERS
// ==========================================================

document
  .getElementById(
    "editAnswersBtn"
  )
  .addEventListener(
    "click",
    startQAFlow
  );


// ==========================================================
// CONFIRM PRODUCT LISTING
// ==========================================================

document
  .getElementById(
    "confirmListingBtn"
  )
  .addEventListener(
    "click",
    async () => {

      const saved =
        await saveProduct(
          state.product
        );


      state.product =
        saved;


      renderDoneScreen();

      showScreen("done");

    }
  );


// ==========================================================
// NORMAL DONE SCREEN
// ==========================================================

function renderDoneScreen() {

  const online =
    isOnline();


  setTopbar(
    online
      ? "Ho gaya"
      : "Save ho gaya",
    ""
  );


  document
    .getElementById(
      "doneIcon"
    )
    .innerHTML =
    online

      ? '<div class="success-icon">&#10003;</div>'

      : '<div class="offline-icon">&#8987;</div>';


  document
    .getElementById(
      "doneMessage"
    )
    .textContent =
    online

      ? "Product listing taiyaar hai."

      : "Saved on your phone — will publish automatically when you're back online.";

}


document
  .getElementById(
    "createAnotherBtn"
  )
  .addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "addProductBtn"
        )
        .click();

    }
  );


// ==========================================================
// PROFILE SCREEN (placeholder — wire to real account data)
// ==========================================================
const profileLanguageSelect =
  document.getElementById(
    "profileLanguageSelect"
  );

if (profileLanguageSelect) {
  profileLanguageSelect.addEventListener(
    "change",
    () => {
      const selectedLanguage =
        LANGUAGES.find(
          (language) =>
            language.code ===
            profileLanguageSelect.value
        );

      if (!selectedLanguage) return;

      state.language =
        selectedLanguage;

      state.previewLangCode =
        selectedLanguage.code;

      try {
        localStorage.setItem(
          "digikarigar_language",
          selectedLanguage.code
        );
      } catch (error) {
        console.warn(
          "Language preference could not be saved."
        );
      }

      applyAppLanguage();

      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();

        const confirmation =
          new SpeechSynthesisUtterance(
            selectedLanguage.greeting
          );

        confirmation.lang =
          selectedLanguage.code;

        window.speechSynthesis.speak(
          confirmation
        );
      }
    }
  );
}


const logoutBtn =
  document.getElementById(
    "logoutBtn"
  );


if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    () => {

      // No real auth/session yet — this just resets local state
      // and sends the artisan back to the language picker.
      state.language = null;

      state.previewLangCode = null;

      try {
        localStorage.removeItem(
          "digikarigar_language"
        );
      } catch (error) {
        console.warn(
          "Language preference could not be cleared."
        );
      }

      showScreen("lang");

    }
  );

}


// ==========================================================
// ==========================================================
// SUBSIDY FLOW
// ==========================================================
// ==========================================================


// ==========================================================
// OPEN SUBSIDY SCREEN
// ==========================================================

const subsidyBtn =
  document.getElementById(
    "subsidyBtn"
  );


if (subsidyBtn) {

  subsidyBtn.addEventListener(
    "click",
    openSubsidyScreen
  );

}


const applySubsidyBtn =
  document.getElementById(
    "applySubsidyBtn"
  );


if (applySubsidyBtn) {

  applySubsidyBtn.addEventListener(
    "click",
    openSubsidyScreen
  );

}


async function openSubsidyScreen() {

  setTopbar(
    isHindi()
      ? "सरकारी योजनाएँ"
      : "Government Schemes",

    isHindi()
      ? "कारीगर सहायता"
      : "Artisan support"
  );


  showScreen("subsidy");


  const container =
    document.getElementById(
      "subsidySchemeList"
    );


  container.innerHTML =
    "<p>Loading...</p>";


  try {

    state.subsidySchemes =
      await getSubsidySchemes();


    renderSubsidySchemes();

  }

  catch (error) {

    console.error(error);


    container.innerHTML =
      "<p>Could not load schemes.</p>";

  }

}


// ==========================================================
// DISPLAY SUBSIDY SCHEMES
// ==========================================================

function renderSubsidySchemes() {

  const container =
    document.getElementById(
      "subsidySchemeList"
    );

  container.innerHTML = "";

  state.subsidySchemes
    .forEach((scheme) => {

      const card =
        document.createElement("div");

      card.className = "card";

      const title =
        localText(scheme, "scheme_name", "scheme_name_hi");

      const description =
        localText(scheme, "description", "description_hi");

      const benefitDetails =
        Array.isArray(scheme.benefit_details)
          ? scheme.benefit_details
          : [];

      const benefitsMarkup = benefitDetails.length
        ? benefitDetails.map((benefit) => {
          const benefitTitle =
            localText(benefit, "title", "title_hi");
          const benefitDescription =
            localText(benefit, "details", "details_hi");
          const benefitHighlight =
            localText(benefit, "highlight", "highlight_hi");

          return `
              <div class="scheme-benefit-item">
                <strong>${benefitTitle}</strong>
                <div class="hint">${benefitHighlight}</div>
                <p>${benefitDescription}</p>
              </div>
            `;
        }).join("")
        : localizedList(scheme, "benefits")
          .map((benefit) => `<li>${benefit}</li>`)
          .join("");

      const documents =
        localizedList(scheme, "required_documents");

      const documentsMarkup = documents
        .map((documentName) =>
          `<li>${documentName}</li>`
        )
        .join("");

      const prototypeNotice =
        localText(
          scheme,
          "prototype_notice",
          "prototype_notice_hi"
        );

      card.innerHTML = `
        <div class="card-title">
          ${title}
        </div>

        <div class="card-body">
          <p>${description}</p>

          <p class="hint">
            ${uiText(
        "Minimum age",
        "न्यूनतम आयु",
        "ন্যূনতম বয়স",
        "குறைந்தபட்ச வயது"
      )}: ${scheme.minimum_age}
          </p>

          <details class="scheme-details" open>
            <summary>
              <strong>${uiText(
        "Benefits you can receive",
        "आपको मिलने वाले लाभ",
        "আপনি যে সুবিধাগুলি পেতে পারেন",
        "நீங்கள் பெறக்கூடிய பயன்கள்"
      )}</strong>
            </summary>

            <div class="scheme-benefits">
              ${benefitDetails.length
          ? benefitsMarkup
          : `<ul>${benefitsMarkup}</ul>`}
            </div>

            <div class="scheme-documents">
              <strong>${uiText(
            "Documents to keep ready",
            "तैयार रखने वाले दस्तावेज़",
            "যে নথিগুলি প্রস্তুত রাখবেন",
            "தயாராக வைத்திருக்க வேண்டிய ஆவணங்கள்"
          )}</strong>
              <ul>${documentsMarkup}</ul>
            </div>

            ${prototypeNotice
          ? `<p class="hint scheme-notice">${prototypeNotice}</p>`
          : ""}
          </details>
        </div>
      `;

      card.onclick = () => {
        state.selectedSubsidyScheme = scheme;

        document
          .querySelectorAll("#subsidySchemeList .card")
          .forEach((element) =>
            element.classList.remove("selected")
          );

        card.classList.add("selected");
      };

      container.appendChild(card);
    });

  if (state.subsidySchemes.length) {
    state.selectedSubsidyScheme =
      state.subsidySchemes[0];

    const firstCard =
      container.querySelector(".card");

    if (firstCard) {
      firstCard.classList.add("selected");
    }
  }

}


// ==========================================================
// START SUBSIDY APPLICATION
// ==========================================================

const startSubsidyFormBtn =
  document.getElementById(
    "startSubsidyFormBtn"
  );


if (startSubsidyFormBtn) {

  startSubsidyFormBtn
    .addEventListener(
      "click",
      startSubsidyApplication
    );

}


async function startSubsidyApplication() {

  try {

    state.subsidyFormSchema =
      await getKarigarFormSchema();


    state.subsidyAnswers = {};

    state.subsidySectionIndex = 0;

    state.subsidyVoiceFieldIndex = 0;


    setTopbar(

      isHindi()
        ? "पीएम विश्वकर्मा"
        : "PM Vishwakarma",

      isHindi()
        ? "आवेदन भरें"
        : "Guided application"

    );


    renderCurrentSubsidySection();


    showScreen(
      "subsidyForm"
    );

  }

  catch (error) {

    console.error(error);

    alert(
      "Could not load the application form."
    );

  }

}


// ==========================================================
// CURRENT SUBSIDY SECTION
// ==========================================================

function getCurrentSubsidySection() {

  if (
    !state.subsidyFormSchema
  ) {
    return null;
  }


  return (
    state
      .subsidyFormSchema
      .sections[
    state.subsidySectionIndex
    ]
  );

}


// ==========================================================
// CONDITIONAL VISIBILITY
// ==========================================================

function shouldShowField(field) {

  if (!field.show_when) {

    return true;

  }


  const dependency =
    field.show_when.field_id;


  const expected =
    field.show_when.equals;


  return (
    state.subsidyAnswers[
    dependency
    ] === expected
  );

}


// ==========================================================
// RENDER SUBSIDY SECTION
// ==========================================================

function renderCurrentSubsidySection() {

  const section =
    getCurrentSubsidySection();


  if (!section) return;


  const sectionName =
    localText(
      section,
      "section_name",
      "section_name_hi"
    );


  document
    .getElementById(
      "subsidySectionName"
    )
    .textContent =
    sectionName;


  document
    .getElementById(
      "subsidyProgress"
    )
    .textContent =
    `${state.subsidySectionIndex + 1} / ${state.subsidyFormSchema.sections.length}`;


  const container =
    document.getElementById(
      "subsidyFormContainer"
    );


  container.innerHTML = "";


  const visibleFields =
    section.fields.filter(
      shouldShowField
    );


  state.subsidyVisibleFields =
    visibleFields;


  visibleFields.forEach(
    (field) => {

      renderSubsidyField(
        field,
        container
      );

    }
  );


  updateSubsidyVoiceField();


  const nextBtn =
    document.getElementById(
      "subsidyNextBtn"
    );


  const finalSection =
    state.subsidySectionIndex ===
    state.subsidyFormSchema.sections.length - 1;


  nextBtn.textContent =
    finalSection

      ? (
        isHindi()
          ? "आवेदन पूरा करें"
          : "Finish Application"
      )

      : (
        isHindi()
          ? "अगला"
          : "Next"
      );

}


// ==========================================================
// RENDER ONE FIELD
// ==========================================================

function renderSubsidyField(
  field,
  container
) {

  if (
    field.type ===
    "hidden"
  ) {

    if (
      field.default_value !==
      undefined
    ) {

      state.subsidyAnswers[
        field.field_id
      ] =
        field.default_value;

    }

    return;

  }


  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.className =
    "field";


  wrapper.dataset.fieldId =
    field.field_id;


  const label =
    document.createElement(
      "label"
    );


  label.textContent =
    localText(
      field,
      "label",
      "label_hi"
    );


  if (field.required) {

    label.textContent += " *";

  }


  wrapper.appendChild(label);


  // --------------------------------
  // Verification field
  // --------------------------------

  if (
    field.type ===
    "verification"
  ) {

    const verification =
      document.createElement(
        "div"
      );


    verification.className =
      "hint";


    verification.textContent =
      isHindi()

        ? "डेमो में सत्यापन सिम्युलेट किया जाएगा।"

        : "Verification is simulated in this prototype.";


    wrapper.appendChild(
      verification
    );


    state.subsidyAnswers[
      field.field_id
    ] = true;


    container.appendChild(
      wrapper
    );

    return;

  }


  // --------------------------------
  // Radio
  // --------------------------------

  if (
    field.type ===
    "radio"
  ) {

    (field.options || [])
      .forEach(
        (option) => {

          const optionLabel =
            document.createElement(
              "label"
            );


          optionLabel.className =
            "radio-option";


          const input =
            document.createElement(
              "input"
            );


          input.type =
            "radio";


          input.name =
            field.field_id;


          input.value =
            String(
              option.value
            );


          if (
            state.subsidyAnswers[
            field.field_id
            ] ===
            option.value
          ) {

            input.checked =
              true;

          }


          input.onchange =
            () => {

              state.subsidyAnswers[
                field.field_id
              ] =
                option.value;


              renderCurrentSubsidySection();

            };


          optionLabel.appendChild(
            input
          );


          optionLabel.append(
            " " +
            localText(
              option,
              "label",
              "label_hi"
            )
          );


          wrapper.appendChild(
            optionLabel
          );

        }
      );

  }


  // --------------------------------
  // Checkbox
  // --------------------------------

  else if (
    field.type ===
    "checkbox"
  ) {

    const input =
      document.createElement(
        "input"
      );


    input.type =
      "checkbox";


    input.checked =
      Boolean(
        state.subsidyAnswers[
        field.field_id
        ]
      );


    input.onchange =
      () => {

        state.subsidyAnswers[
          field.field_id
        ] =
          input.checked;

      };


    wrapper.appendChild(
      input
    );

  }


  // --------------------------------
  // Select
  // --------------------------------

  else if (
    field.type ===
    "select"
  ) {

    const select =
      document.createElement(
        "select"
      );


    select.dataset.fieldId =
      field.field_id;


    const blank =
      document.createElement(
        "option"
      );


    blank.value = "";

    blank.textContent =
      isHindi()
        ? "चुनें"
        : "Select";


    select.appendChild(
      blank
    );


    (field.options || [])
      .forEach(
        (option) => {

          const opt =
            document.createElement(
              "option"
            );


          opt.value =
            String(
              option.value
            );


          opt.textContent =
            localText(
              option,
              "label",
              "label_hi"
            );


          select.appendChild(
            opt
          );

        }
      );


    if (
      state.subsidyAnswers[
      field.field_id
      ] !== undefined
    ) {

      select.value =
        String(
          state.subsidyAnswers[
          field.field_id
          ]
        );

    }


    select.onchange =
      () => {

        const option =
          (field.options || [])
            .find(
              (item) =>
                String(
                  item.value
                ) ===
                select.value
            );


        state.subsidyAnswers[
          field.field_id
        ] =
          option
            ? option.value
            : select.value;


        renderCurrentSubsidySection();

      };


    wrapper.appendChild(
      select
    );

  }


  // --------------------------------
  // Multi select
  // --------------------------------

  else if (
    field.type ===
    "multiselect"
  ) {

    const selected =
      state.subsidyAnswers[
      field.field_id
      ] || [];


    (field.options || [])
      .forEach(
        (option) => {

          const optionLabel =
            document.createElement(
              "label"
            );


          const input =
            document.createElement(
              "input"
            );


          input.type =
            "checkbox";


          input.checked =
            selected.includes(
              option.value
            );


          input.onchange =
            () => {

              let values =
                state.subsidyAnswers[
                field.field_id
                ] || [];


              if (
                input.checked
              ) {

                if (
                  !values.includes(
                    option.value
                  )
                ) {

                  values.push(
                    option.value
                  );

                }

              }

              else {

                values =
                  values.filter(
                    (value) =>
                      value !==
                      option.value
                  );

              }


              state.subsidyAnswers[
                field.field_id
              ] =
                values;

            };


          optionLabel.appendChild(
            input
          );


          optionLabel.append(
            " " +
            localText(
              option,
              "label",
              "label_hi"
            )
          );


          wrapper.appendChild(
            optionLabel
          );

        }
      );

  }


  // --------------------------------
  // Textarea
  // --------------------------------

  else if (
    field.type ===
    "textarea"
  ) {

    const input =
      document.createElement(
        "textarea"
      );


    configureBasicInput(
      input,
      field
    );


    wrapper.appendChild(
      input
    );

  }


  // --------------------------------
  // List
  // --------------------------------

  else if (
    field.type ===
    "list"
  ) {

    const input =
      document.createElement(
        "textarea"
      );


    input.placeholder =
      isHindi()

        ? "जानकारी दर्ज करें"

        : "Enter details";


    configureBasicInput(
      input,
      field
    );


    wrapper.appendChild(
      input
    );

  }


  // --------------------------------
  // Text / tel / password / number etc.
  // --------------------------------

  else {

    const input =
      document.createElement(
        "input"
      );


    input.type =
      [
        "number",
        "tel",
        "password",
        "date",
        "email"
      ].includes(
        field.type
      )

        ? field.type

        : "text";


    configureBasicInput(
      input,
      field
    );


    wrapper.appendChild(
      input
    );

  }


  // --------------------------------
  // Sensitive warning
  // --------------------------------

  if (
    field.sensitive
  ) {

    const hint =
      document.createElement(
        "div"
      );


    hint.className =
      "hint";


    hint.textContent =
      isHindi()

        ? "🔒 यह जानकारी बोलने के बजाय स्वयं टाइप करें।"

        : "🔒 Type this information manually instead of speaking it.";


    wrapper.appendChild(
      hint
    );

  }


  // --------------------------------
  // System-filled field
  // --------------------------------

  if (
    field.user_editable ===
    false &&
    field.type !==
    "verification"
  ) {

    const hint =
      document.createElement(
        "div"
      );


    hint.className =
      "hint";


    hint.textContent =
      isHindi()

        ? "यह जानकारी वास्तविक पोर्टल पर स्वतः भरी जाएगी।"

        : "This would be filled automatically by the real portal.";


    wrapper.appendChild(
      hint
    );

  }


  container.appendChild(
    wrapper
  );

}


// ==========================================================
// CONFIGURE NORMAL INPUT
// ==========================================================

function configureBasicInput(
  input,
  field
) {

  input.dataset.fieldId =
    field.field_id;


  input.value =
    state.subsidyAnswers[
    field.field_id
    ] || "";


  if (
    field.minimum !==
    undefined
  ) {

    input.min =
      field.minimum;

  }


  if (
    field.maximum !==
    undefined
  ) {

    input.max =
      field.maximum;

  }


  if (
    field.validation &&
    field.validation.pattern
  ) {

    input.pattern =
      field.validation.pattern;

  }


  if (
    field.user_editable ===
    false
  ) {

    input.disabled =
      true;

  }


  input.oninput =
    () => {

      let value =
        input.value;


      if (
        field.type ===
        "number"
      ) {

        value =
          value === ""
            ? ""
            : Number(value);

      }


      state.subsidyAnswers[
        field.field_id
      ] =
        value;

    };

}


// ==========================================================
// VOICE-FILLABLE FIELDS
// ==========================================================

function getVoiceFillableFields() {

  return state
    .subsidyVisibleFields
    .filter(
      (field) =>

        field.question &&

        !field.sensitive &&

        field.user_editable !==
        false &&

        field.type !==
        "verification" &&

        field.type !==
        "hidden"

    );

}


// ==========================================================
// UPDATE VOICE PROMPT
// ==========================================================

function updateSubsidyVoiceField() {

  const fields =
    getVoiceFillableFields();


  if (
    state.subsidyVoiceFieldIndex >=
    fields.length
  ) {

    state.subsidyVoiceFieldIndex =
      0;

  }


  const field =
    fields[
    state.subsidyVoiceFieldIndex
    ];


  const promptElement =
    document.getElementById(
      "subsidyVoicePrompt"
    );


  if (!field) {

    promptElement.textContent =
      isHindi()

        ? "इस भाग में जानकारी स्वयं दर्ज करें।"

        : "Complete the remaining fields manually.";

    return;

  }


  promptElement.textContent =
    localText(
      field,
      "question",
      "question_hi"
    );

}


// ==========================================================
// SUBSIDY VOICE BUTTON
// ==========================================================

const subsidyVoiceBtn =
  document.getElementById(
    "subsidyVoiceBtn"
  );


if (subsidyVoiceBtn) {

  subsidyVoiceBtn
    .addEventListener(
      "click",
      fillCurrentSubsidyFieldByVoice
    );

}


// ==========================================================
// VOICE → VISIBLE FORM FIELD
// ==========================================================

async function fillCurrentSubsidyFieldByVoice() {

  const fields =
    getVoiceFillableFields();


  if (!fields.length) {

    return;

  }


  const field =
    fields[
    state.subsidyVoiceFieldIndex
    ];


  const question =
    localText(
      field,
      "question",
      "question_hi"
    );


  const langCode =
    state.language
      ? state.language.code
      : "hi-IN";


  const questionList = [

    {

      field_id:
        field.field_id,

      prompt:
        question

    }

  ];


  const transcript =
    document.getElementById(
      "subsidyTranscript"
    );


  transcript.textContent =
    "";


  try {

    const answers =
      await startVoiceFlow(

        questionList,

        langCode,

        (
          index,
          total,
          liveText
        ) => {

          transcript.textContent =
            liveText || "";

        }

      );


    const spoken =
      answers[
      field.field_id
      ] || "";


    const normalized =
      normalizeSubsidyVoiceAnswer(
        spoken,
        field
      );


    state.subsidyAnswers[
      field.field_id
    ] =
      normalized;


    renderCurrentSubsidySection();


    const refreshedFields =
      getVoiceFillableFields();


    const currentIndex =
      refreshedFields.findIndex(
        (item) =>
          item.field_id ===
          field.field_id
      );


    state.subsidyVoiceFieldIndex =
      Math.min(
        currentIndex + 1,
        refreshedFields.length - 1
      );


    updateSubsidyVoiceField();

  }

  catch (error) {

    console.error(error);


    transcript.textContent =
      isHindi()

        ? "आवाज़ समझ नहीं आई। कृपया दोबारा कोशिश करें।"

        : "Could not understand. Please try again.";

  }

}


// ==========================================================
// NORMALIZE SPOKEN ANSWER
// ==========================================================

function normalizeSubsidyVoiceAnswer(
  spoken,
  field
) {

  const text = String(spoken).trim().toLowerCase();

  if (field.type === "number") {
    const digitMap = {
      "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
      "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
      "௦": "0", "௧": "1", "௨": "2", "௩": "3", "௪": "4",
      "௫": "5", "௬": "6", "௭": "7", "௮": "8", "௯": "9"
    };
    const converted = text.replace(/[০-৯௦-௯]/g, digit => digitMap[digit]);
    const cleaned = converted.replace(/[^0-9.-]/g, "");
    return cleaned === "" ? "" : Number(cleaned);
  }

  if (field.type === "radio" || field.type === "select") {
    const options = field.options || [];
    for (const option of options) {
      const labels = [
        option.label,
        option.label_hi,
        option.label_bn,
        option.label_ta,
        option.value
      ]
        .filter(value => value !== undefined && value !== null)
        .map(value => String(value).toLowerCase());

      if (labels.some(label => label && (text === label || text.includes(label)))) {
        return option.value;
      }
    }

    const yesWords = ["yes", "haan", "ha", "हाँ", "हां", "जी", "হ্যাঁ", "হ্যা", "ஆம்", "ஆமாம்"];
    const noWords = ["no", "nahi", "nahin", "नहीं", "नही", "ना", "না", "இல்லை", "வேண்டாம்"];

    if (yesWords.some(word => text.includes(word))) {
      const yesOption = options.find(option => option.value === true || option.value === "yes");
      if (yesOption) return yesOption.value;
    }
    if (noWords.some(word => text.includes(word))) {
      const noOption = options.find(option => option.value === false || option.value === "no");
      if (noOption) return noOption.value;
    }
  }

  if (field.type === "checkbox") {
    return ["yes", "haan", "हाँ", "हां", "হ্যাঁ", "ஆம்", "ஆமாம்"]
      .some(word => text.includes(word));
  }

  if (field.type === "multiselect") {
    return (field.options || [])
      .filter(option => [option.label, option.label_hi, option.label_bn, option.label_ta]
        .filter(Boolean)
        .some(label => text.includes(String(label).toLowerCase())))
      .map(option => option.value);
  }

  return String(spoken).trim();

}


// ==========================================================
// SUBSIDY NEXT BUTTON
// ==========================================================

const subsidyNextBtn =
  document.getElementById(
    "subsidyNextBtn"
  );


if (subsidyNextBtn) {

  subsidyNextBtn
    .addEventListener(
      "click",
      moveToNextSubsidySection
    );

}


async function moveToNextSubsidySection() {

  const finalSection =
    state.subsidySectionIndex ===
    state.subsidyFormSchema.sections.length - 1;


  if (finalSection) {

    await finishSubsidyApplication();

    return;

  }


  state.subsidySectionIndex += 1;

  state.subsidyVoiceFieldIndex = 0;


  renderCurrentSubsidySection();

}


// ==========================================================
// FINISH SUBSIDY APPLICATION
// ==========================================================

async function finishSubsidyApplication() {

  setTopbar(
    isHindi()
      ? "आवेदन तैयार है"
      : "Application ready",

    ""
  );


  const payload = {

    ...state.subsidyAnswers,

    artisan_id:
      state.product
        ? state.product.artisan_id
        : "demo-artisan"

  };


  try {

    const result =
      await submitSubsidyApplication(
        payload
      );


    state.subsidyResult =
      result;


    showScreen("done");


    document
      .getElementById(
        "doneIcon"
      )
      .innerHTML =
      '<div class="success-icon">&#10003;</div>';


    document
      .getElementById(
        "doneMessage"
      )
      .textContent =
      isHindi()

        ? `आवेदन डेमो में पूरा हुआ। पंजीकरण संख्या: ${result.registration_number}`

        : `Demo application completed. Registration number: ${result.registration_number}`;


  }

  catch (error) {

    console.error(error);


    alert(
      isHindi()

        ? "आवेदन सेव नहीं हो पाया।"

        : "Could not save application."
    );

  }

}


// ==========================================================
// INVENTORY
// ==========================================================

async function renderInventory() {

  const products =
    await getProducts();


  const grid =
    document.getElementById(
      "inventoryGrid"
    );


  grid.innerHTML =
    products
      .map(
        (p) => {

          const pendingBadge =

            p.status &&
              p.status !==
              "synced"

              ? '<span class="pending-badge">Pending</span>'

              : "";


          return `

            <div class="thumb">

              &#128247;

              <span>
                ₹${p.predicted_price}
              </span>

              ${pendingBadge}

            </div>

          `;

        }
      )
      .join("")

    +

    '<button class="thumb" onclick="document.getElementById(\'addProductBtn\').click()">+</button>';

}


// ==========================================================
// BOOT
// ==========================================================

renderLanguageGrid();

showScreen("lang");

updateOnlineDot();


window.addEventListener(
  "online",
  updateOnlineDot
);


window.addEventListener(
  "offline",
  updateOnlineDot
);


window.addEventListener(
  "online",
  () => {

    setTimeout(
      () => {

        if (
          state.screen ===
          "inventory"
        ) {

          renderInventory();

        }

      },
      800
    );

  }
);



// ==========================================================
// B2B / MARKETPLACE INTEGRATION
// Paste this entire section at the bottom of app.js
// ==========================================================

const B2B_CHANNEL_FALLBACK = [
  {
    channel_id: "internal_b2b",
    channel_name: "Artisan B2B Marketplace",
    channel_name_hi: "कारीगर B2B मार्केटप्लेस",
    channel_name_bn: "কারিগর বি২বি মার্কেটপ্লেস",
    channel_name_ta: "கைவினைஞர் B2B சந்தை",
    listing_mode: "internal",
    enabled: true,
    requires_registration: false,
    prototype_status: "available"
  },
  {
    channel_id: "amazon_karigar",
    channel_name: "Amazon Karigar",
    channel_name_hi: "अमेज़न कारीगर",
    channel_name_bn: "অ্যামাজন কারিগর",
    channel_name_ta: "Amazon Karigar",
    listing_mode: "external",
    enabled: true,
    requires_registration: true,
    registration_schema: "marketplace_registration_schema.json",
    listing_schema: "marketplace_listing_schema.json",
    prototype_status: "prepared_only"
  },
  {
    channel_id: "flipkart_samarth",
    channel_name: "Flipkart Samarth",
    channel_name_hi: "फ्लिपकार्ट समर्थ",
    channel_name_bn: "ফ্লিপকার্ট সমর্থ",
    channel_name_ta: "Flipkart Samarth",
    listing_mode: "external",
    enabled: true,
    requires_registration: true,
    registration_schema: "marketplace_registration_schema.json",
    listing_schema: "marketplace_listing_schema.json",
    prototype_status: "prepared_only"
  },
  {
    channel_id: "ondc",
    channel_name: "ONDC Seller Network",
    channel_name_hi: "ONDC विक्रेता नेटवर्क",
    channel_name_bn: "ONDC বিক্রেতা নেটওয়ার্ক",
    channel_name_ta: "ONDC விற்பனையாளர் வலைப்பின்னல்",
    listing_mode: "external",
    enabled: true,
    requires_registration: true,
    registration_schema: "marketplace_registration_schema.json",
    listing_schema: "marketplace_listing_schema.json",
    prototype_status: "prepared_only"
  }
];

const marketplaceState = {
  channels: [],
  selectedChannel: null,
  schema: null,
  answers: {},
  formType: "channels"
};

const marketplaceButton =
  document.getElementById("b2bBtn");

if (marketplaceButton) {
  marketplaceButton.addEventListener(
    "click",
    openMarketplaceScreen
  );
}

const listOnMarketplaceButton =
  document.getElementById(
    "listOnMarketplaceBtn"
  );

if (listOnMarketplaceButton) {
  listOnMarketplaceButton.addEventListener(
    "click",
    openMarketplaceScreen
  );
}


// ==========================================================
// OPEN MARKETPLACE SCREEN
// ==========================================================

async function openMarketplaceScreen() {
  marketplaceState.selectedChannel = null;
  marketplaceState.schema = null;
  marketplaceState.answers = {};
  marketplaceState.formType = "channels";

  setTopbar(
    getMarketplaceTranslation({
      en: "Sell Online",
      hi: "ऑनलाइन बेचें",
      bn: "অনলাইনে বিক্রি করুন",
      ta: "ஆன்லைனில் விற்கவும்"
    }),
    getMarketplaceTranslation({
      en: "Choose a marketplace",
      hi: "मार्केटप्लेस चुनें",
      bn: "মার্কেটপ্লেস বেছে নিন",
      ta: "சந்தையைத் தேர்ந்தெடுக்கவும்"
    })
  );

  showScreen("b2b");

  const container =
    document.getElementById("b2bChannelList");

  if (!container) {
    console.error(
      "b2bChannelList was not found in index.html"
    );
    return;
  }

  container.innerHTML =
    "<p>Loading marketplaces...</p>";

  try {
    marketplaceState.channels =
      await fetchMarketplaceJSON([
        "data/b2b_channels.json",
        "b2b_channels.json"
      ]);
  } catch (error) {
    console.warn(
      "Using built-in marketplace channels:",
      error.message
    );

    marketplaceState.channels =
      B2B_CHANNEL_FALLBACK;
  }

  renderMarketplaceChannels();
}


// ==========================================================
// SHOW MARKETPLACE OPTIONS
// ==========================================================

function renderMarketplaceChannels() {
  marketplaceState.formType = "channels";

  const container =
    document.getElementById("b2bChannelList");

  if (!container) return;
  container.innerHTML = "";

  const channels =
    (marketplaceState.channels || []).filter(
      channel => channel.enabled !== false
    );

  if (!channels.length) {
    container.innerHTML =
      "<p>No marketplace is currently available.</p>";
    return;
  }

  channels.forEach((channel) => {
    const wrapper =
      document.createElement("div");

    wrapper.className =
      "marketplace-channel-wrapper";

    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "action-card b2b marketplace-channel-btn";

    const description =
      getMarketplaceSchemaText(
        channel,
        "description"
      ) || getMarketplaceSubtitle(channel);

    button.innerHTML = `
      <span class="action-icon">
        ${getMarketplaceIcon(channel.channel_id)}
      </span>

      <span>
        <strong>
          ${escapeMarketplaceHTML(
      getMarketplaceChannelName(channel)
    )}
        </strong>

        <small>
          ${escapeMarketplaceHTML(description)}
        </small>
      </span>
    `;

    button.addEventListener(
      "click",
      () => selectMarketplaceChannel(channel)
    );

    wrapper.appendChild(button);

    const benefits =
      localizedList(channel, "benefits");
    const requiredDetails =
      localizedList(channel, "required_details");
    const processSteps =
      localizedList(channel, "process_steps");
    const notice =
      getMarketplaceSchemaText(
        channel,
        "prototype_notice"
      );

    if (
      benefits.length ||
      requiredDetails.length ||
      processSteps.length ||
      notice
    ) {
      const details =
        document.createElement("details");

      details.className =
        "marketplace-channel-details";

      const listMarkup = (items) =>
        items
          .map(item =>
            `<li>${escapeMarketplaceHTML(item)}</li>`
          )
          .join("");

      details.innerHTML = `
        <summary>
          ${escapeMarketplaceHTML(
        getMarketplaceTranslation({
          en: "View details",
          hi: "विवरण देखें",
          bn: "বিস্তারিত দেখুন",
          ta: "விவரங்களைக் காண்க"
        })
      )}
        </summary>

        ${benefits.length ? `
          <div class="marketplace-detail-group">
            <strong>${escapeMarketplaceHTML(
        getMarketplaceTranslation({
          en: "Benefits",
          hi: "लाभ",
          bn: "সুবিধা",
          ta: "பயன்கள்"
        })
      )}</strong>
            <ul>${listMarkup(benefits)}</ul>
          </div>
        ` : ""}

        ${requiredDetails.length ? `
          <div class="marketplace-detail-group">
            <strong>${escapeMarketplaceHTML(
        getMarketplaceTranslation({
          en: "Details to keep ready",
          hi: "तैयार रखने वाली जानकारी",
          bn: "যে তথ্য প্রস্তুত রাখবেন",
          ta: "தயாராக வைத்திருக்க வேண்டிய விவரங்கள்"
        })
      )}</strong>
            <ul>${listMarkup(requiredDetails)}</ul>
          </div>
        ` : ""}

        ${processSteps.length ? `
          <div class="marketplace-detail-group">
            <strong>${escapeMarketplaceHTML(
        getMarketplaceTranslation({
          en: "How it works",
          hi: "यह कैसे काम करता है",
          bn: "এটি কীভাবে কাজ করে",
          ta: "இது எவ்வாறு செயல்படுகிறது"
        })
      )}</strong>
            <ol>${listMarkup(processSteps)}</ol>
          </div>
        ` : ""}

        ${notice ? `
          <p class="hint marketplace-prototype-notice">
            ${escapeMarketplaceHTML(notice)}
          </p>
        ` : ""}
      `;

      wrapper.appendChild(details);
    }

    container.appendChild(wrapper);
  });
}


// ==========================================================
// SELECT MARKETPLACE
// ==========================================================

async function selectMarketplaceChannel(channel) {
  marketplaceState.selectedChannel = channel;

  const savedSellerId =
    getMarketplaceSellerId(channel.channel_id);

  if (
    channel.requires_registration &&
    !savedSellerId
  ) {
    await openMarketplaceForm("registration");
    return;
  }

  await openMarketplaceForm("listing");
}


// ==========================================================
// LOAD REGISTRATION OR LISTING FORM
// ==========================================================

async function openMarketplaceForm(formType) {
  const channel =
    marketplaceState.selectedChannel;

  const container =
    document.getElementById("b2bChannelList");

  if (!channel || !container) return;

  marketplaceState.formType = formType;

  container.innerHTML =
    "<p>Loading form...</p>";

  let schemaFile;

  if (formType === "registration") {
    schemaFile =
      channel.registration_schema ||
      "marketplace_registration_schema.json";
  } else {
    schemaFile =
      channel.listing_schema ||
      "marketplace_listing_schema.json";
  }

  try {
    marketplaceState.schema =
      await fetchMarketplaceJSON([
        `data/${schemaFile}`,
        schemaFile
      ]);

    marketplaceState.answers =
      buildMarketplaceDefaultAnswers(
        formType,
        channel
      );

    renderMarketplaceForm(formType);
  } catch (error) {
    console.error(error);

    container.innerHTML = `
      <p class="error">
        Could not load
        ${escapeMarketplaceHTML(schemaFile)}.
        Make sure this JSON file is inside
        your data folder.
      </p>

      <button
        id="marketplaceRetryBtn"
        class="btn btn-secondary"
        type="button"
      >
        Go back
      </button>
    `;

    document
      .getElementById("marketplaceRetryBtn")
      .addEventListener(
        "click",
        renderMarketplaceChannels
      );
  }
}


// ==========================================================
// RENDER DYNAMIC FORM
// ==========================================================

function renderMarketplaceForm(formType) {
  const container =
    document.getElementById("b2bChannelList");

  const schema =
    marketplaceState.schema;

  const channel =
    marketplaceState.selectedChannel;

  if (!container || !schema || !channel) {
    return;
  }

  const form =
    document.createElement("form");

  form.id = "marketplaceDynamicForm";
  form.noValidate = true;

  const heading =
    document.createElement("div");

  heading.innerHTML = `
    <h3>
      ${escapeMarketplaceHTML(
    getMarketplaceSchemaText(
      schema,
      "form_name"
    )
  )}
    </h3>

    <p class="hint">
      ${escapeMarketplaceHTML(
    getMarketplaceChannelName(channel)
  )}
    </p>
  `;

  form.appendChild(heading);

  (schema.sections || []).forEach(
    (section) => {
      if (
        !marketplaceConditionMatches(
          section.show_when
        )
      ) {
        return;
      }

      const sectionElement =
        document.createElement("div");

      sectionElement.className =
        "marketplace-form-section";

      const sectionHeading =
        document.createElement("h4");

      sectionHeading.textContent =
        getMarketplaceSchemaText(
          section,
          "section_name"
        );

      sectionElement.appendChild(
        sectionHeading
      );

      (section.fields || []).forEach(
        (field) => {
          if (
            marketplaceConditionMatches(
              field.show_when
            )
          ) {
            sectionElement.appendChild(
              createMarketplaceInput(field)
            );
          }
        }
      );

      if (
        sectionElement.querySelector(".field")
      ) {
        form.appendChild(sectionElement);
      }
    }
  );

  const errorElement =
    document.createElement("p");

  errorElement.id =
    "marketplaceFormError";

  errorElement.className = "error";
  errorElement.hidden = true;

  form.appendChild(errorElement);

  const submitButton =
    document.createElement("button");

  submitButton.type = "submit";
  submitButton.className =
    "btn btn-primary";

  if (formType === "registration") {
    submitButton.textContent =
      getMarketplaceTranslation({
        en: "Prepare registration",
        hi: "पंजीकरण तैयार करें",
        bn: "নিবন্ধন প্রস্তুত করুন",
        ta: "பதிவைத் தயாரிக்கவும்"
      });
  } else {
    submitButton.textContent =
      getMarketplaceTranslation({
        en: "Prepare listing",
        hi: "लिस्टिंग तैयार करें",
        bn: "লিস্টিং প্রস্তুত করুন",
        ta: "பட்டியலைத் தயாரிக்கவும்"
      });
  }

  form.appendChild(submitButton);

  const changeButton =
    document.createElement("button");

  changeButton.type = "button";
  changeButton.className =
    "btn btn-secondary";

  changeButton.textContent =
    getMarketplaceTranslation({
      en: "Choose another marketplace",
      hi: "दूसरा मार्केटप्लेस चुनें",
      bn: "অন্য মার্কেটপ্লেস বেছে নিন",
      ta: "வேறு சந்தையைத் தேர்ந்தெடுக்கவும்"
    });

  changeButton.addEventListener(
    "click",
    renderMarketplaceChannels
  );

  form.appendChild(changeButton);

  form.addEventListener(
    "input",
    handleMarketplaceInput
  );

  form.addEventListener(
    "change",
    handleMarketplaceInput
  );

  form.addEventListener(
    "submit",
    (event) =>
      submitMarketplaceForm(
        event,
        formType
      )
  );

  container.innerHTML = "";
  container.appendChild(form);
}


// ==========================================================
// CREATE ONE FORM FIELD
// ==========================================================

function createMarketplaceInput(field) {
  const wrapper =
    document.createElement("div");

  wrapper.className = "field";

  wrapper.dataset.marketplaceField =
    field.field_id;

  if (field.type === "hidden") {
    const hiddenInput =
      document.createElement("input");

    hiddenInput.type = "hidden";

    configureMarketplaceInput(
      hiddenInput,
      field
    );

    wrapper.appendChild(hiddenInput);

    return wrapper;
  }

  const label =
    document.createElement("label");

  label.htmlFor =
    `marketplace_${field.field_id}`;

  label.textContent =
    getMarketplaceSchemaText(
      field,
      "label"
    ) +
    (field.required ? " *" : "");

  wrapper.appendChild(label);

  if (
    field.question ||
    field.question_hi ||
    field.question_bn ||
    field.question_ta
  ) {
    const question =
      document.createElement("p");

    question.className = "hint";

    question.textContent =
      getMarketplaceSchemaText(
        field,
        "question"
      );

    wrapper.appendChild(question);
  }

  let input;

  if (field.type === "textarea") {
    input =
      document.createElement("textarea");
  } else if (
    field.type === "select" ||
    field.type === "multiselect"
  ) {
    input =
      document.createElement("select");

    input.multiple =
      field.type === "multiselect";

    if (!input.multiple) {
      const blankOption =
        document.createElement("option");

      blankOption.value = "";

      blankOption.textContent =
        getMarketplaceTranslation({
          en: "Select",
          hi: "चुनें",
          bn: "নির্বাচন করুন",
          ta: "தேர்வு செய்க"
        });

      input.appendChild(blankOption);
    }

    (field.options || []).forEach(
      (option) => {
        const optionElement =
          document.createElement("option");

        optionElement.value =
          String(option.value);

        optionElement.textContent =
          getMarketplaceSchemaText(
            option,
            "label"
          );

        input.appendChild(optionElement);
      }
    );

    if (
      !field.options &&
      field.options_source
    ) {
      const option =
        document.createElement("option");

      option.value =
        "seller_network_participant";

      option.textContent =
        "Seller App / Network Participant";

      input.appendChild(option);
    }
  } else if (field.type === "radio") {
    input =
      document.createElement("select");

    const blankOption =
      document.createElement("option");

    blankOption.value = "";

    blankOption.textContent =
      getMarketplaceTranslation({
        en: "Select",
        hi: "चुनें",
        bn: "নির্বাচন করুন",
        ta: "தேர்வு செய்க"
      });

    input.appendChild(blankOption);

    const radioOptions =
      field.options || [
        {
          value: true,
          label: "Yes",
          label_hi: "हाँ",
          label_bn: "হ্যাঁ",
          label_ta: "ஆம்"
        },
        {
          value: false,
          label: "No",
          label_hi: "नहीं",
          label_bn: "না",
          label_ta: "இல்லை"
        }
      ];

    radioOptions.forEach((option) => {
      const optionElement =
        document.createElement("option");

      optionElement.value =
        String(option.value);

      optionElement.textContent =
        getMarketplaceSchemaText(
          option,
          "label"
        );

      input.appendChild(optionElement);
    });
  } else {
    input =
      document.createElement("input");

    if (field.type === "checkbox") {
      input.type = "checkbox";
    } else if (field.type === "image") {
      input.type = "url";
    } else if (
      field.type === "verification"
    ) {
      input.type = "text";
    } else {
      input.type =
        field.type || "text";
    }
  }

  configureMarketplaceInput(
    input,
    field
  );

  wrapper.appendChild(input);

  return wrapper;
}


// ==========================================================
// CONFIGURE FORM FIELD
// ==========================================================

function configureMarketplaceInput(
  input,
  field
) {
  input.id =
    `marketplace_${field.field_id}`;

  input.name =
    field.field_id;

  input.dataset.fieldId =
    field.field_id;

  input.required =
    Boolean(field.required);

  if (
    field.user_editable === false &&
    field.type !== "hidden"
  ) {
    input.disabled = true;
  }

  if (field.minimum !== undefined) {
    input.min = field.minimum;
  }

  if (field.maximum !== undefined) {
    input.max = field.maximum;
  }

  if (
    field.validation &&
    field.validation.pattern
  ) {
    input.pattern =
      field.validation.pattern;
  }

  const value =
    marketplaceState.answers[
    field.field_id
    ];

  if (input.type === "checkbox") {
    input.checked =
      value === true ||
      value === "true";
  } else if (
    input.multiple &&
    Array.isArray(value)
  ) {
    Array
      .from(input.options)
      .forEach((option) => {
        option.selected =
          value.includes(
            option.value
          );
      });
  } else if (
    value !== undefined &&
    value !== null &&
    input.type !== "file"
  ) {
    input.value = value;
  }
}


// ==========================================================
// HANDLE FIELD VALUE
// ==========================================================

function handleMarketplaceInput(event) {
  const input = event.target;

  if (
    !input.dataset ||
    !input.dataset.fieldId
  ) {
    return;
  }

  let value;

  if (input.type === "checkbox") {
    value = input.checked;
  } else if (input.type === "file") {
    value =
      input.files &&
        input.files.length
        ? input.files[0].name
        : "";
  } else if (input.multiple) {
    value =
      Array
        .from(input.selectedOptions)
        .map((option) => option.value);
  } else if (input.value === "true") {
    value = true;
  } else if (input.value === "false") {
    value = false;
  } else {
    value = input.value;
  }

  marketplaceState.answers[
    input.dataset.fieldId
  ] = value;

  if (
    marketplaceFieldChangesVisibility(
      input.dataset.fieldId
    )
  ) {
    renderMarketplaceForm(
      marketplaceState.formType
    );
  }
}


// ==========================================================
// CONDITIONAL FIELDS
// ==========================================================

function marketplaceFieldChangesVisibility(
  fieldId
) {
  const schema =
    marketplaceState.schema;

  if (!schema) return false;

  return (schema.sections || []).some(
    (section) => {
      if (
        section.show_when &&
        section.show_when.field_id ===
        fieldId
      ) {
        return true;
      }

      return (section.fields || []).some(
        (field) =>
          field.show_when &&
          field.show_when.field_id ===
          fieldId
      );
    }
  );
}


function marketplaceConditionMatches(
  condition
) {
  if (!condition) return true;

  return (
    marketplaceState.answers[
    condition.field_id
    ] === condition.equals
  );
}


// ==========================================================
// SUBMIT REGISTRATION OR LISTING
// ==========================================================

async function submitMarketplaceForm(
  event,
  formType
) {
  event.preventDefault();

  const form = event.currentTarget;

  const errorElement =
    document.getElementById(
      "marketplaceFormError"
    );

  if (!form.reportValidity()) {
    return;
  }

  const bankAccount =
    marketplaceState.answers
      .bank_account_number;

  const confirmBankAccount =
    marketplaceState.answers
      .confirm_bank_account_number;

  if (
    bankAccount &&
    confirmBankAccount &&
    bankAccount !== confirmBankAccount
  ) {
    errorElement.textContent =
      "Bank account numbers do not match.";

    errorElement.hidden = false;

    return;
  }

  if (formType === "registration") {
    const channel =
      marketplaceState.selectedChannel;

    const sellerId =
      marketplaceState.answers
        .existing_seller_id ||
      `DK-${channel.channel_id
        .toUpperCase()}-${Date.now()
          .toString()
          .slice(-6)}`;

    saveMarketplaceSellerId(
      channel.channel_id,
      sellerId
    );

    marketplaceState.answers
      .generated_seller_id =
      sellerId;

    saveMarketplaceDraft(
      "registration",
      marketplaceState.answers
    );

    await openMarketplaceForm("listing");

    return;
  }

  const listingResult =
    await createFinalMarketplaceListing();

  if (!listingResult.success) {
    errorElement.textContent =
      (
        listingResult.errors || [
          "Please complete all required fields."
        ]
      ).join(" ");

    errorElement.hidden = false;

    return;
  }

  saveMarketplaceDraft(
    "listing",
    listingResult.listing
  );

  if (state.product) {
    state.product.status = "listed";
  }

  renderMarketplaceSuccess();
}


// ==========================================================
// CREATE FINAL LISTING
// ==========================================================

async function createFinalMarketplaceListing() {
  /*
   * Try to use b2b_listing.js first.
   * It must be inside the same js folder as app.js.
   */
  try {
    const b2bModule =
      await import("./b2b_listing.js");

    if (
      b2bModule.createMarketplaceListing &&
      state.product
    ) {
      return (
        b2bModule.createMarketplaceListing(
          state.product,
          marketplaceState.answers
        )
      );
    }
  } catch (error) {
    console.warn(
      "Using local marketplace listing builder:",
      error.message
    );
  }

  /*
   * Fallback keeps the prototype working even
   * when the backend or module is unavailable.
   */
  const listing = {
    listing_id:
      crypto.randomUUID(),

    marketplace_channel:
      marketplaceState
        .selectedChannel
        .channel_id,

    product: state.product
      ? {
        ...state.product,
        status: "listed"
      }
      : null,

    listing_details: {
      ...marketplaceState.answers
    },

    listing_submission_status:
      "prototype_not_submitted",

    created_at:
      new Date().toISOString()
  };

  return {
    success: true,
    listing,
    errors: []
  };
}


// ==========================================================
// SUCCESS MESSAGE
// ==========================================================

function renderMarketplaceSuccess() {
  const container =
    document.getElementById(
      "b2bChannelList"
    );

  const channelName =
    getMarketplaceChannelName(
      marketplaceState.selectedChannel
    );

  setTopbar(
    getMarketplaceTranslation({
      en: "Listing prepared",
      hi: "लिस्टिंग तैयार है",
      bn: "লিস্টিং প্রস্তুত",
      ta: "பட்டியல் தயாராக உள்ளது"
    }),
    channelName
  );

  container.innerHTML = `
    <div class="center-text">

      <div class="success-icon">
        &#10003;
      </div>

      <h3>
        ${escapeMarketplaceHTML(
    channelName
  )}
      </h3>

      <p>
        ${escapeMarketplaceHTML(
    getMarketplaceTranslation({
      en:
        "Your marketplace listing is prepared. OTP, CAPTCHA and final submission will still be completed on the official marketplace.",
      hi:
        "आपकी मार्केटप्लेस लिस्टिंग तैयार है। OTP, CAPTCHA और अंतिम सबमिशन आधिकारिक मार्केटप्लेस पर ही पूरा होगा।",
      bn:
        "আপনার মার্কেটপ্লেস লিস্টিং প্রস্তুত। OTP, CAPTCHA এবং চূড়ান্ত সাবমিশন অফিসিয়াল মার্কেটপ্লেসেই সম্পন্ন হবে।",
      ta:
        "உங்கள் சந்தைப் பட்டியல் தயாராக உள்ளது. OTP, CAPTCHA மற்றும் இறுதி சமர்ப்பிப்பு அதிகாரப்பூர்வ சந்தையிலேயே நிறைவு செய்யப்படும்."
    })
  )}
      </p>

      <button
        id="marketplaceAgainBtn"
        class="btn btn-primary"
        type="button"
      >
        ${escapeMarketplaceHTML(
    getMarketplaceTranslation({
      en: "Sell on another marketplace",
      hi: "दूसरे मार्केटप्लेस पर बेचें",
      bn: "অন্য মার্কেটপ্লেসে বিক্রি করুন",
      ta: "வேறு சந்தையில் விற்கவும்"
    })
  )}
      </button>

    </div>
  `;

  document
    .getElementById("marketplaceAgainBtn")
    .addEventListener(
      "click",
      openMarketplaceScreen
    );
}


// ==========================================================
// AUTOMATIC PRODUCT PREFILLING
// ==========================================================

function buildMarketplaceDefaultAnswers(
  formType,
  channel
) {
  const product =
    state.product || {};

  const sellerId =
    getMarketplaceSellerId(
      channel.channel_id
    );

  const answers = {
    marketplace_channel:
      channel.channel_id,

    seller_id:
      sellerId || "",

    existing_seller_id:
      sellerId || "",

    already_registered:
      Boolean(sellerId),

    artisan_id:
      product.artisan_id ||
      "demo-artisan",

    product_id:
      product.product_id || "",

    title:
      product.title || "",

    description:
      product.description || "",

    material:
      product.material || "",

    category:
      product.category || "",

    size:
      state.answers.size ||
      product.size ||
      "",

    language:
      product.language ||
      (
        state.language
          ? state.language.short
          : "hi"
      ),

    raw_image_url:
      product.raw_image_url || "",

    enhanced_image_url:
      product.enhanced_image_url ||
      product.raw_image_url ||
      "",

    predicted_price:
      product.predicted_price || "",

    listing_submission_status:
      "prototype_not_submitted",

    registration_status:
      "prototype_not_submitted"
  };

  const schema =
    marketplaceState.schema;

  (schema.sections || []).forEach(
    (section) => {
      (section.fields || []).forEach(
        (field) => {
          if (
            answers[field.field_id] ===
            undefined &&
            field.default_value !==
            undefined
          ) {
            answers[field.field_id] =
              field.default_value;
          }
        }
      );
    }
  );

  return answers;
}


// ==========================================================
// LOCAL STORAGE
// ==========================================================

function getMarketplaceSellerId(
  channelId
) {
  try {
    return (
      localStorage.getItem(
        `digikarigar_seller_${channelId}`
      ) || ""
    );
  } catch (error) {
    return "";
  }
}


function saveMarketplaceSellerId(
  channelId,
  sellerId
) {
  try {
    localStorage.setItem(
      `digikarigar_seller_${channelId}`,
      sellerId
    );
  } catch (error) {
    console.warn(
      "Seller ID could not be saved."
    );
  }
}


function saveMarketplaceDraft(
  type,
  data
) {
  const record = {
    type,

    channel_id:
      marketplaceState
        .selectedChannel
        .channel_id,

    data,

    saved_at:
      new Date().toISOString()
  };

  try {
    const drafts =
      JSON.parse(
        localStorage.getItem(
          "digikarigar_marketplace_drafts"
        ) || "[]"
      );

    drafts.push(record);

    localStorage.setItem(
      "digikarigar_marketplace_drafts",
      JSON.stringify(drafts)
    );
  } catch (error) {
    console.warn(
      "Marketplace draft could not be saved."
    );
  }
}


// ==========================================================
// JSON LOADING
// ==========================================================

async function fetchMarketplaceJSON(
  paths
) {
  let lastError;

  for (const path of paths) {
    try {
      const response =
        await fetch(path);

      if (!response.ok) {
        throw new Error(
          `${path}: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw (
    lastError ||
    new Error("JSON file not found.")
  );
}


// ==========================================================
// LANGUAGE HELPERS
// ==========================================================

function getMarketplaceLanguage() {
  if (
    state.language &&
    state.language.short
  ) {
    return state.language.short;
  }

  return "en";
}


function getMarketplaceTranslation(
  values
) {
  const language =
    getMarketplaceLanguage();

  return (
    values[language] ||
    values.en ||
    ""
  );
}


function getMarketplaceSchemaText(
  item,
  key
) {
  if (!item) return "";

  const language =
    getMarketplaceLanguage();

  return (
    item[`${key}_${language}`] ||
    item[key] ||
    ""
  );
}


function getMarketplaceChannelName(
  channel
) {
  return getMarketplaceSchemaText(
    channel,
    "channel_name"
  );
}


function getMarketplaceSubtitle(
  channel
) {
  if (
    channel.listing_mode ===
    "internal"
  ) {
    return getMarketplaceTranslation({
      en:
        "List directly in Digi-Karigar",
      hi:
        "Digi-Karigar पर सीधे लिस्ट करें",
      bn:
        "Digi-Karigar-এ সরাসরি তালিকাভুক্ত করুন",
      ta:
        "Digi-Karigar-ல் நேரடியாகப் பட்டியலிடுங்கள்"
    });
  }

  return getMarketplaceTranslation({
    en:
      "Voice-guided form preparation",
    hi:
      "आवाज़ से फॉर्म तैयार करें",
    bn:
      "ভয়েসের সাহায্যে ফর্ম প্রস্তুত করুন",
    ta:
      "குரல் வழிகாட்டுதலுடன் படிவம் தயாரிக்கவும்"
  });
}


// ==========================================================
// DISPLAY HELPERS
// ==========================================================

function getMarketplaceIcon(
  channelId
) {
  if (channelId === "internal_b2b") {
    return "&#129309;";
  }

  if (channelId === "amazon_karigar") {
    return "A";
  }

  if (
    channelId === "flipkart_samarth"
  ) {
    return "F";
  }

  return "&#127760;";
}


function escapeMarketplaceHTML(value) {
  return String(
    value === null ||
      value === undefined
      ? ""
      : value
  )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}