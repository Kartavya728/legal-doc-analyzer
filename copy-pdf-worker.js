// copy-pdf-worker.js
const fs = require('fs');
const path = require('path');

// Source path (adjust based on your node_modules location)
const sourcePath = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');

// Destination path
const destPath = path.join(__dirname, 'public', 'pdf.worker.min.js');

// Create directory if it doesn't exist
if (!fs.existsSync(path.dirname(destPath))) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
}

// Copy the file
try {
  fs.copyFileSync(sourcePath, destPath);
  console.log(`Successfully copied PDF worker from ${sourcePath} to ${destPath}`);
} catch (error) {
  console.error('Error copying PDF worker file:', error);
}