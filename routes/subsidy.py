from flask import Blueprint, jsonify, request
import json
import os
import uuid

subsidy_bp = Blueprint("subsidy", __name__)

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


@subsidy_bp.route("/api/subsidy-schemes", methods=["GET"])
def get_subsidy_schemes():
    return jsonify(
        load_json("subsidy_schemes.json")
    )


@subsidy_bp.route("/api/karigar-form-schema", methods=["GET"])
def get_karigar_form_schema():
    return jsonify(
        load_json("karigar_form_schema.json")
    )


@subsidy_bp.route("/api/subsidy-application", methods=["POST"])
def submit_subsidy_application():

    data = request.get_json(silent=True) or {}

    artisan_id = (
        data.get("artisan_id")
        or data.get("phone")
    )

    if not artisan_id:
        return jsonify({
            "error": "artisan_id or phone is required"
        }), 400

    registration_number = (
        "DEMO-VK-"
        + uuid.uuid4().hex[:8].upper()
    )

    return jsonify({
        "registration_number":
            registration_number,

        "submission_status":
            "demo_not_submitted"
    }), 200