
from utils import *

class property:

    def __init__(self,chunks):
        self.chunks = chunks


    def extract_clauses_batched(self):
        joined_text = "\n\n---\n\n".join(self.chunks)

        prompt = f"""
    You are an expert in Indian property law and contract analysis. 
    You will receive parts of a property-related document (Sale Deed, Mortgage, Lease, Sale Agreement, etc.).

    Your task is to:

    1. Break the text into individual **clauses**.  
    2. Return each clause as a separate line of plain text.  
    3. Do not explain, summarize, or classify — just extract the clauses.  

    Document Text:
    {joined_text}
    """
        return call_gemini1(prompt)
    


    def extract_property_attributes(self,clause_text):
        """Extract structured attributes for Property Law clauses based on the classification of the clause"""

        prompt = f"""
        You are a legal assistant extracting structured data from property law clauses based on their classes that should be among 4 and this also you need to classify:
        -financial terms
        -deadlines and execution dates
        -buyer and seller info
        -property details

        Now from each clause, extract the attributes in **JSON format** with these keys:
        - if in buyer and seller info category then extract: BuyerSellerInfo: buyer_name, seller_name, addresses 
        - if in property details info category then extract: PropertyDetails: property_location, property_size
        - if in financial terms info category then extract: FinancialTerms: total_amount, advance_amount, installment_details, stamp_duty_responsibility
        - if in deadlines category then extract: Deadlines: possession_date, payment_deadline, lease_start_date, lease_end_date, termination_conditions
        - OtherNotes

        If an attribute is not present, return null.

        Clause:
        \"\"\"{clause_text}\"\"\"
        """

        return call_gemini1(prompt)
    


    def explain_property_document(self, property_attributes):
        """
        Generate a layman explanation for the entire Property Document
        using extracted attributes from each clause.
        """

        prompt = f"""
    You are a legal assistant. 
    You will be given a property contract broken into clauses, where each clause has
    structured attributes such as BuyerSellerInfo, PropertyDetails, FinancialTerms, Deadlines, OtherNotes.

    Your task:
    - Create a **clear explanation in simple English** of the entire document, as if explaining to someone with no legal background.  
    - Go through each section logically:
    1. Start with who the buyer and seller are (from BuyerSellerInfo).  
    2. Explain the property being dealt with (from PropertyDetails).  
    3. Explain the money terms — how much, when, who pays what (from FinancialTerms).  
    4. Explain deadlines — possession date, payment dates, lease period, termination conditions (from Deadlines).  
    5. Explain any responsibilities, conditions, or penalties (from OtherNotes).  
    6. End with an overall explanation of what the contract means.  

    Return the output in JSON with keys:
    - PartiesExplanation
    - PropertyExplanation
    - FinancialExplanation
    - DeadlinesExplanation
    - ResponsibilitiesAndPenalties
    - OverallExplanation

    Here is the structured attribute data to use:
    {property_attributes}
    """

        return call_gemini1(prompt)
    

    def generate_summary_and_comments(self,json_data):
        prompt = f"""
    You are a legal assistant specializing in Indian property law.

    You will receive structured information about a property-related document in JSON format.  
    Your tasks are:
    1. Generate a clear, easy-to-understand summary of the entire document for a layman.  
    2. Give your personal comments on whether the document terms seem fair to both parties or biased toward one party.  
    3. State whether the document appears legally valid under general Indian property and contract law principles.

    JSON Input:
    {json_data}

    Return your output in JSON format with these keys:
    - Summary
    - FairnessComment
    - ValidityComment
    """
        return call_gemini1(prompt)


