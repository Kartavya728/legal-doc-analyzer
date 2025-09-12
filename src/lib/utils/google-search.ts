// src/lib/utils/google-search.ts

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  thumbnail?: string;
}

export async function searchGoogle(query: string, numResults = 5): Promise<SearchResult[]> {
  try {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    if (!apiKey || !searchEngineId) {
      console.warn('Google Search API not configured');
      return [];
    }

    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', searchEngineId);
    url.searchParams.set('q', query);
    url.searchParams.set('num', numResults.toString());
    url.searchParams.set('safe', 'active');

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Search API error: ${response.status}`);
    }

    const data = await response.json();
    
    return (data.items || []).map((item: any) => ({
      title: item.title || '',
      link: item.link || '',
      snippet: item.snippet || '',
      thumbnail: item.pagemap?.cse_thumbnail?.[0]?.src,
    }));

  } catch (error) {
    console.error('Google search failed:', error);
    return [];
  }
}

export async function searchLegalInfo(documentType: string, topic: string): Promise<SearchResult[]> {
  const query = `${documentType} ${topic} legal requirements guide`;
  return await searchGoogle(query, 3);
}