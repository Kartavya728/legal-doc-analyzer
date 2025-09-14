from classes.property_real import property
import pandas as pd

def property_workflow(chunks, category):
    property_ = property(chunks)

    print("Extracting property clauses in streaming mode...\n")
    response_stream = property_.extract_clauses_batched()  # generator
    response_text = ""
    for part in response_stream:
        print(part, end="", flush=True)
        response_text += part

    all_clauses = [c.strip() for c in response_text.split("\n") if c.strip()]
    unique_clauses = list(dict.fromkeys(all_clauses))

    df = pd.DataFrame({"Clause": unique_clauses, "Level1": category})

    # Extract attributes with streaming
    property_attributes = []
    for clause in unique_clauses:
        attr_stream = property_.extract_property_attributes(clause)  # generator
        details = ""
        for part in attr_stream:
            print(part, end="", flush=True)
            details += part
        property_attributes.append({"clause": clause, "attributes": details})

    # Explain document (streaming)
    explanation_stream = property_.explain_property_document(property_attributes)  # generator
    document_explanation = []
    for part in explanation_stream:
        print(part, end="", flush=True)
        document_explanation.append(part)

    # Generate summary (streaming)
    summary_stream = property_.generate_summary_and_comments(document_explanation)
    summary_text = ""
    for part in summary_stream:
        print(part, end="", flush=True)
        summary_text += part

    return summary_text, property_attributes
