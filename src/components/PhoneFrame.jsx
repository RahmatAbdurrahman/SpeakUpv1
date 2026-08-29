import React, { useState, useEffect } from 'react';
import './PhoneFrame.css';

export default function PhoneFrame({ children }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setScale(1);
        return;
      }
      // Leave generous vertical space (100px padding for Safari header/dock/tabs)
      const availableHeight = window.innerHeight - 100;
      const availableWidth = window.innerWidth - 60;

      const scaleByHeight = availableHeight / 864;
      const scaleByWidth = availableWidth / 410;

      // Cap max scale at 0.85 so it looks compact and fits comfortably
      const targetScale = Math.min(0.85, scaleByHeight, scaleByWidth);
      setScale(Math.max(0.45, Math.round(targetScale * 1000) / 1000));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="simulator-wrapper">
      {/* Fixed iPhone 14 Frame with Dynamic Viewport Scale */}
      <div
        className="iphone-14-frame"
        style={
          scale !== 1
            ? { transform: `scale(${scale})`, transformOrigin: 'center center' }
            : undefined
        }
      >
        {/* Physical Button Accents */}
        <div className="side-button silent-switch"></div>
        <div className="side-button volume-up"></div>
        <div className="side-button volume-down"></div>
        <div className="side-button power-button"></div>

        {/* Screen Container */}
        <div className="iphone-screen-container">
          {/* Top iPhone 14 Notch */}
          <div className="iphone-notch">
            <div className="camera-lens"></div>
            <div className="speaker-earpiece"></div>
          </div>

          {/* Inner Content Display Area */}
          <div className="iphone-screen-content">
            {children}
          </div>

          {/* Home Indicator Bar */}
          <div className="home-indicator"></div>
        </div>
      </div>
    </div>
  );
}
