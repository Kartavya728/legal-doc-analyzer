from utils import call_gemini, client
import json
import re

class corp:

    def __init__(self,chunks):
        self.chunks = chunks


    def extract_corporate_clauses(self,chunk_text):
        """
        Extract governance-relevant clauses from a corporate document.
        Returns a simple numbered list of relevant sentences only.
        """
        prompt = f"""
        You are an expert in corporate governance.

        Task: Extract only the corporate-relevant clauses from the document text. Capture all the dates,times and venues mentioned in document with their context. Capture all the names mentioned with their roles mentioned.
        Do not output explanations or metadata.

        Rules:
        1. Return ONLY a clean numbered list (1., 2., ...).
        2. Each item should be a full clause/sentence containing governance info (dates,time,venues, names, resolutions, compliance, approvals, corporate actions, etc.).
        3. Skip filler, generic, or non-governance text.


        Document Text:
        \"\"\"{chunk_text}\"\"\"
        """
        return call_gemini(prompt)


    def classify_corporate_document(self,doc_text):
        """
        Predict the overall Corporate Governance document type from the full text.
        """
        prompt = f"""
        You are a corporate governance classifier.

        Predict the most likely document type (one of or near):
        - Board Resolution
        - Minutes of Board Meeting
        - AGM Notice / AGM Minutes
        - EGM Notice / EGM Minutes
        - Committee Minutes (Audit/NRC/CSR/etc.)
        - Articles of Association (AoA)
        - Memorandum of Association (MoA)
        - Annual Report / Directors' Report
        - Auditor's Report
        - Policy/Code (e.g., Insider Trading Policy, CSR Policy, Code of Conduct)
        - MCA Filing (Form MGT-14, DIR-12, PAS-3, SH-7, etc.)

        Return JSON with:
        - PredictedDocumentType
        - Confidence (High/Medium/Low)
        - Rationale (1-2 lines)

        Document:
        \"\"\"{doc_text}\"\"\"
        """
        return call_gemini(prompt)


    def extract_corporate_attributes(self,clause_text, predicted_doc_type=None):
        """
        Extract structured attributes from a corporate clause.
        Includes common keys + only relevant extras for the predicted doc type.
        """
        prompt = f"""
        You are a corporate governance extractor.

        Output a SINGLE JSON object. Always include common keys:
        - CompanyName
        - CIN
        - DocumentType
        - DocumentNumber
        - RegisteredAddress
        - ResolutionDate
        - MeetingType
        - FilingAuthority
        - OtherNotes

        Adaptive extras (include ONLY if relevant to the clause & doc type):
        - For Board/Committee docs: Directors/Attendees (list), Quorum, AgendaItem, ResolutionText, ResolutionNumber, AuthorizedSignatories (list)
        - For Shareholder meetings: MeetingDate, NoticeDate, RecordDate, SpecialBusiness (list)
        - For Appointments & Changes: PersonName, Designation, AppointmentType (Appointment/Resignation/Reappointment/Removal), EffectiveDate
        - For Corporate Actions: ActionType (Dividend/Buyback/Allotment/ESOP/M&A), Amount/Ratio, ISIN/SecurityDetails
        - For Filings: FormType (MGT-14, DIR-12...), FilingDate, SRN
        - For Policies/Codes: PolicyName, EffectiveDate, SectionReference
        - For AoA/MoA/Reports: SectionReference, Chapter/Article, Auditor, Period

        Rules:
        - {"DocumentType is predicted as: " + predicted_doc_type if predicted_doc_type else "If you can infer DocumentType, set it"}.
        - Do NOT include irrelevant keys.
        - If info is absent, omit the key (do not output null).
        - Keep values concise.

        Clause:
        \"\"\"{clause_text}\"\"\"
        """
        return call_gemini(prompt)
    

    def merge_corporate_clauses_with_llm(self,corporate_clauses, predicted_doc_type=None):
        """
        Merge corporate governance clauses (strings or dicts) into one consolidated JSON.
        Handles both cases safely.
        """
        # Normalize input: if list of dicts, extract the text
        normalized_clauses = []
        for clause in corporate_clauses:
            if isinstance(clause, dict) and "clause" in clause:
                normalized_clauses.append(clause["clause"])
            elif isinstance(clause, str):
                normalized_clauses.append(clause.strip())
            else:
                # Fallback: stringify any unexpected type
                normalized_clauses.append(str(clause))

        prompt = f"""
        You are a corporate governance normalizer.

        You will receive a list of governance clauses (plain sentences) from the SAME document.
        Merge them into ONE consolidated JSON for the whole document.

        Required behavior:
        - Include only relevant keys for the predicted document type (if provided).
        - Deduplicate values; merge into lists where needed (e.g., Directors, Resolutions).
        - For resolutions, combine into a single array "Resolutions" with full text.
        - You may extract relevant keys from the data and add them separately.
        - Keep it concise and factual.

        PredictedDocumentType: {predicted_doc_type or "Not provided"}

        Clauses:
        {json.dumps(normalized_clauses, indent=2)}

        Return ONLY the final merged JSON.
        """
        merged = call_gemini(prompt)
        try:
            return json.loads(merged)
        except Exception:
            return merged  # fallback: return raw text if JSON parsing fails
    

    def explain_corporate_clause(self,clause_text):
        """
        Explain a corporate clause in simple English + why it matters (governance significance).
        Returns JSON with Explanation and Significance.
        """
        prompt = f"""
        You are a corporate governance expert.

        Task: Read the clause and explain it in simple English.
        Also state why it matters for corporate governance or compliance.

        Output a JSON with exactly two keys:
        - "Explanation": plain English meaning of the clause
        - "Significance": why this clause is important (e.g., Board approval required, creates authority, compliance filing triggered, shareholder rights, etc.)

        Clause:
        \"\"\"{clause_text}\"\"\"
        Return ONLY the JSON.
        """
        result = call_gemini(prompt)

        # Ensure it always returns JSON (avoids plain text leakage from LLM)
        try:
            return json.loads(result)
        except Exception:
            return {"Explanation": result, "Significance": "Could not parse as JSON"}


    def safe_json_loads(self,raw):
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
        


    def summarize_corporate_from_json(self,extracted_json):
        """
        Ask LLM to generate a short professional summary of the corporate document
        using the merged JSON as context.
        """
        extracted_json = self.safe_json_loads(extracted_json)

        prompt = f"""
        You are a corporate governance summarizer.

        Using the JSON below, write a summary that states:
        - What the document is (type, date/meeting if available)
        - Mention all details about dates, time, venues etc
        - The key approvals/resolutions/decisions
        - Who is authorized (names/roles) and any filings triggered
        - Include all Directors/Attendees and mention what about them is mentioned in the meeting in 1-2 sentences
        - Any important references (Companies Act sections, SEBI LODR) if present

        Keep it factual and boardroom-ready. Do NOT invent details.You may also explain some details that may be difficult to understand.

        JSON:
        ```json
        {json.dumps(extracted_json, indent=2)}
        """
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )

        return response.text.strip()