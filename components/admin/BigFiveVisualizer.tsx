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

  // Define the "ideal" profile for comparison
  const idealProfile: { [key: string]: number } = {
    openness: 80,
    conscientiousness: 90,
    extraversion: 70,
    agreeableness: 75,
    neuroticism: 20, // Lower is generally desirable
  };

  const traitColors: { [key: string]: string } = {
    openness: 'bg-blue-500',
    conscientiousness: 'bg-purple-500',
    extraversion: 'bg-green-500',
    agreeableness: 'bg-yellow-500',
    neuroticism: 'bg-red-500',
  };

  // Order should be consistent
  const traitOrder = [
    'openness',
    'conscientiousness',
    'extraversion',
    'agreeableness',
    'neuroticism',
  ];

  const neuroticismScore = scores['neuroticism'];
  const highNeuroticism = neuroticismScore !== undefined && neuroticismScore >= 80;

  return (
    <div className="space-y-4">
      {highNeuroticism && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-wide">
            ⚠️ High Neuroticism ({neuroticismScore}%) — Do not send task
          </p>
          <p className="text-xs text-red-500 mt-1">
            Per hiring SOP: candidates scoring ≥80% on neuroticism should not advance.
          </p>
        </div>
      )}
      {traitOrder.map((trait) => {
        const score = scores[trait];
        const idealScore = idealProfile[trait];

        if (score === undefined) return null;

        return (
          <div key={trait}>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                {trait}
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {score}%
              </span>
            </div>
            <div className="relative w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
              <div
                className={`${traitColors[trait] || 'bg-gray-500'} h-2.5 rounded-full`}
                style={{ width: `${score}%` }}
              ></div>
              {/* Ideal Score Marker */}
              <div
                className="absolute top-0 h-full w-1 bg-black dark:bg-white rounded-full border border-gray-500"
                style={{ left: `calc(${idealScore}% - 2px)` }}
                title={`Ideal: ${idealScore}%`}
              ></div>
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-2 pt-2">
        <div className="w-3 h-3 bg-black dark:bg-white border border-gray-500 rounded-full"></div>
        <span className="text-xs text-gray-500 font-medium">
          Ideal score marker
        </span>
      </div>
    </div>
  );
};

export default BigFiveVisualizer;
