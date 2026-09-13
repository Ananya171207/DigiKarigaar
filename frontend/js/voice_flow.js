/**
 * Executes the interactive voice recording flow.
 * @param {Array} questionList - Array of questions to ask the user.
 * @param {string} languageCode - ISO language code (e.g., 'hi', 'ta', 'bn', 'en').
 * @returns {Promise<Object>} Object containing answers keyed by question field_ids.
 */

async function startVoiceFlow(questionList, languageCode) {
    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true }); //permission to record audio
    } catch (error) {
        console.error("Error accessing audio input.", error);
    }

    const answers = {};
    for (const item of questionList) {
       const audioBlob = await recordUserAnswer(stream); //audio blob
       const formData = new FormData();
       const { field_id, prompt } = item;
       formData.append('audio', audioBlob, 'user_answer.webm');
       formData.append('field_id', field_id);
       formData.append('language', languageCode);
       const response = await fetch('/api/voice/process-audio', { method: 'POST', body: formData });
       const data = await response.json(); //returns a promise after reading extracted stream
       answers[field_id] = data.extracted_value; //backend's extracted answer
    }
    stream.getTracks().forEach(track => track.stop()); //stop microphone tracks
    return answers;
}
async function recordUserAnswer(stream) {
    return new Promise((resolve, reject) => {
        const mediaRecorder = new MediaRecorder(stream); //handles binary recording process
        const audioChunks = []; //audio collected in chunks
        mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
        mediaRecorder.onstop = (event) => {
         const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
         resolve(audioBlob); //compiles into one audio file
      };
      mediaRecorder.start();
      setTimeout(() => {
        mediaRecorder.stop();
        console.log("Recording stopped after 5 seconds");
      }, 5000);
    });
}
