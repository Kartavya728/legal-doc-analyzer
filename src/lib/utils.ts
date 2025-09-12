import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to generate UI models for related content with enhanced image search
export async function generateUIModels(content: string, description: string) {
  try {
    // Add loading state indicator
    console.log('Generating UI models with image search...');
    
    // Call an API to generate UI models based on content and description
    const response = await fetch('/api/generate-ui-models', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        content, 
        description,
        enableImageSearch: true // Enable internet image search
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate UI models');
    }

    const data = await response.json();
    console.log('Successfully generated UI models with images');
    return data.models;
  } catch (error) {
    console.error('Error generating UI models:', error);
    return [];
  }
}
