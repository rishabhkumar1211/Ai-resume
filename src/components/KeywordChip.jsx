import React from 'react';

const KeywordChip = ({ keyword, type = 'found' }) => {
  return (
    <span className={`kw-chip kw-${type}`}>
      {keyword}
    </span>
  );
};

export default KeywordChip;
