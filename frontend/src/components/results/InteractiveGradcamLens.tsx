"use client";

import React, { useState, useRef } from "react";
import { Eye, Layers, Sparkles, ZoomIn, Info } from "lucide-react";

interface InteractiveGradcamLensProps {
  originalImage: string;
  gradcamOverlay: string;
  targetDisease?: string;
  confidence?: number;
}

export default function InteractiveGradcamLens({
  originalImage,
  gradcamOverlay,
  targetDisease = "Detected Lesion",
  confidence,
}: InteractiveGradcamLensProps) {
  const [sliderPosition, setSliderPosition] = useState(50); // 0 to 100%
  const [viewMode, setViewMode] = useState<"slider" | "overlay" | "side_by_side">("slider");
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging && e.buttons !== 1) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percent);
  };

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid rgba(82, 183, 136, 0.3)",
        background: "radial-gradient(circle at 50% 0%, #122e20 0%, #0a1b12 100%)",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
        padding: "18px",
        color: "#e2f1e8",
      }}
    >
      {/* Header Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "14px",
          paddingBottom: "12px",
          borderBottom: "1px solid rgba(82, 183, 136, 0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              padding: "8px",
              borderRadius: "10px",
              backgroundColor: "rgba(82, 183, 136, 0.18)",
              color: "#52b788",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Layers size={18} />
          </div>
          <div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Grad-CAM XAI Neural Lens
              <span
                style={{
                  fontSize: "10px",
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  backgroundColor: "rgba(82, 183, 136, 0.2)",
                  color: "#6ee7b7",
                  border: "1px solid rgba(82, 183, 136, 0.35)",
                  fontFamily: "monospace, sans-serif",
                }}
              >
                Conv_1 Attn
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "rgba(167, 243, 208, 0.75)", marginTop: "2px" }}>
              Drag split-lens to inspect deep neural attention vs raw foliar tissue
            </div>
          </div>
        </div>

        {/* View Mode Selector Tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            backgroundColor: "rgba(20, 50, 36, 0.8)",
            padding: "4px",
            borderRadius: "12px",
            border: "1px solid rgba(82, 183, 136, 0.2)",
            fontSize: "12px",
          }}
        >
          {[
            { id: "slider", label: "Split Slider" },
            { id: "overlay", label: "Full Heatmap" },
            { id: "side_by_side", label: "Side by Side" },
          ].map((mode) => {
            const active = viewMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id as any)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: active ? 700 : 500,
                  transition: "all 0.2s ease",
                  backgroundColor: active ? "#2e7d32" : "transparent",
                  color: active ? "#ffffff" : "rgba(167, 243, 208, 0.75)",
                  boxShadow: active ? "0 2px 8px rgba(0, 0, 0, 0.3)" : "none",
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Stage */}
      {viewMode === "slider" && (
        <div
          ref={containerRef}
          onPointerDown={(e) => {
            setIsDragging(true);
            handlePointerMove(e);
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={() => setIsDragging(false)}
          onPointerLeave={() => setIsDragging(false)}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 10",
            maxHeight: "440px",
            borderRadius: "16px",
            overflow: "hidden",
            cursor: "ew-resize",
            userSelect: "none",
            touchAction: "none",
            backgroundColor: "#06130d",
            border: "1px solid rgba(82, 183, 136, 0.2)",
          }}
        >
          {/* Under layer: Grad-CAM overlay */}
          <img
            src={gradcamOverlay}
            alt="AI Attention Grad-CAM"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              pointerEvents: "none",
            }}
          />

          {/* Over layer: Original specimen clipped by slider position */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: `${sliderPosition}%`,
              height: "100%",
              overflow: "hidden",
              borderRight: "2px solid #52b788",
              boxShadow: "2px 0 16px rgba(82, 183, 136, 0.5)",
              pointerEvents: "none",
            }}
          >
            <img
              src={originalImage}
              alt="Original Leaf"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: containerRef.current ? containerRef.current.clientWidth : "100%",
                height: "100%",
                objectFit: "contain",
                maxWidth: "none",
              }}
            />
          </div>

          {/* Draggable Divider Handle */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${sliderPosition}%`,
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "#1b4332",
                border: "2px solid #52b788",
                boxShadow: "0 0 16px rgba(82, 183, 136, 0.6), 0 4px 12px rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              ⇔
            </div>
          </div>

          {/* Floating Indicators */}
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              left: "12px",
              padding: "4px 10px",
              borderRadius: "8px",
              backgroundColor: "rgba(10, 24, 18, 0.8)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(82, 183, 136, 0.3)",
              fontSize: "11px",
              fontWeight: 700,
              color: "#ffffff",
              pointerEvents: "none",
            }}
          >
            Original Foliage
          </div>

          <div
            style={{
              position: "absolute",
              bottom: "12px",
              right: "12px",
              padding: "4px 10px",
              borderRadius: "8px",
              backgroundColor: "rgba(10, 24, 18, 0.8)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(82, 183, 136, 0.3)",
              fontSize: "11px",
              fontWeight: 700,
              color: "#a7f3d0",
              pointerEvents: "none",
            }}
          >
            Conv_1 Activation Heatmap
          </div>
        </div>
      )}

      {viewMode === "overlay" && (
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 10",
            maxHeight: "440px",
            borderRadius: "16px",
            overflow: "hidden",
            backgroundColor: "#06130d",
            border: "1px solid rgba(82, 183, 136, 0.2)",
          }}
        >
          <img
            src={gradcamOverlay}
            alt="AI Attention Grad-CAM Full"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
      )}

      {viewMode === "side_by_side" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            width: "100%",
            aspectRatio: "16 / 9",
            maxHeight: "440px",
          }}
        >
          <div
            style={{
              borderRadius: "14px",
              overflow: "hidden",
              border: "1px solid rgba(82, 183, 136, 0.2)",
              backgroundColor: "#06130d",
              position: "relative",
            }}
          >
            <img
              src={originalImage}
              alt="Raw Specimen"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "8px",
                left: "8px",
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "6px",
                backgroundColor: "rgba(0,0,0,0.7)",
                color: "#ffffff",
              }}
            >
              Raw Foliage
            </div>
          </div>
          <div
            style={{
              borderRadius: "14px",
              overflow: "hidden",
              border: "1px solid rgba(82, 183, 136, 0.2)",
              backgroundColor: "#06130d",
              position: "relative",
            }}
          >
            <img
              src={gradcamOverlay}
              alt="Attention Heatmap"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "8px",
                left: "8px",
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "6px",
                backgroundColor: "rgba(0,0,0,0.7)",
                color: "#a7f3d0",
              }}
            >
              Conv_1 Heatmap
            </div>
          </div>
        </div>
      )}

      {/* Footer Insight */}
      <div
        style={{
          marginTop: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "rgba(167, 243, 208, 0.75)",
          paddingTop: "10px",
          borderTop: "1px solid rgba(82, 183, 136, 0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Info size={14} color="#52b788" />
          <span>Warm red/amber zones denote highest neural gradient influence on class decision.</span>
        </div>
        {confidence !== undefined && (
          <div style={{ fontWeight: 700, color: "#ffffff", fontFamily: "monospace, sans-serif" }}>
            Confidence: {(confidence * 100).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}
