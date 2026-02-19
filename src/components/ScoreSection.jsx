import React from 'react';
import ScoreRing from './ScoreRing';
import MetricCard from './MetricCard';

const ScoreSection = ({ atsResult }) => {
  if (!atsResult) return null;

  const getScoreLabel = (score) => {
    if (score >= 80) return "STRONG";
    if (score >= 60) return "DECENT";
    return "NEEDS WORK";
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#6af7c0";
    if (score >= 60) return "#f7c06a";
    return "#f76a6a";
  };

  return (
    <div className="score-section">
      <ScoreRing score={atsResult.score} />
      <div className="score-verdict" style={{ color: getScoreColor(atsResult.score) }}>
        {getScoreLabel(atsResult.score)}
      </div>
      <div className="score-desc">{atsResult.description}</div>
      
      <div className="metrics">
        <MetricCard 
          label="Keywords" 
          score={atsResult.metrics?.keywords || 0} 
          color="#27AE60"
        />
        <MetricCard 
          label="Formatting" 
          score={atsResult.metrics?.formatting || 0} 
          color="#7c6af7"
        />
        <MetricCard 
          label="Readability" 
          score={atsResult.metrics?.readability || 0} 
          color="#f7c06a"
        />
        <MetricCard 
          label="Relevance" 
          score={atsResult.metrics?.relevance || 0} 
          color="#6af7c0"
        />
      </div>
    </div>
  );
};

export default ScoreSection;
