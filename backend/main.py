from flask import Flask
from routers.voice_router import voice_bp 
from dotenv import load_dotenv
load_dotenv() 

app = Flask(__name__)

app.register_blueprint(voice_bp)

@app.route('/')
def home():
    return "Home Page"

if __name__ == '__main__':
    app.run(debug=True)