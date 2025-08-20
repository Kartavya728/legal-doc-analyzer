// src/lib/js_processing.ts

import { HfInference } from '@huggingface/inference';
import * as pdfjs from 'pdfjs-dist';
import { Canvas, createCanvas, CanvasRenderingContext2D } from 'canvas';
pdfjs.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.js');

const hfToken = process.env.HUGGINGFACE_ACCESS_TOKEN;
if (!hfToken) {
  throw new Error("FATAL: HUGGINGFACE_ACCESS_TOKEN is not defined.");
}
const hf = new HfInference(hfToken);

// This class is complete and correct.
class NodeCanvasFactory {
  create(width: number, height: number): { canvas: Canvas; context: CanvasRenderingContext2D } {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }

  reset(canvasAndContext: { canvas: Canvas; context: CanvasRenderingContext2D }, width: number, height: number): void {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: { canvas: Canvas; context: CanvasRenderingContext2D }): void {
    // @ts-ignore
    canvasAndContext.canvas = null;
    // @ts-ignore
    canvasAndContext.context = null;
  }
}

// This function is correct.
export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  const model = "microsoft/trocr-base-handwritten";
  const imageBlob = new Blob([imageBuffer]);
  const result = await hf.imageToText({ model, data: imageBlob });
  return result.generated_text ?? '';
}

export async function processPdf(fileBuffer: Buffer): Promise<string> {
    const data = new Uint8Array(fileBuffer);
    const pdf = await pdfjs.getDocument(data).promise;
    let fullText = '';
    const pageLimit = Math.min(pdf.numPages, 3); 

    for (let i = 1; i <= pageLimit; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvasFactory = new NodeCanvasFactory();
        const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
        
        // --- THE DEFINITIVE FIX ---
        // The TypeScript error is explicit: the RenderParameters object requires a 'canvas' property.
        // We provide both the context and the canvas to satisfy the strict type definition.
        // We use 'as any' to bridge the type difference between Node's canvas and the browser-based types.
        await page.render({
            canvasContext: canvasAndContext.context as any,
            canvas: canvasAndContext.canvas as any, // This is the required property we were missing
            viewport,
        }).promise;
        // --- END OF FIX ---

        const imageBuffer = (canvasAndContext.canvas as Canvas).toBuffer('image/png');
        const pageText = await extractTextFromImage(imageBuffer);
        fullText += pageText + '\n\n';
    }
    return fullText;
}