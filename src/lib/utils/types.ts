export type AnalysisResult = {
  summary: string;
  risks: {
    term: string;
    explanation: string;
  }[];
};

export type LangGraphState = {
  document: string; // The full document text
  clauses?: string[]; // Identified clauses
  categorizedClauses?: { clause: string; category: string; explanation: string }[]; // Categorized clauses
  summary?: string;
  risks?: { term: string; explanation: string }[];
  errors?: string[];
};