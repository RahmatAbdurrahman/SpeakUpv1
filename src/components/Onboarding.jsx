import React from "react";
import "./Onboarding.css";
import cloudCutout from "../assets/cloud-cutout.svg";
import onboardingHeroImage from "../assets/pages_assets/onboarding/Image-Onboarding.png";
import speakUpLogo from "../assets/pages_assets/onboarding/speakup-logo.svg";

export default function Onboarding({ onStart, onLogin }) {
  return (
    <div className="onboarding-screen" data-node-id="236:496">
      {/* Top Hero Illustration Area */}
      <div className="hero-container" data-node-id="239:562">
        <img
          src={onboardingHeroImage}
          alt="Public speaking stage presentation"
          className="hero-image"
          data-node-id="236:503"
        />
        <img src={cloudCutout} alt="" className="hero-edge" />
      </div>

      {/* Brand Identity: Logo & Slogan */}
      <div className="brand-wrapper" data-node-id="239:554">
        <div className="brand-logo-container" data-node-id="236:550">
          <img src={speakUpLogo} alt="SpeakUp Logo" className="brand-logo" />
        </div>
        <p className="brand-tagline" data-node-id="236:548">
          From Fear to Confidence.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons-group" data-node-id="236:505">
        <button
          type="button"
          className="btn-onboarding btn-start"
          data-node-id="236:511"
          onClick={onStart}
        >
          MULAI SEKARANG
        </button>

        <button
          type="button"
          className="btn-onboarding btn-login"
          data-node-id="236:513"
          onClick={onLogin}
        >
          AKU SUDAH MEMILIKI AKUN
        </button>
      </div>
    </div>
  );
}
