import React from "react";
import "./WelcomingScreen.css";
import cloudCutout from "../assets/cloud-cutout.svg";

// Assets
import welcomingHero from "../assets/pages_assets/register/welcoming_hero.png";

export default function WelcomingScreen({ userName, onStartApp }) {
  const displayName = userName?.trim() || "Nadine Euvania";

  return (
    <div
      className="welcoming-screen"
      data-node-id="246:753"
      data-name="Welcoming Screen"
    >
      {/* ── Scrollable Body ──────────────────────────────────── */}
      <div className="welcoming-scroll-body">
        {/* ── Hero Image with Cloud Curves ─────────────────────── */}
        <div className="welcoming-hero-wrapper" data-node-id="246:791">
          <div className="welcoming-hero-container" data-node-id="246:792">
            <img
              src={welcomingHero}
              alt="Selamat Datang"
              className="welcoming-hero-image"
            />
          </div>
          <div className="welcoming-clouds-overlay" data-node-id="246:793">
            <img src={cloudCutout} alt="" className="welcoming-clouds-image" />
          </div>
        </div>

        {/* ── Typography Section ──────────────────────────────── */}
        <div className="welcoming-content-section">
          <div className="welcoming-title-block" data-node-id="246:797">
            <h1 className="welcoming-title">
              <span>Selamat Bergabung</span>
              <span>{displayName}!</span>
            </h1>
          </div>

          <p className="welcoming-subtitle" data-node-id="246:803">
            Siap untuk mengasah kemampuan berbicara di depan umum? Ayo, kita
            mulai!
          </p>
        </div>
      </div>

      {/* ── Fixed Bottom 40px CTA ────────────────────────────── */}
      <div className="welcoming-cta-wrapper" data-node-id="246:778">
        <button
          type="button"
          className="btn-welcoming-start"
          onClick={onStartApp}
          data-node-id="246:779"
        >
          Ayo, Mulai!
        </button>
      </div>
    </div>
  );
}
