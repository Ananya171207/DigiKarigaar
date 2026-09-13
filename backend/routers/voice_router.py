from flask import request, Blueprint, jsonify
import os
import tempfile
from google import genai
from google.genai import types

voice_bp = Blueprint('voice', __name__)

@voice_bp.route('/api/voice/process-audio', methods=['POST'])
def process_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"error": "GEMINI_API_KEY environment variable missing"}), 500

    client = genai.Client(api_key=api_key)

    audio_file = request.files['audio']
    field_id = request.form.get('field_id', 'unknown')
    language = request.form.get('language', 'en')

    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, 'user_input.webm')
    audio_file.save(temp_path)

    uploaded_file = None
    try:
        uploaded_file = client.files.upload(
            file=temp_path,
            config=types.UploadFileConfig(mime_type='audio/webm')
        )

        
        prompt = f"""You are a strict data extraction model for an artisan app.
Target Field ID: '{field_id}'
Input Language Hint: '{language}'

Task: Listen to the audio file, transcribe what the artisan says, and extract ONLY the precise value corresponding to the target field ID.

Rules:
- Output ONLY the final extracted value string.
- Do NOT include extra conversational text, full sentences, quotes, or JSON formatting.
- If the spoken audio is in Hindi, Hinglish, or any regional language, translate the extracted value into clear English.
- If the value cannot be inferred, return 'Unknown'.
"""

        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=[uploaded_file, prompt]
        )

        extracted_value = response.text.strip() if response.text else "Unknown"

    except Exception as e:
        print(f"Error processing audio stream: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        if uploaded_file:
            try:
                client.files.delete(name=uploaded_file.name)
            except Exception:
                pass

        if os.path.exists(temp_path):
            os.remove(temp_path)

    return jsonify({"extracted_value": extracted_value}), 200