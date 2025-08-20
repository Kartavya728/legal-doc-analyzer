# main.py

import io
from fastapi import FastAPI, UploadFile, HTTPException
from pypdf import PdfReader
from agents import graph_app # Import our compiled LangGraph app

# Initialize the FastAPI app
app = FastAPI(
    title="Legal Document Analyzer API",
    description="An API for analyzing legal documents using LangGraph.",
)

@app.get("/", summary="Root endpoint to check if the API is running.")
def read_root():
    return {"status": "API is running"}

@app.post("/analyze", summary="Analyze a PDF document.")
async def analyze_document(file: UploadFile):
    """
    Accepts a PDF file, extracts text, and returns an AI-powered analysis.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF.")

    print(f"Received file: {file.filename}")

    try:
        # Read the file in memory
        contents = await file.read()
        pdf_stream = io.BytesIO(contents)
        
        # Extract text using pypdf
        reader = PdfReader(pdf_stream)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""

        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from the PDF.")

        print(f"Extracted {len(text)} characters of text from the PDF.")

        # Invoke the LangGraph app with the extracted text
        initial_state = {"document_text": text}
        final_state = graph_app.invoke(initial_state)

        # Return the final formatted response
        return {"analysis": final_state.get("final_response", "Analysis could not be completed.")}

    except Exception as e:
        print(f"An error occurred: {e}")
        raise HTTPException(status_code=500, detail=str(e))