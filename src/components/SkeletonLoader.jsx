import React from "react";
import "./SkeletonLoader.css";

/**
 * Base atomic Skeleton block with shimmer wave animation.
 */
export function Skeleton({ width, height, borderRadius, style, className = "" }) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? "16px",
        borderRadius: borderRadius ?? "8px",
        ...style,
      }}
    />
  );
}

/**
 * Full page Shimmer Skeleton for Home Screen.
 */
export function HomeSkeleton() {
  return (
    <div className="skeleton-page home-skeleton">
      {/* Topbar */}
      <div className="skeleton-topbar">
        <Skeleton width="140px" height="24px" borderRadius="12px" />
        <Skeleton width="80px" height="28px" borderRadius="20px" />
      </div>

      <div className="skeleton-scroll-body">
        {/* Streak card */}
        <div className="skeleton-card skeleton-streak-card">
          <Skeleton width="120px" height="20px" borderRadius="10px" />
          <div className="skeleton-streak-days">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="skeleton-streak-col">
                <Skeleton width="28px" height="28px" borderRadius="50%" />
                <Skeleton width="18px" height="10px" borderRadius="4px" />
              </div>
            ))}
          </div>
        </div>

        {/* Today's lesson hero banner */}
        <div className="skeleton-card skeleton-hero-banner">
          <div className="skeleton-banner-left">
            <Skeleton width="70px" height="12px" borderRadius="6px" />
            <Skeleton width="160px" height="20px" borderRadius="8px" />
            <Skeleton width="100px" height="32px" borderRadius="16px" style={{ marginTop: "10px" }} />
          </div>
          <Skeleton width="90px" height="90px" borderRadius="16px" />
        </div>

        {/* Modules heading & cards */}
        <div className="skeleton-section">
          <Skeleton width="150px" height="18px" borderRadius="8px" style={{ marginBottom: "12px" }} />
          <div className="skeleton-modules-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-module-card">
                <Skeleton width="48px" height="48px" borderRadius="14px" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <Skeleton width="60px" height="12px" borderRadius="6px" />
                  <Skeleton width="120px" height="16px" borderRadius="8px" />
                </div>
                <Skeleton width="36px" height="20px" borderRadius="10px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Full page Shimmer Skeleton for Sosial Screen.
 */
export function SosialSkeleton() {
  return (
    <div className="skeleton-page sosial-skeleton">
      <div className="skeleton-topbar">
        <Skeleton width="100px" height="26px" borderRadius="12px" />
        <Skeleton width="80px" height="28px" borderRadius="20px" />
      </div>

      <div className="skeleton-scroll-body">
        {/* Match Partner Card */}
        <div className="skeleton-card" style={{ padding: "18px", gap: "12px" }}>
          <Skeleton width="160px" height="18px" borderRadius="8px" />
          <Skeleton width="100%" height="14px" borderRadius="6px" />
          <Skeleton width="100%" height="42px" borderRadius="24px" style={{ marginTop: "4px" }} />
        </div>

        {/* Live Rooms Section */}
        <div className="skeleton-section">
          <Skeleton width="120px" height="18px" borderRadius="8px" style={{ marginBottom: "12px" }} />
          <div style={{ display: "flex", gap: "12px", overflow: "hidden" }}>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ width: "200px", padding: "14px", flexShrink: 0 }}>
                <Skeleton width="60px" height="14px" borderRadius="6px" />
                <Skeleton width="120px" height="16px" borderRadius="8px" style={{ margin: "8px 0" }} />
                <Skeleton width="80px" height="12px" borderRadius="6px" />
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard Section */}
        <div className="skeleton-section">
          <Skeleton width="140px" height="18px" borderRadius="8px" style={{ marginBottom: "12px" }} />
          <div className="skeleton-card" style={{ padding: "12px" }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: i < 3 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                <Skeleton width="24px" height="24px" borderRadius="50%" />
                <Skeleton width="36px" height="36px" borderRadius="50%" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <Skeleton width="110px" height="14px" borderRadius="6px" />
                  <Skeleton width="60px" height="10px" borderRadius="4px" />
                </div>
                <Skeleton width="50px" height="16px" borderRadius="8px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Full page Shimmer Skeleton for Profile / Progress Screen.
 */
export function ProfileSkeleton() {
  return (
    <div className="skeleton-page profile-skeleton">
      <div className="skeleton-topbar">
        <Skeleton width="110px" height="26px" borderRadius="12px" />
        <Skeleton width="36px" height="36px" borderRadius="50%" />
      </div>

      <div className="skeleton-scroll-body">
        {/* User Header */}
        <div className="skeleton-card" style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px" }}>
          <Skeleton width="56px" height="56px" borderRadius="50%" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            <Skeleton width="130px" height="18px" borderRadius="8px" />
            <Skeleton width="90px" height="12px" borderRadius="6px" />
          </div>
        </div>

        {/* Speaking DNA Card */}
        <div className="skeleton-card" style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <Skeleton width="100px" height="14px" borderRadius="6px" />
          <Skeleton width="80px" height="44px" borderRadius="12px" />
          <Skeleton width="160px" height="12px" borderRadius="6px" />
        </div>

        {/* Sub-Scores Breakdown */}
        <div className="skeleton-section">
          <Skeleton width="130px" height="18px" borderRadius="8px" style={{ marginBottom: "12px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <Skeleton width="70px" height="12px" borderRadius="6px" />
                <Skeleton width="40px" height="22px" borderRadius="6px" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="skeleton-section">
          <Skeleton width="140px" height="18px" borderRadius="8px" style={{ marginBottom: "12px" }} />
          <div className="skeleton-card" style={{ padding: "12px" }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 2 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <Skeleton width="100px" height="14px" borderRadius="6px" />
                  <Skeleton width="70px" height="10px" borderRadius="4px" />
                </div>
                <Skeleton width="44px" height="20px" borderRadius="10px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Full page Shimmer Skeleton for Simulasi Screen Picker.
 */
export function SimulasiSkeleton() {
  return (
    <div className="skeleton-page simulasi-skeleton">
      <div className="skeleton-topbar">
        <Skeleton width="110px" height="26px" borderRadius="12px" />
        <Skeleton width="80px" height="28px" borderRadius="20px" />
      </div>

      <div className="skeleton-scroll-body">
        <Skeleton width="220px" height="16px" borderRadius="8px" style={{ margin: "8px 0 16px 0" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-card" style={{ display: "flex", alignItems: "center", gap: "14px", padding: "18px" }}>
              <Skeleton width="48px" height="48px" borderRadius="14px" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <Skeleton width="110px" height="16px" borderRadius="8px" />
                <Skeleton width="170px" height="12px" borderRadius="6px" />
              </div>
              <Skeleton width="20px" height="20px" borderRadius="50%" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
