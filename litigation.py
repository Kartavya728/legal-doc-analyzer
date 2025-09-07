import pandas as pd
from collections import defaultdict
from utils import call_gemini, client

class litigation:

    def __init__(self,chunks):
        self.chunks = chunks


    def extract_clauses(self,chunk_text):
        prompt = f"""
        You are a legal document analyzer. 
        Your task is to read the given legal document text and extract **all legal clauses, sections, or laws mentioned** in the document. 

        ⚖️ Rules:
        1. A "clause" means any legal reference like "Section 420 IPC", "Section 161 CrPC", etc.  
        2. If the same clause appears multiple times in the document, list it only once.  
        3. Output should be a clean numbered list.  
        4. Do not repeat, do not explain, do not add anything else.

        Document Text:{chunk_text}
        """
        return call_gemini(prompt)
    


    def classify_criminal_level2(self,clause_text):
        """Classify each clause into Criminal Law sub-categories"""
    
        prompt = f"""
        You are a legal assistant specializing in Criminal Law.

        Classify the following clause into one of these sub-categories 
        (or suggest a new but precise sub-category if none fits):

        - Offenses & Crimes: Theft, Fraud, Assault, Homicide, Cybercrime
        - Procedures: Investigation, Arrest, Bail, Trial Process, Appeals
        - Punishments & Sentences: Imprisonment, Fine, Probation/Parole, Death Penalty
        - Rights & Protections: Rights of the Accused, Victim Protection, Evidence Rules
        - Jurisdiction & Authority: Police Powers, Court Jurisdiction, Prosecutor Roles

        Clause:
        \"\"\"{clause_text}\"\"\"

        Return only the sub-category name.
        """

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        return response.text.strip()


    def extract_criminal_attributes(self,clause_text):
        """Extract structured attributes for Criminal Law clauses"""

        prompt = f"""
        You are a legal assistant extracting structured data from criminal law clauses.

        From the following clause, extract the attributes in **JSON format** with these keys:
        - OffenseType
        - ProcedureStep
        - Punishment
        - RightsProtections
        - Authority
        - OtherNotes

        If an attribute is not present, return null.

        Clause:
        \"\"\"{clause_text}\"\"\"
        """

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        return response.text.strip()
    

    def explain_criminal_clause(self,clause_text):
        """Generate explanation + punishment details for a Criminal Law clause"""

        prompt = f"""
    You are a legal assistant. 
    Read the following clause and provide:

    1. A clear explanation in simple English.  
    2. Specific punishment details (imprisonment, fine, both, or none).  

    Clause:
    \"\"\"{clause_text}\"\"\"

    Return the output in JSON with keys:
    - Explanation
    - PunishmentDetails
    """

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        return response.text.strip()



    def extract_case_details(self,clause_text):
        prompt = f"""
        You are a legal assistant. Extract the following details from this criminal law clause:

        1. Complainant
        2. Investigator / Police Officer
        3. Court / Authority
        4. Section / Law
        5. Date / Time
        6. Punishment
        7. Other Notes

        Return output in JSON format. If a detail is not present, use null.

        Clause:
        \"\"\"{clause_text}\"\"\"
        """
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        return response.text.strip()



    def deduplicate_details(self,raw_details):
        prompt = f"""
        You are an expert legal assistant.
        You are given a list of extracted legal clauses/details. 
        Some may overlap, repeat, or mean the same thing in different words.

        Task:
        1. Group overlapping/duplicate clauses together.
        2. Keep only ONE best simplified version for each group.
        3. Return the result as a clean JSON list.

        Extracted details:
        {raw_details}

        Return format example:
        list
        """

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        return response.text.strip()
    


    def summarize_with_advice(self, json):
        prompt = f"""
        You are a legal assistant AI.

        You are given in list format which contains:
        1. Legal document category
        2. Extracted clauses
        3. Their explanations
        4. Important background knowledge 

        {json}

        Task:
        - Write in very **simple, everyday language**.
        - Structure the output in 4 parts:

        1. **What this document means for you**  
        - Summarize the accusations or obligations in 3-5 short bullet points.  

        1.2 Specify the correlation of evidence in terms of what evidence they have and which evidence proves which part of the accused laws and what they can't prove yet
        2. **What happens if you ignore this**  
        - Clearly state possible punishments, fines, or risks.  

        3. **What you should do now**  
        - Give 2-3 simple, practical steps.  

        4. **Important Note**  
        - Always add: "This is not legal advice. Please consult a qualified lawyer for proper guidance."  

        5.- Clearly explain the **main risks, rights, and consequences**.
        Avoid jargon. Be clear, short, and supportive.
        """

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        return response.text.strip()