import os
from flask import Flask, send_from_directory
 
from routes.enhance_image import enhance_bp
 
# Absolute path to the uploads directory (safe for both local + Render)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
 
# Ensure uploads/ exists (Render's ephemeral filesystem needs this on cold start)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
 
 
def create_app():
    app = Flask(__name__)
    app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
 
    # Register the enhance-image blueprint (contract-locked name: enhance_bp)
    app.register_blueprint(enhance_bp)
 
    @app.route("/uploads/<filename>", methods=["GET"])
    def serve_upload(filename):
        """Serve processed/uploaded images statically."""
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)
 
    @app.route("/", methods=["GET"])
    def health_check():
        return {"status": "ok", "service": "kalakaar"}, 200
 
    return app
 
 
app = create_app()
 
if __name__ == "__main__":
    # Local dev server only. In production, gunicorn imports `app` directly:
    #   gunicorn app:app --bind 0.0.0.0:$PORT
    app.run(host="0.0.0.0", port=5000, debug=True)

from flask_cors import CORS

# ... inside create_app(), right after app = Flask(__name__)
CORS(app)  # allow all origins for now; restrict later for production