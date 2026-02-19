import React from 'react';

const MetricCard = ({ label, score, color = "#7c6af7" }) => {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-score">{score}</div>
      <div className="metric-bar">
        <div 
          className="metric-fill" 
          style={{ 
            width: `${score}%`, 
            backgroundColor: color 
          }}
        />
      </div>
    </div>
  );
};

export default MetricCard;
