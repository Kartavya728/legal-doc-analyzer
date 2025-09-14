from classes.govt import *


def govt_workflow(chunks):
    govt_ = govt(chunks)

    print("Extracting government clauses in streaming mode...\n")
    all_gov_clauses = []

    for ch in chunks:
        clause_stream = govt_.extract_government_clauses(ch)  # generator
        _txt = ""
        for part in clause_stream:
            print(part, end="", flush=True)
            _txt += part
        items = [i.strip() for i in _txt.splitlines() if i.strip() and any(c.isalnum() for c in i)]
        all_gov_clauses.extend(items)

    # Deduplicate while preserving order
    seen = set()
    government_unique_clauses = []
    for it in all_gov_clauses:
        base = it.lstrip("0123456789). ").strip()
        if base not in seen:
            seen.add(base)
            government_unique_clauses.append(base)

    # Classify document type (streaming if supported)
    doc_stream = govt_.classify_government_document("\n".join(chunks))  # generator
    doc_pred = ""
    for part in doc_stream:
        print(part, end="", flush=True)
        doc_pred += part

    predicted_doc_type = None
    try:
        pred_obj = json.loads(doc_pred)
        predicted_doc_type = pred_obj.get("PredictedDocumentType")
    except Exception:
        pass

    # Merge clauses (streaming if supported)
    merge_stream = govt_.merge_government_clauses_with_llm(government_unique_clauses, predicted_doc_type=predicted_doc_type)
    merged_government = []
    for part in merge_stream:
        print(part, end="", flush=True)
        merged_government.append(part)

    # Explain top clauses (streaming)
    government_explanations = []
    for c in government_unique_clauses[:10]:
        explain_stream = govt_.explain_government_clause(c)  # generator
        explanation = ""
        for part in explain_stream:
            print(part, end="", flush=True)
            explanation += part
        government_explanations.append({"clause": c, "analysis": explanation})

    # Summarize (streaming)
    summary_stream = govt_.summarize_government_from_json(merged_government)
    summary_text = ""
    for part in summary_stream:
        print(part, end="", flush=True)
        summary_text += part

    return summary_text, merged_government
