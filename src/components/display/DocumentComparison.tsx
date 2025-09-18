import React from "react";

// --- Corrected Interface ---
// 1. Added 'status' to the tableComparison array object.
// 2. Changed 'clause' type to string for more flexibility (e.g., "Clause 1.1" or "Confidentiality").
interface DocumentComparisonProps {
  title: string;
  docA: {
    title: string;
    clauses: string[];
  };
  docB: {
    title:string;
    clauses: string[];
  };
  tableComparison: Array<{
    clause: string;
    docA: string;
    docB: string;
    status: 'identical' | 'modified' | 'added' | 'removed'; // This was the missing property
  }>;
  differences: string[];
  recommendation: {
    recommendation: string;
    reason: string;
    preferredDoc: string;
  };
}

const DocumentComparison: React.FC<DocumentComparisonProps> = ({
  title,
  docA,
  docB,
  tableComparison,
  differences,
  recommendation,
}) => {
  // This function now correctly receives the 'status' and applies styles
  const getStatusBg = (status: string) => {
    switch (status) {
      case 'identical': return 'bg-emerald-500/10';
      case 'modified': return 'bg-amber-500/10';
      case 'added': return 'bg-blue-500/10';
      case 'removed': return 'bg-orange-500/10';
      default: return 'bg-slate-500/10';
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl lg:text-4xl font-bold mb-8 text-white text-center">📄 {title}</h2>
        
        {/* Document Summaries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="p-6 border border-slate-600/60 rounded-xl bg-slate-800/60 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:bg-slate-700/70 hover:border-slate-500">
            <h3 className="font-semibold text-xl mb-4 text-slate-300">{docA.title}</h3>
            <ul className="list-disc ml-6 space-y-3 text-slate-400">
              {docA.clauses.map((clause, idx) => (
                <li key={`docA-${idx}`} className="leading-relaxed">{clause}</li>
              ))}
            </ul>
          </div>
          <div className="p-6 border border-slate-600/60 rounded-xl bg-slate-800/60 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:bg-slate-700/70 hover:border-slate-500">
            <h3 className="font-semibold text-xl mb-4 text-slate-300">{docB.title}</h3>
            <ul className="list-disc ml-6 space-y-3 text-slate-400">
              {docB.clauses.map((clause, idx) => (
                <li key={`docB-${idx}`} className="leading-relaxed">{clause}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Detailed Comparison Table */}
        <div className="p-4 sm:p-6 border border-slate-600/60 rounded-xl bg-slate-800/50 backdrop-blur-sm mb-8">
          <h3 className="font-semibold text-xl mb-4 text-slate-300">📊 Detailed Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left p-3 text-slate-300 font-medium">Clause</th>
                  <th className="text-left p-3 text-slate-300 font-medium">Document A</th>
                  <th className="text-left p-3 text-slate-300 font-medium">Document B</th>
                </tr>
              </thead>
              <tbody>
                {tableComparison.map((row, idx) => (
                  <tr key={`comp-${idx}`} className={`border-b border-slate-700/50 ${getStatusBg(row.status)}`}>
                    <td className="p-3 text-slate-300 font-medium align-top w-1/5">{row.clause}</td>
                    <td className="p-3 text-slate-400 align-top w-2/5">{row.docA}</td>
                    <td className="p-3 text-slate-400 align-top w-2/5">{row.docB}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Differences */}
        <div className="p-6 border border-slate-600/60 rounded-xl bg-slate-800/50 backdrop-blur-sm mb-8">
          <h3 className="font-semibold text-xl mb-4 text-slate-300">🔍 Key Differences</h3>
          {differences.length > 0 ? (
            <ul className="list-disc ml-6 space-y-3">
              {differences.map((diff, idx) => (
                <li key={`diff-${idx}`} className="text-amber-400 leading-relaxed">{diff}</li>
              ))}
            </ul>
          ) : (
            <p className="text-emerald-400 text-lg">✅ The documents are identical.</p>
          )}
        </div>

        {/* AI Recommendation */}
        <div className="p-6 border border-slate-600/60 rounded-xl bg-gradient-to-r from-slate-800/60 to-slate-700/40 backdrop-blur-sm">
          <h3 className="font-semibold text-xl mb-4 text-slate-300">💡 Recommendation</h3>
          <div className="space-y-4">
            <div className="flex items-start sm:items-center space-x-3">
              <span className="text-2xl mt-1 sm:mt-0">🏆</span>
              <div>
                <p className="text-lg font-medium text-white">Preferred Choice: <span className="text-emerald-400">{recommendation.recommendation}</span></p>
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 border-l-4 border-emerald-500">
              <p className="text-slate-300 leading-relaxed">{recommendation.reason}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentComparison;