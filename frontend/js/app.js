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
    prompt: "Yeh kis cheez se bana hai?"
  },
  {
    field_id: "category",
    prompt: "Yeh kis category mein aata hai?"
  },
  {
    field_id: "size",
    prompt: "Iska size ya lambai kitni hai?"
  },
];


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

function isHindi() {

  return (
    state.language &&
    state.language.short === "hi"
  );

}


function localText(
  object,
  normalKey,
  hindiKey
) {

  if (!object) return "";

  if (
    isHindi() &&
    object[hindiKey]
  ) {
    return object[hindiKey];
  }

  return object[normalKey] || "";

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
    state.previewLangCode ===
    lang.code
  ) {

    state.language = lang;


    setTopbar(
      "Digi-Karigar",
      "Aapka AI manager"
    );


    updateOnlineDot();


    document
      .getElementById("homeGreeting")
      .textContent =
        lang.short === "hi"

          ? "नमस्ते! आज क्या करना है?"

          : "Namaste! What would you like to do today?";


    showScreen("home");

  }

  else {

    state.previewLangCode =
      lang.code;


    if (window.speechSynthesis) {

      window
        .speechSynthesis
        .cancel();


      const utter =
        new SpeechSynthesisUtterance(
          lang.greeting
        );

      utter.lang =
        lang.code;


      window
        .speechSynthesis
        .speak(utter);

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
// NORMAL NAVIGATION BUTTONS
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

          setTopbar(
            "Mera saaman",
            "Your products & orders"
          );

        }


        if (
          target ===
          "home"
        ) {

          setTopbar(
            "Digi-Karigar",
            "Aapka AI manager"
          );

        }


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

            PRODUCT_QUESTIONS,

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


  document
    .getElementById(
      "qaStatus"
    )
    .textContent =
      PRODUCT_QUESTIONS[index]
        ? PRODUCT_QUESTIONS[index].prompt
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


      card.className =
        "card";


      const title =
        isHindi()

          ? (
              scheme.scheme_name_hi ||
              scheme.scheme_name
            )

          : scheme.scheme_name;


      const description =
        isHindi()

          ? (
              scheme.description_hi ||
              scheme.description
            )

          : scheme.description;


      card.innerHTML = `

        <div class="card-title">
          ${title}
        </div>

        <div class="card-body">

          <p>
            ${description}
          </p>

          <p class="hint">
            ${
              isHindi()

                ? "न्यूनतम आयु"

                : "Minimum age"
            }:
            ${scheme.minimum_age}
          </p>

        </div>

      `;


      card.onclick = () => {

        state.selectedSubsidyScheme =
          scheme;


        document
          .querySelectorAll(
            "#subsidySchemeList .card"
          )
          .forEach(
            (el) =>
              el.classList.remove(
                "selected"
              )
          );


        card.classList.add(
          "selected"
        );

      };


      container.appendChild(card);

    });


  // Auto-select first scheme
  if (
    state.subsidySchemes.length
  ) {

    state.selectedSubsidyScheme =
      state.subsidySchemes[0];

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

  const text =
    String(spoken)
      .trim()
      .toLowerCase();


  if (
    field.type ===
    "number"
  ) {

    const cleaned =
      text.replace(
        /[^0-9.-]/g,
        ""
      );


    return cleaned === ""
      ? ""
      : Number(cleaned);

  }


  if (
    field.type ===
    "radio" ||
    field.type ===
    "select"
  ) {

    const options =
      field.options || [];


    for (
      const option of options
    ) {

      const normalLabel =
        String(
          option.label || ""
        )
          .toLowerCase();


      const hindiLabel =
        String(
          option.label_hi || ""
        )
          .toLowerCase();


      const value =
        String(
          option.value
        )
          .toLowerCase();


      if (
        text.includes(
          normalLabel
        ) ||
        (
          hindiLabel &&
          text.includes(
            hindiLabel
          )
        ) ||
        text === value
      ) {

        return option.value;

      }

    }


    // Extra yes/no handling

    if (
      [
        "yes",
        "haan",
        "ha",
        "हाँ",
        "हां",
        "जी"
      ].some(
        (word) =>
          text.includes(word)
      )
    ) {

      const yesOption =
        options.find(
          (option) =>
            option.value === true ||
            option.value === "yes"
        );


      if (yesOption) {

        return yesOption.value;

      }

    }


    if (
      [
        "no",
        "nahi",
        "nahin",
        "नहीं",
        "नही",
        "ना"
      ].some(
        (word) =>
          text.includes(word)
      )
    ) {

      const noOption =
        options.find(
          (option) =>
            option.value === false ||
            option.value === "no"
        );


      if (noOption) {

        return noOption.value;

      }

    }

  }


  if (
    field.type ===
    "checkbox"
  ) {

    return (
      text.includes("yes") ||
      text.includes("haan") ||
      text.includes("हाँ") ||
      text.includes("हां")
    );

  }


  if (
    field.type ===
    "multiselect"
  ) {

    const selected = [];


    (field.options || [])
      .forEach(
        (option) => {

          const english =
            String(
              option.label || ""
            )
              .toLowerCase();


          const hindi =
            String(
              option.label_hi || ""
            )
              .toLowerCase();


          if (
            text.includes(
              english
            ) ||
            (
              hindi &&
              text.includes(
                hindi
              )
            )
          ) {

            selected.push(
              option.value
            );

          }

        }
      );


    return selected;

  }


  return spoken.trim();

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