"""
Kalakaar - simple manual test script.
 
Usage:
    1. Place a test image named `sample.png` in the project root.
    2. Start the API locally:  python app.py
    3. In another terminal:    python test_api.py
"""
 
import os
import requests
 
API_URL = "http://127.0.0.1:5000/api/enhance-image"
SAMPLE_IMAGE_PATH = os.path.join(os.path.dirname(__file__), "sample.png")
 
 
def main():
    if not os.path.exists(SAMPLE_IMAGE_PATH):
        print(f"Sample image not found at: {SAMPLE_IMAGE_PATH}")
        print("Add a 'sample.png' to the project root before running this test.")
        return
 
    with open(SAMPLE_IMAGE_PATH, "rb") as img_file:
        files = {"image": img_file}
        response = requests.post(API_URL, files=files)
 
    print(f"Status Code: {response.status_code}")
    try:
        print("Response JSON:", response.json())
    except ValueError:
        print("Response was not valid JSON:", response.text)
 
 
if __name__ == "__main__":
    main()
 