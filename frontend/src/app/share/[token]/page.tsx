"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  Calendar,
  Thermometer,
  Droplets,
  CloudRain,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Leaf,
  FileCheck,
} from "lucide-react";
import { api } from "@/lib/api";

export default function SharedCasePage() {
  const params = useParams();
  const token = params?.token as string;

  const [caseData, setCaseData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    async function fetchCase() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getSharedCase(token);
        if (res?.valid && res?.case_summary) {
          setCaseData(res.case_summary);
        } else {
          setError("This case link is no longer available.");
        }
      } catch (err: any) {
        if (err?.message?.includes("expired")) {
          setError("This case link has expired.");
        } else if (err?.message?.includes("revoked")) {
          setError("This case link has been revoked by the farmer.");
        } else {
          setError("This case link is no longer available.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchCase();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070e0a] flex items-center justify-center p-6 text-white font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl border-2 border-[#52B788] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-[#8EA396] font-mono">Verifying secure case token...</p>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-[#070e0a] flex items-center justify-center p-6 text-white font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#0f1f16] border border-[#2E7D32]/30 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white font-heading">Case Unavailable</h2>
          <p className="text-xs text-[#8EA396] leading-relaxed">
            {error || "This case link is no longer available."}
          </p>
          <div className="pt-2">
            <a
              href="/"
              className="btn-forest !px-6 !py-2.5 !text-xs inline-block text-white"
            >
              Go to Verdra Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isHealthy = caseData.is_healthy;
  const sevPct = caseData.severity?.percentage;
  const sevLevel = caseData.severity?.level || "Moderate";
  const confPct = (caseData.confidence * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-[#070e0a] text-white font-sans p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Top Header & Branding */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0f1f16] border border-[#2E7D32]/40 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2E7D32] flex items-center justify-center text-white shadow-lg shadow-[#2E7D32]/40">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-wide font-heading">Verdra</h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#2E7D32]/30 text-[#85E3B3] border border-[#2E7D32]/50">
                  Expert Review
                </span>
              </div>
              <p className="text-[11px] text-[#8EA396]">
                Verified AI Plant Pathology Consultation Record
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-[#8EA396] font-mono">
            <div className="flex items-center gap-1.5 sm:justify-end">
              <Calendar className="w-3.5 h-3.5 text-[#52B788]" />
              <span>{new Date(caseData.scan_date).toLocaleDateString()}</span>
            </div>
            <span className="text-[10px] text-[#52B788]">Read-Only Case View</span>
          </div>
        </header>

        {/* Primary Diagnosis & Confidence */}
        <div className="p-6 rounded-3xl bg-[#0f1f16] border border-[#2E7D32]/30 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2E7D32]/20">
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-[#52B788]">
                {caseData.crop} Specimen
              </span>
              <h2 className="text-2xl font-extrabold text-white font-heading mt-0.5">
                {caseData.disease}
              </h2>
            </div>

            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-white">{confPct}%</span>
              <span className="text-[11px] text-[#8EA396] block font-mono">
                {caseData.confidence_level} Confidence
              </span>
            </div>
          </div>

          {/* Visual Grad-CAM Inspection */}
          {caseData.gradcam_url && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-mono text-[#8EA396]">
                <Eye className="w-4 h-4 text-[#52B788]" />
                <span>Neural Attention Map (Grad-CAM)</span>
              </div>
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black max-h-[360px] flex items-center justify-center">
                <img
                  src={caseData.gradcam_url}
                  alt="Grad-CAM"
                  className="w-full h-full object-contain max-h-[360px]"
                />
              </div>
            </div>
          )}

          {/* Diagnostics Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-[#8EA396] block">Estimated Severity</span>
              <span className="text-base font-bold text-white">
                {sevPct !== null && sevPct !== undefined ? `${sevPct}%` : sevLevel}
              </span>
              <span className="text-[10px] text-[#8EA396] block">Visual estimate</span>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-[#8EA396] block">Spread Risk</span>
              <span className="text-base font-bold text-amber-400">
                {caseData.risk?.level || "Moderate"}
              </span>
              <span className="text-[10px] text-[#8EA396] block">Climatic pressure</span>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[#8EA396] block">Health Status</span>
              <span
                className={`text-base font-bold ${
                  isHealthy ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isHealthy ? "Healthy" : "Infected"}
              </span>
              <span className="text-[10px] text-[#8EA396] block">Pathogen classification</span>
            </div>
          </div>

          {/* Environmental Context */}
          {caseData.weather && (
            <div className="p-4 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-around gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-[#52B788]" />
                <span>{caseData.weather.temperature ?? "--"}°C</span>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-400" />
                <span>{caseData.weather.humidity ?? "--"}% Humidity</span>
              </div>
              <div className="flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-cyan-400" />
                <span>{caseData.weather.rainfall ?? 0} mm Rain</span>
              </div>
            </div>
          )}

          {/* Actionable Recommendations */}
          {caseData.recommendations?.immediate?.length > 0 && (
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-[#85E3B3] uppercase font-mono tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                <span>Actionable Pathological Guidance</span>
              </h4>
              <ul className="space-y-2 text-xs text-neutral-200">
                {caseData.recommendations.immediate.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#52B788] mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Scientific Disclaimer */}
          <div className="text-center text-[10px] text-[#8EA396] font-mono pt-2">
            Verdra plant disease model inference generated via authentic MobileNetV2 neural weights.
          </div>
        </div>
      </div>
    </div>
  );
}
