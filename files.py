import os

# Target folder
base_path = r"components/display"

# Files to create with default comments
files = [
    "SummaryCard.tsx",
    "KeyPoints.tsx",
    "RisksCard.tsx",
    "ActionsCard.tsx",
    "ClausesCard.tsx",
    "RelatedInfoGrid.tsx",
    "WebSearch.tsx",
    "TableComponent.tsx",
    "FlowChartComponent.tsx",
    "ImagesComponent.tsx",
    "Chatbot.tsx",
    "Theme.ts",
]

# Create folder if it doesn’t exist
os.makedirs(base_path, exist_ok=True)

# Create each file with a comment
for file in files:
    file_path = os.path.join(base_path, file)
    if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
        with open(file_path, "w", encoding="utf-8") as f:
            if file.endswith(".tsx"):
                f.write(f"// {file} - placeholder component file\n")
            else:
                f.write(f"// {file} - placeholder file\n")
        print(f"Created with comment: {file_path}")
    else:
        print(f"Already has content: {file_path}")
