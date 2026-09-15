/**
 * voice_flow.js
 *
 * Shared voice layer for:
 * 1. Home-page voice commands
 * 2. Product and form question-and-answer flows
 * 3. Screen narration
 *
 * The existing startVoiceFlow() interface remains unchanged.
 */


// ==========================================================
// TEXT TO SPEECH
// ==========================================================

function speakVoicePrompt(
  text,
  languageCode
) {
  return new Promise((resolve) => {
    if (
      !window.speechSynthesis ||
      !text
    ) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(text);

    utterance.lang =
      languageCode || "hi-IN";

    utterance.onend = resolve;
    utterance.onerror = resolve;

    window.speechSynthesis.speak(
      utterance
    );
  });
}


/*
 * Backward-compatible function name used by
 * the screen narration implementation.
 */
function speakQuestion(
  text,
  languageCode
) {
  return speakVoicePrompt(
    text,
    languageCode
  );
}


// ==========================================================
// SPEECH RECOGNITION
// ==========================================================

function listenForVoiceAnswer(
  languageCode,
  onLiveText
) {
  return new Promise((resolve) => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error(
        "Speech recognition is not supported in this browser."
      );

      resolve("");
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang =
      languageCode || "hi-IN";

    recognition.continuous = false;
    recognition.interimResults = true;

    let finalText = "";
    let completed = false;
    let timer = null;


    function finish() {
      if (completed) {
        return;
      }

      completed = true;

      if (timer) {
        clearTimeout(timer);
      }

      resolve(finalText.trim());
    }


    recognition.onresult = (event) => {
      let interimText = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index++
      ) {
        const transcript =
          event.results[index][0].transcript;

        if (
          event.results[index].isFinal
        ) {
          finalText +=
            transcript + " ";
        } else {
          interimText +=
            transcript;
        }
      }

      const liveText =
        `${finalText} ${interimText}`
          .trim();

      if (onLiveText) {
        onLiveText(liveText);
      }
    };


    recognition.onerror = (event) => {
      console.warn(
        "Speech recognition error:",
        event.error
      );

      finish();
    };


    recognition.onend = () => {
      finish();
    };


    try {
      recognition.start();

      /*
       * Maximum listening time so the
       * demo cannot remain stuck.
       */
      timer = setTimeout(() => {
        try {
          recognition.stop();
        } catch (error) {
          finish();
        }
      }, 8000);

    } catch (error) {
      console.error(
        "Could not start speech recognition:",
        error
      );

      finish();
    }
  });
}


// ==========================================================
// VOICE-DRIVEN QUESTION FLOW
// ==========================================================

async function startVoiceFlow(
  questionList,
  languageCode,
  onProgress
) {
  const answers = {};

  for (
    let index = 0;
    index < questionList.length;
    index++
  ) {
    const question =
      questionList[index];

    /*
     * Wait until the question finishes speaking
     * before activating the microphone.
     *
     * This prevents speech recognition from
     * hearing the app's own voice.
     */
    await speakVoicePrompt(
      question.prompt,
      languageCode
    );

    if (onProgress) {
      onProgress(
        index,
        questionList.length,
        ""
      );
    }

    const answerText =
      await listenForVoiceAnswer(
        languageCode,

        (liveText) => {
          if (onProgress) {
            onProgress(
              index,
              questionList.length,
              liveText
            );
          }
        }
      );

    answers[question.field_id] =
      answerText;
  }

  return answers;
}


// ==========================================================
// SCREEN NARRATION
// ==========================================================

const SCREEN_NARRATION = {

  lang: {
    "en-IN":
      "Hello! Please choose your language.",

    "hi-IN":
      "नमस्ते! कृपया अपनी भाषा चुनें।",

    "bn-IN":
      "নমস্কার! অনুগ্রহ করে আপনার ভাষা নির্বাচন করুন।",

    "ta-IN":
      "வணக்கம்! தயவுசெய்து உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்."
  },


  home: {
    "en-IN":
      "What would you like to do? You can say add product, government schemes, marketplace, or inventory.",

    "hi-IN":
      "आप क्या करना चाहेंगे? आप उत्पाद जोड़ें, सरकारी योजना, मार्केटप्लेस या इन्वेंटरी कह सकते हैं।",

    "bn-IN":
      "আপনি কী করতে চান? পণ্য যোগ, সরকারি প্রকল্প, মার্কেটপ্লেস অথবা ইনভেন্টরি বলতে পারেন।",

    "ta-IN":
      "நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்? பொருள் சேர்க்க, அரசு திட்டம், சந்தை அல்லது சரக்கு என்று கூறலாம்."
  },


  photo: {
    "en-IN":
      "Please take or upload a clear photo of your product.",

    "hi-IN":
      "कृपया अपने उत्पाद की साफ़ फोटो खींचें या अपलोड करें।",

    "bn-IN":
      "অনুগ্রহ করে আপনার পণ্যের একটি পরিষ্কার ছবি তুলুন অথবা আপলোড করুন।",

    "ta-IN":
      "தயவுசெய்து உங்கள் பொருளின் தெளிவான புகைப்படத்தை எடுக்கவும் அல்லது பதிவேற்றவும்."
  },


  enhance: {
    "en-IN":
      "Your photo has been enhanced. Please review both images.",

    "hi-IN":
      "आपकी फोटो बेहतर कर दी गई है। कृपया दोनों फोटो देखें।",

    "bn-IN":
      "আপনার ছবিটি উন্নত করা হয়েছে। অনুগ্রহ করে দুটি ছবি দেখুন।",

    "ta-IN":
      "உங்கள் புகைப்படம் மேம்படுத்தப்பட்டுள்ளது. இரண்டு படங்களையும் பார்க்கவும்."
  },


  qa: {
    "en-IN":
      "I will now ask a few questions. You can answer by speaking.",

    "hi-IN":
      "अब मैं आपसे कुछ सवाल पूछूँगी। आप बोलकर जवाब दे सकते हैं।",

    "bn-IN":
      "এখন আমি কয়েকটি প্রশ্ন করব। আপনি কথা বলে উত্তর দিতে পারেন।",

    "ta-IN":
      "இப்போது சில கேள்விகளைக் கேட்பேன். நீங்கள் பேசி பதிலளிக்கலாம்."
  },


  listing: {
    "en-IN":
      "Your listing is ready. Please review it.",

    "hi-IN":
      "आपकी लिस्टिंग तैयार है। कृपया इसे जाँच लें।",

    "bn-IN":
      "আপনার তালিকা প্রস্তুত। অনুগ্রহ করে এটি পরীক্ষা করুন।",

    "ta-IN":
      "உங்கள் பட்டியல் தயாராக உள்ளது. தயவுசெய்து சரிபார்க்கவும்."
  },


  subsidy: {
    "en-IN":
      "These government schemes are available for you. Choose one scheme.",

    "hi-IN":
      "यहाँ आपके लिए उपलब्ध सरकारी योजनाएँ हैं। किसी एक योजना को चुनें।",

    "bn-IN":
      "এখানে আপনার জন্য উপলব্ধ সরকারি প্রকল্প রয়েছে। একটি প্রকল্প বেছে নিন।",

    "ta-IN":
      "உங்களுக்குக் கிடைக்கும் அரசு திட்டங்கள் இங்கே உள்ளன. ஒரு திட்டத்தைத் தேர்ந்தெடுக்கவும்."
  },


  subsidyForm: {
    "en-IN":
      "We will now complete this application. You can answer each question by speaking.",

    "hi-IN":
      "अब हम इस योजना का फॉर्म भरेंगे। आप हर सवाल का जवाब बोलकर दे सकते हैं।",

    "bn-IN":
      "এখন আমরা এই প্রকল্পের ফর্ম পূরণ করব। আপনি প্রতিটি প্রশ্নের উত্তর কথা বলে দিতে পারেন।",

    "ta-IN":
      "இப்போது இந்தத் திட்டத்தின் படிவத்தை நிரப்புவோம். ஒவ்வொரு கேள்விக்கும் பேசி பதிலளிக்கலாம்."
  },


  b2b: {
    "en-IN":
      "Choose where you want to sell your product.",

    "hi-IN":
      "चुनें कि आप अपना उत्पाद कहाँ बेचना चाहते हैं।",

    "bn-IN":
      "আপনি কোথায় আপনার পণ্য বিক্রি করতে চান তা বেছে নিন।",

    "ta-IN":
      "உங்கள் பொருளை எங்கு விற்க விரும்புகிறீர்கள் என்பதைத் தேர்ந்தெடுக்கவும்."
  },


  done: {
    "en-IN":
      "Congratulations! Your task has been completed.",

    "hi-IN":
      "बधाई हो! आपका काम पूरा हो गया है।",

    "bn-IN":
      "অভিনন্দন! আপনার কাজ সম্পন্ন হয়েছে।",

    "ta-IN":
      "வாழ்த்துகள்! உங்கள் பணி முடிந்தது."
  },


  inventory: {
    "en-IN":
      "Here you can review your products, stock, sales, and payments.",

    "hi-IN":
      "यहाँ आप अपने उत्पाद, स्टॉक, बिक्री और भुगतान देख सकते हैं।",

    "bn-IN":
      "এখানে আপনি আপনার পণ্য, স্টক, বিক্রয় এবং পেমেন্ট দেখতে পারেন।",

    "ta-IN":
      "இங்கே உங்கள் பொருட்கள், சரக்கு, விற்பனை மற்றும் பணப்பரிவர்த்தனைகளைப் பார்க்கலாம்."
  },


  profile: {
    "en-IN":
      "Here you can view your profile and change your language.",

    "hi-IN":
      "यहाँ आप अपनी प्रोफाइल देख सकते हैं और भाषा बदल सकते हैं।",

    "bn-IN":
      "এখানে আপনি আপনার প্রোফাইল দেখতে এবং ভাষা পরিবর্তন করতে পারেন।",

    "ta-IN":
      "இங்கே உங்கள் சுயவிவரத்தைப் பார்க்கவும் மொழியை மாற்றவும் முடியும்."
  }

};


// ==========================================================
// ANNOUNCE SCREEN
// ==========================================================

function announceScreen(
  screenId,
  languageCode = "hi-IN"
) {
  const entry =
    SCREEN_NARRATION[screenId];

  if (!entry) {
    console.warn(
      `No narration text for screen '${screenId}'.`
    );

    return Promise.resolve();
  }

  const text =
    entry[languageCode] ||
    entry["en-IN"] ||
    entry["hi-IN"];

  return speakQuestion(
    text,
    languageCode
  );
}