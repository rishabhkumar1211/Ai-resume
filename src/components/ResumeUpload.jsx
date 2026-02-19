import React, { useState } from 'react';
import FileUpload from './FileUpload';
import Button from './Button';


const ResumeUpload = ({ onFileSelect, onAnalyze, isAnalyzing, selectedFile }) => {
  const [jobDescription, setJobDescription] = useState('');

  const handleFileSelect = (file) => {
    // Only set the file, don't analyze yet
    onFileSelect(file);
  };

  const handleAnalyze = () => {
    if (selectedFile) {
      // Now trigger the analysis with job description
      onAnalyze(selectedFile, jobDescription);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon">📄</div>
        <div>
          <h2>Upload Resume</h2>
          <p>Upload your resume for ATS analysis</p>
        </div>
      </div>
      
      <div className="card-content">
        <FileUpload 
          onFileSelect={handleFileSelect}
          acceptedTypes=".pdf,.docx,.txt"
        />
        
        {selectedFile && (
          <div className="file-chip">
            <span>{getFileIcon(selectedFile.name)}</span>
            {selectedFile.name}
          </div>
        )}

        <div className="form-area">
          <div className="field">
            <label>Job Description (Optional)</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here for better keyword matching..."
              rows={4}
            />
          </div>
          
          <Button 
            onClick={handleAnalyze}
            disabled={!selectedFile || isAnalyzing}
            loading={isAnalyzing}
            className="btn-full m-top"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const getFileIcon = (name) => {
  const ext = name?.split('.').pop()?.toLowerCase();
  const icons = {
    pdf: '📕',
    doc: '📘',
    docx: '📘',
    txt: '📄'
  };
  return icons[ext] || '📄';
};

export default ResumeUpload;
