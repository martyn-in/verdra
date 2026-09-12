"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Tag,
  Clock,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { api } from "@/lib/api";

interface DiseaseProgressionTimelineProps {
  plantId?: string;
  plantTag?: string;
  crop?: string;
  scanId?: string;
  currentCrop?: string;
  initialFieldId?: string;
  currentResult?: any;
  onTagAssigned?: (tag: string) => void;
}

export default function DiseaseProgressionTimeline({
  plantId,
  plantTag,
  crop,
  scanId,
  currentCrop,
  initialFieldId,
  currentResult,
  onTagAssigned,
}: DiseaseProgressionTimelineProps) {
  const { t } = useTranslation();

  const effectiveCrop = crop || currentCrop || "Tomato";
  const effectivePlantId = plantId || plantTag || scanId || "";

  const [activeTag, setActiveTag] = useState(plantTag || "");
  const [customTagInput, setCustomTagInput] = useState("");
  const [timelineData, setTimelineData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  // Generate a friendly readable unique plant tag (e.g. TOM-R3-P12)
  const generateReadableTag = () => {
    const prefix = effectiveCrop.slice(0, 3).toUpperCase();
    const now = Date.now();
    const row = (now % 8) + 1;
    const num = (Math.floor(now / 1000) % 90) + 10;
    return `${prefix}-R${row}-P${num}`;
  };

  const loadTimeline = async (tagOrId: string) => {
    if (!tagOrId) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.getPlantTimeline(tagOrId);
      setTimelineData(data);
    } catch (err: any) {
      setError("Unable to load progression timeline for this plant.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (effectivePlantId) {
      loadTimeline(effectivePlantId);
    }
  }, [effectivePlantId]);

  const handleAssignTag = async (tag: string) => {
    if (!tag.trim()) return;
    const cleanTag = tag.trim().toUpperCase();
    setActiveTag(cleanTag);
    setIsTagModalOpen(false);

    try {
      await api.registerPlant({
        plant_tag: cleanTag,
        crop: effectiveCrop,
        notes: `Registered from scan result on ${new Date().toLocaleDateString()}`,
      });
      if (onTagAssigned) onTagAssigned(cleanTag);
      loadTimeline(cleanTag);
    } catch (e) {
      loadTimeline(cleanTag);
    }
  };

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #dce6dc",
        borderRadius: "22px",
        padding: "24px",
        boxShadow: "0 10px 30px rgba(18, 55, 42, 0.05)",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          paddingBottom: "16px",
          borderBottom: "1px solid #edf2ec",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "14px",
              background: "rgba(46, 125, 50, 0.1)",
              border: "1px solid rgba(46, 125, 50, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2e7d32",
              flexShrink: 0,
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 800, color: "#12372a", fontFamily: "var(--font-heading, inherit)" }}>
              {t("progression.title", "Disease Progression Timeline")}
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#68756d" }}>
              Track infection severity on the same plant specimen over time.
            </p>
          </div>
        </div>

        {/* Plant Tag Badge / Assign Button */}
        <div>
          {activeTag ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "10px",
                background: "rgba(46, 125, 50, 0.12)",
                border: "1px solid rgba(46, 125, 50, 0.25)",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#1b6f2b",
                fontFamily: "monospace",
              }}
            >
              <Tag size={14} />
              <span>{activeTag}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsTagModalOpen(true)}
              style={{
                background: "#2e7d32",
                color: "#ffffff",
                border: "none",
                borderRadius: "12px",
                padding: "9px 16px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                boxShadow: "0 4px 12px rgba(46, 125, 50, 0.22)",
                transition: "transform 0.15s ease",
              }}
            >
              <Tag size={15} />
              <span>{t("result.track_plant", "Track This Plant")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tag Assignment Dialog */}
      {isTagModalOpen && (
        <div
          style={{
            padding: "16px 18px",
            borderRadius: "16px",
            background: "#f7faf6",
            border: "1px solid #dce6dc",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#12372a" }}>
              Assign Plant Specimen Tag
            </span>
            <button
              type="button"
              onClick={() => setIsTagModalOpen(false)}
              style={{ background: "none", border: "none", color: "#68756d", fontSize: "0.8rem", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#68756d" }}>
            Enter a row/plot plant tag (e.g. TOM-R3-P12) or auto-generate one for this crop.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <input
              type="text"
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              placeholder="e.g. TOM-R3-P12"
              style={{
                flex: "1 1 180px",
                padding: "8px 12px",
                borderRadius: "10px",
                border: "1px solid #c8d8c8",
                background: "#ffffff",
                fontSize: "0.82rem",
                color: "#12372a",
                fontFamily: "monospace",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => handleAssignTag(customTagInput || generateReadableTag())}
              style={{
                background: "#2e7d32",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "8px 16px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Save Plant Tag
            </button>
            <button
              type="button"
              onClick={() => setCustomTagInput(generateReadableTag())}
              style={{
                background: "#ffffff",
                color: "#2e7d32",
                border: "1px solid #2e7d32",
                borderRadius: "10px",
                padding: "8px 14px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Auto-Generate
            </button>
          </div>
        </div>
      )}

      {/* Progression Status & Trend (When Scans Exist) */}
      {timelineData && timelineData.timeline && timelineData.timeline.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
          }}
        >
          <div style={{ padding: "14px", borderRadius: "14px", background: "#f7faf6", border: "1px solid #e2ebe0" }}>
            <span style={{ fontSize: "0.72rem", color: "#68756d", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
              Progression Trend
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {timelineData.trend === "Improving" && <TrendingDown size={18} color="#2e7d32" />}
              {timelineData.trend === "Worsening" && <TrendingUp size={18} color="#d92d20" />}
              {timelineData.trend === "Stable" && <Minus size={18} color="#68756d" />}
              <span style={{ fontSize: "0.95rem", fontWeight: 800, color: timelineData.trend === "Worsening" ? "#d92d20" : "#2e7d32" }}>
                {timelineData.trend || "Stable"}
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.74rem", color: "#68756d" }}>
              {timelineData.trend_message}
            </p>
          </div>

          <div style={{ padding: "14px", borderRadius: "14px", background: "#f7faf6", border: "1px solid #e2ebe0" }}>
            <span style={{ fontSize: "0.72rem", color: "#68756d", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
              Recorded Scans
            </span>
            <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#12372a", fontFamily: "monospace" }}>
              {timelineData.total_scans || 1}
            </span>
            <span style={{ fontSize: "0.72rem", color: "#68756d", display: "block" }}>
              Chronologically recorded
            </span>
          </div>

          <div style={{ padding: "14px", borderRadius: "14px", background: "#f7faf6", border: "1px solid #e2ebe0" }}>
            <span style={{ fontSize: "0.72rem", color: "#68756d", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
              Notice
            </span>
            <span style={{ fontSize: "0.75rem", color: "#2d4536", display: "block", lineHeight: 1.4 }}>
              {t("progression.disclaimer", "Based on estimated visual lesion severity and microclimate.")}
            </span>
          </div>
        </div>
      )}

      {/* Chronological Timeline List */}
      {timelineData && timelineData.timeline && timelineData.timeline.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#12372a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Chronological Scan Timeline
          </span>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {timelineData.timeline.map((item: any, idx: number) => {
              const dt = new Date(item.date);
              const formattedDate = dt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const sevPct = item.estimated_severity?.percentage;

              return (
                <div
                  key={item.scan_id || idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "14px",
                    background: "#f7faf6",
                    border: "1px solid #e2ebe0",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "rgba(46, 125, 50, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#2e7d32",
                      }}
                    >
                      <Calendar size={16} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#12372a" }}>
                          {item.disease}
                        </span>
                        <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "6px", background: "#e2ebe0", color: "#2d4536", fontFamily: "monospace" }}>
                          {formattedDate}
                        </span>
                      </div>
                      <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#68756d" }}>
                        Confidence: {(item.confidence * 100).toFixed(1)}% • Risk: {item.risk?.level || "Moderate"}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#12372a", fontFamily: "monospace" }}>
                      {sevPct !== null && sevPct !== undefined ? `${sevPct}% Severity` : "Severity N/A"}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#68756d", display: "block" }}>
                      {item.estimated_severity?.level || "Visual"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div
          style={{
            padding: "26px 18px",
            textAlign: "center",
            borderRadius: "16px",
            background: "#f7faf6",
            border: "1.5px dashed #c8d8c8",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "rgba(46, 125, 50, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2e7d32",
            }}
          >
            <Tag size={20} />
          </div>
          <p style={{ margin: 0, fontSize: "0.84rem", fontWeight: 600, color: "#2d4536", maxWidth: "420px", lineHeight: 1.5 }}>
            {activeTag
              ? `No prior scans found for plant tag "${activeTag}". This scan will serve as the initial baseline.`
              : "Click 'Track This Plant' above to begin tracking this specimen over subsequent weeks."}
          </p>
        </div>
      )}
    </div>
  );
}
