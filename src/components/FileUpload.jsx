import React, { useCallback, useRef, useEffect } from 'react';

const FileUpload = ({ onFileSelect, acceptedTypes, maxSize = 10 * 1024 * 1024 }) => {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const dragCounter = useRef(0);
  const dragTimeout = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear any pending timeouts
    if (dragTimeout.current) {
      clearTimeout(dragTimeout.current);
    }
    
    setIsDragOver(false);
    dragCounter.current = 0;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Prevent rapid state changes
    if (dragTimeout.current) {
      clearTimeout(dragTimeout.current);
    }
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    
    // Debounce the drag enter
    if (dragTimeout.current) {
      clearTimeout(dragTimeout.current);
    }
    
    dragTimeout.current = setTimeout(() => {
      if (dragCounter.current > 0) {
        setIsDragOver(true);
      }
    }, 50);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    
    // Only set drag over to false if counter reaches 0
    if (dragCounter.current <= 0) {
      if (dragTimeout.current) {
        clearTimeout(dragTimeout.current);
      }
      
      dragTimeout.current = setTimeout(() => {
        setIsDragOver(false);
      }, 50);
    }
  }, []);

  const handleFileInput = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dragTimeout.current) {
        clearTimeout(dragTimeout.current);
      }
    };
  }, []);

  return (
    <div 
      className={`upload-zone ${isDragOver ? 'drag' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onClick={() => document.getElementById('file-input').click()}
    >
      <input
        id="file-input"
        type="file"
        accept={acceptedTypes}
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />
      <div className="upload-icon">📄</div>
      <h3>Drop your resume here</h3>
      <p>or click to browse files</p>
      <div className="format-chips">
        <span className="format-chip">PDF</span>
        <span className="format-chip">DOCX</span>
        <span className="format-chip">TXT</span>
      </div>
    </div>
  );
};

export default FileUpload;
