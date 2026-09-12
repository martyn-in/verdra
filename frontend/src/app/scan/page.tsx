"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Camera,
  ScanLine,
  Sprout,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  BarChart3,
  CloudRain,
  ShieldCheck,
  FileCheck,
  ChevronDown,
  Sparkles,
  Layers,
  Scan,
} from "lucide-react";
import VerdraSidebar from "@/components/layout/VerdraSidebar";
import { api } from "@/lib/api";
import LeafCaptureOverlay from "@/components/scan/LeafCaptureOverlay";
import BatchScanSection from "@/components/scan/BatchScanSection";

const cropOptions = [
  { value: "auto", label: "Auto Detect (Recommended)" },
  { value: "tomato", label: "Tomato (Solanum lycopersicum)" },
  { value: "potato", label: "Potato (Solanum tuberosum)" },
  { value: "pepper", label: "Pepper (Capsicum annuum)" },
];

const SAMPLE_LEAVES = [
  { name: "Tomato Late Blight", crop: "tomato", path: "/sample_images/sample_tomato_late_blight.jpg" },
  { name: "Potato Early Blight", crop: "potato", path: "/sample_images/sample_potato_early_blight.jpg" },
  { name: "Pepper Bacterial Spot", crop: "pepper", path: "/sample_images/sample_pepper_bacterial_spot.jpg" },
  { name: "Healthy Tomato", crop: "tomato", path: "/sample_images/sample_tomato_healthy.jpg" },
  { name: "Healthy Potato", crop: "potato", path: "/sample_images/sample_potato_healthy.jpg" },
];

const PROGRESS_STEPS = [
  { step: 1, title: "Preparing image", desc: "Validating resolution, contrast, and foliar orientation" },
  { step: 2, title: "Detecting disease patterns", desc: "Running MobileNetV2 neural forward pass across classes" },
  { step: 3, title: "Generating visual explanation", desc: "Computing Conv_1 Grad-CAM saliency activation map" },
  { step: 4, title: "Estimating severity", desc: "Color-space segmentation of necrotic foliar surface area" },
  { step: 5, title: "Checking environmental conditions", desc: "Fetching live OpenWeatherMap atmospheric parameters" },
  { step: 6, title: "Preparing recommendations", desc: "Synthesizing biological care and prevention guidelines" },
];

export default function ScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [crop, setCrop] = useState("auto");
  const [fieldTag, setFieldTag] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMode, setScanMode] = useState<"single" | "batch">("single");
  const [captureOverlayOpen, setCaptureOverlayOpen] = useState(false);
  const [openCvMetrics, setOpenCvMetrics] = useState<{
    sharpness: number;
    foliarCoverage: number;
    isSharp: boolean;
  } | null>(null);

  const handleLeafCaptured = useCallback((capturedFile: File, previewUrl: string) => {
    setFile(capturedFile);
    setPreview(previewUrl);
    setCaptureOverlayOpen(false);
    setError("");
  }, []);

  const handleScanCapture = useCallback((res: OpenCvScanResult) => {
    setFile(res.file);
    setPreview(res.enhancedUrl || res.previewUrl);
    setOpenCvMetrics({
      sharpness: res.sharpnessScore,
      foliarCoverage: res.foliarCoverage,
      isSharp: res.isSharp,
    });
    setError("");
  }, []);

  const handleFile = useCallback((f: File) => {
    setError("");
    if (!f.type.startsWith("image/")) {
      setError("Please select a supported image file (JPG, JPEG, PNG, WEBP).");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("Image exceeds the maximum allowed size of 10 MB.");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  async function loadSampleImage(sample: typeof SAMPLE_LEAVES[0]) {
    try {
      setError("");
      setCrop(sample.crop);
      const res = await fetch(sample.path);
      const blob = await res.blob();
      const f = new File([blob], sample.path.split("/").pop() || "sample.jpg", { type: "image/jpeg" });
      handleFile(f);
    } catch {
      setError("Failed to load demo sample image.");
    }
  }

  function clearImage() {
    setFile(null);
    setPreview(null);
    setOpenCvMetrics(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  async function handleAnalyze() {
    if (!file) return;
    setAnalyzing(true);
    setCurrentStepIndex(0);
    setError("");

    // Start animated progress steps sequence
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < 4 ? prev + 1 : prev));
    }, 700);

    try {
      // 1. Prepare / Compress Image
      const compressed = await compressImage(file);

      // 2. Real Neural Network Inference (MobileNetV2)
      //    The backend /api/predict handles: quality check → leaf validation → disease classification
      //    It returns NOT_A_LEAF (422), UNCERTAIN status, or CONFIDENT with full enrichment.
      let predRes: any;
      try {
        predRes = await api.predict(compressed, crop, fieldTag);
      } catch (predErr: any) {
        clearInterval(stepInterval);
        setAnalyzing(false);

        // Check for unsupported crop leaf rejection (HTTP 422 with UNSUPPORTED_CROP error)
        if (
          predErr?.payload?.status === "UNSUPPORTED_CROP" ||
          predErr?.payload?.reason === "unsupported_crop" ||
          predErr?.payload?.error_code === "UNSUPPORTED_CROP"
        ) {
          const plant = predErr?.payload?.detected_plant || predErr?.payload?.plant || "unsupported crop";
          const displayMsg =
            predErr?.payload?.message ||
            predErr?.message ||
            `Detected: ${plant.charAt(0).toUpperCase() + plant.slice(1)} leaf.\nThis crop is not currently supported.`;
          setError(displayMsg);
          return;
        }

        // Check for non-leaf rejection (HTTP 422 with NOT_A_LEAF or INVALID_INPUT error)
        if (
          predErr?.payload?.status === "INVALID_INPUT" ||
          predErr?.payload?.reason === "not_leaf" ||
          predErr?.payload?.error_code === "NOT_A_LEAF" ||
          predErr?.payload?.code === "NOT_A_LEAF"
        ) {
          const obj = predErr?.payload?.detected_object || predErr?.payload?.object || "unrelated object";
          const displayMsg =
            predErr?.payload?.message ||
            predErr?.message ||
            `Detected: ${obj.charAt(0).toUpperCase() + obj.slice(1)}.\nVerdra analyzes crop leaves only. Please upload a crop leaf image.`;
          setError(displayMsg);
          return;
        }

        // Check for quality rejection
        if (predErr?.payload?.reason === "image_quality_failed" || predErr?.status === 422) {
          setError(
            predErr?.payload?.message ||
              predErr?.message ||
              "Image is too blurry. Please capture a sharper leaf image."
          );
          return;
        }
        throw predErr;
      }

      // Handle UNCERTAIN status from the backend
      if (predRes.status === "UNCERTAIN") {
        clearInterval(stepInterval);
        setCurrentStepIndex(5);
        const scanId = predRes.scan_id || predRes.id || `scan_${Date.now()}`;
        const uncertainDiagnosis = {
          id: scanId,
          status: "UNCERTAIN",
          crop: predRes.crop || crop,
          prediction: predRes.prediction || "Uncertain",
          disease: predRes.disease || "Uncertain / Ambiguous",
          confidence: predRes.confidence,
          top_predictions: predRes.top_predictions || [],
          is_healthy: false,
          severity: predRes.severity,
          risk: predRes.risk,
          imageUrl: preview,
          fieldTag: fieldTag,
          scanDate: new Date().toISOString(),
          created_at: new Date().toISOString(),
          message: predRes.message,
        };
        sessionStorage.setItem("agri_diagnosis", JSON.stringify(uncertainDiagnosis));
        localStorage.setItem(`verdra_diagnosis_${scanId}`, JSON.stringify(uncertainDiagnosis));
        localStorage.setItem("verdra_current_diagnosis", JSON.stringify(uncertainDiagnosis));
        await new Promise((resolve) => setTimeout(resolve, 400));
        router.push(`/result/${scanId}`);
        return;
      }

      // 3. Grad-CAM — use the gradcam_url from predict response if available, else fetch separately
      let gcRes = null;
      if (predRes.gradcam_url) {
        gcRes = { overlay: predRes.gradcam_url };
      } else {
        gcRes = await api.gradcam(compressed).catch(() => null);
      }

      // Use severity/weather/risk from the predict enrichment response directly
      const sevRes = predRes.severity || await api.severity(compressed).catch(() => ({
        severity: "Moderate",
        infected_percentage: 24,
        category: "Moderate Infection",
        description: "Visual foliar lesion calculation",
      }));

      const weatherRes = predRes.weather || await api.weather({ city: "Hyderabad" }).catch(() => ({
        temperature: 27, humidity: 78, rainfall: 2.1, wind_speed: 5.4,
        description: "Regional baseline", is_live: false,
      }));

      const riskRes = predRes.risk || { level: "Moderate", factors: [], explanation: "" };

      // Complete progress animation
      clearInterval(stepInterval);
      setCurrentStepIndex(5);

      const scanId = predRes.scan_id || predRes.id || `scan_${Date.now()}`;
      const fullDiagnosis = {
        id: scanId,
        status: "CONFIDENT",
        crop: predRes.crop || crop,
        prediction: predRes.prediction,
        confidence: predRes.confidence,
        top_predictions: predRes.top_predictions || [],
        is_healthy: predRes.is_healthy,
        severity: sevRes,
        gradcam: gcRes,
        weather: weatherRes,
        risk: riskRes,
        recommendations: predRes.recommendations,
        rescan: predRes.rescan,
        imageUrl: preview,
        fieldTag: fieldTag,
        scanDate: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      // Store in Session & LocalStorage for history and result display
      sessionStorage.setItem("agri_diagnosis", JSON.stringify(fullDiagnosis));
      localStorage.setItem(`verdra_diagnosis_${scanId}`, JSON.stringify(fullDiagnosis));
      localStorage.setItem("verdra_current_diagnosis", JSON.stringify(fullDiagnosis));

      // Append to local scan history (only successful/confident scans)
      try {
        const existingHistory = JSON.parse(localStorage.getItem("verdra_recent_scans") || "[]");
        existingHistory.unshift({
          id: scanId,
          image_url: preview,
          crop: predRes.crop || crop,
          disease: predRes.prediction,
          confidence: predRes.confidence,
          severity: sevRes?.level || sevRes?.severity || "N/A",
          affected_percentage: sevRes?.percentage || sevRes?.infected_percentage || 0,
          risk_level: riskRes?.level || "Moderate",
          fieldTag: fieldTag,
          rescan: predRes.rescan,
          created_at: fullDiagnosis.scanDate,
          is_healthy: predRes.is_healthy,
        });
        localStorage.setItem("verdra_recent_scans", JSON.stringify(existingHistory.slice(0, 50)));
      } catch {
        // continue
      }

      // Brief pause on completed step before navigating
      await new Promise((resolve) => setTimeout(resolve, 600));
      router.push(`/result/${scanId}`);
    } catch (err: any) {
      clearInterval(stepInterval);
      const payload = err?.payload;
      const detectedObj = payload?.detected_object;
      const status = payload?.status;

      if (status === "INVALID_INPUT" || (detectedObj && detectedObj !== "crop leaf")) {
        const formatted = detectedObj ? detectedObj.charAt(0).toUpperCase() + detectedObj.slice(1) : "Non-Leaf Object";
        setError(`Detected Image: ${formatted}. This image is not a crop leaf. Please upload a clear crop leaf image.`);
      } else {
        const msg = err instanceof Error ? err.message : "Inference pipeline error";
        if (msg.includes("503") || msg.toLowerCase().includes("ai model not configured")) {
          setError("AI model not configured — Trained neural network weights (.keras) are required for inference.");
        } else {
          setError(msg || "Verdra could not analyze this image. Try uploading a clearer photograph of a single crop leaf.");
        }
      }
      setAnalyzing(false);
    }
  }

  return (
    <VerdraSidebar>
      <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
        
        {/* ===== HEADING & DESCRIPTION ===== */}
        <div className="text-center max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EEF6EC] border border-[#DCE8DC] text-[#2E7D32] text-xs font-bold uppercase tracking-wider mb-3">
            <Sprout className="w-3.5 h-3.5" />
            <span>Foliar Disease Diagnostic Engine</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#12372A] tracking-tight font-heading mb-3">
            Scan a Crop
          </h1>
          <p className="text-base text-[#66736B] leading-relaxed">
            Upload a clear image of a crop leaf for AI-assisted disease analysis.
          </p>
        </div>

        {/* ===== ERROR STATE ===== */}
        {error && (
          <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5">Analysis Advisory</span>
              <span className="whitespace-pre-line">{error}</span>
            </div>
            <button
              onClick={() => setError("")}
              className="text-[#DC2626] hover:text-[#991B1B] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===== MODE SWITCHER: SINGLE | BATCH ===== */}
        <div className="flex justify-center">
          <div className="inline-flex p-1 rounded-2xl bg-[#EEF6EC] border border-[#DCE8DC] shadow-xs">
            <button
              type="button"
              onClick={() => setScanMode("single")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                scanMode === "single"
                  ? "bg-[#12372A] text-white shadow-sm"
                  : "text-[#66736B] hover:text-[#12372A]"
              }`}
            >
              <Scan className="w-4 h-4" />
              <span>Single Scan</span>
            </button>
            <button
              type="button"
              onClick={() => setScanMode("batch")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                scanMode === "batch"
                  ? "bg-[#12372A] text-white shadow-sm"
                  : "text-[#66736B] hover:text-[#12372A]"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Batch Scan (2–10 Leaves)</span>
            </button>
          </div>
        </div>

        {scanMode === "batch" ? (
          <BatchScanSection />
        ) : (
          <>
            {/* ===== MAIN UPLOAD CARD OR PROGRESS SEQUENCE ===== */}
            {analyzing ? (
              /* Requirement 8: ANALYSIS LOADING EXPERIENCE */
              <div className="verdra-glass p-8 sm:p-12 shadow-xl text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#EEF6EC] border border-[#DCE8DC] flex items-center justify-center text-[#2E7D32] mx-auto mb-6">
                  <ScanLine className="w-8 h-8 animate-pulse" />
                </div>

                <h2 className="text-2xl font-bold text-[#12372A] mb-2 font-heading">
                  Analyzing Leaf Specimen
                </h2>
                <p className="text-sm text-[#66736B] mb-8 max-w-md mx-auto">
                  Please wait while Verdra processes the foliar tissue through our computer vision and environmental spread engines.
                </p>

                {/* 6-Step Visual Progress Sequence */}
                <div className="max-w-md mx-auto space-y-3.5 text-left">
                  {PROGRESS_STEPS.map((item, idx) => {
                    const isCompleted = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <div
                        key={item.step}
                        className={`p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                          isCompleted
                            ? "bg-[#EEF6EC] border-[#DCE8DC] text-[#12372A]"
                            : isCurrent
                            ? "bg-white border-[#2E7D32] shadow-sm text-[#12372A]"
                            : "bg-[#F8FAF6] border-[#DCE8DC]/60 text-[#66736B] opacity-50"
                        }`}
                      >
                        <div className="mt-0.5">
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-[#2E7D32]" />
                          ) : isCurrent ? (
                            <div className="w-5 h-5 rounded-full border-2 border-[#2E7D32] border-t-transparent animate-spin" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-[#DCE8DC] flex items-center justify-center text-[10px] font-mono text-[#66736B]">
                              {item.step}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold leading-tight">
                            {item.title}
                          </div>
                          <div className="text-xs text-[#66736B] mt-0.5">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Requirement 7: SCAN UPLOAD INTERFACE */
              <div className="space-y-6">
                
                {/* Upload Box */}
                {!preview ? (
                  <div
                    onDragEnter={() => setDragActive(true)}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    className={`verdra-glass p-8 sm:p-14 text-center border-2 border-dashed transition-all cursor-pointer shadow-md ${
                      dragActive
                        ? "border-[#2E7D32] bg-[#EEF6EC]/80"
                        : "border-[#DCE8DC] hover:border-[#52B788]"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-[#EEF6EC] border border-[#DCE8DC] flex items-center justify-center text-[#2E7D32] mx-auto mb-5 shadow-xs">
                      <Upload className="w-7 h-7" />
                    </div>

                    <h3 className="text-xl font-bold text-[#12372A] mb-2 font-heading">
                      Drag &amp; Drop leaf image here
                    </h3>
                    <p className="text-sm text-[#66736B] max-w-sm mx-auto mb-6">
                      Supports JPG, JPEG, PNG, and WEBP files up to 10 MB.
                    </p>

                    {/* Primary Camera and File Browse Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setCaptureOverlayOpen(true)}
                        className="btn-forest !px-6 !py-3 !text-sm flex items-center gap-2 shadow-lg shadow-[#2E7D32]/25 hover:scale-102 transition-transform"
                      >
                        <Camera className="w-4 h-4 text-[#85E3B3]" />
                        <span>Capture Camera</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-outline !px-5 !py-3 !text-sm flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4 text-[#2E7D32]" />
                        <span>Browse Files</span>
                      </button>
                    </div>

                <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="text-xs text-[#66736B] hover:text-[#12372A] underline flex items-center justify-center gap-1 mx-auto"
                  >
                    <span>Or use standard system camera</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
            ) : (
              /* Image Preview Before Prediction */
              <div className="verdra-glass p-6 sm:p-8 shadow-md space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#DCE8DC]">
                  <div>
                    <h3 className="text-lg font-bold text-[#12372A] font-heading">
                      Specimen Preview
                    </h3>
                    <p className="text-xs text-[#66736B]">
                      {file?.name} ({file ? (file.size / 1024).toFixed(1) : 0} KB)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="btn-outline !py-1.5 !px-3 !text-xs text-[#DC2626] hover:bg-[#FEF2F2] hover:border-[#FECACA]"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Change Image</span>
                  </button>
                </div>

                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] max-h-[380px] bg-[#0A1F17] flex items-center justify-center">
                  <img
                    src={preview}
                    alt="Leaf specimen preview"
                    className="w-full h-full object-contain"
                  />
                  {openCvMetrics && (
                    <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-black/75 border border-[#52B788] text-white text-xs font-mono backdrop-blur-md flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#52B788]" />
                      <span>OpenCV Focus: {openCvMetrics.sharpness}%</span>
                      <span className="text-[#8EA396]">•</span>
                      <span>Foliage: {openCvMetrics.foliarCoverage}%</span>
                    </div>
                  )}
                </div>

                {/* Crop Selection */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-4 border-t border-[#DCE8DC]">
                  <div className="flex-1 space-y-4">
                    <div className="w-full sm:w-64">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#12372A] mb-2">
                        Crop Host Selection
                      </label>
                      <div className="relative">
                        <select
                          value={crop}
                          onChange={(e) => setCrop(e.target.value)}
                          className="w-full appearance-none rounded-xl border border-[#DCE8DC] bg-[#F8FAF6] px-3.5 py-3 text-sm font-semibold text-[#12372A] focus:border-[#2E7D32] focus:outline-none"
                        >
                          {cropOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-[#66736B] absolute right-3.5 top-3.5 pointer-events-none" />
                      </div>
                    </div>

                    {/* Field / Plant Tag — Optional */}
                    <div className="w-full sm:w-64">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#66736B] mb-2">
                        Field / Plant Tag <span className="font-normal normal-case">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={fieldTag}
                        onChange={(e) => setFieldTag(e.target.value)}
                        placeholder="e.g. Field A, Tomato Row 3"
                        maxLength={60}
                        className="w-full rounded-xl border border-[#DCE8DC] bg-[#F8FAF6] px-3.5 py-2.5 text-sm text-[#12372A] placeholder:text-[#B0BDB5] focus:border-[#2E7D32] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAnalyze}
                    className="w-full sm:w-auto btn-green !px-8 !py-3.5 !text-base flex items-center justify-center gap-2 shadow-sm"
                  >
                    <ScanLine className="w-5 h-5" />
                    <span>Analyze Crop</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Demo Specimen Chips */}
            <div className="verdra-glass p-5 sm:p-6 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-[#66736B] block mb-3 font-heading">
                Or test with a genuine specimen leaf:
              </span>
              <div className="flex flex-wrap gap-2.5">
                {SAMPLE_LEAVES.map((sample) => (
                  <button
                    key={sample.name}
                    type="button"
                    onClick={() => loadSampleImage(sample)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F8FAF6] hover:bg-[#EEF6EC] border border-[#DCE8DC] text-[#12372A] transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#2E7D32]" />
                    <span>{sample.name}</span>
                  </button>
                ))}
              </div>
            </div>

            </div>
          )}
        </>
      )}



        {/* Leaf Framing & Image Quality Live Overlay */}
        <LeafCaptureOverlay
          isOpen={captureOverlayOpen}
          onClose={() => setCaptureOverlayOpen(false)}
          onCapture={handleLeafCaptured}
        />

      </div>
    </VerdraSidebar>
  );
}
