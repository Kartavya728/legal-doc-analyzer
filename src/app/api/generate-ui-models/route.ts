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
    const { content, description } = await request.json();
    
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Generate UI models based on content analysis
    const models = await generateModels(content, description);
    
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error in generate-ui-models:', error);
    return NextResponse.json({ error: 'Failed to generate UI models' }, { status: 500 });
  }
}

async function generateModels(content: string, description: string): Promise<UIModel[]> {
  // Extract key concepts from content
  const keywords = extractKeywords(content);
  
  // Generate different UI models
  const models: UIModel[] = [];
  
  // Add multiple image models if description is provided
  if (description) {
    // Generate primary image model
    const primaryImageModel = await generateImageModel(description);
    if (primaryImageModel) models.push(primaryImageModel);
    
    // Generate additional image models for top keywords
    const topKeywords = keywords.slice(0, 2);
    for (const keyword of topKeywords) {
      // Only add if keyword is substantial (more than 5 chars)
      if (keyword.length > 5) {
        const keywordDescription = `${description} ${keyword}`;
        const additionalImageModel = await generateImageModel(keywordDescription);
        if (additionalImageModel) {
          // Modify the title to reflect the keyword
          additionalImageModel.title = `Visual: ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`;
          models.push(additionalImageModel);
        }
      }
    }
  }
  
  // Generate link models based on keywords
  const linkModels = await generateLinkModels(keywords);
  models.push(...linkModels);
  
  // Generate table model if content has structured data
  if (content.includes('table') || content.includes('data') || content.includes('statistics')) {
    const tableModel = generateTableModel(content);
    if (tableModel) models.push(tableModel);
  }
  
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

async function generateImageModel(description: string): Promise<UIModel | null> {
  try {
    // Call an internet image search API to find relevant images
    // This is a simulated implementation that would be replaced with a real API call
    // to services like Unsplash, Pexels, or Google Custom Search API
    
    // For demonstration, we'll use a more realistic placeholder with the description
    const searchTerm = encodeURIComponent(description.split(' ').slice(0, 3).join(' '));
    
    // In a real implementation, this would be an actual API call
    // const response = await fetch(`https://api.unsplash.com/search/photos?query=${searchTerm}&per_page=1`);
    // const data = await response.json();
    // const imageUrl = data.results[0]?.urls?.regular;
    
    // For now, we'll use a more descriptive placeholder
    const imageUrl = `https://source.unsplash.com/800x400/?${searchTerm}`;
    
    return {
      type: 'image',
      title: 'Visual Representation',
      description: `Image search results for: ${description}`,
      data: {
        searchTerm,
        source: 'Internet Image Search'
      },
      imageUrl
    };
  } catch (error) {
    console.error('Error searching for images:', error);
    
    // Fallback to placeholder if image search fails
    return {
      type: 'image',
      title: 'Visual Representation',
      description: `Visual representation related to: ${description}`,
      data: null,
      imageUrl: 'https://via.placeholder.com/800x400?text=Legal+Document+Visualization'
    };
  }
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