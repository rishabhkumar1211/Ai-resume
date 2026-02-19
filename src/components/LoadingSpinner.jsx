import React from 'react';

const LoadingSpinner = ({ size = 'medium' }) => {
  const sizeClasses = {
    small: 'spinner-small',
    medium: 'spinner',
    large: 'spinner-large'
  };

  return (
    <div className={`spinner ${sizeClasses[size]}`}></div>
  );
};

export default LoadingSpinner;
