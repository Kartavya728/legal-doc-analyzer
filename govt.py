from utils import *
import json
import re

class govt:

    def __init__(self,chunks):
        self.chunks = chunks


    def extract_government_clauses(self,chunk_text):
        """
        Extract governance-relevant clauses from a government/administrative document.
        Returns a simple numbered list of relevant sentences only.
        """
        prompt = f"""
        You are an expert in government and administrative documents.

        Task: Extract only the provisions and directives from the document text.
        Capture all the dates, deadlines, timeframes, and venues mentioned in the document with their context.
        Capture all the names of authorities, ministries, or officials mentioned with their roles.
        Do not output explanations or metadata.

        Rules:
        1. Return ONLY a clean numbered list (1., 2., ...).
        2. Each item should be a full clause/sentence containing governance info 
        (benefits, obligations, compliance requirements, schemes, notifications, circulars, 
        government orders, deadlines, authorities, roles, etc.).
        3. Skip filler, ceremonial, or introductory text.


        Document Text:
        \"\"\"{chunk_text}\"\"\"
        """
        return call_gemini1(prompt)


    def classify_government_document(self,doc_text):
        """
        Predict the overall Government/Administrative document type from the full text.
        """
        prompt = f"""
        You are a government and administrative document classifier.

        Predict the most likely document type (choose the closest category):
        - Government Circular / Office Memorandum
        - Notification / Gazette Notification
        - Administrative Order / Government Order
        - Rules & Regulations
        - Policy Guidelines
        - Public Welfare Scheme Announcement
        - Licensing / Permit Instruction
        - Tax & Revenue Notification
        - Amendment / Update / Revision
        - Procedural Guidelines (application, filing, timelines)
        - Compliance & Enforcement Instruction
        - Other (if not fitting above, specify concisely)

        Return JSON with:
        - PredictedDocumentType
        - Confidence (High/Medium/Low)
        - Rationale (1–2 lines)

        Document:
        \"\"\"{doc_text}\"\"\"
        """
        return call_gemini1(prompt)


    def extract_government_attributes(self, clause_text, predicted_doc_type=None):
        """
        Extract structured attributes from a government/administrative clause.
        Includes common keys + only relevant extras depending on the clause & doc type.
        """
        prompt = f"""
        You are a government and administrative document extractor.

        Output a SINGLE JSON object. Always include common keys:
        - IssuingAuthority
        - DocumentType
        - DocumentNumber
        - PublicationDate
        - EffectiveDate
        - ReferenceNumber
        - Subject
        - OtherNotes

        Adaptive extras (include ONLY if relevant to the clause & doc type):
        - For Notifications / Gazettes: SectionReference, AmendmentDetails, StatutoryAuthority
        - For Administrative Orders: OrderType, ResponsibleDepartment, ApplicableJurisdiction
        - For Circulars / Guidelines: CircularNumber, Scope, Applicability, Instructions
        - For Welfare Schemes: SchemeName, EligibilityCriteria, Benefits, ApplicationProcess
        - For Tax & Revenue: TaxType, Rate/Exemption, AssessmentYear, ComplianceRequirement
        - For Licensing & Permits: LicenseType, ValidityPeriod, Conditions, ApplicationProcess
        - For Compliance & Enforcement: Requirement, Deadline, PenaltyAmount, EnforcementAuthority
        - For Procedural Guidelines: StepwiseProcedure, FilingRequirements, TimelineSpecifications

        Rules:
        - {"DocumentType is predicted as: " + predicted_doc_type if predicted_doc_type else "If you can infer DocumentType, set it"}.
        - Do NOT include irrelevant keys.
        - If info is absent, omit the key (do not output null).
        - Keep values concise.

        Clause:
        \"\"\"{clause_text}\"\"\"
        """
        return call_gemini1(prompt)


    def merge_government_clauses_with_llm(self, government_clauses, predicted_doc_type=None):
        """
        Merge government/administrative clauses (strings or dicts) into one consolidated JSON.
        Handles both cases safely.
        """
        # Normalize input: if list of dicts, extract the text
        normalized_clauses = []
        for clause in government_clauses:
            if isinstance(clause, dict) and "clause" in clause:
                normalized_clauses.append(clause["clause"])
            elif isinstance(clause, str):
                normalized_clauses.append(clause.strip())
            else:
                # Fallback: stringify any unexpected type
                normalized_clauses.append(str(clause))

        prompt = f"""
        You are a government/administrative document normalizer.

        You will receive a list of provisions or clauses (plain sentences) from the SAME document.
        Merge them into ONE consolidated JSON for the whole document.

        Required behavior:
        - Include only relevant keys for the predicted document type (if provided).
        - Deduplicate values; merge into lists where needed (e.g., Beneficiaries, Authorities, Deadlines).
        - For compliance/requirements, combine into a single array "Requirements" with full text.
        - For welfare/benefit provisions, combine into "Schemes" with key details.
        - For penalties/enforcement, combine into "Penalties" with violation and consequence.
        - You may extract relevant metadata (DocumentNumber, IssuingAuthority, PublicationDate).
        - Keep it concise and factual.

        PredictedDocumentType: {predicted_doc_type or "Not provided"}

        Clauses:
        {json.dumps(normalized_clauses, indent=2)}

        Return ONLY the final merged JSON.
        """
        merged = call_gemini1(prompt)
        try:
            return json.loads(merged)
        except Exception:
            return merged 
    

    def explain_government_clause(self, clause_text):
        """
        Explain a government/administrative clause in simple English + why it matters.
        Returns JSON with Explanation and Significance.
        """
        prompt = f"""
        You are a government policy/legal assistant.

        Task: Read the provision and explain it in simple English.
        Also state why it matters (e.g., compliance required, benefit eligibility, authority powers, penalty imposed).

        Output a JSON with exactly two keys:
        - "Explanation": plain English meaning of the provision
        - "Significance": why this provision is important (impact on citizens, businesses, or government bodies)

        Provision:
        \"\"\"{clause_text}\"\"\"

        Return ONLY the JSON.
        """
        result = call_gemini1(prompt)
        try:
            return json.loads(result)
        except Exception:
            return {"Explanation": result, "Significance": "Could not parse as JSON"}


    def safe_json_loads(self, raw):
        """
        Try to safely load JSON even if it's wrapped in markdown or contains junk.
        """
        if not isinstance(raw, str):
            return raw  # already dict or list

        # Remove markdown fences like ```json ... ```
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", raw.strip())
        cleaned = re.sub(r"```$", "", cleaned.strip())

        try:
            return json.loads(cleaned)
        except Exception:
            # Last resort: try to extract the first JSON object/array substring
            match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except Exception:
                    return {"raw_text": cleaned}
            return {"raw_text": cleaned}
        


    def summarize_government_from_json(self, extracted_json, client):
        """
        Ask LLM to generate a short professional summary of a government/administrative document
        using the merged JSON as context.
        """
        extracted_json = self.safe_json_loads(extracted_json)

        prompt = f"""
        You are a government administrative summarizer.

        Using the JSON below, write a concise summary that covers:
        - What the document is (notification, circular, order, gazette, scheme, etc.)
        - The main provisions, directives, or policy changes announced
        - The beneficiaries, affected departments, or obligated entities
        - Any key deadlines, dates, timeframes, or venues
        - The issuing authority (ministry, department, officer) and their role
        - Any financial assistance, compliance requirements, or penalties

        Guidelines:
        - Keep it factual, professional, and easy to understand.
        - No invented details — use only what is present in the JSON.
        - Use clear sentences (2–4 paragraphs max).
        - Avoid bureaucratic jargon where possible.

        JSON:
        {json.dumps(extracted_json, indent=2)}
        """
        return call_gemini1(prompt)
        
     
