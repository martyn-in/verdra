"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  RefreshCw,
  X,
  ArrowRight,
  RotateCcw,
  Smartphone,
  ShieldAlert,
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

export type BioFilterMode = "natural" | "bio" | "contrast" | "shadow";

export const FILTER_CONFIG: Record<
  BioFilterMode,
  { id: BioFilterMode; label: string; icon: string; css: string; desc: string }
> = {
  natural: {
    id: "natural",
    label: "Natural",
    icon: "🌿",
    css: "none",
    desc: "Standard true-to-life neutral exposure",
  },
  bio: {
    id: "bio",
    label: "Bio Enhance",
    icon: "🔬",
    css: "contrast(1.22) saturate(1.30) brightness(1.02)",
    desc: "Highlights chlorophyll, lesions & leaf vein clarity",
  },
  contrast: {
    id: "contrast",
    label: "High Contrast",
    icon: "☀️",
    css: "contrast(1.35) brightness(0.92)",
    desc: "Suppresses glare under direct harsh field sunlight",
  },
  shadow: {
    id: "shadow",
    label: "Shadow Balance",
    icon: "⛅",
    css: "brightness(1.22) contrast(1.12)",
    desc: "Lifts deep shadows under dense crop foliage",
  },
};

interface LeafCaptureOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
}

/**
 * Robust progressive camera stream acquisition across mobile, desktop, and tablets.
 * Falls back through 4 progressive constraint tiers to ensure camera access succeeds
 * on any device (environment rear camera, user-facing webcam, or basic video stream).
 */
async function getCameraStream(preferredFacing: "environment" | "user"): Promise<MediaStream> {
  if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
    throw new Error("Camera API is not supported in this browser environment.");
  }

  const constraintTiers: MediaStreamConstraints[] = [
    // Tier 1: Ideal facingMode with HD dimensions
    {
      video: {
        facingMode: { ideal: preferredFacing },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    // Tier 2: Facing mode without dimensional constraints
    {
      video: {
        facingMode: { ideal: preferredFacing },
      },
      audio: false,
    },
    // Tier 3: Opposite facing mode (e.g. user-facing FaceTime/USB camera on laptops/desktops)
    {
      video: {
        facingMode: preferredFacing === "environment" ? { ideal: "user" } : { ideal: "environment" },
      },
      audio: false,
    },
    // Tier 4: Most permissive - any video device available
    {
      video: true,
      audio: false,
    },
  ];

  let lastError: any = null;
  for (const constraints of constraintTiers) {
    try {
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      if (s && s.getVideoTracks().length > 0) {
        return s;
      }
    } catch (err: any) {
      lastError = err;
      // If user explicitly denied browser permission dialog, stop iterating
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        throw err;
      }
    }
  }

  throw lastError || new Error("Failed to start camera stream.");
}

export default function LeafCaptureOverlay({
  isOpen,
  onClose,
  onCapture,
}: LeafCaptureOverlayProps) {
  const { t } = useTranslation();

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [activeFilter, setActiveFilter] = useState<BioFilterMode>("natural");
  const [permissionStatus, setPermissionStatus] = useState<
    "connecting" | "granted" | "denied" | "unsupported" | "error"
  >("connecting");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Post-capture review states
  const [capturedBlobUrl, setCapturedBlobUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Check hardware camera availability
  useEffect(() => {
    if (typeof window === "undefined" || !navigator?.mediaDevices?.enumerateDevices) {
      return;
    }

    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoInputs.length > 1);
      })
      .catch(() => {});
  }, []);

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // Start real camera stream with multi-tier fallback
  const startCamera = useCallback(async () => {
    stopCamera();
    setPermissionStatus("connecting");
    setErrorMessage("");

    if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
      setPermissionStatus("unsupported");
      setErrorMessage("Direct live camera stream is not supported in this browser. You can use your device's camera app below.");
      return;
    }

    try {
      const newStream = await getCameraStream(facingMode);
      setStream(newStream);
      setPermissionStatus("granted");

      if (navigator?.mediaDevices?.enumerateDevices) {
        navigator.mediaDevices
          .enumerateDevices()
          .then((devices) => {
            const videoInputs = devices.filter((d) => d.kind === "videoinput");
            setHasMultipleCameras(videoInputs.length > 1);
          })
          .catch(() => {});
      }

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Camera initialization error:", err);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setPermissionStatus("denied");
        setErrorMessage("Camera access was not granted. Tap below to use your device's camera app.");
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setPermissionStatus("error");
        setErrorMessage("No direct camera device detected on this system. You can snap a leaf photo using your device camera app.");
      } else {
        setPermissionStatus("error");
        setErrorMessage("Direct camera stream could not be started. You can use your device's camera app below.");
      }
    }
  }, [facingMode, stopCamera]);

  // Handle open / close lifecycle
  useEffect(() => {
    if (isOpen && !capturedBlobUrl) {
      startCamera();
    } else if (!isOpen) {
      stopCamera();
      setCapturedBlobUrl(null);
      setCapturedFile(null);
      setPermissionStatus("connecting");
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera, capturedBlobUrl]);

  // Keep videoRef.current.srcObject tightly bound to stream
  useEffect(() => {
    if (videoRef.current && stream && permissionStatus === "granted") {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch((err) => {
        console.warn("Video play error:", err);
      });
    }
  }, [stream, permissionStatus]);

  // Capture frame from video
  const handleCaptureFromVideo = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const snapCanvas = document.createElement("canvas");
    snapCanvas.width = video.videoWidth || 1280;
    snapCanvas.height = video.videoHeight || 720;
    const snapCtx = snapCanvas.getContext("2d");
    if (!snapCtx) return;

    if (activeFilter !== "natural" && FILTER_CONFIG[activeFilter]?.css !== "none") {
      snapCtx.filter = FILTER_CONFIG[activeFilter].css;
    }

    snapCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
    const dataUrl = snapCanvas.toDataURL("image/jpeg", 0.95);
    setCapturedBlobUrl(dataUrl);

    snapCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `leaf_capture_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setCapturedFile(file);
        stopCamera();
      },
      "image/jpeg",
      0.95
    );
  }, [stopCamera, activeFilter]);

  // Handle image selected through native camera input
  const handleNativeCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setCapturedFile(file);
    setCapturedBlobUrl(previewUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedBlobUrl(null);
    setCapturedFile(null);
    startCamera();
  };

  const handleConfirmPhoto = () => {
    if (!capturedFile || !capturedBlobUrl) return;
    onCapture(capturedFile, capturedBlobUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="leaf-capture-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Hidden native device camera trigger */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleNativeCameraCapture}
      />

      <div className="leaf-capture-card">
        {/* Header */}
        <div className="leaf-capture-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(46,125,50,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#52b788",
              }}
            >
              <Camera size={18} />
            </div>
            <div>
              <h3>Crop Leaf Scanner</h3>
              <p>Position single leaf within frame for clean AI diagnosis</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {hasMultipleCameras && permissionStatus === "granted" && !capturedBlobUrl && (
              <button
                type="button"
                onClick={() => setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "white",
                  padding: "6px 10px",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
                title="Switch Camera"
              >
                <RefreshCw size={14} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "white",
                padding: "6px 10px",
                borderRadius: 10,
                cursor: "pointer",
              }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Viewfinder Body */}
        <div className="leaf-capture-viewfinder">
          {/* Always-mounted video element for immediate srcObject binding */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: FILTER_CONFIG[activeFilter]?.css || "none",
              transition: "filter 0.2s ease",
              display: permissionStatus === "granted" && !capturedBlobUrl ? "block" : "none",
            }}
          />

          {/* Leaf Reticle Guide (when video is actively playing) */}
          {permissionStatus === "granted" && !capturedBlobUrl && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
              }}
            >
              <div
                style={{
                  width: 240,
                  height: 240,
                  borderRadius: 24,
                  border: "2px dashed #52b788",
                  boxShadow: "0 0 25px rgba(82,183,136,0.35)",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#ffffff",
                    background: "rgba(0,0,0,0.65)",
                    padding: "4px 12px",
                    borderRadius: 100,
                    backdropFilter: "blur(4px)",
                  }}
                >
                  Place Leaf Here
                </span>
              </div>
            </div>
          )}

          {/* Connecting State */}
          {permissionStatus === "connecting" && !capturedBlobUrl && (
            <div style={{ textAlign: "center", padding: 24, maxWidth: 360, zIndex: 10 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "3px solid rgba(82, 183, 136, 0.25)",
                  borderTopColor: "#52b788",
                  animation: "spin 0.9s linear infinite",
                  margin: "0 auto 16px",
                }}
              />
              <h4 style={{ color: "white", fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>
                Connecting Camera...
              </h4>
              <p style={{ color: "#8ea396", fontSize: 12, margin: 0 }}>
                Initializing foliar viewfinder feed
              </p>
            </div>
          )}

          {/* Captured Preview State */}
          {capturedBlobUrl && (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
              <img
                src={capturedBlobUrl}
                alt="Captured Leaf"
                style={{ maxHeight: "350px", maxWidth: "100%", objectFit: "contain", borderRadius: 14 }}
              />
            </div>
          )}

          {/* Fallback & Permission Handler */}
          {(permissionStatus === "denied" || permissionStatus === "error" || permissionStatus === "unsupported") && !capturedBlobUrl && (
            <div style={{ textAlign: "center", padding: 24, maxWidth: 380, zIndex: 10 }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 16,
                  background: permissionStatus === "denied" ? "rgba(234,179,8,0.15)" : "rgba(46,125,50,0.18)",
                  border: permissionStatus === "denied" ? "1px solid rgba(234,179,8,0.3)" : "1px solid rgba(82,183,136,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: permissionStatus === "denied" ? "#facc15" : "#52b788",
                  margin: "0 auto 14px",
                }}
              >
                {permissionStatus === "denied" ? <ShieldAlert size={26} /> : <Camera size={26} />}
              </div>
              <h4 style={{ color: "white", fontSize: 16, fontWeight: 800, margin: "0 0 6px" }}>
                {permissionStatus === "denied" ? "Camera Permission Needed" : "Device Camera Access"}
              </h4>
              <p style={{ color: "#8ea396", fontSize: 12, margin: "0 0 18px", lineHeight: 1.5 }}>
                {errorMessage || "Tap below to snap a leaf photo using your device's built-in camera app."}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  style={{
                    background: "#2e7d32",
                    color: "white",
                    border: 0,
                    borderRadius: 12,
                    padding: "12px 22px",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: "0 4px 14px rgba(46,125,50,0.4)",
                  }}
                >
                  <Smartphone size={16} /> Open Device Camera App
                </button>
                <button
                  type="button"
                  onClick={() => startCamera()}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "#c2d4c5",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 10,
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <RefreshCw size={13} /> Retry Camera
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bio-Filter Selection Bar */}
        {!capturedBlobUrl && permissionStatus === "granted" && (
          <div
            style={{
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "rgba(10, 25, 18, 0.95)",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              overflowX: "auto",
            }}
          >
            {(Object.keys(FILTER_CONFIG) as BioFilterMode[]).map((mode) => {
              const cfg = FILTER_CONFIG[mode];
              const isSelected = activeFilter === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setActiveFilter(mode)}
                  title={cfg.desc}
                  style={{
                    background: isSelected ? "#2e7d32" : "rgba(255, 255, 255, 0.06)",
                    border: isSelected
                      ? "1px solid #52b788"
                      : "1px solid rgba(255, 255, 255, 0.12)",
                    color: isSelected ? "#ffffff" : "#c2d4c5",
                    borderRadius: 20,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: isSelected ? 800 : 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                    boxShadow: isSelected ? "0 2px 8px rgba(46,125,50,0.4)" : "none",
                  }}
                >
                  <span>{cfg.icon}</span>
                  <span>{t(`landing.filters.${mode}`, cfg.label)}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="leaf-capture-footer">
          {!capturedBlobUrl ? (
            <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "#dce6dc",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Smartphone size={14} /> System Camera
              </button>

              <button
                type="button"
                onClick={handleCaptureFromVideo}
                disabled={permissionStatus !== "granted"}
                style={{
                  background: "#2e7d32",
                  color: "white",
                  border: 0,
                  borderRadius: 12,
                  padding: "12px 28px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: permissionStatus === "granted" ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: permissionStatus === "granted" ? 1 : 0.5,
                  boxShadow: "0 4px 14px rgba(46,125,50,0.4)",
                }}
              >
                <Camera size={16} /> Snap Photo
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={handleRetake}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "white",
                  borderRadius: 12,
                  padding: "10px 18px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <RotateCcw size={14} /> Retake
              </button>

              <button
                type="button"
                onClick={handleConfirmPhoto}
                style={{
                  background: "#2e7d32",
                  color: "white",
                  border: 0,
                  borderRadius: 12,
                  padding: "11px 24px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 14px rgba(46,125,50,0.4)",
                }}
              >
                <span>Use This Leaf Photo</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
