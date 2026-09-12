"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  CameraOff,
  RefreshCw,
  X,
  AlertTriangle,
  Sun,
  Focus,
  Maximize2,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

interface LeafCaptureOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
}

export default function LeafCaptureOverlay({
  isOpen,
  onClose,
  onCapture,
}: LeafCaptureOverlayProps) {
  const { t } = useTranslation();

  // Hardware states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<
    "prompt" | "granted" | "denied" | "unsupported" | "error"
  >("prompt");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Real live image quality indicators (NO AI disease prediction during preview)
  const [lighting, setLighting] = useState<"Good" | "Too Dark" | "Too Bright">("Good");
  const [focus, setFocus] = useState<"Good" | "Blurry">("Blurry");
  const [framing, setFraming] = useState<"Ready" | "Move Leaf Into Frame">("Move Leaf Into Frame");

  // Post-capture review states
  const [capturedBlobUrl, setCapturedBlobUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isShutterFlashed, setIsShutterFlashed] = useState(false);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Check camera hardware
  useEffect(() => {
    if (typeof window === "undefined" || !navigator?.mediaDevices?.enumerateDevices) {
      setPermissionStatus("unsupported");
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
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, [stream]);

  // Start real camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setPermissionStatus("prompt");
    setErrorMessage("");

    if (!navigator?.mediaDevices?.getUserMedia) {
      setPermissionStatus("unsupported");
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setPermissionStatus("granted");

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionStatus("denied");
        setErrorMessage("Camera permission was not granted. Upload an image instead.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setPermissionStatus("error");
        setErrorMessage("No camera device detected on this system.");
      } else {
        setPermissionStatus("error");
        setErrorMessage(err.message || "Camera capture is unavailable on this browser. Please upload a photo instead.");
      }
    }
  }, [facingMode, stopCamera]);

  // Lifecycle when modal opens/closes
  useEffect(() => {
    if (isOpen && !capturedBlobUrl) {
      startCamera();
    } else if (!isOpen) {
      stopCamera();
      setCapturedBlobUrl(null);
      setCapturedFile(null);
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera, capturedBlobUrl]);

  // Switch camera front / rear
  const toggleCameraFacing = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  // -----------------------------------------------------------------
  // REAL-TIME IMAGE QUALITY EVALUATION LOOP (Canvas Frame Analysis)
  // Calculates: Luminance (Lighting), Discrete Laplacian (Blur/Focus),
  // and Central Reticle Pixel Distribution (Framing).
  // -----------------------------------------------------------------
  useEffect(() => {
    if (permissionStatus !== "granted" || !videoRef.current || capturedBlobUrl) {
      return;
    }

    const video = videoRef.current;
    let isAnalyzing = false;

    // Off-screen evaluation canvas
    const evalCanvas = document.createElement("canvas");
    const evalCtx = evalCanvas.getContext("2d", { willReadFrequently: true });
    if (!evalCtx) return;

    const analyzeFrame = () => {
      if (video.readyState >= 2 && !isAnalyzing) {
        isAnalyzing = true;

        const width = 240; // High performance evaluation scale
        const height = Math.floor((video.videoHeight / (video.videoWidth || 1)) * width) || 180;
        evalCanvas.width = width;
        evalCanvas.height = height;

        evalCtx.drawImage(video, 0, 0, width, height);

        try {
          const imgData = evalCtx.getImageData(0, 0, width, height);
          const data = imgData.data;
          const pixelCount = width * height;

          // 1. Average Luminance
          let sumLuma = 0;
          const gray = new Uint8Array(pixelCount);

          // Central 60% reticle region boundaries
          const rx1 = Math.floor(width * 0.2);
          const rx2 = Math.floor(width * 0.8);
          const ry1 = Math.floor(height * 0.2);
          const ry2 = Math.floor(height * 0.8);
          let centerFoliarPixels = 0;
          let centerTotalPixels = 0;

          for (let i = 0; i < pixelCount; i++) {
            const idx = i * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const luma = (r * 299 + g * 587 + b * 114) / 1000;
            gray[i] = luma;
            sumLuma += luma;

            const px = i % width;
            const py = Math.floor(i / width);

            // Check if pixel is inside the center framing reticle
            if (px >= rx1 && px <= rx2 && py >= ry1 && py <= ry2) {
              centerTotalPixels++;
              // Foliar excess green: 2G - R - B > 15
              const exg = 2 * g - r - b;
              if (exg > 15 && g > b && luma > 20 && luma < 240) {
                centerFoliarPixels++;
              }
            }
          }

          const avgLuma = sumLuma / pixelCount;
          if (avgLuma < 40) {
            setLighting("Too Dark");
          } else if (avgLuma > 220) {
            setLighting("Too Bright");
          } else {
            setLighting("Good");
          }

          // 2. Framing check: At least 15% foliar coverage within center reticle
          const centerFoliarRatio = centerTotalPixels > 0 ? centerFoliarPixels / centerTotalPixels : 0;
          if (centerFoliarRatio >= 0.15) {
            setFraming("Ready");
          } else {
            setFraming("Move Leaf Into Frame");
          }

          // 3. Focus check: Discrete Laplacian variance on central reticle
          let lapSum = 0;
          let lapSumSq = 0;
          let lapCount = 0;

          for (let y = ry1 + 2; y < ry2 - 2; y += 2) {
            const rowOffset = y * width;
            for (let x = rx1 + 2; x < rx2 - 2; x += 2) {
              const center = gray[rowOffset + x];
              const up = gray[rowOffset - width + x];
              const down = gray[rowOffset + width + x];
              const left = gray[rowOffset + x - 1];
              const right = gray[rowOffset + x + 1];

              const lap = up + down + left + right - 4 * center;
              lapSum += lap;
              lapSumSq += lap * lap;
              lapCount++;
            }
          }

          let lapVariance = 0;
          if (lapCount > 0) {
            const meanLap = lapSum / lapCount;
            lapVariance = lapSumSq / lapCount - meanLap * meanLap;
          }

          // Variance threshold for real focus sharpness
          if (lapVariance >= 35) {
            setFocus("Good");
          } else {
            setFocus("Blurry");
          }
        } catch (e) {
          // Continue gracefully
        }

        isAnalyzing = false;
      }

      animFrameRef.current = requestAnimationFrame(analyzeFrame);
    };

    animFrameRef.current = requestAnimationFrame(analyzeFrame);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [permissionStatus, capturedBlobUrl]);

  // Capture High-Res Frame Snapshot
  const handleCaptureLeaf = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Flash animation
    setIsShutterFlashed(true);
    setTimeout(() => setIsShutterFlashed(false), 200);

    const snapCanvas = document.createElement("canvas");
    snapCanvas.width = video.videoWidth || 1280;
    snapCanvas.height = video.videoHeight || 720;
    const snapCtx = snapCanvas.getContext("2d");
    if (!snapCtx) return;

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
  }, [stopCamera]);

  // Retake Snapshot
  const handleRetake = () => {
    setCapturedBlobUrl(null);
    setCapturedFile(null);
    startCamera();
  };

  // Confirm and Use Photo for Real AI Pipeline
  const handleUsePhoto = () => {
    if (!capturedFile || !capturedBlobUrl) return;
    onCapture(capturedFile, capturedBlobUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0d1612] border border-[#2E7D32]/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#12231A]/90 border-b border-[#2E7D32]/20 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2E7D32]/20 border border-[#2E7D32]/40 flex items-center justify-center text-[#52B788]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide font-heading">
                {t("scan.capture_camera", "Capture Camera")}
              </h3>
              <p className="text-[11px] text-[#8EA396]">
                {t("camera_overlay.instruction", "Place one leaf inside the frame")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasMultipleCameras && permissionStatus === "granted" && !capturedBlobUrl && (
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-xs"
                title="Switch Camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-[#A3B8AC] hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder / Video Container */}
        <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[340px] sm:min-h-[440px]">
          
          {/* Shutter flash */}
          {isShutterFlashed && (
            <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200 pointer-events-none" />
          )}

          {/* PERMISSION DENIED STATE */}
          {permissionStatus === "denied" && (
            <div className="text-center p-8 space-y-4 max-w-md mx-auto z-20">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
                <CameraOff className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white">Camera Access Denied</h4>
              <p className="text-xs text-red-300 bg-red-950/40 border border-red-800/40 p-3 rounded-xl leading-relaxed">
                {t("camera_overlay.permission_denied", "Camera permission was not granted. Upload an image instead.")}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn-outline !px-5 !py-2.5 !text-xs !text-white"
              >
                Close &amp; Upload Photo Instead
              </button>
            </div>
          )}

          {/* UNSUPPORTED OR HARDWARE ERROR */}
          {(permissionStatus === "unsupported" || permissionStatus === "error") && (
            <div className="text-center p-8 space-y-4 max-w-sm mx-auto z-20">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white">Camera Unavailable</h4>
              <p className="text-xs text-[#8EA396] leading-relaxed">
                {errorMessage || t("camera_overlay.unsupported", "Camera capture is unavailable on this browser. Please upload a photo instead.")}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn-outline !px-5 !py-2.5 !text-xs !text-white"
              >
                Close &amp; Upload Photo
              </button>
            </div>
          )}

          {/* LIVE STREAM & RETICLE OVERLAY */}
          {permissionStatus === "granted" && !capturedBlobUrl && (
            <>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover select-none"
              />

              {/* Central Leaf-Safe Framing Reticle */}
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-between p-6">
                
                {/* Real-time Quality Indicators Bar */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {/* Lighting Indicator */}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md text-xs font-mono font-medium transition-colors ${
                      lighting === "Good"
                        ? "bg-[#2E7D32]/70 border-[#52B788] text-white"
                        : "bg-amber-950/70 border-amber-500/50 text-amber-300"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>{t("camera_overlay.lighting", "Lighting")}: {lighting}</span>
                  </div>

                  {/* Focus / Sharpness Indicator */}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md text-xs font-mono font-medium transition-colors ${
                      focus === "Good"
                        ? "bg-[#2E7D32]/70 border-[#52B788] text-white"
                        : "bg-amber-950/70 border-amber-500/50 text-amber-300"
                    }`}
                  >
                    <Focus className="w-3.5 h-3.5" />
                    <span>{t("camera_overlay.focus", "Focus")}: {focus}</span>
                  </div>

                  {/* Framing Indicator */}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md text-xs font-mono font-medium transition-colors ${
                      framing === "Ready"
                        ? "bg-[#2E7D32]/70 border-[#52B788] text-white"
                        : "bg-black/70 border-white/20 text-neutral-300"
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>{t("camera_overlay.framing", "Framing")}: {framing}</span>
                  </div>
                </div>

                {/* Central Leaf Guide Reticle Box */}
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-auto flex items-center justify-center">
                  <div
                    className={`absolute inset-0 rounded-3xl border-2 transition-all duration-200 ${
                      framing === "Ready" && focus === "Good" && lighting === "Good"
                        ? "border-[#52B788] shadow-[0_0_20px_rgba(82,183,136,0.5)]"
                        : "border-white/40 border-dashed"
                    }`}
                  >
                    {/* Corners */}
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-[#52B788] rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-[#52B788] rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-[#52B788] rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-[#52B788] rounded-br-lg" />
                  </div>

                  {/* Subtle guidance text inside reticle */}
                  <span className="text-xs text-white/70 font-medium px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
                    {t("camera_overlay.instruction", "Place one leaf inside the frame")}
                  </span>
                </div>

                {/* Technical Disclaimer */}
                <div className="text-center text-[10px] text-[#8EA396] font-mono max-w-sm">
                  {t("camera_overlay.quality_disclaimer", "Only these are image-quality indicators. Do not claim biological validity from these checks.")}
                </div>
              </div>
            </>
          )}

          {/* CAPTURED SPECIMEN PREVIEW VIEW */}
          {capturedBlobUrl && (
            <div className="relative w-full h-full flex items-center justify-center p-4 z-20">
              <div className="relative rounded-2xl overflow-hidden border border-[#2E7D32]/40 max-h-[380px] shadow-2xl bg-black">
                <img
                  src={capturedBlobUrl}
                  alt="Captured Leaf Specimen"
                  className="w-full h-full object-contain max-h-[360px]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#12231A]/95 border-t border-[#2E7D32]/20 z-20 flex items-center justify-between gap-3">
          {!capturedBlobUrl ? (
            <div className="w-full flex items-center justify-between">
              <span className="text-xs text-[#8EA396] hidden sm:inline">
                {framing === "Ready" && focus === "Good" ? "Specimen in focus" : "Align leaf inside frame"}
              </span>

              <button
                type="button"
                onClick={handleCaptureLeaf}
                disabled={permissionStatus !== "granted"}
                className="btn-forest !px-7 !py-3 !text-sm flex items-center gap-2 mx-auto sm:mx-0 shadow-lg shadow-[#2E7D32]/30 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>{t("scan.capture_leaf", "Capture Leaf")}</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="btn-outline !px-5 !py-2.5 !text-xs !text-white flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t("scan.retake", "Retake")}</span>
              </button>

              <button
                type="button"
                onClick={handleUsePhoto}
                className="btn-forest !px-7 !py-2.5 !text-sm flex items-center gap-2 shadow-lg shadow-[#2E7D32]/30"
              >
                <span>{t("scan.use_photo", "Use Photo")}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
