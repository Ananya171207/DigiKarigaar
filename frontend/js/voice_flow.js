/**
 * TEMPORARY STUB — Person C (Voice) replaces this entire file with the real
 * version. Nothing in app.js should need to change when that happens, AS LONG AS
 * the real file keeps this exact function name, signature, and return shape:
 *
 *   const answers = await startVoiceFlow(questionList, languageCode, onProgress);
 *   // answers = { <field_id>: "spoken answer", ... }  — one key per question
 *
 * questionList: [{ field_id: "material", prompt: "Yeh kis cheez se bana hai?" }, ...]
 * languageCode: full locale, e.g. "hi-IN"
 * onProgress (OPTIONAL, safe to ignore in the real implementation):
 *   a function you may call as (index, totalQuestions, liveText) to let the UI
 *   show progress dots + a live transcript. If you don't call it, the UI just
 *   shows a generic "listening..." state instead — nothing breaks either way.
 */
async function startVoiceFlow(questionList, languageCode, onProgress) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const answers = {};

  for (let i = 0; i < questionList.length; i++) {
    const q = questionList[i];

    // Speak the question aloud
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(q.prompt);
      utter.lang = languageCode || "hi-IN";
      window.speechSynthesis.speak(utter);
    }

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
      // Stub-only: auto-stop after 6s of silence so the demo doesn't hang forever.
      // The real module will have its own, better end-of-speech detection.
      setTimeout(() => { try { recognition.stop(); } catch (e) {} }, 6000);
    });

    answers[q.field_id] = answerText;
  }

  return answers;
}
