// src/components/CompareDisplay.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  ArrowRight,
  ExternalLink,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

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
    comparisonMetadata: {
      totalDifferences: number;
      majorChanges: number;
      moderateChanges: number;
      minorChanges: number;
      processedAt: string;
    };
  };
  loading: boolean;
  uploadedImageUrls?: string[];
}

// Streaming Text Effect
const StreamingText = ({ text, delay = 0 }: { text: string; delay?: number }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) return;
    let interval: NodeJS.Timeout;
    const timeout = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        if (i < text.length) {
          setDisplayedText(text.slice(0, i + 1));
          i++;
        } else {
          setIsComplete(true);
          clearInterval(interval);
        }
      }, 15);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, delay]);

  return (
    <span>
      {displayedText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  );
};

// Significance Icon
const SignificanceIcon = ({ significance }: { significance: string }) => {
  switch (significance) {
    case 'major':
      return <AlertTriangle className="w-5 h-5 text-red-400" />;
    case 'moderate':
      return <Info className="w-5 h-5 text-yellow-400" />;
    case 'minor':
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    default:
      return <Minus className="w-5 h-5 text-gray-400" />;
  }
};

// Change Type Icon
const ChangeTypeIcon = ({ changeType }: { changeType: string }) => {
  if (changeType.includes('added') || changeType.includes('new')) {
    return <TrendingUp className="w-4 h-4 text-green-400" />;
  }
  if (changeType.includes('removed') || changeType.includes('deleted')) {
    return <TrendingDown className="w-4 h-4 text-red-400" />;
  }
  return <ArrowRight className="w-4 h-4 text-blue-400" />;
};

export default function CompareDisplay({ data, loading, uploadedImageUrls }: CompareDisplayProps) {
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [selectedDifferenceType, setSelectedDifferenceType] = useState<string>('all');
  const [expandedDifferences, setExpandedDifferences] = useState<Set<number>>(new Set());

  // Animate sections reveal
  useEffect(() => {
    if (!data || loading) return;
    const sections = ['header', 'metadata', 'summary', 'differences'];
    sections.forEach((section, index) => {
      const timer = setTimeout(() => {
        setVisibleSections((prev) => new Set([...prev, section]));
      }, index * 600);
      return () => clearTimeout(timer);
    });
  }, [data, loading]);

  const toggleDifferenceExpansion = (index: number) => {
    setExpandedDifferences(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const filteredDifferences = selectedDifferenceType === 'all' 
    ? data.differences 
    : data.differences.filter(diff => diff.significance === selectedDifferenceType);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-white">Comparing Documents...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6 overflow-y-auto">
      {/* Header Section */}
      <AnimatePresence>
        {visibleSections.has('header') && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <FileText className="w-8 h-8 text-orange-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                  Document Comparison Analysis
                </h1>
                <p className="text-gray-300">
                  Comprehensive comparison between legal documents
                </p>
              </div>
            </div>

            {/* File Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.files.map((fileName, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index === 0 ? -50 : 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="bg-black/30 rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-blue-400' : 'bg-green-400'
                    }`}></div>
                    <div>
                      <p className="text-sm text-gray-400">
                        Document {index === 0 ? 'A' : 'B'}
                      </p>
                      <p className="font-semibold text-white truncate">
                        {fileName}
                      </p>
                    </div>
                  </div>
                  {uploadedImageUrls?.[index] && (
                    <div className="mt-3">
                      <img
                        src={uploadedImageUrls[index]}
                        alt={`Preview of ${fileName}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metadata Section */}
      <AnimatePresence>
        {visibleSections.has('metadata') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Comparison Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { 
                  label: 'Total Changes', 
                  value: data.comparisonMetadata.totalDifferences,
                  color: 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-400/30',
                  icon: '📊'
                },
                { 
                  label: 'Major Changes', 
                  value: data.comparisonMetadata.majorChanges,
                  color: 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-400/30',
                  icon: '🔴'
                },
                { 
                  label: 'Moderate Changes', 
                  value: data.comparisonMetadata.moderateChanges,
                  color: 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-400/30',
                  icon: '🟡'
                },
                { 
                  label: 'Minor Changes', 
                  value: data.comparisonMetadata.minorChanges,
                  color: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-400/30',
                  icon: '🟢'
                }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${stat.color} rounded-xl p-4 border`}
                >
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-300">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Section */}
      <AnimatePresence>
        {visibleSections.has('summary') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-400" />
              Analysis Summary
            </h2>
            <div className="bg-black/30 rounded-xl p-6 border border-white/10">
              <div className="prose prose-invert max-w-none">
                <StreamingText text={data.summary} delay={0} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Differences Section */}
      <AnimatePresence>
        {visibleSections.has('differences') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                Detailed Differences
              </h2>
              
              {/* Filter Controls */}
              <div className="flex gap-2">
                {['all', 'major', 'moderate', 'minor'].map((type) => (
                  <motion.button
                    key={type}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDifferenceType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      selectedDifferenceType === type
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'bg-black/30 text-gray-300 hover:bg-black/50'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                    {type !== 'all' && (
                      <span className="ml-1 text-xs">
                        ({data.differences.filter(d => d.significance === type).length})
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {filteredDifferences.map((difference, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-black/30 rounded-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300"
                >
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => toggleDifferenceExpansion(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <SignificanceIcon significance={difference.significance} />
                        <div>
                          <h3 className="font-semibold text-white">
                            Section: {difference.section}
                          </h3>
                          <p className="text-sm text-gray-400 capitalize">
                            {difference.significance} Change
                          </p>
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: expandedDifferences.has(index) ? 180 : 0 }}
                        className="text-gray-400"
                      >
                        ▼
                      </motion.div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedDifferences.has(index) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10"
                      >
                        <div className="p-4 space-y-4">
                          {/* Explanation */}
                          <div>
                            <h4 className="text-sm font-semibold text-amber-400 mb-2">
                              Analysis:
                            </h4>
                            <p className="text-gray-300 text-sm">
                              {difference.explanation}
                            </p>
                          </div>

                          {/* Before/After Comparison */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                                <TrendingDown className="w-4 h-4" />
                                Original Text:
                              </h4>
                              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                                <p className="text-sm text-gray-200">
                                  {difference.oldText}
                                </p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                Updated Text:
                              </h4>
                              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                                <p className="text-sm text-gray-200">
                                  {difference.newText}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {filteredDifferences.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-xl text-gray-400">
                  No {selectedDifferenceType !== 'all' ? selectedDifferenceType : ''} differences found
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="mt-12 text-center text-sm text-gray-500"
      >
        <p>
          ⚠️ This comparison is AI-generated. Always verify with a licensed legal professional.
        </p>
        <p className="mt-1">
          Processed at: {new Date(data.comparisonMetadata.processedAt).toLocaleString()}
        </p>
      </motion.div>
    </div>
  );
}