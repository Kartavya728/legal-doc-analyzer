import React from 'react';
import { motion } from 'framer-motion';
import { Clock, FileText, BookOpen } from 'lucide-react';

interface DocumentSummaryProps {
  summaryText: string;
  documentType: string;
  wordCount: number;
  readingTime: number;
}

export default function DocumentSummary({
  summaryText,
  documentType,
  wordCount,
  readingTime
}: DocumentSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-amber-100">Document Summary</h2>
        <span className="bg-amber-900/30 text-amber-200 text-xs px-3 py-1 rounded-full">
          {documentType}
        </span>
      </div>
      
      <div className="text-gray-300 leading-relaxed">
        {summaryText}
      </div>
      
      <div className="flex flex-wrap gap-4 pt-2 text-sm text-gray-400">
        <div className="flex items-center gap-1">
          <FileText size={14} />
          <span>{documentType}</span>
        </div>
        <div className="flex items-center gap-1">
          <BookOpen size={14} />
          <span>{wordCount.toLocaleString()} words</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={14} />
          <span>{readingTime} min read</span>
        </div>
      </div>
    </motion.div>
  );
}