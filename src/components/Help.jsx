import React, { useState, useEffect } from 'react';

const Help = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('help-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('help-open');
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('help-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <h2>📚 ATSPro Help Guide</h2>
          <button className="help-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="help-content">
          <div className="help-section">
            <h3>🚀 Getting Started</h3>
            <div className="help-item">
              <h4>Upload Your Resume</h4>
              <p>Upload your resume in PDF, DOCX, or TXT format. The system will analyze it for ATS optimization.</p>
            </div>
            <div className="help-item">
              <h4>Add Job Description (Optional)</h4>
              <p>Paste the job description you're applying for to get personalized keyword matching and better analysis.</p>
            </div>
            <div className="help-item">
              <h4>Click "Analyze Resume"</h4>
              <p>Start the AI-powered analysis to get detailed feedback on your resume's ATS compatibility.</p>
            </div>
          </div>

          <div className="help-section">
            <h3>📊 Analysis Results</h3>
            <div className="help-item">
              <h4>Score Overview</h4>
              <p>Your overall ATS score (0-100) indicates how well your resume will pass through applicant tracking systems.</p>
            </div>
            <div className="help-item">
              <h4>Metrics Breakdown</h4>
              <ul>
                <li><strong>Keywords:</strong> How well your resume matches job requirements</li>
                <li><strong>Formatting:</strong> ATS-friendly structure and layout</li>
                <li><strong>Readability:</strong> Clarity and professional presentation</li>
                <li><strong>Relevance:</strong> Overall alignment with target roles</li>
              </ul>
            </div>
            <div className="help-item">
              <h4>Issues & Fixes</h4>
              <p>Detailed problems with your resume and specific instructions on how to fix each issue.</p>
            </div>
          </div>

          <div className="help-section">
            <h3>🎤 AI Interview Practice</h3>
            <div className="help-item">
              <h4>Interview Settings</h4>
              <ul>
                <li><strong>Type:</strong> Technical, Behavioral, or Mixed questions</li>
                <li><strong>Difficulty:</strong> Easy, Medium, or Hard complexity</li>
                <li><strong>Questions:</strong> Number of questions (3-10)</li>
              </ul>
            </div>
            <div className="help-item">
              <h4>Interview Flow</h4>
              <ol>
                <li>Click "Start Interview" to begin</li>
                <li>AI asks a question (spoken + text)</li>
                <li>Click 🎤 mic button to record your answer</li>
                <li>Click "Send Answer" when finished</li>
                <li>AI provides immediate feedback with score</li>
                <li>Continue until all questions are complete</li>
              </ol>
            </div>
            <div className="help-item">
              <h4>Interview Controls</h4>
              <ul>
                <li><strong>🎤 Mic Button:</strong> Start/stop recording your answer</li>
                <li><strong>Send Answer:</strong> Submit your answer for AI analysis</li>
                <li><strong>⏸ Pause:</strong> Pause the interview temporarily</li>
                <li><strong>⏹ End:</strong> End interview early and see results</li>
              </ul>
            </div>
            <div className="help-item">
              <h4>Feedback System</h4>
              <p>Each answer receives:</p>
              <ul>
                <li><strong>Score (0-100%):</strong> Quality assessment</li>
                <li><strong>Strengths:</strong> What you did well</li>
                <li><strong>Improvements:</strong> Areas to work on</li>
                <li><strong>Final Summary:</strong> Overall performance review</li>
              </ul>
            </div>
          </div>

          <div className="help-section">
            <h3>⚙️ Tips for Best Results</h3>
            <div className="help-item">
              <h4>Resume Optimization</h4>
              <ul>
                <li>Use standard section headers (Experience, Education, Skills)</li>
                <li>Include keywords from the job description</li>
                <li>Avoid tables, columns, and complex formatting</li>
                <li>Use standard fonts (Arial, Calibri, Times New Roman)</li>
                <li>Save as PDF for best compatibility</li>
              </ul>
            </div>
            <div className="help-item">
              <h4>Interview Success</h4>
              <ul>
                <li>Speak clearly and at a moderate pace</li>
                <li>Use the STAR method for behavioral questions</li>
                <li>Be specific with examples and metrics</li>
                <li>Take a moment to think before answering</li>
                <li>Practice regularly to improve your scores</li>
              </ul>
            </div>
          </div>

          <div className="help-section">
            <h3>🔧 Technical Requirements</h3>
            <div className="help-item">
              <h4>Browser Support</h4>
              <ul>
                <li><strong>Chrome:</strong> Full support for all features</li>
                <li><strong>Edge:</strong> Full support for all features</li>
                <li><strong>Firefox:</strong> Limited speech recognition support</li>
                <li><strong>Safari:</strong> Limited speech recognition support</li>
              </ul>
            </div>
            <div className="help-item">
              <h4>Microphone Access</h4>
              <p>For interview practice, allow microphone access when prompted. The system only records when you click the mic button.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
