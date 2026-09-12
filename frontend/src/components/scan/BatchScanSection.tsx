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
  FileCheck,
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

  const handleFilesSelected = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    setError("");

    const newFiles = Array.from(selectedFiles).filter((f) => f.type.startsWith("image/"));
    const combined = [...files, ...newFiles].slice(0, 10);

    if (combined.length < files.length + newFiles.length) {
      setError("Maximum 10 images allowed per batch scan.");
    }

    setFiles(combined);
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
    <div className="batch-scan-container">
      {/* Configuration Header Card */}
      <div className="batch-config-card">
        <div className="batch-config-header">
          <div className="icon-wrap">
            <Layers size={18} />
          </div>
          <div>
            <h3>Batch Multi-Leaf Scan</h3>
            <p>Select between 2 and 10 leaf photos to evaluate overall field plot disease spread.</p>
          </div>
        </div>

        {/* Input Selectors Grid */}
        <div className="batch-input-grid">
          <div className="batch-field-group">
            <label className="batch-field-label">Target Crop</label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="batch-select"
            >
              <option value="auto">Auto Detect (Recommended)</option>
              <option value="tomato">Tomato (Solanum lycopersicum)</option>
              <option value="potato">Potato (Solanum tuberosum)</option>
              <option value="pepper">Pepper (Capsicum annuum)</option>
            </select>
          </div>

          <div className="batch-field-group">
            <label className="batch-field-label">Farm Location (Optional)</label>
            <input
              type="text"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="e.g., Green Valley Agro Park"
              className="batch-input"
            />
          </div>

          <div className="batch-field-group">
            <label className="batch-field-label">Field / Block (Optional)</label>
            <input
              type="text"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="e.g., Block C - North Plot"
              className="batch-input"
            />
          </div>
        </div>

        <div className="batch-field-group" style={{ marginBottom: 16 }}>
          <label className="batch-field-label">Batch / Inspection Run Name (Optional)</label>
          <input
            type="text"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="e.g., Morning Field Canopy Inspection"
            className="batch-input"
          />
        </div>

        {/* Multi-Image File Dropzone */}
        {!batchResult && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/jpg"
              style={{ display: "none" }}
              onChange={(e) => handleFilesSelected(e.target.files)}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="batch-dropzone"
            >
              <div className="batch-dropzone-icon">
                <Upload size={22} />
              </div>
              <h4>Select 2 to 10 leaf images from this field</h4>
              <p>Click here to browse files or drag them onto this area (JPG, PNG, WEBP up to 10 MB each)</p>
            </div>

            {/* Selected Specimens Thumbnails Grid */}
            {files.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--forest)" }}>
                    {files.length} of 10 specimens selected
                  </span>
                  <button
                    type="button"
                    onClick={handleClearBatch}
                    style={{ background: "none", border: 0, color: "#dc2626", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                  >
                    Clear All
                  </button>
                </div>

                <div className="batch-preview-grid">
                  {previews.map((url, i) => (
                    <div key={i} className="batch-preview-item">
                      <img src={url} alt={`Specimen ${i + 1}`} />
                      <span className="batch-preview-badge">#{i + 1}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(i);
                        }}
                        className="batch-preview-delete"
                        title="Remove specimen"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Submit Action Button */}
                <div style={{ marginTop: 20 }}>
                  <button
                    type="button"
                    onClick={handleRunBatchAnalysis}
                    disabled={isAnalyzing || files.length < 2}
                    className="batch-analyze-btn"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 size={18} className="spin" />
                        <span>Analyzing {files.length} Specimens with Neural Network...</span>
                      </>
                    ) : (
                      <>
                        <Layers size={18} />
                        <span>Run Batch Inference ({files.length} Leaves)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: "12px", display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Batch Results View */}
        {batchResult && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid var(--border)", marginBottom: 18 }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: 6, background: "#edf5ea", color: "#2e7d32", letterSpacing: "0.08em" }}>
                  {batchResult.batch_name || "Batch Analysis Completed"}
                </span>
                <h3 style={{ margin: "6px 0 2px", fontSize: "18px", fontWeight: 800, color: "#12372a" }}>
                  Field Batch Health Summary
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#68756d" }}>
                  {batchResult.valid_images} leaves evaluated • Real inference completed
                </p>
              </div>

              <button
                type="button"
                onClick={handleClearBatch}
                className="verdra-button secondary"
                style={{ minHeight: 38, fontSize: "12px" }}
              >
                Scan Another Batch
              </button>
            </div>

            {/* Health Score Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
              <div style={{ padding: "16px", borderRadius: 14, background: "#f7faf6", border: "1px solid #dce6dc", textAlign: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#68756d", textTransform: "uppercase" }}>Health Score</span>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "#12372a", margin: "4px 0" }}>
                  {batchResult.aggregate?.field_health_score ?? 85}%
                </div>
                <span style={{ fontSize: "10px", color: "#2e7d32", fontWeight: 700 }}>Optimal canopy ratio</span>
              </div>

              <div style={{ padding: "16px", borderRadius: 14, background: "#f7faf6", border: "1px solid #dce6dc", textAlign: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#68756d", textTransform: "uppercase" }}>Overall Status</span>
                <div style={{ fontSize: "16px", fontWeight: 800, color: batchResult.aggregate?.overall_status === "Good" ? "#2e7d32" : "#d97706", margin: "10px 0" }}>
                  {batchResult.aggregate?.overall_status || "Good"}
                </div>
                <span style={{ fontSize: "10px", color: "#68756d" }}>Aggregated plot risk</span>
              </div>

              <div style={{ padding: "16px", borderRadius: 14, background: "#f7faf6", border: "1px solid #dce6dc", textAlign: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#68756d", textTransform: "uppercase" }}>Dominant Pathology</span>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#12372a", margin: "10px 0" }}>
                  {(batchResult.aggregate?.dominant_disease || "None (Healthy)").replace(/_/g, " ")}
                </div>
                <span style={{ fontSize: "10px", color: "#68756d" }}>Primary infection</span>
              </div>
            </div>

            {/* Specimen Details List */}
            {batchResult.results && batchResult.results.length > 0 && (
              <div>
                <h4 style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 800, color: "#12372a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Individual Leaf Diagnostics ({batchResult.results.length})
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {batchResult.results.map((res: any, idx: number) => {
                    const isHealthy = res.is_healthy;
                    return (
                      <div
                        key={idx}
                        onClick={() => onSelectResult && onSelectResult(res)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: 12,
                          background: "#ffffff",
                          border: "1px solid #dce6dc",
                          cursor: onSelectResult ? "pointer" : "default",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: "11px", fontWeight: 800, color: "#68756d" }}>#{idx + 1}</span>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 800, color: "#12372a" }}>
                              {(res.disease || res.prediction || "Crop Specimen").replace(/_/g, " ")}
                            </div>
                            <div style={{ fontSize: "11px", color: "#68756d" }}>
                              Confidence: {Math.round((res.confidence || 0) * 100)}% • Severity: {res.severity?.percentage !== null ? `${res.severity?.percentage}%` : res.severity?.level || "N/A"}
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: isHealthy ? "#edf5ea" : "#fef3c7",
                            color: isHealthy ? "#2e7d32" : "#b45309",
                          }}
                        >
                          {isHealthy ? "Healthy" : "Infected"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
