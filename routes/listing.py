import json
import os

from flask import (
    Blueprint,
    render_template,
    jsonify,
    request
)

import joblib
import pandas as pd

from dotenv import load_dotenv

listing_bp = Blueprint("listing", __name__)
PRODUCTS = []
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
load_dotenv(
    os.path.join(
        APP_ROOT,
        ".env"
    )
)

GEMINI_MODEL = os.environ.get(
    "GEMINI_MODEL",
    "gemini-3.6-flash"
)

gemini_client = None

try:
    from google import genai

    gemini_api_key = os.environ.get(
        "GEMINI_API_KEY"
    )

    if gemini_api_key:
        gemini_client = genai.Client(
            api_key=gemini_api_key
        )

        print(
            f"[gemini] Client initialized "
            f"with {GEMINI_MODEL}."
        )

    else:
        print(
            "[gemini] GEMINI_API_KEY "
            "was not found."
        )

except Exception as error:
    print(
        "[gemini] Could not initialize:",
        error
    )
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
def _strip_json_fences(text):
    if text is None:
        return "{}"
    text = str(text).strip()
    if text.startswith("```"):
        text = text.replace("```json", "", 1).replace("```", "", 1)
    return text.strip()


def _gemini_price_prediction(
    category,
    material,
    size
):
    if gemini_client is None:
        raise RuntimeError(
            "Gemini client is unavailable."
        )

    prompt = f"""
Estimate a reasonable retail listing price in Indian rupees
for a handmade Indian artisan product.

Category: {category}
Material: {material}
Size: {size}

Consider material cost, artisan labour, craft complexity,
product size, and a modest seller margin.

Do not claim to have searched live marketplaces.

Return only valid JSON:

{{
  "predicted_price": 0,
  "min_price": 0,
  "max_price": 0,
  "reason": "one short sentence"
}}

All prices must be positive integer values in INR.
The range must satisfy:

min_price <= predicted_price <= max_price
"""

    response = (
        gemini_client
        .models
        .generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
    )

    data = json.loads(
        _strip_json_fences(
            response.text
        )
    )

    predicted_price = max(
        round(
            float(
                data["predicted_price"]
            )
        ),
        1
    )

    min_price = max(
        round(
            float(
                data.get(
                    "min_price",
                    predicted_price * 0.90
                )
            )
        ),
        1
    )

    max_price = max(
        round(
            float(
                data.get(
                    "max_price",
                    predicted_price * 1.10
                )
            )
        ),
        1
    )

    min_price = min(
        min_price,
        predicted_price
    )

    max_price = max(
        max_price,
        predicted_price
    )

    return {
        "predicted_price":
            predicted_price,

        "min_price":
            min_price,

        "max_price":
            max_price,

        "reason":
            str(
                data.get(
                    "reason",
                    "AI-assisted price estimate."
                )
            )
    }

@listing_bp.route(
    "/api/products",
    methods=["GET", "POST"]
)
def products():
    if request.method == "GET":
        return jsonify(PRODUCTS), 200

    payload = request.get_json(
        silent=True
    ) or {}

    # Supports either:
    # { product data }
    # or:
    # { "product": { product data } }
    product = payload.get(
        "product",
        payload
    )

    if not isinstance(product, dict):
        return jsonify({
            "status": "error",
            "message": "Invalid product data."
        }), 400

    if not product.get("product_id"):
        product["product_id"] = (
            f"product-{len(PRODUCTS) + 1}"
        )

    product["status"] = "synced"

    PRODUCTS.append(product)

    return jsonify({
        "status": "success",
        "message": "Product created successfully.",
        "product": product
    }), 201

@listing_bp.route("/api/predict-price", methods=["POST"])
@listing_bp.route(
    "/api/predict-price",
    methods=["POST"]
)
def predict_price():
    data = request.json or {}

    category = (
        data.get("category") or ""
    ).strip()

    material = (
        data.get("material") or ""
    ).strip()

    size = (
        data.get("size") or ""
    ).strip()

    category_norm = (
        category.title()
        if category
        else "Handicraft"
    )

    material_norm = (
        material.title()
        if material
        else "Handmade"
    )

    size_norm = (
        size.title()
        if size
        else "Medium"
    )

    final_price = None
    min_price = None
    max_price = None
    source = None
    reason = None

    # ------------------------------------------
    # Option 1: trained local ML model
    # ------------------------------------------

    if price_model is not None:
        try:
            input_df = pd.DataFrame(
                [
                    {
                        "category":
                            category_norm,

                        "material":
                            material_norm,

                        "size":
                            size_norm
                    }
                ]
            )

            predicted = price_model.predict(
                input_df
            )[0]

            final_price = max(
                round(
                    float(predicted)
                ),
                1
            )

            min_price = round(
                final_price * 0.90
            )

            max_price = round(
                final_price * 1.10
            )

            source = "local_ml_model"

            reason = (
                "Estimated by the trained "
                "artisan price model."
            )

        except Exception as error:
            print(
                "[price model] Prediction failed:",
                error
            )

    # ------------------------------------------
    # Option 2: Gemini fallback
    # ------------------------------------------

    if (
        final_price is None and
        gemini_client is not None
    ):
        try:
            gemini_price = _gemini_price_prediction(
                    category_norm,
                    material_norm,
                    size_norm
                )

            final_price = (
                gemini_price[
                    "predicted_price"
                ]
            )

            min_price = (
                gemini_price[
                    "min_price"
                ]
            )

            max_price = (
                gemini_price[
                    "max_price"
                ]
            )

            source = "gemini_estimate"

            reason = gemini_price["reason"]

        except Exception as error:
            print(
                "[gemini] Price prediction failed, "
                "using heuristic:",
                error
            )

    # ------------------------------------------
    # Option 3: offline heuristic
    # ------------------------------------------

    if final_price is None:
        final_price = 450

        if size.lower() == "small":
            final_price = 250

        elif size.lower() == "large":
            final_price = 850

        min_price = round(
            final_price * 0.90
        )

        max_price = round(
            final_price * 1.10
        )

        source = "fallback_heuristic"

        reason = (
            "Fallback estimate based "
            "on product size."
        )

    return jsonify(
        {
            "status":
                "success",

            # app.js uses this field
            "predicted_price":
                final_price,

            # Older integration uses this field
            "estimated_price":
                final_price,

            "price_range": {
                "min":
                    min_price,

                "max":
                    max_price
            },

            "source":
                source,

            "reason":
                reason
        }
    ), 200
