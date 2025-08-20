# agents.py

import os
from typing import TypedDict, List
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.pydantic_v1 import BaseModel as V1BaseModel
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Ensure the API key is available
if "GEMINI_API_KEY" not in os.environ:
    raise ValueError("GEMINI_API_KEY not found in .env file")

# --- Define the state for our graph ---
# This is the data that will be passed between nodes
class GraphState(TypedDict):
    document_text: str
    summary: str
    risks: List[dict]
    final_response: str

# --- Pydantic models for structured output ---
# This helps the LLM return reliable JSON
class Risk(V1BaseModel):
    term: str
    explanation: str
    severity: int

class Risks(V1BaseModel):
    risks: List[Risk]

# --- Initialize the LLM ---
llm = ChatGoogleGenerativeAI(model="gemini-pro", temperature=0.2)
structured_llm = llm.with_structured_output(Risks)

# --- Define the nodes of the graph ---

def summarize_node(state: GraphState) -> GraphState:
    """Summarizes the document text."""
    print("---NODE: Summarizing document---")
    prompt = ChatPromptTemplate.from_template(
        "Provide a concise, easy-to-understand summary of the following document:\n\n{document}"
    )
    chain = prompt | llm
    summary = chain.invoke({"document": state["document_text"]}).content
    return {"summary": summary}

def identify_risks_node(state: GraphState) -> GraphState:
    """Identifies risks in the document using structured output."""
    print("---NODE: Identifying risks---")
    prompt = ChatPromptTemplate.from_template(
        "Based on the following document, identify potential risks, unfair clauses, or important terms. "
        "For each risk, provide the term, a simple explanation, and a severity score from 1 (low) to 5 (high)."
        "\n\nDOCUMENT:\n{document}"
    )
    chain = prompt | structured_llm
    identified_risks = chain.invoke({"document": state["document_text"]})
    
    # Convert Pydantic models to simple dicts for JSON serialization
    risk_list = [risk.dict() for risk in identified_risks.risks]
    return {"risks": risk_list}

def format_response_node(state: GraphState) -> GraphState:
    """Formats the final response string."""
    print("---NODE: Formatting final response---")
    summary = state["summary"]
    risks = state["risks"]

    risk_lines = []
    if risks:
        for risk in sorted(risks, key=lambda r: r['severity'], reverse=True):
            risk_lines.append(
                f"- **{risk['term']}** (Severity: {risk['severity']}/5): {risk['explanation']}"
            )
    else:
        risk_lines.append("No significant risks were identified.")

    final_response = (
        f"## Document Analysis\n\n"
        f"### Summary\n{summary}\n\n"
        f"### Key Risks & Terms\n" + "\n".join(risk_lines)
    )
    return {"final_response": final_response}

# --- Build the graph ---

def create_graph():
    workflow = StateGraph(GraphState)

    # Add the nodes
    workflow.add_node("summarizer", summarize_node)
    workflow.add_node("risk_identifier", identify_risks_node)
    workflow.add_node("formatter", format_response_node)

    # Define the edges
    workflow.set_entry_point("summarizer")
    workflow.add_edge("summarizer", "risk_identifier")
    workflow.add_edge("risk_identifier", "formatter")
    workflow.add_edge("formatter", END)

    # Compile the graph into a runnable app
    return workflow.compile()

# Create a single instance of the graph to be used by the API
graph_app = create_graph()

print("LangGraph app created successfully.")