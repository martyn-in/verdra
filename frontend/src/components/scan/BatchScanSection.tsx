"use client";

import React, { useState, useRef } from "react";
import {
  Layers,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Info,
  FileSpreadsheet,
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { api } from "@/lib/api";

interface BatchScanSectionProps {
  onBatchCompleted?: (batchData: any) => void;
  onSelectResult?: (result: any) => void;
}

export default function BatchScanSection({
  onBatchCompleted,
  onSelectResult,
}: BatchScanSectionProps) {
  const { t } = useTranslation();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [crop, setCrop] = useState("auto");
  const [farmName, setFarmName] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [batchName, setBatchName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  // Batch Result State
  const [batchResult, setBatchResult] = useState<any | null>(null);
  const [selectedLeafResult, setSelectedLeafResult] = useState<any | null>(null);

  const handleFilesSelected = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    setError("");

    const newFiles = Array.from(selectedFiles).filter((f) => f.type.startsWith("image/"));
    const combined = [...files, ...newFiles].slice(0, 10); // max 10 files

    if (combined.length < files.length + newFiles.length) {
      setError("Maximum 10 images allowed per batch scan.");
    }

    setFiles(combined);

    // Generate previews
    const newPreviews = combined.map((f) => URL.createObjectURL(f));
    setPreviews(newPreviews);
  };

  const handleRemoveFile = (index: number) => {
    const nextFiles = files.filter((_, i) => i !== index);
    const nextPreviews = previews.filter((_, i) => i !== index);
    setFiles(nextFiles);
    setPreviews(nextPreviews);
  };

  const handleClearBatch = () => {
    setFiles([]);
    setPreviews([]);
    setBatchResult(null);
    setSelectedLeafResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRunBatchAnalysis = async () => {
    if (files.length < 2) {
      setError("Batch scan requires at least 2 leaf specimens (maximum 10).");
      return;
    }
    if (files.length > 10) {
      setError("Maximum 10 leaf specimens allowed per batch.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setBatchResult(null);
    setSelectedLeafResult(null);

    try {
      const res = await api.batchPredict(files, {
        crop,
        farm_id: farmName ? farmName.trim() : undefined,
        field_id: fieldName ? fieldName.trim() : undefined,
        batch_name: batchName ? batchName.trim() : undefined,
      });

      setBatchResult(res);
      if (onBatchCompleted) {
        onBatchCompleted(res);
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete batch analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div className="p-5 rounded-3xl bg-[#12231A]/60 border border-[#2E7D32]/20 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-xl bg-[#2E7D32]/20 border border-[#2E7D32]/40 flex items-center justify-center text-[#52B788]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-heading">
              {t("scan.mode_batch", "Batch Scan Mode")}
            </h3>
            <p className="text-xs text-[#8EA396]">
              {t("scan.upload_minimum_batch", "Select between 2 and 10 images for batch analysis")}
            </p>
          </div>
        </div>

        {/* Input Selectors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[#8EA396] font-medium mb-1">
              {t("scan.crop_label", "Target Crop")}
            </label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full bg-[#0d1612] border border-[#2E7D32]/30 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#52B788]"
            >
              <option value="auto">{t("scan.auto_detect", "Auto Detect (Recommended)")}</option>
              <option value="tomato">Tomato</option>
              <option value="potato">Potato</option>
              <option value="pepper">Pepper (Bell)</option>
            </select>
          </div>

          <div>
            <label className="block text-[#8EA396] font-medium mb-1">
              {t("scan.farm_label", "Farm")} (Optional)
            </label>
            <input
              type="text"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="e.g., Green Valley Farm"
              className="w-full bg-[#0d1612] border border-[#2E7D32]/30 rounded-xl px-3 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#52B788]"
            />
          </div>

          <div>
            <label className="block text-[#8EA396] font-medium mb-1">
              {t("scan.field_label", "Field / Plot")} (Optional)
            </label>
            <input
              type="text"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="e.g., Block 4 / North Plot"
              className="w-full bg-[#0d1612] border border-[#2E7D32]/30 rounded-xl px-3 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#52B788]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[#8EA396] font-medium mb-1 text-xs">
            {t("scan.batch_name_label", "Batch / Inspection Name")} (Optional)
          </label>
          <input
            type="text"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder={t("scan.batch_name_placeholder", "e.g., North Field Morning Inspection")}
            className="w-full bg-[#0d1612] border border-[#2E7D32]/30 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#52B788]"
          />
        </div>
      </div>

      {/* Multi-Image File Dropzone */}
      {!batchResult && (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#2E7D32]/40 hover:border-[#52B788] rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all bg-[#12231A]/30 hover:bg-[#12231A]/50"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#2E7D32]/20 border border-[#2E7D32]/40 flex items-center justify-center text-[#52B788] mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">
              Select 2 to 10 leaf images from this field
            </p>
            <p className="text-xs text-[#8EA396]">
              JPG, PNG, or WEBP up to 10 MB each • Every leaf runs independently
            </p>
          </div>

          {/* Selected Specimens Grid */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8EA396]">
                  {files.length} of 10 specimens selected
                </span>
                <button
                  type="button"
                  onClick={handleClearBatch}
                  className="text-red-400 hover:text-red-300 underline text-xs"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {previews.map((url, i) => (
                  <div
                    key={i}
                    className="relative group rounded-2xl overflow-hidden border border-white/10 bg-black aspect-square"
                  >
                    <img
                      src={url}
                      alt={`Specimen ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 text-[10px] text-white font-mono">
                      #{i + 1}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(i);
                      }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/80 text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRunBatchAnalysis}
                  disabled={isAnalyzing || files.length < 2}
                  className="btn-forest !w-full !py-3.5 !text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#2E7D32]/30 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing {files.length} Specimens with Neural Network...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4" />
                      <span>Analyze Field Batch ({files.length} Specimens)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/40 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* BATCH RESULTS VIEW */}
      {batchResult && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Aggregate Field Health Card */}
          <div className="p-6 rounded-3xl bg-[#0f1f16] border border-[#2E7D32]/40 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#2E7D32]/20">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md bg-[#2E7D32]/30 text-[#85E3B3]">
                  {batchResult.batch_name}
                </span>
                <h3 className="text-xl font-bold text-white font-heading mt-1">
                  {t("batch.summary_title", "Field Batch Inspection Summary")}
                </h3>
                <p className="text-xs text-[#8EA396]">
                  {batchResult.valid_images} {t("batch.leaves_analyzed", "leaves analyzed")}
                  {batchResult.rejected_images > 0 && (
                    <span className="text-amber-400 ml-1">
                      ({batchResult.rejected_images} rejected non-leaf / quality)
                    </span>
                  )}
                </p>
              </div>

              {/* Reset Batch Button */}
              <button
                type="button"
                onClick={handleClearBatch}
                className="btn-outline !px-4 !py-2 !text-xs !text-white"
              >
                Scan Another Batch
              </button>
            </div>

            {/* Health Score & Status Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center">
                <span className="text-xs text-[#8EA396] block mb-1">
                  {t("batch.field_health_score", "Field Health Score")}
                </span>
                <span className="text-3xl font-extrabold text-white font-mono">
                  {batchResult.aggregate.field_health_score}%
                </span>
                <span className="text-[10px] text-[#8EA396] block mt-1">
                  Deterministic ratio
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center">
                <span className="text-xs text-[#8EA396] block mb-1">
                  {t("batch.health_status", "Overall Field Health")}
                </span>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-bold mt-1 ${
                    batchResult.aggregate.overall_status === "Good"
                      ? "bg-emerald-950 border border-emerald-500/50 text-emerald-300"
                      : batchResult.aggregate.overall_status === "Monitor"
                      ? "bg-amber-950 border border-amber-500/50 text-amber-300"
                      : "bg-red-950 border border-red-500/50 text-red-300"
                  }`}
                >
                  {batchResult.aggregate.overall_status}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center">
                <span className="text-xs text-[#8EA396] block mb-1">
                  {t("batch.dominant_disease", "Dominant Pathology")}
                </span>
                <span className="text-xs font-bold text-white line-clamp-2 mt-1">
                  {batchResult.aggregate.dominant_disease}
                </span>
              </div>
            </div>

            {/* Specimen Counts Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[#8EA396] block">Healthy Specimens</span>
                <span className="text-base font-bold text-emerald-400">
                  {batchResult.aggregate.healthy_count}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[#8EA396] block">Diseased Specimens</span>
                <span className="text-base font-bold text-amber-400">
                  {batchResult.aggregate.diseased_count}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[#8EA396] block">Avg Severity</span>
                <span className="text-base font-bold text-white">
                  {batchResult.aggregate.average_severity}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[#8EA396] block">Total Evaluated</span>
                <span className="text-base font-bold text-white">
                  {batchResult.valid_images}
                </span>
              </div>
            </div>

            {/* Individual Specimen Results List */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                Individual Specimen Diagnostics ({batchResult.results.length})
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {batchResult.results.map((r: any, idx: number) => {
                  const isHealthy = r.is_healthy;
                  return (
                    <div
                      key={r.id || idx}
                      onClick={() => {
                        setSelectedLeafResult(r);
                        if (onSelectResult) onSelectResult(r);
                      }}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/5 hover:border-[#2E7D32]/40 hover:bg-[#12231A]/40 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black overflow-hidden border border-white/10 shrink-0">
                          {r.gradcam_url ? (
                            <img
                              src={r.gradcam_url}
                              alt="Specimen"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-[#8EA396] font-mono">
                              #{idx + 1}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white group-hover:text-[#52B788] transition-colors">
                              {r.disease || r.prediction}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8EA396] font-mono">
                            Confidence: {(r.confidence * 100).toFixed(1)}% • Severity: {r.severity?.percentage !== null ? `${r.severity?.percentage}%` : "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            isHealthy
                              ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                              : "bg-amber-950/60 text-amber-300 border border-amber-500/40"
                          }`}
                        >
                          {isHealthy ? "Healthy" : "Infected"}
                        </span>
                        <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Leaf Inspection Modal Drawer */}
      {selectedLeafResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl bg-[#0f1f16] border border-[#2E7D32]/50 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#52B788]" />
                <h4 className="text-base font-bold text-white font-heading">
                  {selectedLeafResult.disease}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeafResult(null)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Specimen Visual & Diagnostics */}
            <div className="grid grid-cols-2 gap-3">
              {selectedLeafResult.gradcam_url && (
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-black">
                  <img
                    src={selectedLeafResult.gradcam_url}
                    alt="Grad-CAM"
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-1.5 text-center text-[10px] font-mono text-[#8EA396]">
                    Grad-CAM Heatmap
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2 text-xs font-mono">
                <div>
                  <span className="text-[#8EA396] block">Confidence:</span>
                  <span className="text-white font-bold">
                    {(selectedLeafResult.confidence * 100).toFixed(1)}% ({selectedLeafResult.confidence_level})
                  </span>
                </div>
                <div>
                  <span className="text-[#8EA396] block">Severity:</span>
                  <span className="text-white font-bold">
                    {selectedLeafResult.severity?.level} ({selectedLeafResult.severity?.percentage}%)
                  </span>
                </div>
                <div>
                  <span className="text-[#8EA396] block">Spread Risk:</span>
                  <span className="text-white font-bold">
                    {selectedLeafResult.risk?.level}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {selectedLeafResult.recommendations?.immediate?.length > 0 && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <span className="text-xs font-bold text-[#85E3B3] uppercase font-mono">
                  Immediate Recommended Action
                </span>
                <ul className="text-xs text-neutral-200 space-y-1 list-disc list-inside">
                  {selectedLeafResult.recommendations.immediate.slice(0, 2).map((a: string, i: number) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLeafResult(null)}
                className="btn-forest !px-6 !py-2.5 !text-xs"
              >
                Close Specimen Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
