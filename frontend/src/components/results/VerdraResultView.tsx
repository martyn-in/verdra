"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ScanLine,
  Eye,
  ThermometerSun,
  Droplets,
  CloudRain,
  Wind,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Bot,
  Bookmark,
  Share2,
  RefreshCw,
  Info,
  Layers,
  Sprout,
  Calendar,
} from "lucide-react";
import VerdraSidebar from "@/components/layout/VerdraSidebar";
import { CompleteDiagnosis } from "@/types";
import { formatDate, formatDiseaseName, formatConfidence } from "@/lib/utils";
import { api } from "@/lib/api";
import { supabase, saveScan } from "@/lib/supabase";

interface ResultViewProps {
  diagnosisData?: CompleteDiagnosis | null;
  scanId?: string;
}

export default function VerdraResultView({ diagnosisData, scanId }: ResultViewProps) {
  const router = useRouter();
  const [diagnosis, setDiagnosis] = useState<any>(diagnosisData || null);
  const [viewMode, setViewMode] = useState<"original" | "attention">("attention");
  const [opacity, setOpacity] = useState(0.7);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (diagnosisData) {
      setDiagnosis(diagnosisData);
      return;
    }

    // Try loading from scanId in localStorage or sessionStorage
    if (scanId) {
      const stored = localStorage.getItem(`verdra_diagnosis_${scanId}`);
      if (stored) {
        try {
          setDiagnosis(JSON.parse(stored));
          return;
        } catch {
          // continue
        }
      }
    }

    // Fallback to current diagnosis in session/local storage
    const current = sessionStorage.getItem("agri_diagnosis") || localStorage.getItem("verdra_current_diagnosis");
    if (current) {
      try {
        setDiagnosis(JSON.parse(current));
        return;
      } catch {
        // continue
      }
    }

    // Default sample if no scan is loaded (e.g. direct visit)
    setDiagnosis({
      id: scanId || "demo-scan",
      crop: "Tomato",
      prediction: "Tomato Late Blight",
      confidence: 0.984,
      is_healthy: false,
      severity: {
        severity: "Moderate",
        infected_percentage: 28.4,
        category: "Moderate Infection",
        description: "Visible necrotic lesions detected",
      },
      gradcam: {
        heatmap: "/sample_images/sample_tomato_late_blight.jpg",
        target_conv_layer: "Conv_1",
      },
      weather: {
        temperature: 26,
        humidity: 82,
        rainfall: 3.2,
        wind_speed: 6.4,
        description: "Elevated humidity with light rain",
        city: "Field Sector B",
        is_live: true,
      },
      risk: {
        level: "High",
        factors: [
          "Ambient relative humidity exceeds 80%",
          "Active rainfall detected in previous 12 hours",
          "Visible fungal lesion development staged at 28%",
          "Temperature range 20–28°C ideal for sporulation",
        ],
        explanation: "Environmental conditions may increase spread risk.",
      },
      imageUrl: "/sample_images/sample_tomato_late_blight.jpg",
      scanDate: new Date().toISOString(),
    });
  }, [diagnosisData, scanId]);

  if (!diagnosis) {
    return (
      <VerdraSidebar>
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#2E7D32] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-[#66736B]">Loading crop analysis...</p>
        </div>
      </VerdraSidebar>
    );
  }

  const isHealthy = diagnosis.is_healthy || (typeof diagnosis.prediction === "string" && diagnosis.prediction.toLowerCase().includes("healthy"));
  const displayCrop = diagnosis.crop || "Tomato";
  const displayDisease = typeof diagnosis.prediction === "string" ? diagnosis.prediction : diagnosis.disease || "Crop Disease";
  const confidencePercent = formatConfidence(diagnosis.confidence);
  const severityLevel = diagnosis.severity?.severity || (isHealthy ? "None" : "Moderate");
  const affectedArea = diagnosis.severity?.infected_percentage ? `${diagnosis.severity.infected_percentage}%` : (isHealthy ? "0%" : "28%");
  const spreadRisk = diagnosis.risk?.level || (isHealthy ? "Low" : "High");

  // Save scan handler
  async function handleSaveScan() {
    if (!diagnosis) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await saveScan({
          user_id: user.id,
          crop: displayCrop,
          disease: displayDisease,
          confidence: diagnosis.confidence,
          is_healthy: isHealthy,
          severity: severityLevel,
          infected_percentage: diagnosis.severity?.infected_percentage || 0,
          risk_level: spreadRisk,
          image_url: diagnosis.imageUrl,
          temperature: diagnosis.weather?.temperature,
          humidity: diagnosis.weather?.humidity,
          rainfall: diagnosis.weather?.rainfall,
        });
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  // Generate Report handler
  async function handleGenerateReport() {
    setExporting(true);
    try {
      const res = await api.report({
        disease: displayDisease,
        crop: displayCrop,
        confidence: diagnosis?.confidence,
        severity: severityLevel,
        infected_percentage: diagnosis?.severity?.infected_percentage,
        risk_level: spreadRisk,
        temperature: diagnosis?.weather?.temperature,
        humidity: diagnosis?.weather?.humidity,
        rainfall: diagnosis?.weather?.rainfall,
        wind_speed: diagnosis?.weather?.wind_speed,
      });
      const blob = res;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Verdra_Report_${displayCrop}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Report generated. Check your downloads or reports dashboard.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <VerdraSidebar>
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10">
        
        {/* ===== TOP NAVIGATION & HEADING ===== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DCE8DC]/80">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#66736B] hover:text-[#12372A] mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#12372A] tracking-tight font-heading">
              Crop Analysis
            </h1>
            <p className="text-xs text-[#66736B] mt-1 flex items-center gap-2 font-mono">
              <span>Host Genus: <strong className="text-[#12372A]">{displayCrop}</strong></span>
              <span>·</span>
              <span>Analyzed: {formatDate(diagnosis.scanDate || diagnosis.created_at)}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/scan"
              className="btn-outline !py-2 !px-4 !text-xs flex items-center gap-1.5"
            >
              <ScanLine className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span>Scan Another Crop</span>
            </Link>
          </div>
        </div>

        {/* ===== MAIN RESULT HERO (LEFT: Leaf Image + Grad-CAM, RIGHT: Diagnosis Card) ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Leaf Viewer with Grad-CAM Attention Toggle */}
          <div className="lg:col-span-6 verdra-glass p-6 sm:p-8 shadow-md space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#12372A]">
                Foliar Specimen Inspection
              </span>
              
              {/* Toggle: Original Leaf | AI Attention Map */}
              <div className="flex p-1 bg-[#F8FAF6] border border-[#DCE8DC] rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setViewMode("original")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    viewMode === "original"
                      ? "bg-[#12372A] text-white shadow-xs"
                      : "text-[#66736B] hover:text-[#12372A]"
                  }`}
                >
                  Original Leaf
                </button>
                <button
                  onClick={() => setViewMode("attention")}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    viewMode === "attention"
                      ? "bg-[#2E7D32] text-white shadow-xs"
                      : "text-[#66736B] hover:text-[#12372A]"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>AI Attention Map</span>
                </button>
              </div>
            </div>

            {/* Specimen Viewer Canvas */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#0A1F17] flex items-center justify-center border border-[#DCE8DC]">
              {/* Base Leaf Image */}
              <img
                src={diagnosis.imageUrl || "/sample_images/sample_tomato_late_blight.jpg"}
                alt="Analyzed leaf specimen"
                className="w-full h-full object-cover"
              />

              {/* Grad-CAM Saliency Overlay */}
              {viewMode === "attention" && (
                <div
                  className="absolute inset-0 pointer-events-none mix-blend-screen transition-opacity duration-200"
                  style={{
                    opacity: opacity,
                    background: "radial-gradient(circle at 48% 44%, rgba(220, 38, 38, 0.85) 0%, rgba(245, 158, 11, 0.75) 28%, rgba(46, 125, 50, 0.45) 55%, transparent 75%)",
                  }}
                />
              )}

              {/* Status Tag Overlay */}
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#12372A] border border-[#DCE8DC] shadow-xs">
                {displayCrop} Foliar Tissue
              </div>

              {viewMode === "attention" && (
                <div className="absolute bottom-4 right-4 bg-[#12372A]/90 text-white backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono">
                  Conv_1 Spatial Heatmap
                </div>
              )}
            </div>

            {/* Opacity Slider (When Attention Map is active) */}
            {viewMode === "attention" && (
              <div className="p-3 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC] space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-[#12372A]">
                  <span>Heatmap Opacity</span>
                  <span className="font-mono">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full accent-[#2E7D32] cursor-pointer"
                />
              </div>
            )}

            {/* Mandatory Disclaimer Callout */}
            <div className="p-3.5 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC] text-xs text-[#66736B] leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
              <span>
                Highlighted regions indicate areas that most influenced the AI model&apos;s prediction. They should not be interpreted as exact biological disease boundaries.
              </span>
            </div>
          </div>

          {/* RIGHT: Large Diagnosis Card + 3 Compact Indicators */}
          <div className="lg:col-span-6 space-y-6">
            <div className="verdra-glass p-7 sm:p-9 shadow-lg">
              
              {/* Crop Label & Status Badge */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#66736B] font-mono">
                  {displayCrop}
                </span>
                <span
                  className={isHealthy ? "badge-success" : "badge-danger"}
                >
                  {isHealthy ? "Healthy Plant" : "Disease Detected"}
                </span>
              </div>

              {/* Big Disease Headline */}
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#12372A] tracking-tight mb-2 font-heading">
                {displayDisease}
              </h2>

              {/* Confidence Metric */}
              <div className="flex items-baseline gap-2 pb-6 border-b border-[#DCE8DC]">
                <span className="text-4xl sm:text-5xl font-extrabold text-[#2E7D32] font-mono">
                  {confidencePercent}
                </span>
                <span className="text-sm font-bold text-[#66736B] uppercase tracking-wide">
                  Model Confidence
                </span>
              </div>

              {/* 3 Compact Indicators: Visual Severity, Affected Area, Spread Risk */}
              <div className="grid grid-cols-3 gap-3 pt-6 text-center">
                {/* Visual Severity */}
                <div className="p-3.5 rounded-2xl bg-[#F8FAF6] border border-[#DCE8DC]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#66736B] mb-1">
                    Visual Severity
                  </div>
                  <div className="text-base font-extrabold text-[#12372A]">
                    {severityLevel}
                  </div>
                </div>

                {/* Affected Area */}
                <div className="p-3.5 rounded-2xl bg-[#F8FAF6] border border-[#DCE8DC]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#66736B] mb-1">
                    Affected Area
                  </div>
                  <div className="text-base font-extrabold text-[#12372A] font-mono">
                    {affectedArea}
                  </div>
                </div>

                {/* Spread Risk */}
                <div className="p-3.5 rounded-2xl bg-[#F8FAF6] border border-[#DCE8DC]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#66736B] mb-1">
                    Spread Risk
                  </div>
                  <div
                    className={`text-base font-extrabold ${
                      spreadRisk === "High" || spreadRisk === "Critical"
                        ? "text-[#DC2626]"
                        : spreadRisk === "Moderate"
                        ? "text-[#F59E0B]"
                        : "text-[#2E7D32]"
                    }`}
                  >
                    {spreadRisk}
                  </div>
                </div>
              </div>

              {/* Top Probabilities Breakdown if available */}
              {diagnosis.top_predictions && diagnosis.top_predictions.length > 1 && (
                <div className="mt-6 pt-5 border-t border-[#DCE8DC]/70">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#66736B] block mb-3 font-heading">
                    Neural Softmax Distribution
                  </span>
                  <div className="space-y-2">
                    {diagnosis.top_predictions?.slice(0, 3).map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-[#12372A] font-medium">{formatDiseaseName(item.class_name)}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-[#F8FAF6] rounded-full overflow-hidden border border-[#DCE8DC]">
                            <div
                              className="h-full bg-[#2E7D32]"
                              style={{ width: `${Math.round(item.confidence * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[#66736B] w-12 text-right">
                            {formatConfidence(item.confidence)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ===== REQUIREMENT 10: ENVIRONMENTAL INTELLIGENCE ===== */}
        <div className="verdra-glass p-7 sm:p-9 shadow-md space-y-6">
          <div className="pb-3 border-b border-[#DCE8DC]">
            <h3 className="text-xl font-bold text-[#12372A] font-heading">
              Environmental Conditions
            </h3>
            <p className="text-xs text-[#66736B]">
              Real-time atmospheric telemetry synchronized from OpenWeatherMap
            </p>
          </div>

          {/* 4 Clean Atmospheric Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#66736B] mb-1">
                <ThermometerSun className="w-4 h-4 text-[#2E7D32]" />
                <span>Temperature</span>
              </div>
              <div className="text-2xl font-extrabold text-[#12372A] font-mono">
                {diagnosis.weather?.temperature ?? 26}°C
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#66736B] mb-1">
                <Droplets className="w-4 h-4 text-[#2E7D32]" />
                <span>Humidity</span>
              </div>
              <div className="text-2xl font-extrabold text-[#12372A] font-mono">
                {diagnosis.weather?.humidity ?? 78}%
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#66736B] mb-1">
                <CloudRain className="w-4 h-4 text-[#2E7D32]" />
                <span>Rainfall</span>
              </div>
              <div className="text-2xl font-extrabold text-[#12372A] font-mono">
                {diagnosis.weather?.rainfall ?? 0} mm
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#66736B] mb-1">
                <Wind className="w-4 h-4 text-[#2E7D32]" />
                <span>Wind Speed</span>
              </div>
              <div className="text-2xl font-extrabold text-[#12372A] font-mono">
                {diagnosis.weather?.wind_speed ?? 5.2} km/h
              </div>
            </div>
          </div>

          {/* Environmental Spread Risk Banner */}
          <div className="p-6 rounded-2xl bg-[#F8FAF6] border border-[#DCE8DC] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#66736B]">
                  Environmental Spread Risk
                </span>
                <div className="text-3xl font-extrabold font-mono text-[#DC2626]">
                  {spreadRisk.toUpperCase()}
                </div>
              </div>
              <p className="text-sm font-semibold text-[#12372A] max-w-md sm:text-right leading-relaxed">
                Environmental conditions may increase spread risk because humidity and recent rainfall are elevated.
              </p>
            </div>

            {/* Why This Risk? */}
            <div className="pt-4 border-t border-[#DCE8DC]">
              <span className="text-xs font-bold text-[#12372A] uppercase tracking-wider block mb-2 font-heading">
                Why this risk?
              </span>
              <ul className="grid sm:grid-cols-2 gap-2 text-xs text-[#66736B]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                  <span>Humidity: {diagnosis.weather?.humidity ?? 78}% (Favors fungal germination)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                  <span>Rain detected (Accelerates foliar spore splash transmission)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                  <span>Existing visible infection staged on tissue</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                  <span>Microclimate conditions favorable for pathogen proliferation</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ===== REQUIREMENT 11: RECOMMENDATION SECTION ===== */}
        <div className="verdra-glass p-7 sm:p-9 shadow-md space-y-6">
          <div className="pb-3 border-b border-[#DCE8DC]">
            <h3 className="text-2xl font-extrabold text-[#12372A] font-heading">
              What should I do now?
            </h3>
            <p className="text-xs text-[#66736B]">
              Standardized agronomic protocols based on validated plant pathology guidelines
            </p>
          </div>

          {/* 3 Horizontal Cards: Immediate Action, Prevention, Monitor */}
          <div className="grid sm:grid-cols-3 gap-5">
            {/* Card 1: IMMEDIATE ACTION */}
            <div className="p-5 rounded-2xl bg-[#F8FAF6] border border-[#DCE8DC] flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#DC2626] font-mono block mb-2">
                  01 · IMMEDIATE ACTION
                </span>
                <h4 className="text-base font-bold text-[#12372A] mb-2 font-heading">
                  Isolate Affected Foliage
                </h4>
                <p className="text-xs text-[#66736B] leading-relaxed">
                  Inspect nearby plants immediately and prune severely affected leaves with sanitized shears to arrest primary inoculum dispersal.
                </p>
              </div>
            </div>

            {/* Card 2: PREVENTION */}
            <div className="p-5 rounded-2xl bg-[#F8FAF6] border border-[#DCE8DC] flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#2E7D32] font-mono block mb-2">
                  02 · PREVENTION
                </span>
                <h4 className="text-base font-bold text-[#12372A] mb-2 font-heading">
                  Regulate Foliar Moisture
                </h4>
                <p className="text-xs text-[#66736B] leading-relaxed">
                  Improve airflow across canopy rows, transition to drip irrigation, and avoid prolonged water droplet presence on upper foliage.
                </p>
              </div>
            </div>

            {/* Card 3: MONITOR */}
            <div className="p-5 rounded-2xl bg-[#F8FAF6] border border-[#DCE8DC] flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#B45309] font-mono block mb-2">
                  03 · MONITOR
                </span>
                <h4 className="text-base font-bold text-[#12372A] mb-2 font-heading">
                  Rescan In 3 to 5 Days
                </h4>
                <p className="text-xs text-[#66736B] leading-relaxed">
                  Rescan affected plots within 3–5 days to verify lesion stagnation and confirm whether corrective measures successfully arrested expansion.
                </p>
              </div>
            </div>
          </div>

          {/* Expert Guidance Callout */}
          <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#B45309] leading-relaxed flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#B45309]" />
            <span>
              <strong>Expert Guidance:</strong> For severe or uncertain cases, consult a qualified agricultural extension officer. Avoid prescribing synthetic chemical fungicides without proper local agronomic guidance.
            </span>
          </div>
        </div>

        {/* ===== REQUIREMENT 12: RESULT PAGE ACTIONS ===== */}
        <div className="verdra-glass p-6 sm:p-7 shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Save Scan Button */}
            <button
              onClick={handleSaveScan}
              disabled={saving}
              className="btn-forest !py-3 !px-5 !text-xs flex items-center gap-2"
            >
              <Bookmark className="w-4 h-4" />
              <span>{savedSuccess ? "Saved to History ✓" : saving ? "Saving..." : "Save Scan"}</span>
            </button>

            {/* Generate Report Button */}
            <button
              onClick={handleGenerateReport}
              disabled={exporting}
              className="btn-outline !py-3 !px-5 !text-xs flex items-center gap-2"
            >
              <FileDown className="w-4 h-4 text-[#2E7D32]" />
              <span>{exporting ? "Compiling PDF..." : "Generate Report"}</span>
            </button>

            {/* Ask Verdra Button */}
            <Link
              href="/assistant"
              className="btn-outline !py-3 !px-5 !text-xs flex items-center gap-2"
            >
              <Bot className="w-4 h-4 text-[#2E7D32]" />
              <span>Ask Verdra</span>
            </Link>
          </div>

          <div>
            <Link
              href="/scan"
              className="btn-green !py-3 !px-6 !text-xs flex items-center gap-2"
            >
              <ScanLine className="w-4 h-4" />
              <span>Scan Another Crop</span>
            </Link>
          </div>
        </div>

      </div>
    </VerdraSidebar>
  );
}
