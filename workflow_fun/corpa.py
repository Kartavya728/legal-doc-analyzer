from corp import *

def corp_workflow(chunks):
    corp_ = corp(chunks)

    print("Extracting corporate clauses in streaming mode...\n")
    all_corp_clauses = []

    for ch in chunks:
        clause_stream = corp_.extract_corporate_clauses(ch)  # generator
        _txt = ""
        for part in clause_stream:
            print(part, end="", flush=True)
            _txt += part
        items = [i.strip() for i in _txt.splitlines() if i.strip() and any(c.isalnum() for c in i)]
        all_corp_clauses.extend(items)

    # Deduplicate
    seen = set()
    corporate_unique_clauses = []
    for it in all_corp_clauses:
        base = it.lstrip("0123456789). ").strip()
        if base not in seen:
            seen.add(base)
            corporate_unique_clauses.append(base)

    # Classify document type (streaming if supported)
    doc_stream = corp_.classify_corporate_document("\n".join(chunks))  # generator
    doc_pred = ""
    for part in doc_stream:
        print(part, end="", flush=True)
        doc_pred += part

    predicted_doc_type = None
    try:
        pred_obj = json.loads(doc_pred)
        predicted_doc_type = pred_obj.get("PredictedDocumentType")
    except Exception:
        predicted_doc_type = None

    corporate_attributes = [{"clause": c} for c in corporate_unique_clauses]

    # Merge clauses (streaming if supported)
    merge_stream = corp_.merge_corporate_clauses_with_llm(corporate_unique_clauses, predicted_doc_type=predicted_doc_type)
    merged_corporate = []
    for part in merge_stream:
        print(part, end="", flush=True)
        merged_corporate.append(part)

    # Explain top clauses (streaming if supported)
    corporate_explanations = []
    for c in corporate_unique_clauses[:10]:
        explain_stream = corp_.explain_corporate_clause(c)  # generator
        explanation = ""
        for part in explain_stream:
            print(part, end="", flush=True)
            explanation += part
        corporate_explanations.append({"clause": c, "analysis": explanation})

    # Summarize (streaming)
    summary_stream = corp_.summarize_corporate_from_json(merged_corporate)
    summary_text = ""
    for part in summary_stream:
        print(part, end="", flush=True)
        summary_text += part

    return summary_text, merged_corporate
