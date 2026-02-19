import React, { useState } from 'react';
import Help from './Help';

const Header = () => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <header className="header">
        <div className="logo">
          <div className="logo-icon">📊</div>
          <span>ATSPro</span>
          <div className="badge">AI</div>
        </div>
        <div className="header-actions">
          <div 
            className="help-button-container"
            onClick={() => setShowHelp(true)}
            style={{
              background: 'linear-gradient(135deg, #7c6af7, #6af7c0)',
              color: '#ffffff',
              border: '2px solid #7c6af7',
              padding: '12px 20px',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(124, 106, 247, 0.4)',
              cursor: 'pointer',
              minWidth: '130px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center',
              position: 'relative',
              visibility: 'visible',
              opacity: 1
            }}
          >
            📚 Help
          </div>
        </div>
      </header>
      
      <Help isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
};

export default Header;
