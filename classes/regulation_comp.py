
from utils import *

class regulatory:

    def __init__(self,chunks):
        self.chunks = chunks


    def extract_clauses_batched(self):
        joined_text = "\n\n---\n\n".join(self.chunks)

        prompt = f"""
    You are an expert in Indian regulation and compilance law and analysis. 
    You will receive parts of a regulation and compilance related document (regulatory obligations, permissions, licenses, permits, environmental clearances, GDPR/data protection notices, tax compliance, labor law filings, or health & safety compliance, classify here **exclude corporate governance documents**).

    Your task is to:

    1. Break the text into individual **clauses**.  
    2. Return each clause as a separate line of plain text.  
    3. Do not explain, summarize, or classify — just extract the clauses.  

    Document Text:
    {joined_text}
    """
        return call_gemini1(prompt)
    


    def extract_regulatory_attributes(self,clause_text):
        """Extract structured attributes from a compilance and regulatory clause.
        Returns JSON with all relevant fields.
        """

        prompt = f"""
        You are an expert in Indian regulation and compilance law and analysis. 
        You will receive a single property-related clause (~2-3 lines / ~100 words). 

        Your task:

        Extract structured information from the text in **JSON format only** with the following keys:
        - IssuedTo
        - DocumentNumber
        - Purpose
        - ActionsRequired
        - Operational Requirements / Facility Management
        - Reporting / Audits / Documentation
        - Deadlines / Validity
        - Deviation / Non-Compliance / Penalties
        - Health & Safety / Risk Management
        - Environmental Compliance
        - OtherNotes

        **Requirements:**
        - Return **strict JSON only** with the above keys.
        - If a field is not applicable or missing, set it to `null`.
        - Do not include explanations, summaries, or extra text.

        Clause:
        \"\"\"{clause_text}\"\"\"
            """

        return call_gemini1(prompt)
    


    def explain_regulatory_document(self,regulatory_attributes):
        """
        Generate a detailed clause-by-clause explanation for a regulatory/compliance document
        using extracted structured attributes, preserving all metadata such as IssueDate, DocumentNumber, Location, and IssuingAuthority.
        This output can then be used to generate a plain-language summary.
        """

        prompt = f"""
        You are a legal assistant.

        You will receive structured attributes extracted from each clause of a regulatory or compliance document.
        Each entry may include: PeopleInvolved, AssociationsInvolved, IssuedTo, DocumentNumber, IssueDate, Location, IssuingAuthority, Purpose, ActionsRequired, Deadlines, CategoryOfConditions, OtherNotes.

        Your task:
        - Generate an explanation **for each clause**, preserving all information present in the attributes.
        - For each clause, clearly explain:
            1. Who is involved (PeopleInvolved, AssociationsInvolved, IssuedTo)
            2. What the purpose of the clause is (Purpose)
            3. Any actions required and deadlines (ActionsRequired, Deadlines)
            4. The category or type of condition (CategoryOfConditions)
            5. Any other important notes (OtherNotes)
            6. **Include all metadata if present** (DocumentNumber, IssueDate, Location, IssuingAuthority)
        - Keep each explanation factual and based only on the attributes. Do not add opinions or extra interpretation.
        - Organize explanations **clause by clause**, each as a coherent paragraph.
        - Ensure that IssueDate, DocumentNumber, Location, and IssuingAuthority are explicitly mentioned in the text if available.

        Return the output in JSON format with keys:
        - ClauseExplanations: a list of explanations, one per clause, each including metadata and details.

            Here is the structured attribute data to use:
            {regulatory_attributes}
            """

        return call_gemini1(prompt)
        

    def explain_regulatory_document_plain_language(self,regulatory_attributes):
        """
        Generate a layman-friendly explanation of a regulatory/compliance document
        using extracted structured attributes. All technical/legal terms are simplified.
        Include metadata such as when, where, and by whom the document was issued.
        """

        prompt = f"""
    You are a legal assistant. 

    You will receive structured attributes extracted from a regulatory/compliance document.
    Each entry includes: PeopleInvolved, AssociationsInvolved, IssuedTo, Purpose, ActionsRequired, Deadlines, CategoryOfConditions, OtherNotes.
    Some entries may also include metadata: IssuingAuthority, DocumentNumber, IssueDate, Location.

    Your task:
    - Write a **clear explanation in simple, everyday English** that anyone can understand, including people with no legal or technical background.
    - Include **all metadata if available**: who issued the document, when it was issued, the location, and the document number.
    - Do **not** use legal jargon, technical terms, or complex words. Rephrase everything in plain language.
    - Base your explanation entirely on the structured attributes; do not add extra interpretation or assume anything not in the attributes.
    - Combine information from all attributes into a single, coherent paragraph or two.
    - Cover the parties involved, purpose, actions required, deadlines, type of conditions, any important notes, and the document metadata.

    Return the output in JSON format with keys:
    - DocumentExplanation: a simple, clear description of what the document says in plain language, including issuing authority, date, location, and document number if available.

    Here is the structured attribute data:
    {regulatory_attributes}
    """

        return call_gemini1(prompt)





