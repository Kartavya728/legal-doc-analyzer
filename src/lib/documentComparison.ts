// src/lib/documentComparison.ts
"use server";

import { callGemini, streamGemini, cleanJsonString } from "./utils";

/**
 * Interface for document difference analysis results
 */
export interface DocumentDifference {
  section: string;
  oldText: string;
  newText: string;
  significance: string;
  explanation: string;
}

/**
 * Hybrid document difference analysis class
 * Combines rule-based and AI-based approaches for document comparison
 */
export class DocumentComparison {
  private oldText: string;
  private newText: string;
  
  /**
   * Constructor for DocumentComparison
   * @param oldText The original document text
   * @param newText The new document text to compare against
   */
  constructor(oldText: string, newText: string) {
    this.oldText = oldText;
    this.newText = newText;
  }
  
  /**
   * Identify sections in a document
   * @param text Document text to analyze
   * @returns Array of identified sections
   */
  private async identifySections(text: string): Promise<{title: string, content: string}[]> {
    const prompt = `
      You are a legal document expert. Identify the main sections in this document.
      For each section, provide the section title and its content.
      
      Return the results in JSON format as an array of objects with 'title' and 'content' properties.
      
      Document text:
      ${text.substring(0, 5000)}... [truncated]
    `;
    
    const response = await callGemini(prompt);
    const cleanedResponse = cleanJsonString(response);
    
    try {
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error("Error parsing sections:", error);
      return [];
    }
  }
  
  /**
   * Compare two sections and identify differences
   * @param oldSection Original section content
   * @param newSection New section content
   * @param sectionTitle Title of the section being compared
   * @returns Generator yielding the comparison results
   */
  private async* compareSection(oldSection: string, newSection: string, sectionTitle: string) {
    const prompt = `
      You are a legal document expert. Compare these two versions of the "${sectionTitle}" section and identify the key differences.
      
      Original version:
      ${oldSection}
      
      New version:
      ${newSection}
      
      For each significant difference:
      1. Quote the specific text that changed
      2. Explain the significance of the change
      3. Assess whether this change is minor, moderate, or major
      
      Return the results in JSON format as an array of objects with these properties:
      - 'oldText': The text in the original version
      - 'newText': The text in the new version
      - 'significance': 'minor', 'moderate', or 'major'
      - 'explanation': Your explanation of the significance
    `;
    
    yield* streamGemini(prompt);
  }
  
  /**
   * Analyze the overall impact of all differences
   * @param differences Array of identified differences
   * @returns Generator yielding the impact analysis
   */
  private async* analyzeImpact(differences: DocumentDifference[]) {
    const prompt = `
      You are a legal document expert. Analyze the overall impact of these changes between document versions.
      
      Differences identified:
      ${JSON.stringify(differences, null, 2)}
      
      Provide a comprehensive analysis that includes:
      1. A summary of the most significant changes
      2. The potential legal implications of these changes
      3. Recommendations for how to respond to these changes
      4. Any areas of concern or opportunity created by these changes
      
      Format your response as a well-structured report with clear headings and bullet points where appropriate.
    `;
    
    yield* streamGemini(prompt);
  }
  
  /**
   * Perform a full comparison of the documents
   * @returns Promise resolving to [summary, differences]
   */
  public async compareDocuments(): Promise<[string, DocumentDifference[]]> {
    console.log("Starting document comparison...");
    
    // Identify sections in both documents
    const oldSections = await this.identifySections(this.oldText);
    const newSections = await this.identifySections(this.newText);
    
    // Map sections by title for easier comparison
    const oldSectionMap = new Map(oldSections.map(s => [s.title, s.content]));
    const newSectionMap = new Map(newSections.map(s => [s.title, s.content]));
    
    // Collect all unique section titles
    const allSectionTitles = new Set([...oldSectionMap.keys(), ...newSectionMap.keys()]);
    
    // Compare each section and collect differences
    const allDifferences: DocumentDifference[] = [];
    
    for (const title of allSectionTitles) {
      const oldContent = oldSectionMap.get(title) || "";
      const newContent = newSectionMap.get(title) || "";
      
      // Skip if section is identical
      if (oldContent === newContent) continue;
      
      // If section is entirely new or removed, add as a single difference
      if (!oldContent) {
        allDifferences.push({
          section: title,
          oldText: "[Section not present in original document]",
          newText: newContent.substring(0, 100) + "...",
          significance: "major",
          explanation: "This section was added to the document."
        });
        continue;
      }
      
      if (!newContent) {
        allDifferences.push({
          section: title,
          oldText: oldContent.substring(0, 100) + "...",
          newText: "[Section removed from document]",
          significance: "major",
          explanation: "This section was removed from the document."
        });
        continue;
      }
      
      // Compare sections with content in both versions
      console.log(`Comparing section: ${title}`);
      let sectionDifferences = "";
      for await (const partial of this.compareSection(oldContent, newContent, title)) {
        process.stdout.write(partial); // Stream to terminal
        sectionDifferences += partial;
      }
      
      try {
        const parsedDifferences = JSON.parse(cleanJsonString(sectionDifferences));
        if (Array.isArray(parsedDifferences)) {
          for (const diff of parsedDifferences) {
            allDifferences.push({
              section: title,
              ...diff
            });
          }
        }
      } catch (error) {
        console.error(`Error parsing differences for section ${title}:`, error);
      }
    }
    
    // Generate impact analysis
    let summary = "";
    for await (const partial of this.analyzeImpact(allDifferences)) {
      process.stdout.write(partial); // Stream to terminal
      summary += partial;
    }
    
    return [summary, allDifferences];
  }
}

/**
 * Compare two documents and analyze differences
 * @param oldText Original document text
 * @param newText New document text
 * @returns Promise resolving to [summary, differences]
 */
export async function compareDocuments(oldText: string, newText: string): Promise<[string, DocumentDifference[]]> {
  const comparison = new DocumentComparison(oldText, newText);
  return await comparison.compareDocuments();
}