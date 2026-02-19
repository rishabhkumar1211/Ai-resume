import React from 'react';

const Button = ({ children, variant = "primary", size = "medium", disabled = false, loading = false, onClick, className = "", ...props }) => {
  const baseClasses = "btn interactive";
  const variantClasses = {
    primary: "btn-primary",
    outline: "btn-outline", 
    danger: "btn-danger",
    ghost: "btn-ghost",
    docx: "btn-docx",
    download: "btn-download"
  };
  
  const sizeClasses = {
    small: "btn-small",
    medium: "",
    large: "btn-large",
    full: "btn-full"
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <div className="btn-spinner">
          <div className="spinner-dot"></div>
          <div className="spinner-dot"></div>
          <div className="spinner-dot"></div>
        </div>
      )}
      <span className="btn-content">{children}</span>
    </button>
  );
};

export default Button;
