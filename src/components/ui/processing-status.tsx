"use client";


import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface ProcessingStatusProps {
  isProcessing: boolean;
  processingMode: "analyze" | "compare";
  currentStep?: string;
}

export const ProcessingStatus = ({
  isProcessing,
  processingMode,
  currentStep = "Uploading files",
}: ProcessingStatusProps) => {
  const [step, setStep] = useState(currentStep);
  const [progress, setProgress] = useState(0);
  
  // Simulate processing steps
  useEffect(() => {
    if (!isProcessing) return;
    
    const steps = {
      analyze: [
        "Uploading files",
        "Extracting text",
        "Analyzing content",
        "Generating insights",
        "Preparing visualization",
        "Finalizing results"
      ],
      compare: [
        "Uploading files",
        "Extracting text",
        "Identifying sections",
        "Comparing documents",
        "Analyzing differences",
        "Generating summary",
        "Finalizing results"
      ]
    };
    
    const currentSteps = steps[processingMode];
    let currentStepIndex = 0;
    
    const interval = setInterval(() => {
      // Update progress based on current step
      const progressIncrement = 100 / currentSteps.length;
      const newProgress = Math.min(progressIncrement * (currentStepIndex + 1), 99);
      setProgress(newProgress);
      
      // Update step text
      setStep(currentSteps[currentStepIndex]);
      
      // Move to next step
      currentStepIndex++;
      if (currentStepIndex >= currentSteps.length) {
        clearInterval(interval);
      }
    }, 2000); // Change step every 2 seconds
    
    return () => clearInterval(interval);
  }, [isProcessing, processingMode]);
  
  if (!isProcessing) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-x-0 bottom-10 z-50 flex justify-center"
    >
      <div className="bg-black/70 backdrop-blur-lg rounded-xl p-4 shadow-xl border border-gray-700/30 max-w-md w-full mx-4">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">
              {processingMode === "analyze" ? "Analyzing Document" : "Comparing Documents"}
            </h3>
            <span className="text-sm text-blue-400">{Math.round(progress)}%</span>
          </div>
          
          <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
            <motion.div 
              className={`h-full rounded-full ${processingMode === "analyze" ? "bg-blue-500" : "bg-orange-500"}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 50 }}
            />
          </div>
          
          <p className="text-sm text-gray-300 mt-1">
            <span className="inline-block mr-2 animate-pulse">
              {processingMode === "analyze" ? "🔍" : "⚖️"}
            </span>
            {step}...
          </p>
        </div>
      </div>
    </motion.div>
  );
};