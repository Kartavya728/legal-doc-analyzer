import { NextResponse } from 'next/server';

interface UIModel {
  type: string; // 'image' | 'link' | 'table' | 'chart'
  title: string;
  description: string;
  data: any; // Specific data for each type
  imageUrl?: string;
}

export async function POST(request: Request) {
  try {
    const { content, description, documentType, enableImageSearch } = await request.json();
    
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    
    // Log incoming request data
    console.log('Generate UI Models API - Request received:', {
      contentLength: content.length,
      contentPreview: content.substring(0, 100) + '...',
      description,
      documentType,
      enableImageSearch
    });

    // Generate UI models based on content analysis
    const models = await generateModels(content, description, documentType);
    
    // Log response data
    console.log('Generate UI Models API - Response data:', {
      modelCount: models.length,
      modelTypes: models.map(model => model.type),
      modelTitles: models.map(model => model.title)
    });
    
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error in generate-ui-models:', error);
    return NextResponse.json({ error: 'Failed to generate UI models' }, { status: 500 });
  }
}

async function generateModels(content: string, description: string, documentType?: string): Promise<UIModel[]> {
  console.log('generateModels function - Processing started:', {
    contentLength: content.length,
    description,
    documentType
  });
  // Extract key concepts from content
  const keywords = extractKeywords(content);
  
  // Generate different UI models
  const models: UIModel[] = [];
  
  // Generate summary model for all categories
  const summaryModel = await generateSummaryModel(content, description, documentType);
  if (summaryModel) models.push(summaryModel);
  
  // Generate link models based on keywords (online data search)
  const linkModels = await generateLinkModels(keywords);
  models.push(...linkModels);
  
  // Generate table model if content has structured data
  if (content.includes('table') || content.includes('data') || content.includes('statistics')) {
    const tableModel = generateTableModel(content);
    if (tableModel) models.push(tableModel);
  }
  
  // Log final models before returning
  console.log('generateModels function - Final output:', {
    modelCount: models.length,
    modelTypes: models.map(model => model.type),
    modelDetails: models.map(model => ({
      type: model.type,
      title: model.title,
      hasImageUrl: !!model.imageUrl
    }))
  });
  
  return models;
}

function extractKeywords(content: string): string[] {
  // Simple keyword extraction (in production, use NLP libraries)
  const words = content.toLowerCase().split(/\s+/);
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by']);
  
  const filteredWords = words
    .filter(word => word.length > 3 && !stopWords.has(word))
    .map(word => word.replace(/[^a-z]/g, ''));
  
  // Count word frequency
  const wordCount: Record<string, number> = {};
  filteredWords.forEach(word => {
    if (word) wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // Get top keywords
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

async function generateSummaryModel(content: string, description: string, documentType?: string): Promise<UIModel | null> {
  // Log the summary generation process
  console.log('generateSummaryModel - Generating summary for:', {
    contentPreview: content.substring(0, 100) + '...',
    description,
    documentType
  });
  
  // In a real implementation, this would use AI to generate a comprehensive summary
  // For now, we'll create a placeholder summary based on the available information
  const summaryText = `This ${documentType || 'document'} appears to be related to ${description}. 
  It contains approximately ${content.length} characters of text. 
  Key points include legal terminology, potential obligations, and relevant context.`;
  
  return {
    type: 'summary',
    title: 'Document Summary',
    description: 'Comprehensive overview of the document',
    data: {
      summaryText,
      documentType: documentType || 'Legal Document',
      wordCount: Math.round(content.length / 5), // Approximate word count
      readingTime: Math.round(content.length / 1000) // Approximate reading time in minutes
    }
  };
}

async function generateLinkModels(keywords: string[]): Promise<UIModel[]> {
  // In a real implementation, this would search for relevant links
  // For now, we'll return placeholders based on keywords
  return keywords.slice(0, 3).map(keyword => ({
    type: 'link',
    title: `Resources about ${keyword}`,
    description: `Learn more about ${keyword} and related legal concepts`,
    data: {
      url: `https://example.com/legal/${keyword}`,
      source: 'Legal Resources Database'
    }
  }));
}

function generateTableModel(content: string): UIModel | null {
  // In a real implementation, this would extract structured data
  // For now, we'll return a placeholder table
  return {
    type: 'table',
    title: 'Key Information',
    description: 'Structured data extracted from the document',
    data: {
      headers: ['Item', 'Description', 'Relevance'],
      rows: [
        ['Document Type', 'Legal Agreement', 'High'],
        ['Effective Date', 'Upon signing', 'Medium'],
        ['Key Provisions', 'Sections 3.1, 4.2, 7.8', 'High']
      ]
    }
  };
}