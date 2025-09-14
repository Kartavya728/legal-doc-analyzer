from pers import *

def personal_workflow(chunks, category, doc_text):
    personal_ = pers(chunks)
    all_clauses = []

    print("Extracting personal legal clauses in streaming mode...\n")
    for chunk in chunks:
        clause_stream = personal_.extract_clauses(chunk)  # should return a generator
        clause_text = ""
        for part in clause_stream:
            print(part, end="", flush=True)  # stream to terminal
            clause_text += part
        clauses = [c.strip() for c in clause_text.split("\n") if c.strip()]
        all_clauses.extend(clauses)

    # Deduplicate while preserving order
    unique_clauses = list(dict.fromkeys(all_clauses))

    # Classify Level 2 clauses
    personal_results = []
    for clause in unique_clauses:
        level2_stream = personal_.classify_personal_level2(clause)  # generator
        sub_category = ""
        for part in level2_stream:
            print(part, end="", flush=True)
            sub_category += part
        personal_results.append({"clause": clause, "sub_category": sub_category})

    # Predict document type (streaming if supported)
    doc_stream = personal_.classify_personal_document(doc_text)  # generator
    doc_type_prediction = ""
    for part in doc_stream:
        print(part, end="", flush=True)
        doc_type_prediction += part

    # Extract attributes for each clause
    personal_attributes = []
    for clause in unique_clauses:
        attr_stream = personal_.extract_personal_attributes(clause, predicted_doc_type=doc_type_prediction)  # generator
        details = ""
        for part in attr_stream:
            print(part, end="", flush=True)
            details += part
        personal_attributes.append({"clause": clause, "attributes": details})

    # Explain clauses
    explained_personal_clauses = []
    for clause in personal_attributes:
        explain_stream = personal_.explain_personal_clause(clause)  # generator
        details = ""
        for part in explain_stream:
            print(part, end="", flush=True)
            details += part
        explained_personal_clauses.append({"clause": clause, "analysis": details})

    # Merge attributes (streaming if supported)
    merge_stream = personal_.merge_personal_attributes_lm(explained_personal_clauses)
    js = []
    for part in merge_stream:
        print(part, end="", flush=True)
        js.append(part)

    # Generate summary (streaming)
    summary_stream = personal_.generate_summary_from_json(js)
    summary_text = ""
    for part in summary_stream:
        print(part, end="", flush=True)
        summary_text += part

    return summary_text, js
