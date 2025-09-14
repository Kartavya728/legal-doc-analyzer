"use client";

import { motion } from "framer-motion";

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

  const currentStepIndex = steps.findIndex(
    (step) => step.toLowerCase() === currentStep.toLowerCase()
  );

  return (
    <div className="w-full max-w-md mx-auto bg-gray-800/70 backdrop-blur-sm rounded-lg p-6 shadow-xl border border-gray-700">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">Processing Document</h3>
        <p className="text-gray-300">{currentStep}...</p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-700 rounded-full h-2.5 mb-6">
        <motion.div
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Steps */}
      <div className="flex flex-col space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center mr-3 ${
                index < currentStepIndex
                  ? "bg-green-500"
                  : index === currentStepIndex
                  ? "bg-blue-500 animate-pulse"
                  : "bg-gray-600"
              }`}
            >
              {index < currentStepIndex && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              )}
            </div>
            <span
              className={`text-sm ${
                index <= currentStepIndex ? "text-white" : "text-gray-400"
              }`}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}