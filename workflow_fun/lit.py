from litigation import litigation

def litigation_workflow(chunks):
    litigation_ = litigation(chunks)
    all_clauses = []

    print("Extracting clauses in streaming mode...\n")

    for chunk in chunks:
        clause_stream = litigation_.extract_clauses(chunk)  # now this should return a generator
        clause_text = ""
        for partial in clause_stream:
            print(partial, end="", flush=True)  # stream to terminal
            clause_text += partial
        clauses = [c.strip() for c in clause_text.split("\n") if c.strip()]
        all_clauses.extend(clauses)

    # Deduplicate
    unique_clauses = list(dict.fromkeys(all_clauses))

    criminal_results = []
    for clause in unique_clauses:
        # Assu*
        # ing classify_criminal_level2 can also stream
        category_stream = litigation_.classify_criminal_level2(clause)
        sub_category = ""
        for part in category_stream:
            print(part, end="", flush=True)
            sub_category += part
        criminal_results.append({
            "clause": clause,
            "sub_category": sub_category
        })

    criminal_attributes = []
    for clause in unique_clauses:
        attr_stream = litigation_.extract_criminal_attributes(clause)
        details = ""
        for part in attr_stream:
            print(part, end="", flush=True)
            details += part
        criminal_attributes.append({
            "clause": clause,
            "attributes": details
        })
        

    explained_clauses = []
    for clause in criminal_attributes:
        explanation_stream = litigation_.explain_criminal_clause(clause)
        explanation = ""
        for part in explanation_stream:
            print(part, end="", flush=True)
            explanation += part
        explained_clauses.append({
            "clause": clause,
            "analysis": explanation
        })

    # Case details (can also stream if supported)
    detailed_clauses = []
    for clause in chunks:
        details_stream = litigation_.extract_case_details(clause)
        details_text = ""
        for part in details_stream:
            print(part, end="", flush=True)
            details_text += part
        detailed_clauses.append({
            "case_details": details_text
        })

    cleaned = litigation_.deduplicate_details(detailed_clauses)
    final_jason = [cleaned] + explained_clauses

    summary_stream = litigation_.summarize_with_advice(final_jason)
    summary_text = ""
    for part in summary_stream:
        print(part, end="", flush=True)
        summary_text += part

    return summary_text, final_jason

