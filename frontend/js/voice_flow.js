// /**
//  * TEMPORARY STUB — Person C (Voice) replaces this entire file with the real
//  * version. Nothing in app.js should need to change when that happens, AS LONG AS
//  * the real file keeps this exact function name, signature, and return shape:
//  *
//  *   const answers = await startVoiceFlow(questionList, languageCode, onProgress);
//  *   // answers = { <field_id>: "spoken answer", ... }  — one key per question
//  *
//  * questionList: [{ field_id: "material", prompt: "Yeh kis cheez se bana hai?" }, ...]
//  * languageCode: full locale, e.g. "hi-IN"
//  * onProgress (OPTIONAL, safe to ignore in the real implementation):
//  *   a function you may call as (index, totalQuestions, liveText) to let the UI
//  *   show progress dots + a live transcript. If you don't call it, the UI just
//  *   shows a generic "listening..." state instead — nothing breaks either way.
//  */
// async function startVoiceFlow(questionList, languageCode, onProgress) {
//   const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
//   const answers = {};

//   for (let i = 0; i < questionList.length; i++) {
//     const q = questionList[i];

//     // Speak the question aloud
//     if (window.speechSynthesis) {
//       window.speechSynthesis.cancel();
//       const utter = new SpeechSynthesisUtterance(q.prompt);
//       utter.lang = languageCode || "hi-IN";
//       window.speechSynthesis.speak(utter);
//     }

//     if (onProgress) onProgress(i, questionList.length, "");

//     // Listen for the answer (falls back to empty string if unsupported)
//     const answerText = await new Promise((resolve) => {
//       if (!SR) { resolve(""); return; }
//       const recognition = new SR();
//       recognition.lang = languageCode || "hi-IN";
//       recognition.continuous = true;
//       recognition.interimResults = true;

//       let finalText = "";
//       recognition.onresult = (e) => {
//         finalText = "";
//         for (let j = 0; j < e.results.length; j++) finalText += e.results[j][0].transcript;
//         if (onProgress) onProgress(i, questionList.length, finalText);
//       };
//       recognition.onerror = () => resolve(finalText);
//       recognition.onend = () => resolve(finalText);

//       recognition.start();
//       // Stub-only: auto-stop after 6s of silence so the demo doesn't hang forever.
//       // The real module will have its own, better end-of-speech detection.
//       setTimeout(() => { try { recognition.stop(); } catch (e) {} }, 6000);
//     });

//     answers[q.field_id] = answerText;
//   }

//   return answers;
// }














/**
 * voice_flow.js
 * Combines:
 *   1) startVoiceFlow — asks a list of questions aloud, listens for spoken answers
 *   2) announceScreen  — ambient screen narration, called on every screen change
 * Both share a single speakQuestion() helper for text-to-speech so there's
 * only one place that touches window.speechSynthesis.
 *
 *   const answers = await startVoiceFlow(questionList, languageCode, onProgress);
 *   // answers = { <field_id>: "spoken answer", ... }  — one key per question
 *
 * questionList: [{ field_id: "material", prompt: "Yeh kis cheez se bana hai?" }, ...]
 * languageCode: full locale, e.g. "hi-IN"
 * onProgress (OPTIONAL): function(index, totalQuestions, liveText)
 */

// ---------------------------------------------------------------------
// Shared text-to-speech helper
// ---------------------------------------------------------------------
function speakQuestion(text, languageCode) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel(); // cuts off any speech still playing
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = languageCode || "hi-IN";
  window.speechSynthesis.speak(utter);
}

// ---------------------------------------------------------------------
// Voice-driven form filling (product QA, subsidy form, etc.)
// ---------------------------------------------------------------------
async function startVoiceFlow(questionList, languageCode, onProgress) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const answers = {};

  for (let i = 0; i < questionList.length; i++) {
    const q = questionList[i];

    // Speak the question aloud
    speakQuestion(q.prompt, languageCode);

    if (onProgress) onProgress(i, questionList.length, "");

    // Listen for the answer (falls back to empty string if unsupported)
    const answerText = await new Promise((resolve) => {
      if (!SR) { resolve(""); return; }
      const recognition = new SR();
      recognition.lang = languageCode || "hi-IN";
      recognition.continuous = true;
      recognition.interimResults = true;

      let finalText = "";
      recognition.onresult = (e) => {
        finalText = "";
        for (let j = 0; j < e.results.length; j++) finalText += e.results[j][0].transcript;
        if (onProgress) onProgress(i, questionList.length, finalText);
      };
      recognition.onerror = () => resolve(finalText);
      recognition.onend = () => resolve(finalText);

      recognition.start();
      // auto-stop after 6s of silence so it doesn't hang forever
      setTimeout(() => { try { recognition.stop(); } catch (e) {} }, 6000);
    });

    answers[q.field_id] = answerText;
  }

  return answers;
}

// ---------------------------------------------------------------------
// Ambient screen narration — call once whenever the app navigates to a
// new screen, so the UI is always narrated aloud.
//
// app.js integration (one line, additive only):
//
//   function showScreen(screenId) {
//     ...existing screen-switch code stays exactly as-is...
//     announceScreen(screenId, currentLangCode);   // <-- only new line
//   }
//
// IMPORTANT: double-check these keys against the ACTUAL screenId strings
// app.js uses internally (inferred from index.html's data-screen
// attributes) — rename keys below if app.js's internal ids differ.
// ---------------------------------------------------------------------
const SCREEN_NARRATION = {
  lang: {
    'hi-IN': 'नमस्ते! कृपया अपनी भाषा चुनें।'
  },
  home: {
    'hi-IN': 'यहाँ से शुरू करें। अपने सामान की फोटो लेने के लिए यहाँ दबाएँ, या सरकारी योजनाएँ देखने के लिए यहाँ दबाएँ।'
  },
  photo: {
    'hi-IN': 'अपने उत्पाद की फोटो खींचें या अपलोड करें।'
  },
  enhance: {
    'hi-IN': 'अब हम आपकी फोटो को और बेहतर बनाएंगे। कृपया थोड़ा इंतज़ार करें।'
  },
  qa: {
    'hi-IN': 'अब मैं आपसे कुछ सवाल पूछूँगा। आप बोलकर जवाब दे सकते हैं।'
  },
  listing: {
    'hi-IN': 'आपकी लिस्टिंग तैयार हो गई है। कृपया एक बार देख लें।'
  },
  subsidy: {
    'hi-IN': 'यहाँ आपके लिए उपलब्ध सरकारी योजनाएँ हैं। किसी एक योजना पर दबाएँ।'
  },
  subsidyForm: {
    'hi-IN': 'अब हम इस योजना के लिए फॉर्म भरेंगे। मैं सवाल पूछूँगा, आप बोलकर बताएं।'
  },
  b2b: {
    'hi-IN': 'यहाँ आप अपना सामान बड़े खरीदारों को सीधे बेच सकते हैं।'
  },
  done: {
    'hi-IN': 'बधाई हो! आपका काम पूरा हो गया।'
  },
  inventory: {
    'hi-IN': 'यहाँ आपके सभी उत्पाद और उनकी स्थिति दिखाई गई है।'
  }
};

function announceScreen(screenId, langCode = 'hi-IN') {
  const entry = SCREEN_NARRATION[screenId];
  if (!entry) {
    console.warn(`No narration text for screen '${screenId}' — add one to SCREEN_NARRATION.`);
    return;
  }
  const text = entry[langCode] || entry['hi-IN'];
  if (!text) return;
  speakQuestion(text, langCode);
}