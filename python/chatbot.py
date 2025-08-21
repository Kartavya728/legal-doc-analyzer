import sys
import requests
import base64
import json

# Gemini API Key
GEMINI_API_KEY = "AIzaSyDzI44HYgem4C7elnohwKsy5B3Ri2HO2hw"

def gemini_vision(image_path, prompt="Extract the text from this image and give a short summary."):
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": "image/jpeg", "data": image_b64}}
            ]
        }]
    }

    response = requests.post(url, json=payload, timeout=60)

    try:
        result = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return {"summary": result}
    except Exception:
        return {"error": response.text}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)

    image_path = sys.argv[1]
    result = gemini_vision(image_path)
    print(json.dumps(result))  # 👈 Output JSON to Node
