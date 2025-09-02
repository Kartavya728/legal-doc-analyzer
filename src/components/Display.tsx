import React from 'react';

interface DisplayProps {
  text: string;
  filename: string;
}

export default function Display({ text, filename }: DisplayProps) {
  return (
    <div className="mt-8 p-4 bg-gray-100 rounded-lg shadow-inner">
      <h3 className="text-lg font-semibold mb-2">Extracted Text from: {filename}</h3>
      <div className="whitespace-pre-wrap text-gray-700 max-h-96 overflow-y-auto border border-gray-300 p-3 rounded">
        {text}
      </div>
    </div>
  );
}