# 🏛️ Legal Document Analyzer with LangChain, LangGraph & Supabase

An AI-powered legal document analyzer that:
- Extracts text from **PDF, DOCX, XLS** files
- Analyzes amounts, dates, and purposes
- Compares real-time pricing online
- Uses **RAG** on **Indian Court Documentation** for legal references
- Summarizes findings in simple, structured outputs

---

## 🚀 Features
- **Chatbot Interface** Interactive, user-friendly chatbot for querying and navigating legal documents effortlessly.
- **Granular Analysis** Deep, category-wise and clause-level insights that go beyond surface text scanning.
- **Safe Search** Smart, secure search functionality to instantly locate critical clauses or terms within large documents.
- **Document Comparison** Side-by-side comparison to highlight differences, detect manipulations, and ensure authenticity.
- **Context Aware Analysis** Provides practical interpretations and summaries tailored to the legal domain context.
- **Related Case Reference** Auto-suggests past cases, judgments, or precedents relevant to the clauses under review.
- **Transparent Thinking Process** Explainable AI that shows reasoning and highlights why decisions or categorizations are made.
---

## 🛠️ Tech Stack
| Component      | Technology |
|---------------|-----------|
Frontend        | Next.js 15 + TailwindCSS  
Backend         | FastAPI + LangChain + LangGraph  
Database        | Supabase + pgvector  
AI Models       | Goolge OCR / Gemini Pro /CLoud Translation  
Storage         | Supabase Buckets  
Deployment      | Vercel  

---

## 📂 Folder Structure
See [Project Structure](./) above.

---

## 🔧 Setup
```bash
# Clone repo
git clone https://github.com/your-username/legal-doc-analyzer.git
cd legal-doc-analyzer

# Install dependencies
npm install

# Run psmbdsm
npm run dev
