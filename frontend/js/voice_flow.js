let currentUtterance = null;
 
function speakQuestion(text, lang = 'hi-IN') {
    return new Promise((resolve) => {
        if (!('speechSynthesis' in window)) {
            console.error('Text-to-speech not supported.');
            return resolve();
        }
 
        window.speechSynthesis.cancel();
 
        let hasResolved = false;
        const done = () => {
            if (!hasResolved) {
                hasResolved = true;
                clearTimeout(timeoutId);
                resolve();
            }
        };
 
        const timeoutId = setTimeout(() => {
            console.warn("TTS timed out, skipping speech to proceed.");
            window.speechSynthesis.cancel();
            done();
        }, 3000);
 
        currentUtterance = new SpeechSynthesisUtterance(text);
        currentUtterance.lang = lang;
        currentUtterance.rate = 1.0;
 
        currentUtterance.onend = () => done();
        currentUtterance.onerror = () => done();
 
        setTimeout(() => {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
            window.speechSynthesis.speak(currentUtterance);
        }, 50);
    });
}
 
function listenForAnswer(lang = 'hi-IN', timeoutMs = 7000) {
    return new Promise((resolve) => {
        const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
 
        if (!SpeechRecognitionImpl) {
            console.error('SpeechRecognition not supported in this browser. Use Chrome.');
            return resolve('');
        }
 
        const recognition = new SpeechRecognitionImpl();
        recognition.lang = lang;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
 
        let settled = false;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            clearTimeout(safetyTimer);
            try { recognition.stop(); } catch (e) { /* already stopped */ }
            resolve(value);
        };
 
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim();
            finish(transcript);
        };
 
        recognition.onerror = (event) => {
            console.warn('SpeechRecognition error:', event.error);
            finish('');
        };
 
        recognition.onend = () => {
            finish('');
        };
 
        const safetyTimer = setTimeout(() => {
            console.warn('SpeechRecognition timed out with no result.');
            finish('');
        }, timeoutMs);
 
        try {
            recognition.start();
        } catch (e) {
            console.error('Could not start SpeechRecognition:', e);
            finish('');
        }
    });
}
 

function getDynamicQuestionSchema(containerSelector = '#productForm') {
    const promptElements = document.querySelectorAll(`${containerSelector} [data-prompt]`);
    const seen = new Set();
    const schema = [];
 
    promptElements.forEach((el) => {
        const fieldId = el.name || el.id;
        if (!fieldId || seen.has(fieldId)) return;
        seen.add(fieldId);
        schema.push({
            field_id: fieldId,
            prompt: el.getAttribute('data-prompt'),
            input_id: el.id || fieldId
        });
    });
 
    return schema;
}
 
function populateInputField(inputId, textValue) {
    return new Promise((resolve) => {
        if (!textValue) return resolve();
 
        const target = document.getElementById(inputId) || document.querySelector(`[name="${inputId}"]`);
 
        if (!target) {
            console.warn(`No DOM element found for '${inputId}' — value was still captured in the returned answers.`);
            return resolve();
        }
 
        const type = (target.type || '').toLowerCase();
 
        if (type === 'radio' || type === 'checkbox') {
            console.log(`Skipping live preview for '${inputId}' (${type}) — set correctly via field_mapper.js at the end.`);
            return resolve();
        }
 
        if (target.tagName === 'SELECT') {

            const matched = Array.from(target.options).some(opt => opt.value === textValue);
            if (matched) {
                target.value = textValue;
                target.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                console.log(`No exact option match for '${inputId}' yet — set correctly via field_mapper.js at the end.`);
            }
            return resolve();
        }
 
        // Plain text / textarea / number / tel / date: safe to echo directly.
        target.value = textValue;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
 
        requestAnimationFrame(() => {
            target.focus();
            target.style.backgroundColor = '#d1e7dd';
            setTimeout(() => {
                target.style.backgroundColor = '';
                resolve();
            }, 300);
        });
    });
}
 
async function generateListingFromData(formAnswers) {
    const listingContentDiv = document.getElementById('listingContent');
    listingContentDiv.innerHTML = "<em>Generating listing description...</em>";
 
    const productName = document.getElementById('productNameInput')?.value || formAnswers.productNameInput || '';
    const category = document.getElementById('categoryInput')?.value || formAnswers.categoryInput || 'Handicrafts';
    const material = document.getElementById('materialInput')?.value || formAnswers.materialInput || 'Handmade';
    const size = document.getElementById('sizeInput')?.value || formAnswers.sizeInput || 'Standard';
    const transcription = document.getElementById('transcriptionInput')?.value || formAnswers.transcriptionInput || productName;
    const price = formAnswers.price || 450;
 
    try {
        const response = await fetch('/generate-listing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcription: transcription,
                category: category,
                material: material,
                size: size,
                estimated_price: price
            })
        });
 
        const data = await response.json();
 
        if (data.status === 'success' && data.listing) {
            const listing = data.listing;
            listingContentDiv.innerHTML = `
                <h4>${listing.title}</h4>
                <p><strong>Category:</strong> ${listing.category}</p>
                <p><strong>Description:</strong> ${listing.description}</p>
                <p><strong>Price:</strong> ₹${listing.price}</p>
                <p><strong>Highlights:</strong></p>
                <ul>
                    ${listing.highlights.map(h => `<li>${h}</li>`).join('')}
                </ul>
                <p><strong>Tags:</strong> ${listing.tags.join(', ')}</p>
            `;
        } else {
            listingContentDiv.innerHTML = `<span style="color:red;">Error rendering listing.</span>`;
        }
    } catch (err) {
        console.error("Listing error:", err);
        listingContentDiv.innerHTML = `<span style="color:red;">Failed to connect to backend server.</span>`;
    }
}
 

async function handleProductListingComplete(answers) {
    try {
        const priceRes = await fetch('/api/predict-price', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category: answers.categoryInput || answers.category || '',
                material: answers.materialInput || answers.material || '',
                size: answers.sizeInput || answers.size || ''
            })
        });
        const priceData = await priceRes.json();
        answers.price = priceData.estimated_price || 450;
    } catch (e) {
        answers.price = 450;
    }
 
    await generateListingFromData(answers);
    return answers;
}
 
async function startVoiceFlow(questionList, languageCode = 'hi', ttsLang = 'hi-IN', options = {}) {
    const { onComplete } = options;
    const answers = {};
 
    for (const item of questionList) {
        const { field_id, prompt, input_id } = item;
 
        console.log(`Asking field [${field_id}]: "${prompt}"`);
        await speakQuestion(prompt, ttsLang);
 
        console.log(`Listening for [${field_id}]...`);
        const extractedVal = await listenForAnswer(ttsLang);
        console.log(`Heard for [${field_id}]:`, extractedVal);
 
        await populateInputField(input_id, extractedVal);
 
        answers[field_id] = extractedVal;
    }
 
    if (typeof onComplete === 'function') {
        await onComplete(answers);
    }
 
    return answers;
}
 
document.addEventListener('DOMContentLoaded', () => {
    const productBtn = document.getElementById('startVoiceBtn');
    if (productBtn) {
        productBtn.addEventListener('click', () => {
            const questions = getDynamicQuestionSchema('#productForm');
            startVoiceFlow(questions, 'hi', 'hi-IN', { onComplete: handleProductListingComplete });
        });
    }
});
 