// src/lib/utils/pdf-processor.ts
import { createCanvas, loadImage } from 'canvas';

// Fast PDF text extraction using pdfjs-dist
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid bundling issues
    const pdfParse = await import('pdf-parse/lib/pdf-parse');
    const options = {
      // Increase max pages to handle larger documents
      max: 0, // 0 = no limit
      // Add custom rendering to improve text extraction
      pagerender: async (pageData: any) => {
        // Return both standard text and custom rendering
        const renderText = await pageData.getTextContent();
        return renderText.items.map((item: any) => item.str).join(' ');
      }
    };
    const result = await pdfParse.default(buffer, options);
    
    // Check if text was successfully extracted
    if (!result.text || result.text.trim().length < 10) {
      console.log('Primary extraction yielded insufficient text, trying fallback');
      return await extractPdfTextFallback(buffer);
    }
    
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
    // Set worker path to avoid worker issues
    const pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.entry');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let fullText = '';
    
    // Process each page with enhanced extraction
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      
      // Get text content with more options for better extraction
      const textContent = await page.getTextContent({
        normalizeWhitespace: true,
        disableCombineTextItems: false
      });
      
      // Process text with position awareness to maintain document structure
      const items = textContent.items;
      let lastY = null;
      let pageText = '';
      
      for (const item of items) {
        if (lastY !== item.transform[5] && lastY !== null) {
          pageText += '\n'; // Add newline when y-position changes
        }
        pageText += item.str + ' ';
        lastY = item.transform[5];
      }
      
      fullText += pageText + '\n\n'; // Double newline between pages
    }
    
    // Clean up the extracted text
    const cleanedText = fullText
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n\n') // Replace multiple newlines with double newline
      .trim();
    
    return cleanedText || 'No text content extracted from PDF';
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
            features: [
              // Use both TEXT_DETECTION and DOCUMENT_TEXT_DETECTION for better results
              { type: 'TEXT_DETECTION', maxResults: 1 },
              { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
            ],
            imageContext: {
              languageHints: ['en'], // Optimize for English text
              textDetectionParams: {
                enableTextDetectionConfidenceScore: true
              }
            }
          }]
        })
      }
    );

    const result = await response.json();
    
    // Try to get text from DOCUMENT_TEXT_DETECTION first (better for documents)
    let extractedText = '';
    
    // Check for document text detection result
    const documentTextAnnotation = result.responses?.[0]?.fullTextAnnotation?.text;
    if (documentTextAnnotation) {
      extractedText = documentTextAnnotation;
    } else {
      // Fall back to regular text detection
      extractedText = result.responses?.[0]?.textAnnotations?.[0]?.description || '';
    }
    
    // Clean up the extracted text
    const cleanedText = extractedText
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n\n') // Replace multiple newlines with double newline
      .trim();
    
    return cleanedText || 'No text content extracted from image';
    
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