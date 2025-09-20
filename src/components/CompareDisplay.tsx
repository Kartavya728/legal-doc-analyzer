import React from "react";
import { motion } from "framer-motion";

interface DocumentDifference {
  section: string;
  oldText: string;
  newText: string;
  significance: string;
  explanation: string;
}

interface CompareDisplayProps {
  data: {
    files: string[];
    summary: string;
    differences: DocumentDifference[];
    metadata: {
      totalChanges: number;
      majorChanges: number;
      moderateChanges: number;
      minorChanges: number;
    };
  };
}

const CompareDisplay: React.FC<CompareDisplayProps> = ({ data }) => {
  const getStatusBg = (significance: string) => {
    switch (significance.toLowerCase()) {
      case 'minor': return 'bg-emerald-500/10';
      case 'moderate': return 'bg-amber-500/10';
      case 'major': return 'bg-orange-500/10';
      default: return 'bg-slate-500/10';
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                Document Comparison Analysis
              </h1>
              <p className="text-gray-300">
                Comprehensive comparison between legal documents
              </p>
            </div>
<div/>
        </div>

        {/* Summary Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 border border-slate-600/60 rounded-xl bg-slate-800/50 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:bg-slate-700/60 hover:border-slate-500 mb-8"
        >
          <h3 className="font-semibold text-xl mb-4 text-slate-300">📝 Summary</h3>
          <div className="prose prose-invert max-w-none">
            <p className="text-slate-300 leading-relaxed whitespace-pre-line">{data.summary}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/40 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-white">{data.metadata.totalChanges}</div>
              <div className="text-xs text-slate-400">Total Changes</div>
            </div>
            <div className="bg-orange-900/30 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-400">{data.metadata.majorChanges}</div>
              <div className="text-xs text-slate-400">Major Changes</div>
            </div>
            <div className="bg-amber-900/30 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-amber-400">{data.metadata.moderateChanges}</div>
              <div className="text-xs text-slate-400">Moderate Changes</div>
            </div>
            <div className="bg-emerald-900/30 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-emerald-400">{data.metadata.minorChanges}</div>
              <div className="text-xs text-slate-400">Minor Changes</div>
            </div>
          </div>
        </motion.div>

        {/* Detailed Comparison Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 border border-slate-600/60 rounded-xl bg-slate-800/50 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:bg-slate-700/60 hover:border-slate-500 mb-8"
        >
          <h3 className="font-semibold text-xl mb-4 text-slate-300">📊 Detailed Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left p-3 text-slate-300 font-medium">Section</th>
                  <th className="text-left p-3 text-slate-300 font-medium">Original Text</th>
                  <th className="text-left p-3 text-slate-300 font-medium">New Text</th>
                  <th className="text-left p-3 text-slate-300 font-medium">Significance</th>
                </tr>
              </thead>
              <tbody>
                {data.differences.map((diff, idx) => (
                  <tr key={idx} className={`border-b border-slate-700/50 ${getStatusBg(diff.significance)}`}>
                    <td className="p-3 text-slate-400 font-medium">{diff.section}</td>
                    <td className="p-3 text-slate-400">{diff.oldText}</td>
                    <td className="p-3 text-slate-400">{diff.newText}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${diff.significance.toLowerCase() === 'major' ? 'bg-orange-900/30 text-orange-400' : 
                          diff.significance.toLowerCase() === 'moderate' ? 'bg-amber-900/30 text-amber-400' : 
                          'bg-emerald-900/30 text-emerald-400'}`}>
                        {diff.significance}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Key Insights Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 border border-slate-600/60 rounded-xl bg-slate-800/50 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:bg-slate-700/60 hover:border-slate-500 mb-8"
        >
          <h3 className="font-semibold text-xl mb-4 text-slate-300">🔍 Key Insights</h3>
          <div className="space-y-4">
            {data.insights.map((insight, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/50">
                <h4 className="font-medium text-slate-200 mb-2">{insight.title}</h4>
                <p className="text-slate-400 whitespace-pre-line">{insight.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recommendation Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 border border-slate-600/60 rounded-xl bg-slate-800/50 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:bg-slate-700/60 hover:border-slate-500"
        >
          <h3 className="font-semibold text-xl mb-4 text-slate-300">💡 Recommendation</h3>
          <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/50">
            <p className="text-slate-300 whitespace-pre-line">{data.recommendation}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DocumentComparison;