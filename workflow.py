
from workflow_fun.contra import *
from workflow_fun.corpa import *
from workflow_fun.doc_comp import *
from workflow_fun.govt1 import *
from workflow_fun.lit import *
from workflow_fun.personal import *
from workflow_fun.property import *
from workflow_fun.regulat import *
from langchain.text_splitter import RecursiveCharacterTextSplitter
from utils import *

from collections import Counter



doc_text ="""
STATE OF MAHARASHTRA
IN THE COURT OF THE CHIEF JUDICIAL MAGISTRATE, MUMBAI

Case No.: 1023/2024
Date: 01/08/2024

The State vs. Rahul Sharma

Charge Sheet / FIR

Complainant / Informant:
Name: Priya Verma
Address: 12, MG Road, Mumbai, Maharashtra
Contact: 9876543210

Accused:
Name: Rahul Sharma
Address: 45, Nehru Nagar, Mumbai, Maharashtra
Age: 28
Gender: Male

Police Station: Andheri Police Station, Mumbai
FIR No.: 2456/2024
Date & Time of Occurrence: 28/07/2024, 10:30 AM
Place of Occurrence: Shop No. 7, Linking Road, Mumbai

Sections of Law Invoked:
- Section 420 IPC – Cheating and dishonestly inducing delivery of property
- Section 406 IPC – Criminal breach of trust
- Section 34 IPC – Acts done by several persons in furtherance of common intention

Facts of the Case
On 28th July 2024, at approximately 10:30 AM, the accused, Rahul Sharma, approached the complainant, Priya Verma, claiming to be a representative of a reputed electronics company. The accused offered a scheme to deliver electronic goods at a discounted rate if an advance payment was made. The complainant, believing the accused’s representation, transferred Rs. 50,000 to the accused’s bank account.

The accused failed to deliver the goods and avoided all communication thereafter. Witnesses present at the shop, including Mr. Anil Kapoor and Ms. Rina Desai, confirmed the interaction and noted that the accused left the premises after taking the payment. The complainant immediately approached the Andheri Police Station and lodged an FIR against the accused.

Evidence Collected
1. Statements of witnesses: Mr. Anil Kapoor, Ms. Rina Desai
2. Bank transaction records of Rs. 50,000 to the accused’s account
3. CCTV footage from Linking Road showing the accused’s visit
4. Copies of messages exchanged between complainant and accused via WhatsApp
5. Identity documents of the accused

Investigation
Upon registration of FIR No. 2456/2024, the investigation was initiated by Officer In-Charge, Inspector Suresh Patil. The accused was summoned on 29th July 2024, and the following steps were undertaken:

1. Recording of statements under Section 161 CrPC
2. Collection and verification of bank records and CCTV footage
3. Verification of the accused’s identity and prior criminal record
4. Examination of witnesses at the scene of occurrence
5. Seizure of electronic communications between the complainant and the accused

The investigation established that the accused intentionally induced the complainant to part with money by making false promises, thereby committing offences under Sections 420, 406, and 34 IPC.

Charges
Based on the evidence collected, the following charges are formally brought against the accused:

1. Section 420 IPC – Cheating and dishonestly inducing delivery of property
2. Section 406 IPC – Criminal breach of trust
3. Section 34 IPC – Acts done by several persons in furtherance of common intention

Prayer
It is respectfully prayed that this Hon’ble Court may:

1. Take cognizance of the offences against Rahul Sharma
2. Summon the accused to appear before the Court for trial
3. Direct further proceedings as per the provisions of law
4. Grant any other relief deemed appropriate in the interest of justice

Investigating Officer: Suresh Patil
Rank & Designation: Inspector, Andheri Police Station
Date: 01/08/2024
Place: Mumbai
"""

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


