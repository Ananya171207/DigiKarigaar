import os

from flask import Blueprint, render_template, jsonify, request

import joblib
import pandas as pd

listing_bp = Blueprint("listing", __name__)

# --- Price prediction model -----------------------------------------------
# artisan_price_model.pkl is a sklearn Pipeline (ColumnTransformer +
# OneHotEncoder + RandomForestRegressor) trained ONLY on
# ["category", "material", "size"], using Title Case English vocabulary
# (e.g. "Pottery", "Terracotta", "Medium"). OneHotEncoder(handle_unknown=
# "ignore") means an unmatched value is silently treated as unknown rather
# than raising an error, so title-case the inputs before predicting.
#
# Assumes artisan_price_model.pkl sits next to app.py (one level up from
# this routes/ folder) — adjust MODEL_PATH if it actually lives elsewhere.
APP_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(APP_ROOT, "backend", "artisan_price_model.pkl")

price_model = None
try:
    price_model = joblib.load(MODEL_PATH)
    print(f"[price model] Loaded successfully from {MODEL_PATH}")
except Exception as e:
    print(f"[price model] WARNING: failed to load ({e}). "
          f"/api/predict-price will fall back to the placeholder heuristic.")


# --- Voice-enabled product entry page --------------------------------------
# Serves the page voice_flow.js runs on. voice_flow.js itself must live at
# static/js/voice_flow.js (Flask's default static folder relative to app.py
# — no extra config needed since app.py doesn't override static_folder),
# and this template at templates/index.html, both relative to app.py's
# location, not this file's.
#
# Kept off "/" deliberately so it doesn't collide with the existing health
# check route in app.py. Move/rename as needed once confirmed safe to do so.
@listing_bp.route("/product-entry", methods=["GET"])
def product_entry():
    return render_template("index.html")


# --- Listing generation ------------------------------------------------
# Called by voice_flow.js's handleProductListingComplete once all
# product-form questions are answered.
@listing_bp.route("/generate-listing", methods=["POST"])
def generate_listing():
    data = request.json or {}

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


# --- Price prediction ------------------------------------------------
# Called by voice_flow.js's handleProductListingComplete right before
# generate-listing. Uses the real ML model when it loaded successfully,
# otherwise falls back to a placeholder heuristic so the demo never
# hard-fails on a missing/broken model file.
@listing_bp.route("/api/predict-price", methods=["POST"])
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
