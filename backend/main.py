import os
import json
from flask import Flask, render_template, jsonify, request
from routers.voice_router import voice_bp
from dotenv import load_dotenv
from routers.bhashini_router import bhashini_bp
 
import joblib
import pandas as pd
 
load_dotenv()
 
app = Flask(__name__,
            template_folder='templates',
            static_folder='../frontend')
 
app.register_blueprint(bhashini_bp)
app.register_blueprint(voice_bp)
 
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "artisan_price_model.pkl")
price_model = None
try:
    price_model = joblib.load(MODEL_PATH)
    print(f"[price model] Loaded successfully from {MODEL_PATH}")
except Exception as e:
    print(f"[price model] WARNING: failed to load ({e}). "
          f"/api/predict-price will fall back to the placeholder heuristic.")
 
 
@app.route('/')
def home():
    return render_template('index.html')
 
 
@app.route("/generate-listing", methods=["POST"])
def generate_listing():
    data = request.json or {}
 
    transcription = data.get("transcription", "")
    category = data.get("category", "Handicrafts").strip() or "Handicrafts"
    material = data.get("material", "Handmade").strip() or "Handmade"
    size = data.get("size", "Standard").strip() or "Standard"
    price = data.get("estimated_price", 0)
 
    listing_data = {
        "title": f"Authentic Handcrafted {material.title()} {category.title()}",
        "category": category.title(),
        "description": f"Exquisitely crafted {category.lower()} built with authentic {material.lower()}. "
                       f"This {size.lower()} product reflects traditional Indian craftsmanship and quality detailing.",
        "highlights": [
            f"100% Genuine {material.lower()} material",
            f"Size / Dimensions: {size.title()}",
            "Handcrafted by local Indian artisans",
            "Durable and premium finish"
        ],
        "tags": [category.lower(), material.lower(), "handcrafted", "artisancraft", "indianart"],
        "price": price
    }
 
    return jsonify({"status": "success", "listing": listing_data}), 200
 
 
@app.route("/api/predict-price", methods=["POST"])
def predict_price():
    data = request.json or {}
 
    category = (data.get("category") or "").strip()
    material = (data.get("material") or "").strip()
    size = (data.get("size") or "").strip()

    category_norm = category.title() if category else "Handicraft"
    material_norm = material.title() if material else "Handmade"
    size_norm = size.title() if size else "Medium"
 
    final_price = None
    used_model = False
 
    if price_model is not None:
        try:
            input_df = pd.DataFrame([{
                "category": category_norm,
                "material": material_norm,
                "size": size_norm
            }])
            predicted = price_model.predict(input_df)[0]
            final_price = max(round(float(predicted)), 0)
            used_model = True
        except Exception as e:
            print(f"[price model] Prediction failed, falling back to heuristic: {e}")
 
    if final_price is None:
        # Placeholder heuristic — only used if the model didn't load or
        # prediction raised an exception, so the demo never hard-fails.
        final_price = 450
        if size.lower() == "small":
            final_price = 250
        elif size.lower() == "large":
            final_price = 850
 
    return jsonify({
        "status": "success",
        "estimated_price": final_price,
        "price_range": {
            "min": round(final_price * 0.90),
            "max": round(final_price * 1.10)
        },
        "source": "model" if used_model else "fallback_heuristic"
    }), 200
 
 
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
 