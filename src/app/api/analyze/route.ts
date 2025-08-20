import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// We still need the OCR and PDF handling logic in JS
import { processPdf, extractTextFromImage } from '@/lib/js_processing'; 

// We define the type for the Python script's output
interface PythonAnalysisResult {
  summary: string;
  risks: { term: string; explanation: string }[];
}

/**
 * Executes the Python analysis script as a child process.
 * @param text The text to be analyzed.
 * @returns A promise that resolves with the structured analysis result.
 */
function runPythonAnalysis(text: string): Promise<PythonAnalysisResult> {
  return new Promise((resolve, reject) => {
    // Determine the path to the Python script
    // process.cwd() gives the project root directory
    const scriptPath = path.join(process.cwd(), 'python', 'main.py');
    
    // Spawn the child process. 'python' should be in the system's PATH.
    // On Vercel, this will be the Python runtime we configure.
    const pythonProcess = spawn('python', [scriptPath, '--method', 'langchain']);

    let stdoutData = '';
    let stderrData = '';

    // Listen for data from the Python script's standard output
    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    // Listen for data from the Python script's standard error
    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    // Handle the script's exit
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        // Success
        try {
          const result: PythonAnalysisResult = JSON.parse(stdoutData);
          resolve(result);
        } catch (error) {
          reject(new Error('Failed to parse Python script output.'));
        }
      } else {
        // Failure
        try {
            // Try to parse the error from stderr, otherwise use the raw message
            const errorResult = JSON.parse(stderrData);
            reject(new Error(errorResult.error || 'Python script failed with an unknown error.'));
        } catch (parseError) {
            reject(new Error(stderrData || 'Python script failed with an unknown error.'));
        }
      }
    });
    
    // Write the extracted text to the Python script's standard input
    pythonProcess.stdin.write(text);
    pythonProcess.stdin.end();
  });
}

export async function POST(request: NextRequest) {
  console.log("API ROUTE HIT: /api/analyze (with Python backend)");

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    // We don't need the auth token for the Python script itself, but it's good practice
    const token = request.headers.get('Authorization')?.split(' ')[1];

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file.' }, { status: 400 });
  
    console.log(`Received file: ${file.name}, type: ${file.type}`);
    
    // Step 1: OCR in JavaScript
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let extractedText = '';

    if (file.type === 'application/pdf') {
      extractedText = await processPdf(fileBuffer);
    } else if (file.type.startsWith('image/')) {
      extractedText = await extractTextFromImage(fileBuffer);
    } else {
      throw new Error('Unsupported file type.');
    }

    if (!extractedText) throw new Error("OCR in JS failed to extract any text.");
    console.log("JS OCR successful. Passing text to Python...");

    // Step 2: Call Python script for AI analysis
    const analysisResult = await runPythonAnalysis(extractedText);
    console.log("Python analysis successful.");

    // For the testing UI, let's just combine the results
    const finalResult = {
        extractedText: extractedText,
        hfSummary: 'N/A (Using Python)', // Or you can keep this
        geminiSummary: analysisResult.summary, // Main summary from Python
        risks: analysisResult.risks, // Risks from Python
    };

    return NextResponse.json(finalResult);

  } catch (error: any) {
    console.error("!!!!!!!!!!!!! FATAL ERROR IN API ROUTE !!!!!!!!!!!!!");
    console.error("Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}