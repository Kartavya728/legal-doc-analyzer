import pandas as pd
import json
from property_real import property
from regulation_comp import regulatory
from pers import pers
from litigation import litigation
from corp import corp
from contracts import contracts
from govt import govt
from utils import client
from documentComparison import hybrid_difference_workflow

def property_workflow(chunks, category):
    property_ = property(chunks)

    response_text = property_.extract_clauses_batched()
    all_clauses = [c.strip() for c in response_text.split("\n") if c.strip()]
    unique_clauses = list(dict.fromkeys(all_clauses))

    df = pd.DataFrame({"Clause": unique_clauses, "Level1": category})

    regulatory_attributes = []
    for clause in unique_clauses:   # list of Property clauses
        details = property_.extract_property_attributes(clause)
        regulatory_attributes.append({
            "clause": clause,
            "attributes": details
        })
        
    document_explanation = property_.explain_property_document(regulatory_attributes)

    return property_.generate_summary_and_comments(document_explanation), regulatory_attributes

     


def regulatory_workflow(chunks, category):
    regulatory_ = regulatory(chunks)

    response_text = regulatory_.extract_clauses_batched()
    all_clauses = [c.strip() for c in response_text.split("\n") if c.strip()]
    unique_clauses = list(dict.fromkeys(all_clauses))

    df = pd.DataFrame({"Clause": unique_clauses, "Level1": category})

    regulatory_attributes = []
    for clause in unique_clauses:   
        details = regulatory_.extract_regulatory_attributes(clause)
        regulatory_attributes.append({
            "clause": clause,
            "attributes": details
        })

    return  regulatory_.explain_regulatory_document_plain_language(regulatory_attributes), regulatory_attributes


def personal_workflow(chunks, category, doc_text):

    personal_ = pers(chunks)

    all_clauses = []

    for chunk in chunks:
        clause_text = personal_.extract_clauses(chunk)  # your LLM/regex function
        clauses = [c.strip() for c in clause_text.split("\n") if c.strip()]
        all_clauses.extend(clauses)

    # Deduplicate by converting to set, then back to list
    unique_clauses = list(dict.fromkeys(all_clauses))  # preserves order


    personal_results = []
    for clause in unique_clauses:   # list of clauses tagged "Personal Legal Documents" from Level 1
        sub_category = personal_.classify_personal_level2(clause)
        personal_results.append({
            "clause": clause,
            "sub_category": sub_category
        })

    doc_type_prediction = personal_.classify_personal_document(doc_text)
    personal_attributes = []

    for clause in unique_clauses:   # list of Level 1 Personal Document clauses
        details = personal_.extract_personal_attributes(clause, predicted_doc_type=doc_type_prediction)
        personal_attributes.append({
            "clause": clause,
            "attributes": details
        })

    explained_personal_clauses = []
    for clause in personal_attributes:   # from your Level 1 Personal Document category
        details = personal_.explain_personal_clause(clause)
        explained_personal_clauses.append({
            "clause": clause,
            "analysis": details
        })

    js=personal_.merge_personal_attributes_lm(explained_personal_clauses)

    return personal_.generate_summary_from_json(js), js

def litigation_workflow(chunks):

    litigation_ = litigation(chunks)

    all_clauses = []

    for chunk in chunks:
        clause_text = litigation_.extract_clauses(chunk)  # your LLM/regex function
        clauses = [c.strip() for c in clause_text.split("\n") if c.strip()]
        all_clauses.extend(clauses)

    # Deduplicate by converting to set, then back to list
    unique_clauses = list(dict.fromkeys(all_clauses)) 

    criminal_results = []

    for clause in unique_clauses:   # list of clauses tagged "Criminal Law" from Level 1
        sub_category = litigation_.classify_criminal_level2(clause)
        criminal_results.append({
            "clause": clause,
            "sub_category": sub_category
        })

    criminal_attributes = []
    for clause in unique_clauses:   # list of Level 1 Criminal clauses
        details = litigation_.extract_criminal_attributes(clause)
        criminal_attributes.append({
            "clause": clause,
            "attributes": details
        })

    explained_clauses = []
    for clause in criminal_attributes:   # from your Level 1 Criminal category
        details = litigation_.explain_criminal_clause(clause)
        explained_clauses.append({
            "clause": clause,
            "analysis": details
        })

    detailed_clauses = []
    for clause in chunks:
        details = litigation_.extract_case_details(clause)
        detailed_clauses.append({
            "case_details": details
        })

    cleaned = litigation_.deduplicate_details(detailed_clauses)
    final_jason=[cleaned]+explained_clauses

    return litigation_.summarize_with_advice(final_jason), final_jason


def corp_workflow(chunks):

    corp_ = corp(chunks)

        # Collect & dedupe across chunks
    all_corp_clauses = []
    for ch in chunks:
        _txt = corp_.extract_corporate_clauses(ch)
        items = [i.strip() for i in _txt.splitlines() if i.strip() and any(c.isalnum() for c in i)]
        all_corp_clauses.extend(items)

    # De-duplicate while preserving order
    seen = set()
    corporate_unique_clauses = []
    for it in all_corp_clauses:
        base = it.lstrip("0123456789). ").strip()
        if base not in seen:
            seen.add(base)
            corporate_unique_clauses.append(base)

    doc_pred = corp_.classify_corporate_document("\n".join(chunks))
    predicted_doc_type = None
    try:
        pred_obj = json.loads(doc_pred)
        predicted_doc_type = pred_obj.get("PredictedDocumentType")
    except Exception:
        predicted_doc_type = None

    corporate_attributes = [
        {"clause": c}
        for c in corporate_unique_clauses
    ]

    merged_corporate = corp_.merge_corporate_clauses_with_llm(
        corporate_unique_clauses,  # can be list of strings OR list of dicts with "clause"
        predicted_doc_type=predicted_doc_type
    )

    corporate_explanations = [
    {"clause": c, "analysis": corp_.explain_corporate_clause(c)}
    for c in corporate_unique_clauses[:10]
    ]

 

    return corp_.summarize_corporate_from_json(merged_corporate), merged_corporate

def contract_workflow(chunks):
    contract_ = contracts(chunks)
    all_clauses = []
    for chunk in chunks:
        clause_text = contract_.extract_contract_clauses(chunk)
        clauses = [c.strip() for c in clause_text.split("\n") if c.strip()]
        all_clauses.extend(clauses)

    # Deduplicate
    unique_clauses = list(dict.fromkeys(all_clauses))


    contract_results = []
    for clause in unique_clauses:
        sub_category = contract_.classify_contract_level2(clause)
        contract_results.append({
            "clause": clause,
            "sub_category": sub_category
        })

    contract_attributes = []
    for clause in unique_clauses:
        details = contract_.extract_contract_attributes(clause)
        contract_attributes.append({
            "clause": clause,
            "attributes": details
        })

    explained_contract_clauses = []
    for clause in contract_attributes:
        details = contract_.explain_contract_clause(clause)
        explained_contract_clauses.append({
            "clause": clause,
            "analysis": details
        })

    summary = contract_.makenice(explained_contract_clauses)
    return summary, explained_contract_clauses


def govt_workflow(chunks):
    govt_ = govt(chunks)

    all_gov_clauses = []
    for ch in chunks:
        _txt = govt_.extract_government_clauses(ch)
        items = [i.strip() for i in _txt.splitlines() if i.strip() and any(c.isalnum() for c in i)]
        all_gov_clauses.extend(items)

    seen = set()
    government_unique_clauses = []
    for it in all_gov_clauses:
        base = it.lstrip("0123456789). ").strip()
        if base not in seen:
            seen.add(base)
            government_unique_clauses.append(base)
    
    doc_pred = govt_.classify_government_document("\n".join(chunks))
    predicted_doc_type = None
    try:
        pred_obj = json.loads(doc_pred)
        predicted_doc_type = pred_obj.get("PredictedDocumentType")
    except Exception:
        pass

    merged_government = govt_.merge_government_clauses_with_llm(
        government_unique_clauses,  
        predicted_doc_type=predicted_doc_type
    )

    government_explanations = [
        {"clause": c, "analysis": govt_.explain_government_clause(c)}
        for c in government_unique_clauses[:10]
    ]

    summary = govt_.summarize_government_from_json(merged_government)
    return summary, merged_government


def compare_documents_workflow(doc1_chunks, doc2_chunks, doc1_category, doc2_category):
    return hybrid_difference_workflow(doc1_chunks, doc2_chunks, doc1_category, doc2_category)