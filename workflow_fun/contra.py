from contracts import *

def contract_workflow(chunks):
    contract_ = contracts(chunks)
    all_clauses = []

    print("Extracting contract clauses in streaming mode...\n")
    for chunk in chunks:
        clause_stream = contract_.extract_contract_clauses(chunk)  # should return a generator
        clause_text = ""
        for partial in clause_stream:
            print(partial, end="", flush=True)  # stream to terminal
            clause_text += partial
        clauses = [c.strip() for c in clause_text.split("\n") if c.strip()]
        all_clauses.extend(clauses)

    # Deduplicate
    unique_clauses = list(dict.fromkeys(all_clauses))

    contract_results = []
    for clause in unique_clauses:
        level2_stream = contract_.classify_contract_level2(clause)  # generator
        sub_category = ""
        for part in level2_stream:
            print(part, end="", flush=True)
            sub_category += part
        contract_results.append({
            "clause": clause,
            "sub_category": sub_category
        })

    contract_attributes = []
    for clause in unique_clauses:
        attr_stream = contract_.extract_contract_attributes(clause)
        details = ""
        for part in attr_stream:
            print(part, end="", flush=True)
            details += part
        contract_attributes.append({
            "clause": clause,
            "attributes": details
        })

    explained_contract_clauses = []
    for clause in contract_attributes:
        explain_stream = contract_.explain_contract_clause(clause)
        details = ""
        for part in explain_stream:
            print(part, end="", flush=True)
            details += part
        explained_contract_clauses.append({
            "clause": clause,
            "analysis": details
        })

    # Summarize with streaming if possible
    summary_stream = contract_.makenice(explained_contract_clauses)
    summary_text = ""
    for part in summary_stream:
        print(part, end="", flush=True)
        summary_text += part

    return summary_text, explained_contract_clauses
