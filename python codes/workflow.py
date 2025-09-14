
from workflow_fun.contra import *
from workflow_fun.corpa import *
from workflow_fun.doc_comp import *
from workflow_fun.govt1 import *
from workflow_fun.lit import *
from workflow_fun.personal import *
from workflow_fun.property import *
from workflow_fun.regulat import *
from calendar_.calender import *
from langchain.text_splitter import RecursiveCharacterTextSplitter
from utils import *

from collections import Counter



doc_text ="""
STATE OF MAHARASHTRA
IN THE COURT OF THE CHIEF JUDICIAL MAGISTRATE, MUMBAI

Case No.: 2056/2025
Date: 14/09/2025

The State vs. Amit Mehra

Complainant / Informant:
Name: Sunita Joshi
Address: 24, Carter Road, Bandra, Mumbai
Contact: 9876504321

Accused:
Name: Amit Mehra
Address: 78, Shivaji Nagar, Mumbai
Age: 35
Gender: Male

Police Station: Dadar Police Station, Mumbai
FIR No.: 3012/2025
Date & Time of Occurrence: 10/09/2025, 11:15 AM
Place of Occurrence: Shop No. 14, Hill Road, Bandra

Sections of Law Invoked:

Section 420 IPC – Cheating and dishonestly inducing delivery of property

Section 468 IPC – Forgery for purpose of cheating

Section 34 IPC – Acts done by several persons in furtherance of common intention

Facts of the Case

On 10th September 2025, at approximately 11:15 AM, the accused, Amit Mehra, presented forged documents to the complainant, Sunita Joshi, for the purpose of obtaining a business loan. After suspicion arose, the complainant verified the documents with the issuing authority and found them to be fabricated.

The complainant immediately reported the matter to the Dadar Police Station, where FIR No. 3012/2025 was registered.

Evidence Collected

Forged business documents submitted by the accused

Verification reports from the issuing authority dated 12/09/2025

Statements of witnesses recorded on 13/09/2025

CCTV footage of the accused visiting the complainant’s office

Investigation

The investigation is ongoing. The accused has been summoned to appear before the Court on 20/09/2025. Further statements of witnesses are scheduled to be recorded on 25/09/2025.

Prayer

It is respectfully prayed that this Hon’ble Court may:

Take cognizance of the offences against Amit Mehra

Summon the accused to appear before the Court for trial on 20/09/2025

Direct further proceedings as per law

Investigating Officer: Inspector Ramesh Desai
Date: 15/09/2025
Place: Mumbai
"""
future_dates = extract_future_dates_with_context(doc_text)

if future_dates:
    json_file = save_dates_to_json(future_dates, filename="deadlines.json")
    print(f"Extracted {len(future_dates)} future dates saved to {json_file}")

    add_events_to_calendar(future_dates, calendar_id="primary")
else:
    print("No future dates found in this document.")

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1500,
    chunk_overlap=150
)
chunks = text_splitter.split_text(doc_text)

#level 1 classification

def classify_level1(chunk_text):
    prompt = f"""
    You are an expert legal document classifier with deep knowledge of Indian and international legal systems.  

    🎯 TASK: Classify this document into ONE category from the list below.  

    📂 CATEGORIES:  
    1. Contracts & Agreements  
    2. Litigation & Court Documents  
    3. Regulatory & Compliance  
    4. Corporate Governance Documents  
    5. Property & Real Estate  
    6. Government & Administrative  
    7. Personal Legal Documents  
    8. NON-LEGAL DOCUMENT  
    9. PSEUDO-LEGAL DOCUMENT  

    🔍 CLASSIFICATION RULES (STRICT FILTERING):  

    ### STEP 1 - VALIDITY CHECK (Most Important)  
    Decide FIRST if the text is a real legal document or not:  

    *NON-LEGAL DOCUMENT →*  
    - Narrative / Fiction: novels, stories, diaries, letters describing events.  
    - Informational / Educational: blog posts, news, academic articles, lecture notes, study guides.  
    - Technical / Business: software code, marketing content, product descriptions, financial reports.  
    - Random / Gibberish: incoherent, fragmented, or irrelevant content.  
    - Legal Commentary: summaries, explanations, or discussions about law but not actual binding documents.  

    *PSEUDO-LEGAL DOCUMENT →*  
    - Fake or template-like with placeholders ([INSERT NAME], XXXX, <party A>).  
    - Documents explicitly marked as "Sample", "Template", "Example".  
    - Clearly fabricated or incomplete drafts that cannot be binding.  

    ⚠ If either case applies, STOP and return only *NON-LEGAL DOCUMENT* or *PSEUDO-LEGAL DOCUMENT* .

    ---

    ### STEP 2 - LEGAL DOCUMENT CLASSIFICATION  
    (Only if it passes Step 1 as a real legal document)  

    Apply priority order:  
    1. *Property & Real Estate* → deeds, leases, sale agreements, mortgage docs.  
    2. *Personal Legal Documents* → ID cards, wills, birth/marriage certificates, affidavits.  
    3. *Government & Administrative* → official notices, government orders, public gazettes.  
    4. *Regulatory & Compliance* → licenses, permits, compliance filings, environmental/industry approvals.  
    5. *Corporate Governance Documents* → board resolutions, shareholder agreements, bylaws, MOA/AOA.  
    6. *Litigation & Court Documents* → petitions, judgments, court orders, arbitration filings.  
    7. *Contracts & Agreements* → commercial contracts not covered above (service agreements, NDAs, MoUs).  

    ---

    🎯 DECISION PRIORITY ORDER:  
    1. First filter: NON-LEGAL DOCUMENT vs PSEUDO-LEGAL DOCUMENT.  
    2. If neither, apply Step 2 and assign the most specific category by the rules above.  

    Document Text: {chunk_text}  

    INSTRUCTIONS:  
    - Analyze the *purpose and function*, not just keywords.  
    - Be strict: if it only talks about law but is not a binding legal document, classify as *NON-LEGAL DOCUMENT*.  
    - Return ONLY the category name, nothing else.  
    """
    return call_gemini(prompt)


# Classify all chunks
chunk_categories = [classify_level1(c) for c in chunks]

# Aggregate most frequent category
level1_category = Counter(chunk_categories).most_common(1)[0][0]
print("Level 1 Category:", level1_category)

# Classify all chunks
chunk_categories = [classify_level1(c) for c in chunks]

# Aggregate most frequent category
level1_category = Counter(chunk_categories).most_common(1)[0][0]

if (level1_category == "Property & Real Estate"):
    document_summary,json_f = property_workflow(chunks,level1_category)

elif(level1_category == "regulation_compilance"):
    document_summary,json_f = regulatory_workflow(chunks,level1_category)

elif(level1_category == "Personal Legal Documents"):
    document_summary,json_f = personal_workflow(chunks,level1_category,doc_text)

elif (level1_category =="Litigation & Court Documents"):
    document_summary,json_f = litigation_workflow(chunks)
    
    
elif (level1_category =="Corporate Governance Documents"):
    document_summary,json_f = corp_workflow(chunks)

elif (level1_category =="Contracts & Agreements"):
   document_summary,json_f = contract_workflow(chunks)

elif (level1_category =="Government & Administrative"):
    document_summary,json_f =govt_workflow(chunks)


