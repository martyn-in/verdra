"use client";

import React from "react";
import { motion } from "framer-motion";

interface PulsatingThreatRingProps {
  level: "Low" | "Mild" | "Moderate" | "Severe" | "High" | "Critical" | "Healthy" | string;
  size?: number; // pixel diameter (default: 130)
  children?: React.ReactNode;
  pulseCount?: number;
  label?: string;
}

export default function PulsatingThreatRing({
  level = "Low",
  size = 130,
  children,
  pulseCount = 3,
  label,
}: PulsatingThreatRingProps) {
  const normLevel = (level || "low").toLowerCase();

  const getTheme = () => {
    if (normLevel === "healthy" || normLevel === "low") {
      return {
        color: "#4ADE80",
        rgb: "74, 222, 128",
        duration: 3.2,
        severityName: "Minimal Risk",
      };
    }
    if (normLevel === "mild") {
      return {
        color: "#86EFAC",
        rgb: "134, 239, 172",
        duration: 2.6,
        severityName: "Mild Vector",
      };
    }
    if (normLevel === "moderate") {
      return {
        color: "#F59E0B",
        rgb: "245, 158, 11",
        duration: 2.0,
        severityName: "Moderate Outbreak Risk",
      };
    }
    // Severe / High / Critical
    return {
      color: "#EF4444",
      rgb: "239, 68, 68",
      duration: 1.3,
      severityName: "Critical Pathogen Threat",
    };
  };

  const theme = getTheme();
  const coreDiameter = Math.round(size * 0.72);

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px",
        userSelect: "none",
      }}
    >
      {/* Concentric Pulsating Rings Container */}
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
        {/* Animated Expanding Rings */}
        {Array.from({ length: pulseCount }).map((_, idx) => (
          <motion.div
            key={idx}
            style={{
              position: "absolute",
              width: coreDiameter,
              height: coreDiameter,
              borderRadius: "50%",
              pointerEvents: "none",
              border: `1.5px solid rgba(${theme.rgb}, 0.55)`,
              boxShadow: `0 0 16px rgba(${theme.rgb}, 0.25)`,
            }}
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{
              scale: [0.8, 1.45],
              opacity: [0.8, 0],
            }}
            transition={{
              duration: theme.duration,
              repeat: Infinity,
              delay: (idx * theme.duration) / pulseCount,
              ease: "easeOut",
            }}
          />
        ))}

        {/* Ambient Core Glow */}
        <div
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(${theme.rgb}, 0.28) 0%, transparent 70%)`,
            filter: "blur(12px)",
            pointerEvents: "none",
          }}
        />

        {/* Central Core Content / Badge */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            width: coreDiameter,
            height: coreDiameter,
            borderRadius: "50%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            background: `radial-gradient(circle, rgba(${theme.rgb}, 0.16) 0%, rgba(15, 41, 30, 0.9) 100%)`,
            border: `1.5px solid rgba(${theme.rgb}, 0.5)`,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.45), inset 0 0 14px rgba(${theme.rgb}, 0.25)`,
            backdropFilter: "blur(8px)",
          }}
        >
          {children ? (
            children
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontFamily: "monospace, sans-serif",
                  color: theme.color,
                }}
              >
                {level}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: "rgba(167, 243, 208, 0.7)",
                  textTransform: "uppercase",
                  letterSpacing: "-0.02em",
                  marginTop: "2px",
                }}
              >
                Spread Risk
              </span>
            </div>
          )}
        </div>
      </div>

      {label && (
        <div
          style={{
            marginTop: "10px",
            textAlign: "center",
            fontSize: "12px",
            fontWeight: 600,
            color: "rgba(167, 243, 208, 0.85)",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
