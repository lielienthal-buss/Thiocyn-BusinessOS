import React from "react";

interface DISCVisualizerProps {
  discCounts: {
    d: number;
    i: number;
    s: number;
    c: number;
  };
  aiScore?: number; // optional 0–1
}

const COLORS: Record<string, string> = {
  D: "#f87171", // rot
  I: "#fb923c", // orange
  S: "#34d399", // grün
  C: "#60a5fa", // blau
};

const DESCRIPTIONS: Record<string, string> = {
  D: "Dominance – Ergebnisorientiert, durchsetzungsstark, entscheidungsfreudig",
  I: "Influence – Kommunikativ, enthusiastisch, überzeugend",
  S: "Steadiness – Beständig, verlässlich, teamorientiert",
  C: "Conscientiousness – Analytisch, präzise, regelorientiert",
};

const MAX_SCORE = 10;

const DISCVisualizerPro: React.FC<DISCVisualizerProps> = ({
  discCounts,
  aiScore,
}) => {
  const data = [
    { label: "D", value: discCounts.d },
    { label: "I", value: discCounts.i },
    { label: "S", value: discCounts.s },
    { label: "C", value: discCounts.c },
  ];

  // Funktion für dynamische AI Score Farbe
  const getAiScoreColor = (score: number) => {
    if (score >= 0.75) return "#34d399"; // grün
    if (score >= 0.5) return "#facc15";  // gelb
    return "#f87171";                     // rot
  };

  return (
    <div className="w-full max-w-md p-4 bg-white rounded-lg shadow-md space-y-6">
      {/* AI Score prominent */}
      {aiScore !== undefined && (
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">AI Score</h3>
          <div
            className="inline-block px-6 py-3 rounded-full text-white text-4xl font-extrabold shadow-lg"
            style={{ backgroundColor: getAiScoreColor(aiScore) }}
          >
            {Math.round(aiScore * 100)}%
          </div>
        </div>
      )}

      {/* DISC Balken */}
      {data.map((item) => {
        const percent = (item.value / MAX_SCORE) * 100;

        return (
          <div key={item.label} className="mb-3">
            <div className="flex justify-between items-center text-sm font-semibold mb-1 text-gray-800 dark:text-white">
              <span>{item.label}</span>
              <span>{item.value}/{MAX_SCORE}</span>
            </div>
            <div className="w-full bg-gray-200 h-5 rounded relative group">
              <div
                className="h-5 rounded transition-all duration-500"
                style={{ width: `${percent}%`, backgroundColor: COLORS[item.label] }}
              />
              {/* Tooltip */}
              <div className="absolute left-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-gray-800 text-white rounded px-2 py-1 shadow-lg z-10">
                {DESCRIPTIONS[item.label]}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DISCVisualizerPro;