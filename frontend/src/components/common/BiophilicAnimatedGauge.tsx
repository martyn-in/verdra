"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface BiophilicAnimatedGaugeProps {
  value: number; // 0 to 100
  size?: number; // pixel diameter (default: 180)
  strokeWidth?: number; // width of arc (default: 12)
  label?: string; // e.g. "Tissue Loss" or "Spread Risk"
  sublabel?: string; // e.g. "Foliar Necrosis"
  level?: "Low" | "Mild" | "Moderate" | "Severe" | "Critical" | "Healthy" | string;
  unit?: string; // "%", "pts", etc.
  interactive?: boolean;
}

export default function BiophilicAnimatedGauge({
  value,
  size = 170,
  strokeWidth = 14,
  label = "Severity",
  sublabel,
  level,
  unit = "%",
  interactive = true,
}: BiophilicAnimatedGaugeProps) {
  const [displayVal, setDisplayVal] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc covering 270 degrees (3/4 circle) from bottom-left around to bottom-right
  const arcSweep = 0.75;
  const maxArcLength = circumference * arcSweep;
  const clampedVal = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = maxArcLength - (clampedVal / 100) * maxArcLength;

  useEffect(() => {
    let start = 0;
    const duration = 1000; // ms
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = clampedVal / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= clampedVal) {
        setDisplayVal(clampedVal);
        clearInterval(timer);
      } else {
        setDisplayVal(Math.round(start * 10) / 10);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [clampedVal]);

  // Color mapping based on value or level
  const getColorGradient = () => {
    const l = (level || "").toLowerCase();
    if (l === "healthy" || clampedVal < 10) {
      return {
        start: "#4ADE80", // vibrant chlorophyll green
        end: "#10B981",
        glow: "rgba(74, 222, 128, 0.45)",
        badgeBg: "rgba(74, 222, 128, 0.16)",
        badgeText: "#86EFAC",
        badgeBorder: "rgba(74, 222, 128, 0.4)",
      };
    }
    if (l === "mild" || clampedVal < 25) {
      return {
        start: "#86EFAC",
        end: "#EAB308", // sunlit amber
        glow: "rgba(234, 179, 8, 0.4)",
        badgeBg: "rgba(234, 179, 8, 0.16)",
        badgeText: "#FDE047",
        badgeBorder: "rgba(234, 179, 8, 0.4)",
      };
    }
    if (l === "moderate" || clampedVal < 50) {
      return {
        start: "#F59E0B",
        end: "#F97316", // terracotta amber
        glow: "rgba(245, 158, 11, 0.45)",
        badgeBg: "rgba(245, 158, 11, 0.18)",
        badgeText: "#FDBA74",
        badgeBorder: "rgba(245, 158, 11, 0.45)",
      };
    }
    // Severe / Critical
    return {
      start: "#F97316",
      end: "#EF4444", // deep pathogen crimson
      glow: "rgba(239, 68, 68, 0.55)",
      badgeBg: "rgba(239, 68, 68, 0.2)",
      badgeText: "#FCA5A5",
      badgeBorder: "rgba(239, 68, 68, 0.45)",
    };
  };

  const theme = getColorGradient();
  const gradId = `bio-gauge-grad-${label.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "val"}`;

  return (
    <div
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px",
        userSelect: "none",
        transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: isHovered ? "scale(1.03)" : "scale(1)",
      }}
    >
      {/* SVG Arc Meter */}
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{
            overflow: "visible",
            transform: "rotate(135deg)",
          }}
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={theme.start} />
              <stop offset="100%" stopColor={theme.end} />
            </linearGradient>
            <filter id={`glow-${gradId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={theme.glow} />
            </filter>
          </defs>

          {/* Background Track Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(46, 125, 50, 0.22)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${maxArcLength} ${circumference}`}
            strokeLinecap="round"
          />

          {/* Active Animated Progress Arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={`url(#${gradId})`}
            strokeWidth={strokeWidth + (isHovered ? 2 : 0)}
            strokeDasharray={`${maxArcLength} ${circumference}`}
            initial={{ strokeDashoffset: maxArcLength }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
            filter={`url(#glow-${gradId})`}
          />
        </svg>

        {/* Center Readout HUD — Absolutely Centered */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            pointerEvents: "none",
            padding: "0 8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center" }}>
            <span
              style={{
                fontSize: Math.round(size * 0.22),
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.03em",
                fontFamily: "monospace, sans-serif",
                textShadow: `0 0 16px ${theme.glow}`,
                lineHeight: 1,
              }}
            >
              {displayVal.toFixed(1)}
            </span>
            <span
              style={{
                fontSize: Math.round(size * 0.1),
                fontWeight: 700,
                color: "rgba(110, 231, 183, 0.9)",
                marginLeft: "3px",
              }}
            >
              {unit}
            </span>
          </div>

          {/* Level Pill */}
          {level && (
            <div
              style={{
                marginTop: "6px",
                padding: "2px 10px",
                borderRadius: "9999px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                backgroundColor: theme.badgeBg,
                color: theme.badgeText,
                border: `1px solid ${theme.badgeBorder}`,
                backdropFilter: "blur(6px)",
                whiteSpace: "nowrap",
              }}
            >
              {level}
            </div>
          )}
        </div>
      </div>

      {/* Outer Labels */}
      <div style={{ marginTop: "10px", textAlign: "center" }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            color: "#e2f1e8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: theme.end,
              boxShadow: `0 0 8px ${theme.glow}`,
              display: "inline-block",
            }}
          />
          {label}
        </div>
        {sublabel && (
          <div
            style={{
              fontSize: "11px",
              color: "rgba(167, 243, 208, 0.7)",
              fontFamily: "monospace, sans-serif",
              marginTop: "2px",
            }}
          >
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}
