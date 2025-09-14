from utils import call_gemini, client
import json
import re
from typing import Dict, List, Tuple, Any, Optional
from collections import defaultdict

class HybridDocumentDifferenceIdentifier:
    
    def __init__(self, doc1_chunks: List[str], doc2_chunks: List[str], doc1_category: str = None, doc2_category: str = None):
        self.doc1_chunks = doc1_chunks
        self.doc2_chunks = doc2_chunks
        self.doc1_category = doc1_category
        self.doc2_category = doc2_category
        
        # Create document summaries for holistic analysis
        self.doc1_summary = self.create_document_summary(doc1_chunks, "Document 1")
        self.doc2_summary = self.create_document_summary(doc2_chunks, "Document 2")
        
    def create_document_summary(self, chunks: List[str], doc_label: str, max_chunks: int = 10) -> Dict[str, str]:
        """
        Create a comprehensive but concise summary of the entire document.
        """
        # Take first, middle, and last chunks to capture overall structure
        selected_chunks = []
        if len(chunks) <= max_chunks:
            selected_chunks = chunks
        else:
            # Take first 3, middle 4, and last 3 chunks
            selected_chunks.extend(chunks[:3])
            mid_start = len(chunks) // 2 - 2
            selected_chunks.extend(chunks[mid_start:mid_start + 4])
            selected_chunks.extend(chunks[-3:])
        
        combined_text = "\n\n".join(selected_chunks)
        
        prompt = f"""
        Create a comprehensive summary of this {doc_label} for comparison purposes.
        
        Document Content (selected sections):
        \"\"\"{combined_text}\"\"\"
        
        Return JSON with:
        - DocumentType: Type of legal document
        - MainPurpose: Primary purpose/objective
        - KeySections: List of main sections identified
        - CriticalElements: Most important legal elements (dates, parties, amounts, etc.)
        - LegalFramework: Laws, regulations, sections referenced
        - DocumentStructure: Overall organization and flow
        - Tone: Formal/procedural/advisory/enforcement tone
        - Scope: Who/what this document affects
        """
        
        response = call_gemini(prompt)
        try:
            return json.loads(response)
        except:
            return {
                "DocumentType": "Unknown",
                "MainPurpose": "Could not determine",
                "error": "Summary generation failed",
                "raw_response": response
            }

    def holistic_document_comparison(self) -> Dict[str, Any]:
        """
        Compare documents holistically using document summaries.
        """
        prompt = f"""
        You are a legal document comparison expert. Compare these two documents holistically.
        
        Document 1 Summary:
        {json.dumps(self.doc1_summary, indent=2)}
        
        Document 2 Summary: 
        {json.dumps(self.doc2_summary, indent=2)}
        
        Provide holistic comparison in JSON:
        {{
            "OverallRelationship": "Amendment/Update/Revision/Completely_Different/Related_Documents",
            "DocumentEvolution": {{
                "StructuralChanges": "How document organization changed",
                "ScopeChanges": "Changes in who/what is affected", 
                "ToneChanges": "Changes in legal approach/tone",
                "PurposeEvolution": "How main purpose evolved"
            }},
            "StrategicDifferences": [
                "High-level strategic changes between documents"
            ],
            "ContinuityElements": [
                "What remains consistent across documents"
            ],
            "DocumentWideImpact": {{
                "LegalSignificance": "Overall legal impact of changes",
                "PracticalImplications": "Real-world effects",
                "ComplianceImpact": "How compliance requirements changed"
            }},
            "HolisticInsights": [
                "Insights only visible from full document perspective"
            ]
        }}
        """
        
        response = call_gemini(prompt)
        try:
            return json.loads(response)
        except:
            return {"error": "Holistic comparison failed", "raw_response": response}

    def chunk_level_analysis(self) -> Dict[str, Any]:
        """
        Perform detailed chunk-level analysis (using efficient approach from before).
        """
        print("🔍 Performing detailed chunk-level analysis...")
        
        # Extract metadata from key chunks (limit for efficiency)
        doc1_metadata = []
        doc2_metadata = []
        
        # Process up to 12 chunks from each document
        max_chunks_to_process = min(12, len(self.doc1_chunks), len(self.doc2_chunks))
        
        for i in range(max_chunks_to_process):
            if i < len(self.doc1_chunks):
                meta1 = self.extract_chunk_metadata(self.doc1_chunks[i], i, "Doc1")
                doc1_metadata.append(meta1)
            
            if i < len(self.doc2_chunks):
                meta2 = self.extract_chunk_metadata(self.doc2_chunks[i], i, "Doc2")
                doc2_metadata.append(meta2)
        
        # Find and compare similar chunks
        similar_chunks = self.find_similar_chunks_efficient(doc1_metadata, doc2_metadata)
        
        # Detailed comparisons for top matches
        detailed_comparisons = []
        for match in similar_chunks[:6]:  # Top 6 matches
            try:
                idx1, idx2 = match['doc1_chunk'], match['doc2_chunk']
                if idx1 < len(self.doc1_chunks) and idx2 < len(self.doc2_chunks):
                    comparison = self.compare_chunk_pair_detailed(
                        self.doc1_chunks[idx1], self.doc2_chunks[idx2], 
                        doc1_metadata[idx1], doc2_metadata[idx2]
                    )
                    detailed_comparisons.append(comparison)
            except Exception as e:
                print(f"Error in chunk comparison: {e}")
        
        return {
            "doc1_metadata": doc1_metadata,
            "doc2_metadata": doc2_metadata, 
            "chunk_matches": similar_chunks,
            "detailed_comparisons": detailed_comparisons,
            "chunks_processed": {
                "doc1": len(doc1_metadata),
                "doc2": len(doc2_metadata),
                "comparisons": len(detailed_comparisons)
            }
        }

    def extract_chunk_metadata(self, chunk: str, index: int, doc_label: str) -> Dict[str, Any]:
        """Efficient metadata extraction for chunks."""
        prompt = f"""
        Extract key metadata from this chunk:
        
        {chunk[:800]}{"..." if len(chunk) > 800 else ""}
        
        Return JSON:
        {{"ChunkType": "header/facts/evidence/legal_refs/charges/conclusion", 
          "KeyTerms": ["important terms"], "Summary": "one line summary"}}
        """
        
        try:
            response = call_gemini(prompt)
            metadata = json.loads(response)
            metadata.update({"chunk_index": index, "doc_label": doc_label})
            return metadata
        except:
            return {
                "chunk_index": index, "doc_label": doc_label,
                "ChunkType": "unknown", "Summary": "Processing failed"
            }

    def find_similar_chunks_efficient(self, meta1: List[Dict], meta2: List[Dict]) -> List[Dict]:
        """Efficient chunk matching based on metadata."""
        matches = []
        
        # Simple but effective matching
        for i, m1 in enumerate(meta1):
            for j, m2 in enumerate(meta2):
                score = 0
                
                # Same chunk type = high score
                if m1.get('ChunkType') == m2.get('ChunkType'):
                    score += 3
                
                # Similar summaries = medium score  
                summary1 = set(m1.get('Summary', '').lower().split())
                summary2 = set(m2.get('Summary', '').lower().split())
                overlap = len(summary1 & summary2)
                if overlap > 1:
                    score += overlap
                
                if score >= 3:  # Threshold for similarity
                    matches.append({
                        "doc1_chunk": i, "doc2_chunk": j,
                        "similarity_score": score,
                        "match_reason": f"ChunkType: {m1.get('ChunkType')}, Summary overlap: {overlap}"
                    })
        
        # Sort by score and return top matches
        return sorted(matches, key=lambda x: x['similarity_score'], reverse=True)

    def compare_chunk_pair_detailed(self, chunk1: str, chunk2: str, meta1: Dict, meta2: Dict) -> Dict[str, Any]:
        """Detailed comparison of chunk pair."""
        prompt = f"""
        Compare these chunks:
        
        Chunk 1: {chunk1[:500]}...
        Chunk 2: {chunk2[:500]}...
        
        Return JSON:
        {{"differences": ["key differences"], "similarities": ["similarities"], 
          "impact": "significance of differences", "change_type": "addition/modification/deletion"}}
        """
        
        try:
            response = call_gemini(prompt)
            result = json.loads(response)
            result.update({"chunk1_idx": meta1['chunk_index'], "chunk2_idx": meta2['chunk_index']})
            return result
        except:
            return {"error": "Comparison failed", "chunk1_idx": meta1['chunk_index'], "chunk2_idx": meta2['chunk_index']}

    def synthesize_hybrid_results(self, holistic: Dict, chunk_level: Dict) -> Dict[str, Any]:
        """
        Combine holistic and chunk-level insights into comprehensive analysis.
        """
        prompt = f"""
        You are synthesizing a hybrid document comparison combining holistic and detailed analysis.
        
        HOLISTIC ANALYSIS:
        {json.dumps(holistic, indent=2)}
        
        CHUNK-LEVEL ANALYSIS:
        - Chunks processed: {chunk_level['chunks_processed']}
        - Key comparisons: {len(chunk_level['detailed_comparisons'])} detailed comparisons
        - Chunk matches found: {len(chunk_level['chunk_matches'])}
        
        Sample chunk comparisons:
        {json.dumps(chunk_level['detailed_comparisons'][:3], indent=2)}
        
        Synthesize into comprehensive comparison:
        {{
            "ExecutiveInsights": {{
                "DocumentRelationship": "Overall relationship between documents",
                "MajorChanges": ["Most significant changes identified"],
                "BusinessImpact": "Real-world implications", 
                "LegalImplications": "Legal significance"
            }},
            "DetailedAnalysis": {{
                "StructuralComparison": "How document structure changed",
                "ContentComparison": "Key content differences", 
                "SectionBySection": ["Section-specific changes"],
                "CriticalModifications": ["Most important modifications"]
            }},
            "HybridInsights": {{
                "HolisticFindings": ["Insights from overall document view"],
                "GranularFindings": ["Insights from detailed section analysis"],
                "ComplementaryInsights": ["Insights from combining both approaches"]
            }},
            "Recommendations": {{
                "ImmediateActions": ["Actions to take based on changes"],
                "ComplianceConsiderations": ["Compliance implications"],
                "ReviewPriorities": ["Areas requiring focused review"]
            }}
        }}
        """
        
        response = call_gemini(prompt)
        try:
            return json.loads(response)
        except:
            return {
                "error": "Synthesis failed",
                "holistic_available": bool(holistic),
                "chunk_analysis_available": bool(chunk_level),
                "raw_response": response
            }

    def generate_comprehensive_summary(self, synthesis: Dict) -> str:
        """Generate executive summary from hybrid analysis."""
        prompt = f"""
        Write a comprehensive executive summary based on this hybrid document analysis:
        
        {json.dumps(synthesis, indent=2)}
        
        Structure the summary in 5-6 paragraphs:
        1. Document Overview & Relationship
        2. Major Structural & Strategic Changes  
        3. Key Content Modifications (section-specific)
        4. Legal & Compliance Implications
        5. Business Impact & Practical Effects
        6. Recommendations & Next Steps
        
        Balance high-level insights with specific details. Use professional legal language.
        """
        
        return call_gemini(prompt)

    def run_hybrid_comparison(self) -> Dict[str, Any]:
        """
        Run the complete hybrid comparison combining both approaches.
        """
        print("🚀 Starting Hybrid Document Comparison...")
        print(f"📊 Documents: {len(self.doc1_chunks)} vs {len(self.doc2_chunks)} chunks")
        print(f"📂 Categories: {self.doc1_category} vs {self.doc2_category}")
        
        # Step 1: Holistic comparison
        print("🌐 Performing holistic document analysis...")
        holistic_results = self.holistic_document_comparison()
        
        # Step 2: Chunk-level analysis  
        print("🔬 Performing detailed chunk-level analysis...")
        chunk_results = self.chunk_level_analysis()
        
        # Step 3: Synthesize results
        print("🧠 Synthesizing hybrid insights...")
        synthesis = self.synthesize_hybrid_results(holistic_results, chunk_results)
        
        # Step 4: Generate comprehensive summary
        print("📄 Generating comprehensive summary...")
        executive_summary = self.generate_comprehensive_summary(synthesis)
        
        # Compile final results
        return {
            "ExecutiveSummary": executive_summary,
            "HybridAnalysis": {
                "HolisticAnalysis": holistic_results,
                "ChunkLevelAnalysis": chunk_results,
                "SynthesizedInsights": synthesis
            },
            "DocumentMetadata": {
                "doc1_category": self.doc1_category,
                "doc2_category": self.doc2_category,
                "doc1_chunks": len(self.doc1_chunks),
                "doc2_chunks": len(self.doc2_chunks),
                "analysis_method": "hybrid_holistic_and_granular"
            },
            "ProcessingStats": {
                "holistic_summaries_created": 2,
                "chunks_analyzed": chunk_results['chunks_processed'],
                "total_comparisons": len(chunk_results['detailed_comparisons']),
                "analysis_depth": "comprehensive"
            }
        }


# Updated workflow function using hybrid approach
def hybrid_difference_workflow(doc1_chunks: List[str], doc2_chunks: List[str], 
                              doc1_category: str = None, doc2_category: str = None):
    """
    Hybrid difference workflow that combines holistic and granular analysis.
    
    Returns:
        Tuple containing (executive_summary, comprehensive_results)
    """
    print("🔄 Starting Hybrid Document Difference Analysis...")
    
    comparator = HybridDocumentDifferenceIdentifier(doc1_chunks, doc2_chunks, doc1_category, doc2_category)
    results = comparator.run_hybrid_comparison()
    
    executive_summary = results.get("ExecutiveSummary", "Summary generation failed")
    return executive_summary, results


# Comparison of approaches
def compare_approaches():
    """
    Helper to understand the differences between approaches.
    """
    return {
        "chunk_only": {
            "pros": ["Memory efficient", "Scalable", "Granular analysis", "Token-safe"],
            "cons": ["May miss holistic context", "Less document-wide insights"],
            "best_for": ["Large documents", "Section-specific changes", "Detailed analysis"]
        },
        "holistic_only": {
            "pros": ["Complete context", "Document-wide insights", "Strategic view"],
            "cons": ["Token limits", "Memory issues", "Less precise"],
            "best_for": ["Small documents", "Overall comparison", "Strategic analysis"] 
        },
        "hybrid": {
            "pros": ["Best of both worlds", "Comprehensive", "Balanced insights"],
            "cons": ["Slightly more processing time", "More complex"],
            "best_for": ["Most legal documents", "Professional analysis", "Complete comparison"]
        }
    }