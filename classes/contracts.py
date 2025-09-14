from utils import *
import json
import re

class contracts:

    def __init__(self,chunks):
        self.chunks = chunks


    def extract_contract_clauses(self, chunk_text):
        prompt = f"""
        You are a legal contract analyzer. 
        Your task is to read the given contract/agreement text and extract **both Parties and Clauses**.

        Rules:
        1. First, list the **Parties** involved in the contract with their roles (e.g., Employer – ABC Corp, Employee – John Doe, Landlord – Mr. X, Tenant – Ms. Y).
        2. After that, list the **major Clauses**. A clause means any distinct contractual provision such as "Confidentiality", "Termination", "Governing Law", "Payment Terms", etc.
        3. Each clause should be summarized into **one concise sentence**.
        4. Format strictly as a **clean numbered list** (1., 2., 3., …).  
        5. Do not explain, do not repeat, do not add anything else. Just return the numbered list.

        Document Text:
        {chunk_text}
        """
        return call_gemini1(prompt)


    def classify_contract_level2(self,clause_text):
        """Classify each clause into Contract sub-categories"""
        
        prompt = f"""
        You are a legal assistant specializing in Contract Law.

        Classify the following clause into one of these sub-categories 
        (or suggest a new but precise sub-category if none fits):


        - Core Relationship: Parties, Scope, Duration
        - Financial Terms: Salary, Fees, Rent, Payment Terms
        - Performance & Obligations: Duties, Service Levels, Maintenance
        - Confidentiality & IP: NDA, Trade Secrets, IP Ownership
        - Termination & Exit: Termination grounds, Notice periods, Handover
        - Risk & Restrictions: Indemnity, Liability, Non-Compete, Non-Solicitation
        - Dispute Handling: Governing Law, Arbitration, Mediation, Jurisdiction
        - Boilerplate: Force Majeure, Severability, Entire Agreement, Notices

        Clause:
        \"\"\"{clause_text}\"\"\"  

        Return only the sub-category name.
        """
        return call_gemini1(prompt)




    def extract_contract_attributes(self, clause_text):
        """Extract structured attributes for Contract clauses"""

        prompt = f"""
        You are a legal assistant extracting structured data from contract clauses.

        From the following clause, extract the attributes in **JSON format** with these keys:
        - Parties
        - Scope
        - FinancialTerms
        - Obligations
        - Confidentiality
        - IP_Rights
        - TerminationConditions
        - RiskRestrictions
        - DisputeResolution
        - Boilerplate
        - OtherNotes

        If an attribute is not relevant, return null.

        Clause:
        \"\"\"{clause_text}\"\"\"
        """
        return call_gemini1(prompt)




    def explain_contract_clause(self, clause_text):
        """Generate explanation + practical effect for a Contract clause"""

        prompt = f"""
        You are a legal assistant.

        TASK: Read the clause and provide:
        1. A clear explanation of what the clause states in plain English.
        2. The practical effect on the parties (rights, obligations, benefits, restrictions).

        Rules:
        - Focus only on the given clause, do not assume or speculate about missing terms.
        - Cover everything explicitly mentioned in the clause.
        - Keep language clear, professional, and non-repetitive.
        - Explanations can be a few sentences if needed, but avoid unnecessary length.
        - If the clause only identifies a party or role, state that directly without judging completeness.

        Clause:
        \"\"\"{clause_text}\"\"\"

        Return the output in JSON format with every key in diffrent line:
        - Explanation
        - PracticalEffect
        """
        return call_gemini1(prompt)
    

    def makenice(self, clause_text):
        """Generate explanation + practical effect for a Contract clause"""

        prompt = f"""
        We would give you a json file and make it display nice and which cell are duplicated make it as one and remove all null columns and the key name which are repeated merge them in a list display it nicely 
        {clause_text}
        """
        return call_gemini1(prompt)

    