import os

from flask import Flask, send_from_directory
from flask_cors import CORS

from routes.enhance_image import enhance_bp
from routes.subsidy import subsidy_bp
from routes.b2b import b2b_bp
from routes.listing import listing_bp


# Absolute path to the uploads directory
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

# frontend/ is a sibling of backend/ (backend/app.py lives one level below
# the repo root, frontend/ lives at the repo root next to backend/).
# voice_flow.js, index.html, css, etc. all live under here.
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

# Ensure uploads/ exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def create_app():
    # template_folder + static_folder both point at frontend/ so:
    # render_template("index.html") -> frontend/index.html
    # url_for("static", filename="js/x.js") -> frontend/js/x.js

    app = Flask(
        __name__,
        template_folder=FRONTEND_DIR,
        static_folder=FRONTEND_DIR
    )

    # Allow the frontend running through Live Server
    # to communicate with Flask API routes.
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://127.0.0.1:5500",
                    "http://localhost:5500"
                ],
                "methods": [
                    "GET",
                    "POST",
                    "PUT",
                    "PATCH",
                    "DELETE",
                    "OPTIONS"
                ],
                "allow_headers": [
                    "Content-Type",
                    "Authorization"
                ]
            }
        }
    )

    app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

    # Register image enhancement routes
    app.register_blueprint(enhance_bp)

    # Register subsidy routes
    app.register_blueprint(subsidy_bp)

    # Register B2B / marketplace routes
    app.register_blueprint(b2b_bp)

    # Register voice-enabled product entry,
    # price prediction and listing routes
    app.register_blueprint(listing_bp)

    @app.route(
        "/uploads/<filename>",
        methods=["GET"]
    )
    def serve_upload(filename):
        """Serve processed/uploaded images."""

        return send_from_directory(
            app.config["UPLOAD_FOLDER"],
            filename
        )

    @app.route(
        "/",
        methods=["GET"]
    )
    def health_check():
        return {
            "status": "ok",
            "service": "kalakaar"
        }, 200

    return app


app = create_app()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )