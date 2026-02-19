import React from 'react';
import KeywordChip from './KeywordChip';

const KeywordAnalysis = ({ keywordsFound = [], keywordsMissing = [] }) => {
  return (
    <div className="keyword-cloud">
      {keywordsFound.length > 0 && (
        <>
          <div className="section-title">KEYWORDS DETECTED</div>
          <div className="kw-grid">
            {keywordsFound.map((keyword, index) => (
              <KeywordChip key={index} keyword={keyword} type="found" />
            ))}
          </div>
        </>
      )}
      
      {keywordsMissing.length > 0 && (
        <>
          <div className="section-title">MISSING KEYWORDS — ADD THESE</div>
          <div className="kw-grid">
            {keywordsMissing.map((keyword, index) => (
              <KeywordChip key={index} keyword={keyword} type="missing" />
            ))}
          </div>
          <p className="text-muted text-sm mt-2">
            Add the above keywords naturally into your summary and bullet points.
          </p>
        </>
      )}
    </div>
  );
};

export default KeywordAnalysis;
