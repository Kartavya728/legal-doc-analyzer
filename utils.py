# utils.py
from google import genai  # or whichever client library you use

import os
from dotenv import load_dotenv
load_dotenv()

gemini=os.getenv("gemini_api")
# Initialize Gemini API
client = genai.Client(api_key=gemini)


def call_gemini(prompt, model="gemini-1.5-flash"): 
    """Direct call to Gemini API""" 
    response = client.models.generate_content( model=model, contents=prompt ) 
    return response.text.strip()

def call_gemini1(prompt, model="gemini-1.5-flash"):
    """Call Gemini API with streaming if supported"""
    stream = client.models.generate_content_stream(
        model=model,
        contents=prompt,
        
    )

    for response in stream:
        yield response.text.strip()
