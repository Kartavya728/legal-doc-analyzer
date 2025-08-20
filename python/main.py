import os
import sys
import json
import argparse
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.pydantic_v1 import BaseModel, Field
from typing import List

# --- Pydantic Data Structures for Structured Output ---
# This ensures our output is always in the correct JSON format.
class Risk(BaseModel):
    term: str = Field(description="The specific legal term or clause identified as a potential risk.")
    explanation: str = Field(description="A simple explanation of why this term is a risk or what it means.")

class AnalysisResult(BaseModel):
    summary: str = Field(description="A concise, easy-to-understand summary of the legal document.")
    risks: List[Risk] = Field(description="A list of potential risks or important terms.")

# --- LangChain Implementation ---
def analyze_document_with_langchain(text: str, api_key: str) -> dict:
    """Analyzes text using a simple LangChain chain."""
    
    # Set up the model
    model = ChatGoogleGenerativeAI(model="gemini-pro", google_api_key=api_key, temperature=0.3)
    
    # Set up the parser with our Pydantic model
    parser = JsonOutputParser(pydantic_object=AnalysisResult)
    
    # Create the prompt
    prompt = PromptTemplate(
        template="You are an expert legal assistant. Analyze the following legal document.\n"
                 "{format_instructions}\n"
                 "DOCUMENT TEXT:\n---\n{document}\n---\n",
        input_variables=["document"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )
    
    # Create the chain
    chain = prompt | model | parser
    
    # Invoke the chain
    result = chain.invoke({"document": text[:25000]}) # Truncate for safety
    return result

# --- LangGraph Implementation (for future use or comparison) ---
# Note: LangGraph is more for multi-step, stateful agentic workflows. 
# For this summarization task, a simple chain is often more direct.
def analyze_document_with_langgraph(text: str, api_key: str) -> dict:
    """A placeholder for a more complex LangGraph workflow if needed."""
    # For this specific task, LangGraph is overkill. The simple chain is more efficient.
    # We will just call the LangChain function as an example.
    # In a real scenario, you'd define a graph with nodes for summarization, risk identification, etc.
    return analyze_document_with_langchain(text, api_key)


# --- Main Execution Block ---
def main():
    try:
        # Load environment variables (GEMINI_API_KEY) from a .env file if it exists
        load_dotenv()
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables.")

        # Read the entire input text from standard input (piped from Node.js)
        document_text = sys.stdin.read()

        if not document_text:
            raise ValueError("Input text is empty.")

        # Use argparse to decide which method to run (defaults to langchain)
        parser = argparse.ArgumentParser(description="Analyze a legal document.")
        parser.add_argument(
            '--method', 
            type=str, 
            choices=['langchain', 'langgraph'], 
            default='langchain',
            help='The method to use for analysis.'
        )
        args = parser.parse_args()

        # Run the selected analysis function
        if args.method == 'langgraph':
            analysis = analyze_document_with_langgraph(document_text, api_key)
        else:
            analysis = analyze_document_with_langchain(document_text, api_key)

        # Print the final result as a JSON string to standard output
        sys.stdout.write(json.dumps(analysis))

    except Exception as e:
        # If any error occurs, print an error JSON to standard error
        error_payload = {"error": str(e)}
        sys.stderr.write(json.dumps(error_payload))
        sys.exit(1) # Exit with a non-zero status code to indicate failure

if __name__ == "__main__":
    main()