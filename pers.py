import pandas as pd
import json
from utils import call_gemini, client

class pers:

    def __init__(self,chunks):
        self.chunks = chunks


    def extract_clauses(self,chunk_text):
        prompt = f"""
        You are a legal document analyzer. 
        Your task is to read the given document text and extract **important details or references**.

        📌 Rules for Personal Legal Documents:
        1. A "clause" here means any structured field or important reference such as:
        - Aadhaar Number, PAN Number, Driving License Number, Passport Number
        - Name, Father’s/Mother’s Name, Date of Birth
        - Address, Issuing Authority, Validity Period, Certificate/Marksheet details, Restrictions
        - Specific details such as gun type in gun license etc.
        2. If the same detail appears multiple times, list it only once.
        3. If some details are missing, skip them (do not invent).
        4. Output should be a clean numbered list.
        5. Do not repeat, do not explain, do not add anything else.

        Document Text:
        {chunk_text}
        """
        return call_gemini(prompt)
    


    def classify_personal_document(self,full_doc_text):
        """Predict overall Personal Legal Document type by looking at the full document"""
        
        prompt = f"""
        You are a legal assistant specializing in Personal Legal Documents.

        Look at the full document text and predict the most likely document type. 
        Consider structure, keywords, and overall content — not just one line.

        Possible types include (but are not limited to):
        - Aadhaar Card
        - PAN Card
        - Passport
        - Voter ID
        - Driving License
        - Marksheet
        - Degree Certificate
        - Transcript
        - Bank Passbook
        - Salary Slip
        - Tax Certificate
        - Medical Certificate
        - Vaccination Card
        - Address Proof
        - Rent Agreement
        - Utility Bill
        - Birth Certificate
        - Marriage Certificate
        - Death Certificate
        - Gun License

        Return output in JSON with keys:
        - "PredictedDocumentType"
        - "Confidence" (High, Medium, Low)
        """

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt + f"\n\nDocument:\n\"\"\"{full_doc_text}\"\"\""
        )
        return response.text.strip()



    def classify_personal_level2(self,clause_text):
        """Classify each clause into Personal Legal Document sub-categories"""
    
        prompt = f"""
        You are a legal assistant specializing in Personal Legal Documents.

        Classify the following clause into one of these sub-categories 
        (or suggest a new but precise sub-category if none fits):

        - Identity Documents: Aadhaar Card, PAN Card, Passport, Voter ID, Driving License
        - Educational Records: Marksheet, Degree Certificate, Transcript
        - Financial Documents: Bank Passbook, Salary Slip, Tax Certificate
        - Health Records: Medical Certificate, Vaccination Card
        - Residential Proof: Address Proof, Rent Agreement, Utility Bill
        - Other Personal Certificates: Birth Certificate, Marriage Certificate, Death Certificate

        Clause:
        \"\"\"{clause_text}\"\"\" 

        Return only the sub-category name.
        """

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        return response.text.strip()
    

    def extract_personal_attributes(self,clause_text, predicted_doc_type=None):
        """Extract structured attributes for Personal Legal Document clauses"""

        prompt = f"""
    You are a legal assistant extracting structured data from Personal Legal Documents.

    From the following clause, extract the attributes in **JSON format**.

    ### Rules:
    1. Always include the common fields:
    - Name
    - DateOfBirth
    - DocumentType
    - DocumentNumber
    - IssuedBy
    - IssueDate
    - ExpiryDate
    - Address
    - Mother's Name
    - Father's Name
    

    2. Based on the predicted DocumentType, add only the relevant extra fields:
    - Passport → Nationality, PlaceOfBirth, FatherName, MotherName
    - Driving License → VehicleType, LicenseClass, BloodGroup
    - Gun License → GunType, Caliber, Restrictions
    - Aadhaar → AadhaarNumber, Gender
    - PAN → PANNumber

    3. If { "a document type is predicted: " + predicted_doc_type if predicted_doc_type else "document type is not obvious from clause" }, then always set DocumentType accordingly.
    4. If there are any restrictions or warnings mentioned also include them.
    5. Do NOT include irrelevant fields for that document type.
    Example: Driving License should not contain Nationality or EducationalDetails.

    6. Do not leave any key as null. If information is missing, set it to "Not available".

    Clause:
    \"\"\"{clause_text}\"\"\"
    """


        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        return response.text.strip()


    def explain_personal_clause(self,clause_text):
        """Generate explanation + significance for a Personal Legal Document clause"""

        prompt = f"""
        You are a legal assistant. 
        Read the following clause and provide:

        1. A clear explanation in simple English (what this information means).  
        2. The legal or practical significance of this information (e.g., proof of identity, proof of age, proof of residence, proof of education).  

        Clause:
        \"\"\"{clause_text}\"\"\"  

        Return the output in JSON with keys:
        - Explanation
        - Significance
        """

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        return response.text.strip()


    def merge_personal_attributes_lm(self,clause_attributes_list):
        """
        Use LLM to merge clause-wise personal attributes into one consolidated JSON.
        The model handles overlapping info, validity ranges, and formatting.
        """

        prompt = f"""
    You are a legal assistant. You are given multiple clause-level JSONs extracted from a Personal Legal Document.
    Your task is to merge them into a single **clean, consolidated JSON**.

    Rules:
    - Keep only one final JSON object (no lists).
    - If multiple clauses provide overlapping values, choose the most complete/consistent one.
    - If validity is written like "Valid from X to Y", map X → IssueDate, Y → ExpiryDate.
    - If some fields are repeated across clauses, merge intelligently (not just first non-null).
    - If nothing is found, return null for that field.
    - If information appears in 'OtherNotes', expand it into structured fields and add to the keys written below.


    Clause-level JSONs:
    {json.dumps(clause_attributes_list, indent=2)}

    Return only the final merged JSON with these keys:
    - Name
    - DateOfBirth
    - DocumentType
    - DocumentNumber
    - IssuedBy
    - IssueDate
    - ExpiryDate
    - Address
    - EducationalDetails

    If there are more key-value pairs except the above mentioned categories, create new categories with their name.
    """

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        
        # Parse back into Python dict
        try:
            return json.loads(response.text.strip())
        except:
            return response.text.strip()
    
    def generate_summary_from_json(self,extracted_json):
        """
        Ask the LLM to generate a natural summary of the document 
        using the extracted JSON as context.
        """
        prompt = f"""
    You are a legal summarizer. Based on the extracted structured data of a personal document (in JSON), 
    write a clear, human-readable summary. 

    Rules:
    - Use concise natural language .
    - Mention key details like Name, Date of Birth, Document Number, Issue/Expiry dates, and Address that are present in JSON given to you.
    - Do not mention fields marked as "Not available".
    - The tone should be factual and professional, not casual.

    Here is the extracted JSON:
    ```json
    {json.dumps(extracted_json, indent=2)}
    """
        response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=prompt
    )

        return response.text.strip()


        
 
