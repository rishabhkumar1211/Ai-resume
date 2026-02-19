import React from 'react';
import IssueItem from './IssueItem';

const IssuesSection = ({ issues = [] }) => {
  if (issues.length === 0) return null;

  return (
    <div className="issues-section">
      <div className="section-title">
        ISSUES & FIXES APPLIED ({issues.length})
      </div>
      {issues.map((issue, index) => (
        <IssueItem key={index} issue={issue} />
      ))}
    </div>
  );
};

export default IssuesSection;
