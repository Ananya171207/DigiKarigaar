from flask import Blueprint, jsonify, request
import json
import os
import uuid

b2b_bp = Blueprint("b2b", __name__)

BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)

DATA_DIR = os.path.join(
    BASE_DIR,
    "frontend",
    "data"
)


def load_json(filename):
    path = os.path.join(DATA_DIR, filename)

    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


@b2b_bp.route("/api/b2b-channels", methods=["GET"])
def get_b2b_channels():

    return jsonify(
        load_json("b2b_channels.json")
    )


@b2b_bp.route(
    "/api/marketplace-listing-schema",
    methods=["GET"]
)
def get_listing_schema():

    return jsonify(
        load_json(
            "marketplace_listing_schema.json"
        )
    )


@b2b_bp.route(
    "/api/marketplace-registration-schema",
    methods=["GET"]
)
def get_registration_schema():

    return jsonify(
        load_json(
            "marketplace_registration_schema.json"
        )
    )


@b2b_bp.route(
    "/api/b2b-listing",
    methods=["POST"]
)
def create_b2b_listing():

    data = request.get_json(silent=True) or {}

    if "product" not in data:
        return jsonify({
            "error":
                "Listing product data required"
        }), 400

    listing_id = (
        data.get("listing_id")
        or str(uuid.uuid4())
    )

    return jsonify({
        "listing_id": listing_id,
        "status": "listed",
        "submission_status":
            "prototype_not_submitted"
    }), 200


@b2b_bp.route(
    "/api/marketplace-registration",
    methods=["POST"]
)
def submit_marketplace_registration():

    data = request.get_json(silent=True) or {}

    artisan_id = (
        data.get("artisan_id")
        or data.get("mobile_number")
    )

    channel = data.get(
        "marketplace_channel"
    )

    if not artisan_id:
        return jsonify({
            "error":
                "artisan_id or mobile_number is required"
        }), 400

    if not channel:
        return jsonify({
            "error":
                "marketplace_channel is required"
        }), 400

    seller_id = (
        f"DEMO-{channel.upper()}-"
        f"{uuid.uuid4().hex[:6].upper()}"
    )

    return jsonify({
        "generated_seller_id":
            seller_id,

        "registration_status":
            "prototype_not_submitted"
    }), 200