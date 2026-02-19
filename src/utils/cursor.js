// Custom Cursor System - Fixed and Professional
export const initCustomCursor = () => {
  // Only run on desktop
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const cursor = document.createElement('div');
    cursor.className = 'cursor-glow';
    document.body.appendChild(cursor);

    let mouseX = 0;
    let mouseY = 0;

    const updateCursorPosition = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      // Update CSS variables for hover effects
      document.documentElement.style.setProperty('--mouse-x', `${mouseX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${mouseY}px`);
    };

    const moveCursor = (e) => {
      cursor.style.left = mouseX + 'px';
      cursor.style.top = mouseY + 'px';
    };

    // Throttled mouse move handler
    let ticking = false;
    const updateMousePosition = (e) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateCursorPosition(e);
          moveCursor(e);
          ticking = false;
        });
        ticking = true;
      }
    };

    // Mouse event listeners
    document.addEventListener('mousemove', updateMousePosition);
    
    // Show/hide cursor based on window state
    document.addEventListener('mouseenter', () => {
      cursor.classList.add('active');
    });

    document.addEventListener('mouseleave', () => {
      cursor.classList.remove('active');
    });

    // Hide cursor when over specific elements
    const hideCursorElements = '.upload-zone, .interview-controls, .mic-btn, .send-btn, .control-btn';
    
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hideCursorElements)) {
        cursor.style.opacity = '0';
      } else {
        cursor.style.opacity = '0.8';
      }
    });

    // Clean up on unmount
    return () => {
      document.removeEventListener('mousemove', updateMousePosition);
      document.removeEventListener('mouseenter', () => cursor.classList.add('active'));
      document.removeEventListener('mouseleave', () => cursor.classList.remove('active'));
      if (cursor.parentNode) {
        document.body.removeChild(cursor);
      }
    };
  }
};

export const removeCustomCursor = () => {
  const cursor = document.querySelector('.cursor-glow');
  if (cursor) {
    document.body.removeChild(cursor);
  }
  // Restore default cursor
  document.documentElement.style.removeProperty('--mouse-x');
  document.documentElement.style.removeProperty('--mouse-y');
};
