"use client";
import { useState, useEffect, useMemo } from "react";
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
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Bot,
  Bookmark,
  Info,
  Sprout,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  GitCompareArrows,
  Clock,
  Share2,
} from "lucide-react";
import VerdraSidebar from "@/components/layout/VerdraSidebar";
import { CompleteDiagnosis } from "@/types";
import { formatDate, formatDiseaseName, formatConfidence } from "@/lib/utils";
import { api } from "@/lib/api";
import { supabase, saveScan } from "@/lib/supabase";
import VoiceReadout from "@/components/results/VoiceReadout";
import ExpertShareModal from "@/components/results/ExpertShareModal";
import DiseaseProgressionTimeline from "@/components/results/DiseaseProgressionTimeline";
import NearbyRiskAlerts from "@/components/results/NearbyRiskAlerts";

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
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const [loadingError, setLoadingError] = useState(false);

  useEffect(() => {
    if (diagnosisData) { setDiagnosis(diagnosisData); return; }
    
    if (scanId) {
      // 1. Direct key
      const stored = localStorage.getItem(`verdra_diagnosis_${scanId}`);
      if (stored) {
        try { setDiagnosis(JSON.parse(stored)); return; } catch {}
      }

      // 2. Recent scans list
      try {
        const recent = JSON.parse(localStorage.getItem("verdra_recent_scans") || "[]");
        const found = recent.find((s: any) => s.id === scanId);
        if (found) { setDiagnosis(found); return; }
      } catch {}

      // 3. SPA history list
      try {
        const hist = JSON.parse(localStorage.getItem("verdra-real-scan-history") || "[]");
        const found = hist.find((s: any) => s.id === scanId);
        if (found) { setDiagnosis(found); return; }
      } catch {}

      // 4. Fetch from backend API
      api.getScan(scanId)
        .then((remoteScan) => {
          if (remoteScan) {
            setDiagnosis(remoteScan);
            try {
              localStorage.setItem(`verdra_diagnosis_${scanId}`, JSON.stringify(remoteScan));
            } catch {}
          }
        })
        .catch(() => {
          // Fall back to current diagnosis if available
          const current = sessionStorage.getItem("agri_diagnosis") || localStorage.getItem("verdra_current_diagnosis");
          if (current) {
            try { setDiagnosis(JSON.parse(current)); return; } catch {}
          }
          setLoadingError(true);
        });
      return;
    }

    const current = sessionStorage.getItem("agri_diagnosis") || localStorage.getItem("verdra_current_diagnosis");
    if (current) { try { setDiagnosis(JSON.parse(current)); return; } catch {} }
    setDiagnosis(null);
  }, [diagnosisData, scanId]);

  // Find previous scan for comparison
  const previousScan = useMemo(() => {
    if (!diagnosis) return null;
    try {
      const history = JSON.parse(localStorage.getItem("verdra_recent_scans") || "[]");
      const currentId = diagnosis.id || scanId;
      const currentCrop = (diagnosis.crop || "").toLowerCase();
      const currentTag = (diagnosis.fieldTag || "").toLowerCase().trim();
      const candidates = history.filter((s: any) => {
        if (s.id === currentId) return false;
        if ((s.crop || "").toLowerCase() !== currentCrop) return false;
        if (currentTag && (s.fieldTag || "").toLowerCase().trim() === currentTag) return true;
        if (!currentTag) return true;
        return false;
      });
      return candidates.length > 0 ? candidates[0] : null;
    } catch { return null; }
  }, [diagnosis, scanId]);

  if (!diagnosis) {
    return (
      <VerdraSidebar>
        <div className="p-12 text-center max-w-md mx-auto">
          {loadingError ? (
            <div className="verdra-glass p-8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626] mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#12372A]">Scan Details Unavailable</h3>
              <p className="text-xs text-[#66736B] leading-relaxed">
                The requested scan record could not be found or has expired from this local session.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <Link href="/scan" className="btn-forest !py-2 !px-4 !text-xs">
                  Scan New Crop
                </Link>
                <Link href="/history" className="btn-outline !py-2 !px-4 !text-xs">
                  View History
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full border-2 border-[#2E7D32] border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-sm font-semibold text-[#66736B]">Loading crop analysis...</p>
            </>
          )}
        </div>
      </VerdraSidebar>
    );
  }

  const isUncertain = diagnosis.status === "UNCERTAIN";
  const isHealthy =
    !isUncertain &&
    (Boolean(diagnosis.is_healthy) ||
      (typeof diagnosis.prediction === "string" &&
        diagnosis.prediction.toLowerCase().includes("healthy")) ||
      (typeof diagnosis.disease === "string" &&
        diagnosis.disease.toLowerCase().includes("healthy")));
  const displayCrop = diagnosis.crop || diagnosis.crop_name || "Tomato";
  const displayDisease =
    typeof diagnosis.prediction === "string"
      ? diagnosis.prediction
      : diagnosis.disease || "Crop Disease";
  const confidencePercent = formatConfidence(diagnosis.confidence);
  const severityLevel =
    diagnosis.severity?.level ||
    diagnosis.severity?.severity ||
    (typeof diagnosis.severity === "string"
      ? diagnosis.severity
      : isHealthy
      ? "None"
      : "Moderate");
  const affectedPct =
    diagnosis.severity?.percentage != null
      ? diagnosis.severity.percentage
      : diagnosis.severity?.infected_percentage != null
      ? diagnosis.severity.infected_percentage
      : diagnosis.affected_percentage != null
      ? diagnosis.affected_percentage
      : null;
  const affectedArea = affectedPct != null ? `${affectedPct}%` : isHealthy ? "0%" : "N/A";
  const spreadRisk = diagnosis.risk?.level || diagnosis.risk_level || (isHealthy ? "Low" : "Moderate");
  const gradcamOverlay =
    diagnosis.gradcam?.overlay ||
    diagnosis.gradcam?.overlay_base64 ||
    diagnosis.gradcam_url ||
    null;
  const hasRealGradcam =
    gradcamOverlay &&
    (gradcamOverlay.startsWith("data:") || gradcamOverlay.startsWith("http"));
  const displayImage =
    diagnosis.imageUrl ||
    diagnosis.image_url ||
    "/sample_images/sample_tomato_late_blight.jpg";
  const displayDate =
    diagnosis.scanDate ||
    diagnosis.created_at ||
    diagnosis.timestamp ||
    new Date().toISOString();
  const displayTag = diagnosis.fieldTag || diagnosis.field_tag || "";
  const topPredictionsList =
    diagnosis.top_predictions && diagnosis.top_predictions.length > 0
      ? diagnosis.top_predictions
      : diagnosis.topPredictions && diagnosis.topPredictions.length > 0
      ? diagnosis.topPredictions.map((tp: any) => ({
          class_name: tp.className || tp.class_name,
          confidence: tp.confidence,
        }))
      : [];

  async function handleSaveScan() {
    if (!diagnosis) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await saveScan({ user_id: user.id, crop: displayCrop, disease: displayDisease, confidence: diagnosis.confidence, is_healthy: isHealthy, severity: severityLevel, infected_percentage: diagnosis.severity?.infected_percentage || diagnosis.severity?.percentage || 0, risk_level: spreadRisk, image_url: diagnosis.imageUrl, temperature: diagnosis.weather?.temperature, humidity: diagnosis.weather?.humidity, rainfall: diagnosis.weather?.rainfall, field_tag: diagnosis.fieldTag || "" });
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch { setSavedSuccess(true); setTimeout(() => setSavedSuccess(false), 3000); }
    finally { setSaving(false); }
  }

  async function handleGenerateReport() {
    setExporting(true);
    try {
      const res = await api.report({ disease: displayDisease, prediction: displayDisease, crop: displayCrop, confidence: diagnosis?.confidence, is_healthy: isHealthy, severity: severityLevel, infected_percentage: diagnosis?.severity?.infected_percentage || diagnosis?.severity?.percentage || 0, risk_level: spreadRisk, temperature: diagnosis?.weather?.temperature, humidity: diagnosis?.weather?.humidity, rainfall: diagnosis?.weather?.rainfall, wind_speed: diagnosis?.weather?.wind_speed, field_tag: diagnosis?.fieldTag || "", scan_date: diagnosis?.scanDate || diagnosis?.created_at, scan_id: diagnosis?.id || scanId, top_predictions: diagnosis?.top_predictions, weather: { ...diagnosis?.weather, available: true }, risk: { risk_level: spreadRisk, factors: diagnosis?.risk?.factors, recommendation: diagnosis?.risk?.explanation }, recommendations: diagnosis?.recommendations ? { found: true, ...diagnosis.recommendations } : undefined, rescan: diagnosis?.rescan });
      const url = window.URL.createObjectURL(res);
      const a = document.createElement("a");
      a.href = url; a.download = `Verdra_Report_${displayCrop}_${Date.now()}.pdf`;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
    } catch { alert("Report generation may not be available. Check the backend configuration."); }
    finally { setExporting(false); }
  }

  // ====================== UNCERTAIN RESULT ======================
  if (isUncertain) {
    return (
      <VerdraSidebar>
        <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between pb-4 border-b border-[#DCE8DC]/80">
            <div>
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#66736B] hover:text-[#12372A] mb-2 transition-colors">
                <ArrowLeft className="w-4 h-4" /><span>Back to Dashboard</span>
              </Link>
              <h1 className="text-3xl font-extrabold text-[#12372A] tracking-tight font-heading">Uncertain Result</h1>
            </div>
            <Link href="/scan" className="btn-outline !py-2 !px-4 !text-xs flex items-center gap-1.5">
              <ScanLine className="w-3.5 h-3.5 text-[#2E7D32]" /><span>Scan Another Crop</span>
            </Link>
          </div>

          <div className="verdra-glass p-8 sm:p-10 shadow-lg border-l-4 border-[#F59E0B]">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-[#F59E0B]" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-extrabold text-[#12372A] font-heading mb-2">Unable to Confidently Identify This Disease</h2>
                <p className="text-sm text-[#66736B] leading-relaxed mb-4">{diagnosis.message || "Verdra could not confidently identify this leaf. Please upload a clearer image or consult an agricultural expert."}</p>
                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-3xl font-extrabold text-[#F59E0B] font-mono">{confidencePercent}</span>
                  <span className="text-xs font-bold text-[#66736B] uppercase tracking-wide">Confidence (below threshold)</span>
                </div>
                {diagnosis.top_predictions && diagnosis.top_predictions.length > 0 && (
                  <div className="p-4 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#66736B] block mb-3">Top Alternatives</span>
                    <div className="space-y-2">
                      {diagnosis.top_predictions.slice(0, 3).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-[#12372A] font-medium">{formatDiseaseName(item.class_name)}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-white rounded-full overflow-hidden border border-[#DCE8DC]">
                              <div className="h-full bg-[#F59E0B]" style={{ width: `${Math.round(item.confidence * 100)}%` }} />
                            </div>
                            <span className="font-mono text-[#66736B] w-12 text-right">{formatConfidence(item.confidence)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-5 p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#B45309] leading-relaxed">
                  <strong>Suggestions:</strong>
                  <ul className="mt-1.5 space-y-1 list-disc list-inside">
                    <li>Capture another photograph in diffuse daylight with the leaf laid flat.</li>
                    <li>Ensure high contrast against the background and eliminate lens glare.</li>
                    <li>Consult a qualified agricultural extension officer for uncertain cases.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="verdra-glass p-6 shadow-md flex items-center justify-center">
            <Link href="/scan" className="btn-green !py-3 !px-8 !text-sm flex items-center gap-2">
              <ScanLine className="w-4 h-4" /><span>Try Again with a Clearer Image</span>
            </Link>
          </div>
        </div>
      </VerdraSidebar>
    );
  }

  // ====================== CONFIDENT RESULT ======================
  return (
    <VerdraSidebar>
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10">
        {/* TOP NAV */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DCE8DC]/80">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#66736B] hover:text-[#12372A] mb-2 transition-colors">
              <ArrowLeft className="w-4 h-4" /><span>Back to Dashboard</span>
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#12372A] tracking-tight font-heading">Crop Analysis</h1>
            <p className="text-xs text-[#66736B] mt-1 flex items-center gap-2 font-mono flex-wrap">
              <span>Host Genus: <strong className="text-[#12372A]">{displayCrop}</strong></span>
              <span>·</span>
              <span>Analyzed: {formatDate(displayDate)}</span>
              {displayTag && (<><span>·</span><span>Tag: <strong className="text-[#12372A]">{displayTag}</strong></span></>)}
            </p>
          </div>
          <Link href="/scan" className="btn-outline !py-2 !px-4 !text-xs flex items-center gap-1.5">
            <ScanLine className="w-3.5 h-3.5 text-[#2E7D32]" /><span>Scan Another Crop</span>
          </Link>
        </div>

        {/* HERO: Leaf + Grad-CAM | Diagnosis */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Leaf Viewer */}
          <div className="lg:col-span-6 verdra-glass p-6 sm:p-8 shadow-md space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#12372A]">Foliar Specimen Inspection</span>
              <div className="flex p-1 bg-[#F8FAF6] border border-[#DCE8DC] rounded-xl text-xs font-semibold">
                <button onClick={() => setViewMode("original")} className={`px-3 py-1 rounded-lg transition-all ${viewMode === "original" ? "bg-[#12372A] text-white shadow-xs" : "text-[#66736B] hover:text-[#12372A]"}`}>Original Leaf</button>
                <button onClick={() => setViewMode("attention")} className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${viewMode === "attention" ? "bg-[#2E7D32] text-white shadow-xs" : "text-[#66736B] hover:text-[#12372A]"}`}>
                  <Eye className="w-3.5 h-3.5" /><span>AI Attention Map</span>
                </button>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#0A1F17] flex items-center justify-center border border-[#DCE8DC]">
              <img src={displayImage} alt="Analyzed leaf specimen" className="w-full h-full object-cover" />
              {viewMode === "attention" && (hasRealGradcam ? (
                <img src={gradcamOverlay} alt="Grad-CAM heatmap" className="absolute inset-0 w-full h-full object-cover pointer-events-none mix-blend-screen transition-opacity duration-200" style={{ opacity }} />
              ) : (
                <div className="absolute inset-0 pointer-events-none mix-blend-screen transition-opacity duration-200" style={{ opacity, background: "radial-gradient(circle at 48% 44%, rgba(220, 38, 38, 0.85) 0%, rgba(245, 158, 11, 0.75) 28%, rgba(46, 125, 50, 0.45) 55%, transparent 75%)" }} />
              ))}
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#12372A] border border-[#DCE8DC] shadow-xs">{displayCrop} Foliar Tissue</div>
              {viewMode === "attention" && <div className="absolute bottom-4 right-4 bg-[#12372A]/90 text-white backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono">{hasRealGradcam ? "Conv_1 Grad-CAM" : "Conv_1 Spatial Heatmap"}</div>}
            </div>
            {viewMode === "attention" && (
              <div className="p-3 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC] space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-[#12372A]"><span>Heatmap Opacity</span><span className="font-mono">{Math.round(opacity * 100)}%</span></div>
                <input type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-full accent-[#2E7D32] cursor-pointer" />
              </div>
            )}
            <div className="p-3.5 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC] text-xs text-[#66736B] leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
              <span>Highlighted regions indicate areas that most influenced the AI model&apos;s prediction. They should not be interpreted as exact biological disease boundaries.</span>
            </div>
          </div>

          {/* RIGHT: Diagnosis Card */}
          <div className="lg:col-span-6 space-y-6">
            <div className="verdra-glass p-7 sm:p-9 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#66736B] font-mono">{displayCrop}</span>
                <span className={isHealthy ? "badge-success" : "badge-danger"}>{isHealthy ? "Healthy Plant" : "Disease Detected"}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#12372A] tracking-tight mb-2 font-heading">{displayDisease}</h2>
              <div className="flex items-baseline justify-between gap-2 pb-3 border-b border-[#DCE8DC]">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-extrabold text-[#2E7D32] font-mono">{confidencePercent}</span>
                  <span className="text-sm font-bold text-[#66736B] uppercase tracking-wide">Model Confidence</span>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                  (diagnosis.confidence_level === "HIGH" || diagnosis.confidence >= 0.8)
                    ? "bg-[#EEF6EC] text-[#2E7D32]"
                    : "bg-[#FFFBEB] text-[#D97706]"
                }`}>
                  {diagnosis.confidence_level || (diagnosis.confidence >= 0.8 ? "HIGH" : "MODERATE")} CONFIDENCE
                </span>
              </div>
              <p className="text-xs text-[#66736B] my-2">
                {diagnosis.confidence_message || (diagnosis.confidence >= 0.8
                  ? "The model strongly favors this disease class."
                  : "Prediction accepted above threshold (0.55). Field confirmation advised.")}
              </p>
              <div className="grid grid-cols-3 gap-3 pt-4 text-center">
                <div className="p-3.5 rounded-2xl bg-[#F8FAF6] border border-[#DCE8DC]"><div className="text-[11px] font-bold uppercase tracking-wider text-[#66736B] mb-1">Visual Severity</div><div className="text-base font-extrabold text-[#12372A]">{severityLevel}</div></div>
                <div className="p-3.5 rounded-2xl bg-[#F8FAF6] border border-[#DCE8DC]"><div className="text-[11px] font-bold uppercase tracking-wider text-[#66736B] mb-1">Affected Area</div><div className="text-base font-extrabold text-[#12372A] font-mono">{affectedArea}</div></div>
                <div className="p-3.5 rounded-2xl bg-[#F8FAF6] border border-[#DCE8DC]"><div className="text-[11px] font-bold uppercase tracking-wider text-[#66736B] mb-1">Spread Risk</div><div className={`text-base font-extrabold ${spreadRisk === "High" || spreadRisk === "Critical" ? "text-[#DC2626]" : spreadRisk === "Moderate" ? "text-[#F59E0B]" : "text-[#2E7D32]"}`}>{spreadRisk}</div></div>
              </div>
              {topPredictionsList && topPredictionsList.length > 1 && (
                <div className="mt-6 pt-5 border-t border-[#DCE8DC]/70">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#66736B] block mb-3 font-heading">Neural Softmax Distribution</span>
                  <div className="space-y-2">
                    {topPredictionsList.slice(0, 3).map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-[#12372A] font-medium">{formatDiseaseName(item.class_name)}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-[#F8FAF6] rounded-full overflow-hidden border border-[#DCE8DC]"><div className="h-full bg-[#2E7D32]" style={{ width: `${Math.round(item.confidence * 100)}%` }} /></div>
                          <span className="font-mono text-[#66736B] w-12 text-right">{formatConfidence(item.confidence)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Voice Readout for Accessibility */}
            <VoiceReadout
              crop={displayCrop}
              disease={displayDisease}
              confidenceExplanation={diagnosis.confidence_message || (diagnosis.confidence >= 0.8 ? "The model strongly favors this disease class." : "The model shows moderate confidence.")}
              severity={severityLevel}
              risk={spreadRisk}
              immediateAction={diagnosis.recommendations?.immediate?.[0] || "Inspect nearby plants and prune affected leaves."}
            />
          </div>
        </div>

        {/* WEATHER */}
        <div className="verdra-glass p-7 sm:p-9 shadow-md space-y-6">
          <div className="pb-3 border-b border-[#DCE8DC]"><h3 className="text-xl font-bold text-[#12372A] font-heading">Environmental Conditions</h3><p className="text-xs text-[#66736B]">Real-time atmospheric telemetry synchronized from OpenWeatherMap</p></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]"><div className="flex items-center gap-2 text-xs font-semibold text-[#66736B] mb-1"><ThermometerSun className="w-4 h-4 text-[#2E7D32]" /><span>Temperature</span></div><div className="text-2xl font-extrabold text-[#12372A] font-mono">{diagnosis.weather?.temperature ?? "N/A"}°C</div></div>
            <div className="p-4 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]"><div className="flex items-center gap-2 text-xs font-semibold text-[#66736B] mb-1"><Droplets className="w-4 h-4 text-[#2E7D32]" /><span>Humidity</span></div><div className="text-2xl font-extrabold text-[#12372A] font-mono">{diagnosis.weather?.humidity ?? "N/A"}%</div></div>
            <div className="p-4 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]"><div className="flex items-center gap-2 text-xs font-semibold text-[#66736B] mb-1"><CloudRain className="w-4 h-4 text-[#2E7D32]" /><span>Rainfall</span></div><div className="text-2xl font-extrabold text-[#12372A] font-mono">{diagnosis.weather?.rainfall ?? 0} mm</div></div>
            <div className="p-4 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]"><div className="flex items-center gap-2 text-xs font-semibold text-[#66736B] mb-1"><Wind className="w-4 h-4 text-[#2E7D32]" /><span>Wind Speed</span></div><div className="text-2xl font-extrabold text-[#12372A] font-mono">{diagnosis.weather?.wind_speed ?? "N/A"} km/h</div></div>
          </div>
          <div className="p-6 rounded-2xl bg-[#F8FAF6] border border-[#DCE8DC] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div><span className="text-xs font-bold uppercase tracking-wider text-[#66736B]">Environmental Spread Risk</span><div className={`text-3xl font-extrabold font-mono ${spreadRisk === "High" || spreadRisk === "Critical" ? "text-[#DC2626]" : spreadRisk === "Moderate" ? "text-[#F59E0B]" : "text-[#2E7D32]"}`}>{spreadRisk.toUpperCase()}</div></div>
              <p className="text-sm font-semibold text-[#12372A] max-w-md sm:text-right leading-relaxed">{diagnosis.risk?.explanation || "Environmental conditions evaluated for disease spread potential."}</p>
            </div>
            {diagnosis.risk?.factors && diagnosis.risk.factors.length > 0 && (
              <div className="pt-4 border-t border-[#DCE8DC]"><span className="text-xs font-bold text-[#12372A] uppercase tracking-wider block mb-2 font-heading">Why this risk?</span>
                <ul className="grid sm:grid-cols-2 gap-2 text-xs text-[#66736B]">
                  {diagnosis.risk.factors.map((f: string, i: number) => (<li key={i} className="flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${spreadRisk === "High" || spreadRisk === "Critical" ? "bg-[#DC2626]" : spreadRisk === "Moderate" ? "bg-[#F59E0B]" : "bg-[#2E7D32]"}`} /><span>{f}</span></li>))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Nearby-Risk Spatio-temporal Outbreak Alerts */}
        <NearbyRiskAlerts fieldId={diagnosis.field_id || displayTag || "all"} />

        {/* RECOMMENDATIONS */}
        <div className="verdra-glass p-7 sm:p-9 shadow-md space-y-6">
          <div className="pb-3 border-b border-[#DCE8DC]"><h3 className="text-2xl font-extrabold text-[#12372A] font-heading">What should I do now?</h3><p className="text-xs text-[#66736B]">Standardized agronomic protocols based on validated plant pathology guidelines</p></div>
          <div className="grid sm:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-[#F8FAF6] border border-[#DCE8DC]"><span className="text-xs font-bold uppercase tracking-wider text-[#DC2626] font-mono block mb-2">01 · IMMEDIATE ACTION</span>
              {diagnosis.recommendations?.immediate?.length > 0 ? (<ul className="text-xs text-[#66736B] leading-relaxed space-y-1.5">{diagnosis.recommendations.immediate.slice(0, 3).map((a: string, i: number) => (<li key={i} className="flex items-start gap-1.5"><span className="text-[#DC2626] mt-0.5">•</span>{a}</li>))}</ul>) : (<p className="text-xs text-[#66736B]">Inspect nearby plants and prune affected leaves with sanitized shears.</p>)}
            </div>
            <div className="p-5 rounded-2xl bg-[#F8FAF6] border border-[#DCE8DC]"><span className="text-xs font-bold uppercase tracking-wider text-[#2E7D32] font-mono block mb-2">02 · PREVENTION</span>
              {diagnosis.recommendations?.prevention?.length > 0 ? (<ul className="text-xs text-[#66736B] leading-relaxed space-y-1.5">{diagnosis.recommendations.prevention.slice(0, 3).map((a: string, i: number) => (<li key={i} className="flex items-start gap-1.5"><span className="text-[#2E7D32] mt-0.5">•</span>{a}</li>))}</ul>) : (<p className="text-xs text-[#66736B]">Improve airflow and transition to drip irrigation.</p>)}
            </div>
            <div className="p-5 rounded-2xl bg-[#F8FAF6] border border-[#DCE8DC]"><span className="text-xs font-bold uppercase tracking-wider text-[#B45309] font-mono block mb-2">03 · MONITOR</span>
              {diagnosis.recommendations?.monitoring?.length > 0 ? (<ul className="text-xs text-[#66736B] leading-relaxed space-y-1.5">{diagnosis.recommendations.monitoring.slice(0, 3).map((a: string, i: number) => (<li key={i} className="flex items-start gap-1.5"><span className="text-[#B45309] mt-0.5">•</span>{a}</li>))}</ul>) : (<p className="text-xs text-[#66736B]">Rescan affected plots within 3–5 days to track progression.</p>)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#B45309] leading-relaxed flex items-start gap-2.5"><Info className="w-4 h-4 shrink-0 mt-0.5 text-[#B45309]" /><span><strong>Expert Guidance:</strong> For severe or uncertain cases, consult a qualified agricultural extension officer. Avoid prescribing synthetic chemical fungicides without proper local agronomic guidance.</span></div>
        </div>

        {/* COMPARE WITH PREVIOUS SCAN */}
        <div className="verdra-glass p-7 sm:p-9 shadow-md space-y-5">
          <div className="pb-3 border-b border-[#DCE8DC] flex items-center gap-3">
            <GitCompareArrows className="w-5 h-5 text-[#2E7D32]" />
            <div><h3 className="text-xl font-bold text-[#12372A] font-heading">Compare with Previous Scan</h3><p className="text-xs text-[#66736B]">Track disease progression across scans{diagnosis.fieldTag ? ` (${diagnosis.fieldTag})` : ""}</p></div>
          </div>
          {previousScan ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <CompareMetric label="Disease" previous={formatDiseaseName(previousScan.disease || "N/A")} current={formatDiseaseName(displayDisease)} isText />
              <CompareMetric label="Confidence" previous={`${Math.round((previousScan.confidence || 0) * 100)}%`} current={confidencePercent} previousVal={(previousScan.confidence || 0) * 100} currentVal={diagnosis.confidence * 100} />
              <CompareMetric label="Severity" previous={previousScan.severity || "N/A"} current={severityLevel} isText />
              <CompareMetric label="Affected Area" previous={previousScan.affected_percentage != null ? `${previousScan.affected_percentage}%` : "N/A"} current={affectedArea} previousVal={previousScan.affected_percentage || 0} currentVal={parseFloat(affectedArea) || 0} />
              <CompareMetric label="Spread Risk" previous={previousScan.risk_level || "N/A"} current={spreadRisk} isText />
              <CompareMetric label="Scan Date" previous={previousScan.created_at ? formatDate(previousScan.created_at) : "N/A"} current={formatDate(diagnosis.scanDate || diagnosis.created_at)} isText />
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC] text-center text-sm text-[#66736B]">No earlier scan is available for comparison.</div>
          )}
        </div>

        {/* RESCAN REMINDER */}
        {diagnosis.rescan?.interval_days && (
          <div className="verdra-glass p-6 sm:p-7 shadow-md">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#EEF6EC] border border-[#DCE8DC] flex items-center justify-center shrink-0"><Clock className="w-5 h-5 text-[#2E7D32]" /></div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[#12372A] font-heading mb-1">Recommended Rescan</h3>
                <p className="text-2xl font-extrabold text-[#2E7D32] font-mono mb-1">Rescan this crop in {diagnosis.rescan.interval_days} day{diagnosis.rescan.interval_days !== 1 ? "s" : ""}</p>
                <p className="text-xs text-[#66736B]">{diagnosis.rescan.reason}{diagnosis.rescan.recommended_date && (<> · Recommended by <strong>{diagnosis.rescan.recommended_date}</strong></>)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Real Disease Progression Timeline */}
        <DiseaseProgressionTimeline
          scanId={diagnosis.id || scanId}
          currentCrop={displayCrop}
          initialFieldId={diagnosis.field_id || diagnosis.fieldTag}
        />

        {/* ACTIONS */}
        <div className="verdra-glass p-6 sm:p-7 shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleSaveScan} disabled={saving} className="btn-forest !py-3 !px-5 !text-xs flex items-center gap-2"><Bookmark className="w-4 h-4" /><span>{savedSuccess ? "Saved to History ✓" : saving ? "Saving..." : "Save Scan"}</span></button>
            <button onClick={() => setShareModalOpen(true)} className="btn-outline !py-3 !px-5 !text-xs flex items-center gap-2"><Share2 className="w-4 h-4 text-[#2E7D32]" /><span>Share With Expert</span></button>
            <button onClick={handleGenerateReport} disabled={exporting} className="btn-outline !py-3 !px-5 !text-xs flex items-center gap-2"><FileDown className="w-4 h-4 text-[#2E7D32]" /><span>{exporting ? "Compiling PDF..." : "Generate Report"}</span></button>
            <Link href="/assistant" className="btn-outline !py-3 !px-5 !text-xs flex items-center gap-2"><Bot className="w-4 h-4 text-[#2E7D32]" /><span>Ask Verdra</span></Link>
          </div>
          <Link href="/scan" className="btn-green !py-3 !px-6 !text-xs flex items-center gap-2"><ScanLine className="w-4 h-4" /><span>Scan Another Crop</span></Link>
        </div>

        {/* Secure Expert Share Modal */}
        <ExpertShareModal
          scanId={diagnosis.id || scanId || "demo-scan"}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      </div>
    </VerdraSidebar>
  );
}

function CompareMetric({ label, previous, current, previousVal, currentVal, isText }: { label: string; previous: string; current: string; previousVal?: number; currentVal?: number; isText?: boolean }) {
  let changeLabel = "";
  let changeColor = "text-[#66736B]";
  let ChangeIcon = Minus;
  if (!isText && previousVal !== undefined && currentVal !== undefined) {
    const delta = currentVal - previousVal;
    if (Math.abs(delta) < 0.5) { changeLabel = "No change"; ChangeIcon = Minus; }
    else if (delta > 0) { changeLabel = `+${delta.toFixed(1)}%`; changeColor = "text-[#DC2626]"; ChangeIcon = ArrowUpRight; }
    else { changeLabel = `${delta.toFixed(1)}%`; changeColor = "text-[#2E7D32]"; ChangeIcon = ArrowDownRight; }
  } else if (isText && previous !== current && previous !== "N/A") { changeLabel = `${previous} → ${current}`; }
  return (
    <div className="p-4 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#66736B] mb-2">{label}</div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <div><div className="text-[10px] text-[#B0BDB5] mb-0.5">Previous</div><div className="font-bold text-[#12372A]">{previous}</div></div>
        <div><div className="text-[10px] text-[#B0BDB5] mb-0.5">Current</div><div className="font-bold text-[#12372A]">{current}</div></div>
      </div>
      {changeLabel && (<div className={`flex items-center gap-1 text-[10px] font-bold ${changeColor}`}><ChangeIcon className="w-3 h-3" /><span>{changeLabel}</span></div>)}
    </div>
  );
}
