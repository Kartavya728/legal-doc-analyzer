// src/lib/utils/ui-generator.ts

interface UIGeneratorInput {
  category: string;
  title: string;
  summary: any;
  clauses: any[];
  relatedInfo: any;
}

// This would integrate with a Hugging Face model for UI generation
export async function generateUIComponent(input: UIGeneratorInput): Promise<string> {
  try {
    // For now, we'll create a structured layout description
    // In production, you'd call a Hugging Face model here
    const uiStructure = generateUIStructure(input);
    
    // Optionally call Hugging Face model
    // const generatedUI = await callHuggingFaceModel(uiStructure);
    
    return uiStructure;
  } catch (error) {
    console.error('UI generation failed:', error);
    return generateFallbackUI(input);
  }
}

function generateUIStructure(input: UIGeneratorInput): string {
  const { category, title, summary, clauses, relatedInfo } = input;
  
  return JSON.stringify({
    layout: "card-grid",
    theme: getCategoryTheme(category),
    sections: [
      {
        type: "header",
        title: title,
        category: category,
        icon: getCategoryIcon(category),
        color: getCategoryColor(category)
      },
      {
        type: "summary-card",
        content: summary?.summaryText,
        importance: "high",
        style: "elevated"
      },
      {
        type: "key-points",
        title: "Key Points",
        items: summary?.importantPoints || [],
        layout: "bullet-list",
        icon: "⭐"
      },
      {
        type: "risks-consequences", 
        title: "Risks & Consequences",
        content: summary?.mainRisksRightsConsequences,
        warning: summary?.whatHappensIfYouIgnoreThis,
        style: "warning-card"
      },
      {
        type: "action-items",
        title: "What to Do Now",
        items: summary?.whatYouShouldDoNow || [],
        layout: "action-cards",
        priority: "high"
      },
      {
        type: "clauses-grid",
        title: "Important Clauses",
        items: clauses.map((clause: any) => ({
          title: clause.clause,
          explanation: clause.explanation?.Explanation,
          punishment: clause.explanation?.PunishmentDetails,
          importance: clause.importance
        })),
        layout: "expandable-cards"
      },
      {
        type: "related-info",
        title: "Related Information",
        sources: relatedInfo?.slice(0, 3) || [],
        layout: "link-cards"
      }
    ],
    visualElements: {
      progressBar: true,
      iconography: true,
      colorCoding: true,
      animations: "subtle"
    }
  }, null, 2);
}

function generateFallbackUI(input: UIGeneratorInput): string {
  return JSON.stringify({
    layout: "simple",
    theme: "default",
    sections: [
      { type: "title", content: input.title },
      { type: "summary", content: input.summary?.summaryText || "No summary available" }
    ]
  });
}

function getCategoryTheme(category: string): string {
  const themes = {
    "Contracts & Agreements": "business",
    "Litigation & Court Documents": "legal",
    "Regulatory & Compliance": "compliance",
    "Corporate Governance Documents": "corporate",
    "Property & Real Estate": "property",
    "Government & Administrative": "government",
    "Personal Legal Documents": "personal"
  };
  return themes[category as keyof typeof themes] || "default";
}

function getCategoryIcon(category: string): string {
  const icons = {
    "Contracts & Agreements": "📋",
    "Litigation & Court Documents": "⚖️",
    "Regulatory & Compliance": "📊",
    "Corporate Governance Documents": "🏢",
    "Property & Real Estate": "🏠",
    "Government & Administrative": "🏛️",
    "Personal Legal Documents": "📄"
  };
  return icons[category as keyof typeof icons] || "📄";
}

function getCategoryColor(category: string): string {
  const colors = {
    "Contracts & Agreements": "#3B82F6", // blue
    "Litigation & Court Documents": "#EF4444", // red
    "Regulatory & Compliance": "#10B981", // green
    "Corporate Governance Documents": "#8B5CF6", // purple
    "Property & Real Estate": "#F59E0B", // amber
    "Government & Administrative": "#6B7280", // gray
    "Personal Legal Documents": "#EC4899" // pink
  };
  return colors[category as keyof typeof colors] || "#6B7280";
}