from regulation_comp import regulatory
import pandas as pd

def regulatory_workflow(chunks, category):
    regulatory_ = regulatory(chunks)

    print("Extracting regulatory clauses in streaming mode...\n")
    response_stream = regulatory_.extract_clauses_batched()  # generator
    response_text = ""
    for part in response_stream:
        print(part, end="", flush=True)
        response_text += part

    all_clauses = [c.strip() for c in response_text.split("\n") if c.strip()]
    unique_clauses = list(dict.fromkeys(all_clauses))

    df = pd.DataFrame({"Clause": unique_clauses, "Level1": category})

    # Extract attributes with streaming
    regulatory_attributes = []
    for clause in unique_clauses:
        attr_stream = regulatory_.extract_regulatory_attributes(clause)  # generator
        details = ""
        for part in attr_stream:
            print(part, end="", flush=True)
            details += part
        regulatory_attributes.append({"clause": clause, "attributes": details})

    # Explain document (streaming)
    explanation_stream = regulatory_.explain_regulatory_document_plain_language(regulatory_attributes)  # generator
    explanation_text = []
    for part in explanation_stream:
        print(part, end="", flush=True)
        explanation_text.append(part)

    return explanation_text, regulatory_attributes
