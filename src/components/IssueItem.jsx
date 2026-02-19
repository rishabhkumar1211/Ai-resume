import React from 'react';

const IssueItem = ({ issue }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'good': return '✅';
      default: return '📝';
    }
  };

  return (
    <div className={`issue-item ${issue.type}`}>
      <div className="issue-icon">{getIcon(issue.type)}</div>
      <div>
        <div className="issue-title">{issue.title}</div>
        <div className="issue-fix">{issue.fix}</div>
      </div>
    </div>
  );
};

export default IssueItem;
