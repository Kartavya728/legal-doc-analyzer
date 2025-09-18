"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

// The component no longer needs props to drive the animation,
// but we keep them for API consistency with the parent.
interface ProcessingStatusProps {
  currentStep: string;
  progress: number;
}

export default function ProcessingStatus({
  currentStep,
  progress,
}: ProcessingStatusProps) {
  const steps = [
    "Uploading document",
    "Extracting text",
    "Analyzing content",
    "Generating summary",
    "Identifying key points",
    "Assessing risks",
    "Preparing results",
  ];

  const [animatedStepIndex, setAnimatedStepIndex] = useState(0);

  // This effect runs once when the component mounts,
  // starting a timer to cycle through the steps automatically.
  useEffect(() => {
    const stepInterval = 1200; // Time in ms for each step to display

    const interval = setInterval(() => {
      setAnimatedStepIndex((prevIndex) => {
        // Stop incrementing when we reach the last step
        if (prevIndex >= steps.length - 1) {
          clearInterval(interval);
          return prevIndex;
        }
        return prevIndex + 1;
      });
    }, stepInterval);

    // Cleanup the interval when the component is unmounted
    return () => clearInterval(interval);
  }, []); // Empty dependency array ensures this runs only once

  const totalDuration = steps.length * 1.2; // Match total duration to step intervals

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-md mx-auto bg-gray-900/50 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-gray-700/50"
        >
        <div className="flex items-center gap-4 mb-6">
            {/* Animated Spinner */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 rounded-full border-t-2 border-r-2 border-cyan-500"
            />
            <div>
                <h3 className="text-xl font-semibold text-white">Processing Document</h3>
                <AnimatePresence mode="wait">
                    <motion.p
                        key={animatedStepIndex}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3 }}
                        className="text-gray-300"
                    >
                        {steps[animatedStepIndex]}...
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>


        {/* Continuous Progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-8">
            <motion.div
            className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2.5 rounded-full"
            initial={{ width: "0%" }}
            // Animate to just under 100% to give a feeling of "almost done"
            animate={{ width: "98%" }}
            transition={{ duration: totalDuration, ease: "linear" }}
            />
        </div>

        {/* Animated Steps */}
        <div className="flex flex-col space-y-4">
            {steps.map((step, index) => {
            const status =
                index < animatedStepIndex
                ? "completed"
                : index === animatedStepIndex
                ? "processing"
                : "pending";

            return (
                <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="flex items-center">
                <motion.div
                    animate={status}
                    variants={{
                        pending: { scale: 1, backgroundColor: "#4b5563" },
                        processing: { scale: 1.1, backgroundColor: "#3b82f6" },
                        completed: { scale: 1, backgroundColor: "#22c55e" },
                    }}
                    transition={{ duration: 0.3 }}
                    className="w-5 h-5 rounded-full flex items-center justify-center mr-3"
                >
                    {status === 'completed' && (
                    <motion.svg
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </motion.svg>
                    )}
                    {status === 'processing' && (
                        <motion.div 
                            animate={{ scale: [1, 0.5, 1] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                            className="w-2 h-2 bg-blue-200 rounded-full"
                        />
                    )}
                </motion.div>
                <span className={`text-sm ${ status === 'pending' ? "text-gray-400" : "text-white"}`}>
                    {step}
                </span>
                </motion.div>
            );
            })}
        </div>
        </motion.div>
    </div>
  );
}