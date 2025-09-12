// src/lib/utils/pdf-processor.ts
import { createCanvas, loadImage } from 'canvas';

// Fast PDF text extraction using pdfjs-dist
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid bundling issues
    const pdfParse = await import('pdf-parse/lib/pdf-parse');
    const result = await pdfParse.default(buffer);
    return result.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    // Fallback: try alternative method
    return await extractPdfTextFallback(buffer);
  }
}

// Fallback PDF extraction using pdfjs-dist directly
async function extractPdfTextFallback(buffer: Buffer): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Fallback PDF extraction failed:', error);
    return 'Failed to extract text from PDF';
  }
}

// Image OCR using Google Vision API
export async function extractImageText(buffer: Buffer): Promise<string> {
  try {
    if (!process.env.GOOGLE_CLOUD_VISION_API_KEY) {
      throw new Error('Google Vision API key not configured');
    }

    const base64Image = buffer.toString('base64');
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Image },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
          }]
        })
      }
    );

    const result = await response.json();
    return result.responses?.[0]?.textAnnotations?.[0]?.description || '';
    
  } catch (error) {
    console.error('OCR error:', error);
    return 'Failed to extract text from image';
  }
}

// Main processor function
export async function processDocumentText(
  buffer: Buffer, 
  type: 'pdf' | 'image'
): Promise<string> {
  if (type === 'pdf') {
    return await extractPdfText(buffer);
  } else {
    return await extractImageText(buffer);
  }
}