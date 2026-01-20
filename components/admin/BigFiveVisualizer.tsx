import React from 'react';

interface BigFiveVisualizerProps {
  scores: { [key: string]: number } | null | undefined;
}

const BigFiveVisualizer: React.FC<BigFiveVisualizerProps> = ({ scores }) => {
  if (!scores) {
    return (
      <p className="text-sm text-gray-500">
        No personality assessment data available.
      </p>
    );
  }

  const traitColors: { [key: string]: string } = {
    openness: 'bg-blue-500',
    conscientiousness: 'bg-purple-500',
    extraversion: 'bg-green-500',
    agreeableness: 'bg-yellow-500',
    neuroticism: 'bg-red-500',
  };

  return (
    <div className="space-y-3">
      {Object.entries(scores).map(([trait, score]) => (
        <div key={trait}>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
              {trait}
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {score}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
            <div
              className={`${traitColors[trait] || 'bg-gray-500'} h-2.5 rounded-full`}
              style={{ width: `${score}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BigFiveVisualizer;
