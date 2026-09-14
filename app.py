import os

from flask import Flask, send_from_directory
from flask_cors import CORS

from routes.enhance_image import enhance_bp
from routes.subsidy import subsidy_bp
from routes.b2b import b2b_bp


# Absolute path to the uploads directory
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

# Ensure uploads/ exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def create_app():
    app = Flask(__name__)

    # Allow frontend to communicate with Flask backend
    CORS(app)

    app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

    # Register image enhancement
    app.register_blueprint(enhance_bp)

    # Register subsidy routes
    app.register_blueprint(subsidy_bp)

    # Register B2B / marketplace routes
    app.register_blueprint(b2b_bp)

    @app.route("/uploads/<filename>", methods=["GET"])
    def serve_upload(filename):
        """Serve processed/uploaded images statically."""
        return send_from_directory(
            app.config["UPLOAD_FOLDER"],
            filename
        )

    @app.route("/", methods=["GET"])
    def health_check():
        return {
            "status": "ok",
            "service": "kalakaar"
        }, 200

    return app


app = create_app()


if __name__ == "__main__":
    # Local development server
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )