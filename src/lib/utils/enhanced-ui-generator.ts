// src/lib/utils/enhanced-ui-generator.ts

interface UIGeneratorInput {
  category: string;
  title: string;
  summary: any;
  clauses: any[];
  relatedInfo: any;
}

interface ImageSearchResult {
  url: string;
  title: string;
  description: string;
  source: string;
}

interface UIElement {
  type: 'section' | 'card' | 'visual' | 'interactive' | 'data';
  id: string;
  title: string;
  content?: any;
  images?: ImageSearchResult[];
  layout: 'grid' | 'carousel' | 'stack' | 'split';
  priority: 'high' | 'medium' | 'low';
  visualEffects: {
    animation: 'fade' | 'slide' | 'zoom' | 'pulse';
    gradient: boolean;
    glassmorphism: boolean;
    shadows: boolean;
  };
}

// Enhanced image search for legal content
// Enhanced image search for legal content
async function searchLegalImages(query: string, count: number = 3): Promise<ImageSearchResult[]> {
  try {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      // ❌ Instead of falling back to Unsplash, just return an empty array
      console.warn("⚠️ No Google Search credentials found. Skipping image search.");
      return [];
    }

    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', searchEngineId);
    url.searchParams.set('q', query);
    url.searchParams.set('searchType', 'image');
    url.searchParams.set('num', count.toString());
    url.searchParams.set('safe', 'active');
    url.searchParams.set('rights', 'cc_publicdomain,cc_attribute,cc_sharealike');

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error("❌ Google Image API request failed:", response.statusText);
      return [];
    }

    const data = await response.json();

    return (data.items || []).slice(0, count).map((item: any) => ({
      url: item.link,
      title: item.title || 'Legal Illustration',
      description: item.snippet || `Visual representation of ${query}`,
      source: item.displayLink || 'Internet'
    }));
  } catch (error) {
    console.error('❌ Image search failed:', error);
    return [];
  }
}


// Fallback to Unsplash for high-quality images
// Fallback to Unsplash for high-quality images (async, resolves redirects)
async function getFallbackImages(query: string, count: number): Promise<ImageSearchResult[]> {
  const searchTerms = encodeURIComponent(query.replace(/[^a-zA-Z0-9\s]/g, "").trim());
  const results: ImageSearchResult[] = [];

  for (let i = 0; i < count; i++) {
    const res = await fetch(`https://source.unsplash.com/800x600/?${searchTerms}&sig=${i}`, {
      redirect: "follow"
    });

    results.push({
      url: res.url,
      title: `${query} Visualization`,
      description: `Professional image illustrating ${query}`,
      source: "Unsplash"
    });
  }

  console.log(`🌄 Unsplash fallback results for "${query}":`);
  results.forEach(img => console.log("🖼️", img.url));

  return results;
}

// Generate contextual UI based on document analysis
export async function generateEnhancedUI(input: UIGeneratorInput): Promise<UIElement[]> {
  const { category, title, summary, clauses, relatedInfo } = input;
  const elements: UIElement[] = [];

  // 1. Document Header with Category Visualization
  const headerImages = await searchLegalImages(`${category} legal document professional`, 1);
  elements.push({
    type: 'section',
    id: 'document-header',
    title: 'Document Overview',
    content: { category, title, summary: summary?.summaryText },
    images: headerImages,
    layout: 'split',
    priority: 'high',
    visualEffects: {
      animation: 'fade',
      gradient: true,
      glassmorphism: true,
      shadows: true
    }
  });

  // 2. Key Points with Visual Explanations
  if (summary?.importantPoints?.length > 0) {
    const keyPointsImages = await searchLegalImages(`legal key points checklist important`, 2);
    elements.push({
      type: 'card',
      id: 'key-points',
      title: 'Key Points & Highlights',
      content: {
        points: summary.importantPoints,
        description: 'Critical information you need to know'
      },
      images: keyPointsImages,
      layout: 'grid',
      priority: 'high',
      visualEffects: {
        animation: 'slide',
        gradient: true,
        glassmorphism: false,
        shadows: true
      }
    });
  }

  // 3. Risk Assessment with Warning Visuals
  if (summary?.mainRisksRightsConsequences || summary?.whatHappensIfYouIgnoreThis) {
    const riskImages = await searchLegalImages('legal risk warning consequences compliance', 2);
    elements.push({
      type: 'card',
      id: 'risk-assessment',
      title: 'Risks & Legal Consequences',
      content: {
        risks: summary.mainRisksRightsConsequences,
        consequences: summary.whatHappensIfYouIgnoreThis,
        severity: 'high'
      },
      images: riskImages,
      layout: 'split',
      priority: 'high',
      visualEffects: {
        animation: 'pulse',
        gradient: true,
        glassmorphism: true,
        shadows: true
      }
    });
  }

  // 4. Action Items with Process Visualization
  if (summary?.whatYouShouldDoNow?.length > 0) {
    const actionImages = await searchLegalImages('legal process steps action plan checklist', 2);
    elements.push({
      type: 'interactive',
      id: 'action-items',
      title: 'Immediate Action Plan',
      content: {
        actions: summary.whatYouShouldDoNow,
        timeline: 'immediate',
        priority: 'urgent'
      },
      images: actionImages,
      layout: 'carousel',
      priority: 'high',
      visualEffects: {
        animation: 'zoom',
        gradient: true,
        glassmorphism: false,
        shadows: true
      }
    });
  }

  // 5. Clauses Analysis with Legal Documentation Visuals
  if (clauses?.length > 0) {
    const clauseImages = await searchLegalImages('legal contract clauses analysis document review', 3);
    
    // Group clauses by importance for better visualization
    const groupedClauses = {
      high: clauses.filter(c => c.importance === 'high'),
      medium: clauses.filter(c => c.importance === 'medium'),
      low: clauses.filter(c => c.importance === 'low')
    };

    elements.push({
      type: 'data',
      id: 'clauses-analysis',
      title: 'Detailed Clause Analysis',
      content: {
        groupedClauses,
        totalClauses: clauses.length,
        analysisType: 'detailed'
      },
      images: clauseImages,
      layout: 'grid',
      priority: 'medium',
      visualEffects: {
        animation: 'fade',
        gradient: false,
        glassmorphism: true,
        shadows: true
      }
    });
  }

  // 6. Compliance Timeline (if dates are mentioned)
  if (summary?.keyDates?.length > 0) {
    const timelineImages = await searchLegalImages('legal timeline compliance deadlines calendar', 2);
    elements.push({
      type: 'visual',
      id: 'compliance-timeline',
      title: 'Important Dates & Deadlines',
      content: {
        dates: summary.keyDates,
        timelineType: 'compliance'
      },
      images: timelineImages,
      layout: 'carousel',
      priority: 'high',
      visualEffects: {
        animation: 'slide',
        gradient: true,
        glassmorphism: false,
        shadows: false
      }
    });
  }

  // 7. Parties & Stakeholders Visualization
  if (summary?.parties?.length > 0) {
    const partiesImages = await searchLegalImages('legal parties stakeholders business meeting', 2);
    elements.push({
      type: 'visual',
      id: 'parties-stakeholders',
      title: 'Involved Parties & Stakeholders',
      content: {
        parties: summary.parties,
        relationships: 'contractual'
      },
      images: partiesImages,
      layout: 'grid',
      priority: 'medium',
      visualEffects: {
        animation: 'fade',
        gradient: false,
        glassmorphism: true,
        shadows: true
      }
    });
  }

  // 8. Related Resources with Educational Content
  if (relatedInfo?.length > 0) {
    const resourceImages = await searchLegalImages('legal resources education guides library', 3);
    elements.push({
      type: 'card',
      id: 'related-resources',
      title: 'Educational Resources & References',
      content: {
        resources: relatedInfo.slice(0, 6),
        type: 'educational'
      },
      images: resourceImages,
      layout: 'grid',
      priority: 'medium',
      visualEffects: {
        animation: 'slide',
        gradient: true,
        glassmorphism: false,
        shadows: true
      }
    });
  }

  // 9. Legal Context & Background
  const contextImages = await searchLegalImages(`${category} legal background context law`, 2);
  elements.push({
    type: 'visual',
    id: 'legal-context',
    title: 'Legal Context & Background',
    content: {
      category,
      jurisdiction: 'general',
      applicability: 'varies by location'
    },
    images: contextImages,
    layout: 'split',
    priority: 'low',
    visualEffects: {
      animation: 'fade',
      gradient: true,
      glassmorphism: true,
      shadows: false
    }
  });

  // 10. Interactive Help Section
  const helpImages = await searchLegalImages('legal help support consultation advice', 2);
  elements.push({
    type: 'interactive',
    id: 'help-support',
    title: 'Get Additional Help',
    content: {
      chatAvailable: true,
      expertConsultation: true,
      additionalResources: true
    },
    images: helpImages,
    layout: 'stack',
    priority: 'medium',
    visualEffects: {
      animation: 'pulse',
      gradient: true,
      glassmorphism: true,
      shadows: true
    }
  });

  return elements;
}

// Generate specific UI components for different document types
export async function generateCategorySpecificUI(category: string, content: any): Promise<UIElement[]> {
  const specificElements: UIElement[] = [];

  switch (category) {
    case 'Contracts & Agreements':
      const contractImages = await searchLegalImages('contract signing agreement handshake business', 3);
      specificElements.push({
        type: 'visual',
        id: 'contract-visualization',
        title: 'Contract Structure & Flow',
        content: {
          contractType: content.contractType || 'General',
          parties: content.parties || [],
          terms: content.terms || []
        },
        images: contractImages,
        layout: 'carousel',
        priority: 'high',
        visualEffects: {
          animation: 'zoom',
          gradient: true,
          glassmorphism: true,
          shadows: true
        }
      });
      break;

    case 'Property & Real Estate':
      const propertyImages = await searchLegalImages('real estate property legal documents house', 3);
      specificElements.push({
        type: 'visual',
        id: 'property-details',
        title: 'Property & Real Estate Details',
        content: {
          propertyType: content.propertyType || 'Real Estate',
          location: content.location || 'Various',
          rights: content.rights || []
        },
        images: propertyImages,
        layout: 'grid',
        priority: 'high',
        visualEffects: {
          animation: 'slide',
          gradient: true,
          glassmorphism: false,
          shadows: true
        }
      });
      break;

    case 'Litigation & Court Documents':
      const litigationImages = await searchLegalImages('court litigation legal proceedings justice', 3);
      specificElements.push({
        type: 'data',
        id: 'litigation-overview',
        title: 'Litigation & Court Proceedings',
        content: {
          caseType: content.caseType || 'Legal Proceeding',
          jurisdiction: content.jurisdiction || 'Various',
          timeline: content.timeline || []
        },
        images: litigationImages,
        layout: 'split',
        priority: 'high',
        visualEffects: {
          animation: 'fade',
          gradient: true,
          glassmorphism: true,
          shadows: true
        }
      });
      break;

    case 'Regulatory & Compliance':
      const complianceImages = await searchLegalImages('regulatory compliance rules regulations checklist', 3);
      specificElements.push({
        type: 'interactive',
        id: 'compliance-tracker',
        title: 'Compliance Requirements & Tracker',
        content: {
          requirements: content.requirements || [],
          deadlines: content.deadlines || [],
          penalties: content.penalties || []
        },
        images: complianceImages,
        layout: 'carousel',
        priority: 'high',
        visualEffects: {
          animation: 'pulse',
          gradient: true,
          glassmorphism: false,
          shadows: true
        }
      });
      break;

    default:
      // Generic legal document visualization
      const genericImages = await searchLegalImages(`${category} legal document analysis`, 2);
      specificElements.push({
        type: 'card',
        id: 'generic-analysis',
        title: 'Document Analysis Overview',
        content: {
          category,
          analysisComplete: true,
          keyInsights: content.insights || []
        },
        images: genericImages,
        layout: 'grid',
        priority: 'medium',
        visualEffects: {
          animation: 'fade',
          gradient: true,
          glassmorphism: true,
          shadows: true
        }
      });
  }

  return specificElements;
}

// Generate dynamic UI structure based on content complexity
export async function generateAdaptiveUI(input: UIGeneratorInput): Promise<any> {
  const baseElements = await generateEnhancedUI(input);
  const categorySpecific = await generateCategorySpecificUI(input.category, input.summary);
  
  const allElements = [...baseElements, ...categorySpecific];
  
  // Sort by priority and create adaptive layout
  const sortedElements = allElements.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Create final payload
  const adaptiveUI = {
    layout: 'adaptive-grid',
    theme: getCategoryTheme(input.category),
    totalElements: sortedElements.length,
    renderOrder: sortedElements.map(el => el.id),
    elements: sortedElements.reduce((acc, el) => {
      acc[el.id] = el;
      return acc;
    }, {} as Record<string, UIElement>),
    metadata: {
      generatedAt: new Date().toISOString(),
      category: input.category,
      complexity: sortedElements.length > 8 ? 'high' : sortedElements.length > 5 ? 'medium' : 'low',
      hasInteractiveElements: sortedElements.some(el => el.type === 'interactive'),
      hasVisualElements: sortedElements.some(el => el.images && el.images.length > 0)
    }
  };

  // 🔹 Debug: Print the full payload for frontend inspection
  console.log("🚀 Final Adaptive UI Payload:", JSON.stringify(adaptiveUI, null, 2));

  // 🔹 Optional: Print a concise preview of elements & images
  console.log("🖼️ Elements & Image URLs Preview:");
  sortedElements.forEach(el => {
    console.log(el.id, el.images?.map(img => img.url));
  });

  return adaptiveUI;
}

function getCategoryTheme(category: string) {
  const themes = {
    "Contracts & Agreements": {
      primary: "#3B82F6",
      secondary: "#1E40AF",
      accent: "#60A5FA",
      background: "linear-gradient(135deg, #1e3a8a20, #3b82f620)"
    },
    "Litigation & Court Documents": {
      primary: "#EF4444",
      secondary: "#B91C1C",
      accent: "#F87171",
      background: "linear-gradient(135deg, #b91c1c20, #ef444420)"
    },
    "Regulatory & Compliance": {
      primary: "#10B981",
      secondary: "#047857",
      accent: "#34D399",
      background: "linear-gradient(135deg, #04785720, #10b98120)"
    },
    "Corporate Governance Documents": {
      primary: "#8B5CF6",
      secondary: "#7C3AED",
      accent: "#A78BFA",
      background: "linear-gradient(135deg, #7c3aed20, #8b5cf620)"
    },
    "Property & Real Estate": {
      primary: "#F59E0B",
      secondary: "#D97706",
      accent: "#FBB042",
      background: "linear-gradient(135deg, #d9770620, #f59e0b20)"
    },
    "Government & Administrative": {
      primary: "#6B7280",
      secondary: "#4B5563",
      accent: "#9CA3AF",
      background: "linear-gradient(135deg, #4b556320, #6b728020)"
    },
    "Personal Legal Documents": {
      primary: "#EC4899",
      secondary: "#DB2777",
      accent: "#F472B6",
      background: "linear-gradient(135deg, #db277720, #ec489920)"
    }
  };
  console.log("🚀 Themes object:", JSON.stringify(themes, null, 2));

  return themes[category as keyof typeof themes] || themes["Personal Legal Documents"];
}