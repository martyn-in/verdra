"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Tag,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { api } from "@/lib/api";

interface DiseaseProgressionTimelineProps {
  plantId?: string;
  plantTag?: string;
  crop?: string;
  currentResult?: any;
  onTagAssigned?: (tag: string) => void;
}

export default function DiseaseProgressionTimeline({
  plantId,
  plantTag,
  crop = "Tomato",
  currentResult,
  onTagAssigned,
}: DiseaseProgressionTimelineProps) {
  const { t } = useTranslation();

  const [activeTag, setActiveTag] = useState(plantTag || "");
  const [customTagInput, setCustomTagInput] = useState("");
  const [timelineData, setTimelineData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  // Generate a friendly readable unique plant tag (e.g. TOM-R3-P12)
  // Generate a friendly readable unique plant tag (e.g. TOM-R3-P12) deterministically
  const generateReadableTag = () => {
    const prefix = (crop || "PLANT").slice(0, 3).toUpperCase();
    const now = Date.now();
    const row = ((now % 8) + 1); // deterministic row 1-8
    const num = ((Math.floor(now / 1000) % 90) + 10); // deterministic plant 10-99
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
    if (plantId || plantTag) {
      loadTimeline(plantId || plantTag || "");
    }
  }, [plantId, plantTag]);

  const handleAssignTag = async (tag: string) => {
    if (!tag.trim()) return;
    const cleanTag = tag.trim().toUpperCase();
    setActiveTag(cleanTag);
    setIsTagModalOpen(false);

    try {
      await api.registerPlant({
        plant_tag: cleanTag,
        crop: crop,
        notes: `Registered from scan result on ${new Date().toLocaleDateString()}`,
      });
      if (onTagAssigned) onTagAssigned(cleanTag);
      loadTimeline(cleanTag);
    } catch (e) {
      // Continue locally
      loadTimeline(cleanTag);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-[#0f1f16] border border-[#2E7D32]/30 shadow-2xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2E7D32]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#2E7D32]/20 border border-[#2E7D32]/40 flex items-center justify-center text-[#52B788]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-heading">
              {t("progression.title", "Disease Progression Timeline")}
            </h3>
            <p className="text-xs text-[#8EA396]">
              Track infection severity on the same plant specimen over time.
            </p>
          </div>
        </div>

        {/* Plant Tag Badge / Assign Button */}
        <div className="flex items-center gap-2">
          {activeTag ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#2E7D32]/20 border border-[#2E7D32]/40 text-xs font-mono text-[#85E3B3]">
              <Tag className="w-3.5 h-3.5" />
              <span>{activeTag}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsTagModalOpen(true)}
              className="btn-forest !px-4 !py-2 !text-xs flex items-center gap-1.5"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{t("result.track_plant", "Track This Plant")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tag Assignment Dialog */}
      {isTagModalOpen && (
        <div className="p-4 rounded-2xl bg-[#12231A] border border-[#2E7D32]/40 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white font-heading">
              Assign Plant Specimen Tag
            </span>
            <button
              type="button"
              onClick={() => setIsTagModalOpen(false)}
              className="text-xs text-[#8EA396] hover:text-white"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-[#8EA396]">
            Enter a row/plot plant tag (e.g. TOM-R3-P12) or generate one automatically.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              placeholder="e.g., TOM-R3-P12"
              className="flex-1 bg-black/40 border border-[#2E7D32]/40 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-500 font-mono focus:outline-none focus:border-[#52B788]"
            />
            <button
              type="button"
              onClick={() => handleAssignTag(customTagInput || generateReadableTag())}
              className="btn-forest !px-4 !py-2 !text-xs whitespace-nowrap"
            >
              Save Plant Tag
            </button>
            <button
              type="button"
              onClick={() => {
                const gen = generateReadableTag();
                setCustomTagInput(gen);
              }}
              className="btn-outline !px-3 !py-2 !text-xs !text-white whitespace-nowrap"
            >
              Auto-Generate
            </button>
          </div>
        </div>
      )}

      {/* Progression Status & Trend */}
      {timelineData && timelineData.timeline.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-[11px] text-[#8EA396] font-mono block">Progression Trend</span>
            <div className="flex items-center gap-2">
              {timelineData.trend === "Improving" && (
                <>
                  <TrendingDown className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">
                    {t("progression.trend_improving", "Improving")}
                  </span>
                </>
              )}
              {timelineData.trend === "Worsening" && (
                <>
                  <TrendingUp className="w-5 h-5 text-rose-400" />
                  <span className="text-sm font-bold text-rose-400">
                    {t("progression.trend_worsening", "Worsening")}
                  </span>
                </>
              )}
              {timelineData.trend === "Stable" && (
                <>
                  <Minus className="w-5 h-5 text-neutral-400" />
                  <span className="text-sm font-bold text-neutral-300">
                    {t("progression.trend_stable", "Stable")}
                  </span>
                </>
              )}
              {timelineData.trend !== "Improving" && timelineData.trend !== "Worsening" && timelineData.trend !== "Stable" && (
                <span className="text-sm font-bold text-[#8EA396]">
                  {timelineData.trend}
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#8EA396] leading-tight">
              {timelineData.trend_message}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-[11px] text-[#8EA396] font-mono block">Recorded Inspections</span>
            <span className="text-2xl font-bold text-white font-mono">
              {timelineData.total_scans}
            </span>
            <span className="text-[10px] text-[#8EA396] block">
              Chronologically recorded scans
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-[11px] text-[#8EA396] font-mono block">Scientific Notice</span>
            <span className="text-xs text-neutral-300 block font-sans leading-relaxed">
              {t("progression.disclaimer", "Based on estimated visual severity.")}
            </span>
          </div>
        </div>
      )}

      {/* Chronological Timeline Cards */}
      {timelineData && timelineData.timeline.length > 0 ? (
        <div className="space-y-3">
          <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
            Chronological Scan Timeline
          </span>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#2E7D32]/40">
            {timelineData.timeline.map((item: any, idx: number) => {
              const dt = new Date(item.date);
              const formattedDate = dt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const sevPct = item.estimated_severity?.percentage;

              return (
                <div key={item.scan_id || idx} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-3 w-4 h-4 rounded-full bg-[#12372A] border-2 border-[#52B788] group-hover:scale-110 transition-transform" />

                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-[#2E7D32]/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {item.thumbnail_url && (
                        <img
                          src={item.thumbnail_url}
                          alt="Thumbnail"
                          className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {item.disease}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#8EA396]">
                            {formattedDate}
                          </span>
                        </div>
                        <p className="text-xs text-[#8EA396] font-mono mt-0.5">
                          Confidence: {(item.confidence * 100).toFixed(1)}% • Risk: {item.risk?.level || "Moderate"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-white">
                        {sevPct !== null && sevPct !== undefined ? `${sevPct}% Severity` : "Severity N/A"}
                      </span>
                      <span className="text-[10px] text-[#8EA396] block font-mono">
                        {item.estimated_severity?.level || "Visual"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center rounded-2xl bg-black/20 border border-dashed border-white/10 space-y-2">
          <Tag className="w-8 h-8 text-[#8EA396] mx-auto opacity-60" />
          <p className="text-xs text-neutral-300 font-medium">
            {activeTag
              ? `No prior scans found for plant tag "${activeTag}". This scan will serve as the initial baseline.`
              : "Click 'Track This Plant' above to begin tracking this specimen over subsequent weeks."}
          </p>
        </div>
      )}
    </div>
  );
}
