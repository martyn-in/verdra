"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ShieldCheck, AlertTriangle, Wind, Droplets, Thermometer, ArrowRight, Eye, ScanLine, Layers, CheckCircle2 } from "lucide-react";
import BiophilicAnimatedGauge from "./BiophilicAnimatedGauge";
import PulsatingThreatRing from "./PulsatingThreatRing";

interface Specimen {
  id: string;
  name: string;
  crop: string;
  pathogen: string;
  severity: number;
  severityLevel: "Low" | "Mild" | "Moderate" | "Severe" | "Healthy";
  spreadRisk: "Low" | "Moderate" | "High" | "Critical";
  spreadRiskScore: number;
  confidence: number;
  temp: number;
  humidity: number;
  windSpeed: number;
  image: string;
  gradcam: string;
  advice: string;
  actionProtocol: string;
}

const SPECIMENS: Specimen[] = [
  {
    id: "tomato_late_blight",
    name: "Tomato Late Blight",
    crop: "Solanum lycopersicum",
    pathogen: "Phytophthora infestans (Oomycete)",
    severity: 78.4,
    severityLevel: "Severe",
    spreadRisk: "Critical",
    spreadRiskScore: 92,
    confidence: 0.985,
    temp: 18.2,
    humidity: 94,
    windSpeed: 14.5,
    image: "/sample_images/sample_tomato_early_blight.jpg",
    gradcam: "/sample_images/sample_tomato_early_blight.jpg",
    advice: "Severe foliar necrosis with high sporulation potential. Night humidity exceeds 90% threshold for epidemic spread.",
    actionProtocol: "Apply targeted copper hydroxide (77% WP @ 2.0g/L) foliar protectant within 24h. Prune lower canopy leaves immediately.",
  },
  {
    id: "potato_early_blight",
    name: "Potato Early Blight",
    crop: "Solanum tuberosum",
    pathogen: "Alternaria solani (Fungus)",
    severity: 38.6,
    severityLevel: "Moderate",
    spreadRisk: "High",
    spreadRiskScore: 68,
    confidence: 0.962,
    temp: 24.5,
    humidity: 78,
    windSpeed: 9.2,
    image: "/sample_images/sample_potato_early_blight.jpg",
    gradcam: "/sample_images/sample_potato_early_blight.jpg",
    advice: "Target-spot concentric lesions identified across middle canopy. Moderate temperature facilitates conidial germination.",
    actionProtocol: "Prune infected lower foliage. Apply chlorothalonil or azoxystrobin spray. Enforce drip irrigation to eliminate splash.",
  },
  {
    id: "pepper_bacterial_spot",
    name: "Pepper Bacterial Spot",
    crop: "Capsicum annuum",
    pathogen: "Xanthomonas campestris (Bacteria)",
    severity: 18.2,
    severityLevel: "Mild",
    spreadRisk: "Moderate",
    spreadRiskScore: 48,
    confidence: 0.941,
    temp: 27.0,
    humidity: 62,
    windSpeed: 6.0,
    image: "/sample_images/sample_pepper_bacterial_spot.jpg",
    gradcam: "/sample_images/sample_pepper_bacterial_spot.jpg",
    advice: "Early water-soaked lesions detected along foliar margins. Dry canopy airflow is curbing accelerated bacterial multiplication.",
    actionProtocol: "Suspend overhead sprinklers. Apply copper-mancozeb combination. Sanitize pruning tools with 70% isopropyl alcohol.",
  },
  {
    id: "tomato_healthy",
    name: "Healthy Foliage",
    crop: "Solanum lycopersicum",
    pathogen: "None (Vigorous Chlorophyll Index)",
    severity: 0.0,
    severityLevel: "Healthy",
    spreadRisk: "Low",
    spreadRiskScore: 8,
    confidence: 0.994,
    temp: 22.0,
    humidity: 55,
    windSpeed: 7.5,
    image: "/sample_images/sample_tomato_healthy.jpg",
    gradcam: "/sample_images/sample_tomato_healthy.jpg",
    advice: "Intact epidermal cells and uniform photosynthetic chlorophyll distribution. Cellular defense barriers fully active.",
    actionProtocol: "Maintain balanced nitrogen/potassium foliar fertigation. Continue weekly scouting rounds to monitor new flush.",
  },
];

export default function InteractiveSpecimenBiosphere({
  onLaunchScan,
}: {
  onLaunchScan?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string>("tomato_late_blight");
  const [showAttention, setShowAttention] = useState<boolean>(false);
  const specimen = SPECIMENS.find((s) => s.id === selectedId) || SPECIMENS[0];

  return (
    <div
      style={{
        width: "100%",
        borderRadius: "28px",
        background: "radial-gradient(ellipse at 50% 0%, #133325 0%, #0a1b13 75%, #06120d 100%)",
        border: "1px solid rgba(82, 183, 136, 0.35)",
        boxShadow: "0 25px 70px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        padding: "clamp(20px, 3.5vw, 36px)",
        color: "#ffffff",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Ambient background glow orb */}
      <div
        style={{
          position: "absolute",
          top: "-150px",
          right: "-100px",
          width: "450px",
          height: "450px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(82, 183, 136, 0.18) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      {/* Top Banner & Specimen Selector Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "18px",
          paddingBottom: "22px",
          borderBottom: "1px solid rgba(82, 183, 136, 0.22)",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#52b788",
              fontFamily: "monospace, sans-serif",
              marginBottom: "6px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#52b788",
                boxShadow: "0 0 10px #52b788",
                display: "inline-block",
              }}
            />
            Neural Pathology Telemetry
          </div>
          <h3
            style={{
              fontSize: "clamp(20px, 2.2vw, 26px)",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Interactive Crop Biosphere Simulator
          </h3>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(167, 243, 208, 0.75)",
              margin: "4px 0 0",
            }}
          >
            Select a verified benchmark specimen to simulate real-time neural inference, tissue severity mapping & risk dynamics:
          </p>
        </div>

        {/* Specimen Buttons */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          {SPECIMENS.map((s) => {
            const active = s.id === selectedId;
            const dotColor =
              s.severityLevel === "Healthy"
                ? "#4ade80"
                : s.severityLevel === "Severe"
                ? "#ef4444"
                : s.severityLevel === "Moderate"
                ? "#f59e0b"
                : "#a3e635";

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedId(s.id);
                  setShowAttention(false);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 14px",
                  borderRadius: "14px",
                  fontSize: "12px",
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  backgroundColor: active ? "rgba(82, 183, 136, 0.24)" : "rgba(16, 42, 30, 0.6)",
                  color: active ? "#ffffff" : "rgba(167, 243, 208, 0.8)",
                  border: active
                    ? "1px solid #52b788"
                    : "1px solid rgba(82, 183, 136, 0.18)",
                  boxShadow: active
                    ? "0 0 20px rgba(82, 183, 136, 0.35), 0 4px 12px rgba(0,0,0,0.3)"
                    : "none",
                  transform: active ? "translateY(-1px)" : "none",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: dotColor,
                    boxShadow: `0 0 8px ${dotColor}`,
                  }}
                />
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive 3-Column Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
          gap: "24px",
          marginTop: "24px",
          alignItems: "stretch",
        }}
      >
        {/* Card 1: Specimen Visualizer & Neural Attention */}
        <div
          style={{
            borderRadius: "20px",
            backgroundColor: "rgba(15, 38, 27, 0.75)",
            border: "1px solid rgba(82, 183, 136, 0.25)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#52b788",
                    fontFamily: "monospace, sans-serif",
                    textTransform: "uppercase",
                  }}
                >
                  Foliar Specimen
                </span>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>
                  {specimen.name}
                </div>
                <div style={{ fontSize: "12px", color: "rgba(167, 243, 208, 0.7)", fontStyle: "italic" }}>
                  {specimen.crop}
                </div>
              </div>

              {/* Toggle original vs attention */}
              <button
                type="button"
                onClick={() => setShowAttention(!showAttention)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: showAttention ? "#2e7d32" : "rgba(82, 183, 136, 0.15)",
                  color: showAttention ? "#ffffff" : "#a7f3d0",
                  border: "1px solid rgba(82, 183, 136, 0.35)",
                  transition: "all 0.2s ease",
                }}
              >
                <Eye size={13} />
                <span>{showAttention ? "Heatmap On" : "Toggle Heatmap"}</span>
              </button>
            </div>

            {/* Specimen Image Display */}
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "4 / 3",
                borderRadius: "14px",
                overflow: "hidden",
                backgroundColor: "#07160e",
                border: "1px solid rgba(82, 183, 136, 0.2)",
              }}
            >
              <img
                src={showAttention ? specimen.gradcam : specimen.image}
                alt={specimen.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: showAttention ? "contrast(1.15) saturate(1.2)" : "none",
                  transition: "filter 0.3s ease",
                }}
              />

              {/* Mode Watermark */}
              <div
                style={{
                  position: "absolute",
                  bottom: "10px",
                  left: "10px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(8, 20, 14, 0.8)",
                  backdropFilter: "blur(4px)",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: showAttention ? "#6ee7b7" : "#ffffff",
                  border: "1px solid rgba(82, 183, 136, 0.25)",
                }}
              >
                {showAttention ? "Conv_1 Grad-CAM Attention" : "High-Resolution Foliar Image"}
              </div>

              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(8, 20, 14, 0.8)",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#52b788",
                  fontFamily: "monospace, sans-serif",
                }}
              >
                {(specimen.confidence * 100).toFixed(1)}% Conf
              </div>
            </div>
          </div>

          {/* Pathogen Detail */}
          <div
            style={{
              marginTop: "14px",
              padding: "10px 14px",
              borderRadius: "12px",
              backgroundColor: "rgba(10, 26, 18, 0.6)",
              border: "1px solid rgba(82, 183, 136, 0.15)",
              fontSize: "12px",
            }}
          >
            <div style={{ color: "rgba(167, 243, 208, 0.7)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Identified Pathogen Agent
            </div>
            <div style={{ fontWeight: 700, color: "#ffffff", marginTop: "2px" }}>
              {specimen.pathogen}
            </div>
          </div>
        </div>

        {/* Card 2: Biophilic Dynamic Gauges HUD */}
        <div
          style={{
            borderRadius: "20px",
            backgroundColor: "rgba(15, 38, 27, 0.75)",
            border: "1px solid rgba(82, 183, 136, 0.25)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#52b788",
                fontFamily: "monospace, sans-serif",
                textTransform: "uppercase",
                marginBottom: "14px",
              }}
            >
              Quantitative Disease Physics
            </div>

            {/* Gauges Container */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-around",
                gap: "16px",
                padding: "8px 0",
              }}
            >
              {/* Severity Gauge */}
              <BiophilicAnimatedGauge
                key={`gauge-${specimen.id}`}
                value={specimen.severity}
                size={160}
                strokeWidth={13}
                label="Foliar Tissue Loss"
                sublabel={`Phenotype: ${specimen.severityLevel}`}
                level={specimen.severityLevel}
                unit="%"
              />

              {/* Threat Ring */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <PulsatingThreatRing
                  key={`ring-${specimen.id}`}
                  level={specimen.spreadRisk}
                  size={145}
                  pulseCount={specimen.spreadRisk === "Critical" ? 4 : 3}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span
                      style={{
                        fontSize: "9px",
                        fontFamily: "monospace, sans-serif",
                        color: "rgba(167, 243, 208, 0.8)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Transmission
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 800,
                        color: "#ffffff",
                        textTransform: "uppercase",
                        lineHeight: 1.1,
                      }}
                    >
                      {specimen.spreadRisk}
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        fontFamily: "monospace, sans-serif",
                        color: "#a7f3d0",
                      }}
                    >
                      Score: {specimen.spreadRiskScore}/100
                    </span>
                  </div>
                </PulsatingThreatRing>

                <div style={{ textAlign: "center", marginTop: "8px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#e2f1e8" }}>
                    Epidemiological Vector
                  </div>
                  <div style={{ fontSize: "11px", color: "rgba(167, 243, 208, 0.7)", fontFamily: "monospace, sans-serif" }}>
                    Microclimate Risk
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "rgba(167, 243, 208, 0.8)",
              backgroundColor: "rgba(10, 26, 18, 0.6)",
              padding: "10px 14px",
              borderRadius: "12px",
              border: "1px solid rgba(82, 183, 136, 0.15)",
              lineHeight: 1.45,
            }}
          >
            {specimen.advice}
          </div>
        </div>

        {/* Card 3: Environmental Telemetry & Treatment Action Protocol */}
        <div
          style={{
            borderRadius: "20px",
            backgroundColor: "rgba(15, 38, 27, 0.75)",
            border: "1px solid rgba(82, 183, 136, 0.25)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#52b788",
                fontFamily: "monospace, sans-serif",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              Microclimate & Rx Protocol
            </div>

            {/* Microclimate Telemetry Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  padding: "10px 8px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(10, 26, 18, 0.7)",
                  border: "1px solid rgba(82, 183, 136, 0.18)",
                  textAlign: "center",
                }}
              >
                <Thermometer size={16} color="#52b788" style={{ margin: "0 auto 4px" }} />
                <div style={{ fontSize: "10px", color: "rgba(167, 243, 208, 0.7)" }}>Temp</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff", fontFamily: "monospace, sans-serif" }}>
                  {specimen.temp}°C
                </div>
              </div>

              <div
                style={{
                  padding: "10px 8px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(10, 26, 18, 0.7)",
                  border: "1px solid rgba(82, 183, 136, 0.18)",
                  textAlign: "center",
                }}
              >
                <Droplets size={16} color="#52b788" style={{ margin: "0 auto 4px" }} />
                <div style={{ fontSize: "10px", color: "rgba(167, 243, 208, 0.7)" }}>Humidity</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff", fontFamily: "monospace, sans-serif" }}>
                  {specimen.humidity}%
                </div>
              </div>

              <div
                style={{
                  padding: "10px 8px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(10, 26, 18, 0.7)",
                  border: "1px solid rgba(82, 183, 136, 0.18)",
                  textAlign: "center",
                }}
              >
                <Wind size={16} color="#52b788" style={{ margin: "0 auto 4px" }} />
                <div style={{ fontSize: "10px", color: "rgba(167, 243, 208, 0.7)" }}>Wind</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff", fontFamily: "monospace, sans-serif" }}>
                  {specimen.windSpeed} km/h
                </div>
              </div>
            </div>

            {/* Action Protocol Box */}
            <div
              style={{
                padding: "14px",
                borderRadius: "14px",
                backgroundColor: "rgba(10, 26, 18, 0.8)",
                border: "1px solid rgba(82, 183, 136, 0.25)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#52b788",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                <ShieldCheck size={14} />
                <span>Immediate Field Protocol</span>
              </div>
              <p
                style={{
                  fontSize: "12px",
                  color: "#e2f1e8",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {specimen.actionProtocol}
              </p>
            </div>
          </div>

          {/* Launch Scanner Button */}
          {onLaunchScan && (
            <button
              type="button"
              onClick={onLaunchScan}
              style={{
                marginTop: "16px",
                width: "100%",
                padding: "12px 18px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #2e7d32 0%, #1b4332 100%)",
                border: "1px solid rgba(82, 183, 136, 0.5)",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(46, 125, 50, 0.35)",
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(46, 125, 50, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(46, 125, 50, 0.35)";
              }}
            >
              <ScanLine size={16} />
              <span>Scan Your Field Crop</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
