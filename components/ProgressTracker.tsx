import React from 'react';
import { AppStep } from '../App';

interface ProgressTrackerProps {
  currentStep: AppStep;
}

const steps = [
  { name: '提供簡介', applicableSteps: ['intro'] },
  { name: '上傳檔案', applicableSteps: ['upload', 'analyzing'] },
  { name: '檢閱設定', applicableSteps: ['review'] },
  { name: '自動翻譯', applicableSteps: ['translating'] },
  { name: '完成', applicableSteps: ['finished'] },
];

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ currentStep }) => {
    const currentStepIndex = steps.findIndex(s => s.applicableSteps.includes(currentStep));

  return (
    <div className="flex items-center justify-center my-8">
      {steps.map((step, index) => (
        <React.Fragment key={step.name}>
          <div className="flex flex-col items-center text-center w-20 sm:w-24">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                index <= currentStepIndex
                  ? 'bg-cyan-500 border-cyan-400 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-400'
              }`}
            >
              <span className="font-bold">{index + 1}</span>
            </div>
            <p
              className={`mt-2 text-xs sm:text-sm font-medium transition-all duration-300 ${
                index <= currentStepIndex ? 'text-cyan-400' : 'text-gray-500'
              }`}
            >
              {step.name}
            </p>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-1 transition-all duration-500 mx-1 sm:mx-2 ${
                index < currentStepIndex ? 'bg-cyan-500' : 'bg-gray-700'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};