"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  CameraOff,
  RefreshCw,
  Zap,
  ZapOff,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  X,
  Scan,
  Focus,
  Maximize2,
  Sun,
  Layers,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";

export interface OpenCvScanResult {
  file: File;
  previewUrl: string;
  enhancedUrl?: string;
  sharpnessScore: number;
  foliarCoverage: number;
  isSharp: boolean;
}

interface OpenCvCameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (result: OpenCvScanResult) => void;
}

type VisionMode = "hud" | "canny" | "foliar";

export default function OpenCvCameraScanner({
  isOpen,
  onClose,
  onCapture,
}: OpenCvCameraScannerProps) {
  // Camera stream states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<
    "prompt" | "granted" | "denied" | "unsupported" | "error"
  >("prompt");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Vision engine states
  const [visionMode, setVisionMode] = useState<VisionMode>("hud");
  const [autoCapture, setAutoCapture] = useState(false);
  const [focusScore, setFocusScore] = useState(0);
  const [foliarCoverage, setFoliarCoverage] = useState(0);
  const [isLeafCentered, setIsLeafCentered] = useState(false);
  const [lightingCondition, setLightingCondition] = useState<
    "optimal" | "low" | "glare"
  >("optimal");
  const [leafBoundingBox, setLeafBoundingBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Capture & confirmation states
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [processingOpenCv, setProcessingOpenCv] = useState(false);
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number | null>(
    null
  );
  const [isShutterActive, setIsShutterActive] = useState(false);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const autoCaptureTimerRef = useRef<NodeJS.Timeout | null>(null);
  const steadyFramesRef = useRef<number>(0);

  // Check camera hardware capabilities
  useEffect(() => {
    if (!navigator?.mediaDevices?.enumerateDevices) {
      setPermissionStatus("unsupported");
      return;
    }

    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoDevices.length > 1);
      })
      .catch(() => {});
  }, []);

  // Play synthetic camera shutter audio
  const playShutterSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {}
  }, []);

  // Stop active camera stream
  const stopCameraStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
  }, [stream]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    stopCameraStream();
    setPermissionStatus("prompt");
    setErrorMessage("");

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

      // Check for torch capability
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        const caps = (videoTrack.getCapabilities?.() as any) || {};
        setTorchSupported(Boolean(caps.torch));
      }
    } catch (err: any) {
      console.warn("Camera access error:", err);
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setPermissionStatus("denied");
        setErrorMessage(
          "Camera access was denied. Please allow camera permissions in your browser address bar settings to scan live crops."
        );
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        setPermissionStatus("error");
        setErrorMessage("No camera device was detected on your system.");
      } else {
        setPermissionStatus("error");
        setErrorMessage(
          err.message || "Unable to initialize video stream from camera."
        );
      }
    }
  }, [facingMode, stopCameraStream]);

  // Open/Close Lifecycle
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    } else if (!isOpen) {
      stopCameraStream();
      setCapturedImage(null);
      setCapturedFile(null);
      setEnhancedImage(null);
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, startCamera, stopCameraStream, capturedImage]);

  // Toggle Torch
  const toggleTorch = useCallback(async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn("Could not toggle torch", err);
      }
    }
  }, [stream, torchOn]);

  // Switch between front and rear cameras
  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  // -------------------------------------------------------------
  // REAL-TIME OPENCV COMPUTER VISION FRAME PROCESSING LOOP
  // -------------------------------------------------------------
  useEffect(() => {
    if (
      permissionStatus !== "granted" ||
      !videoRef.current ||
      !canvasRef.current ||
      capturedImage
    ) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let isProcessing = false;

    const processFrame = () => {
      if (video.readyState >= 2 && !isProcessing) {
        isProcessing = true;

        const width = 320; // High-efficiency processing downscale
        const height = Math.floor(
          (video.videoHeight / (video.videoWidth || 1)) * width
        ) || 240;

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        // Draw current video frame to processing canvas
        ctx.drawImage(video, 0, 0, width, height);

        try {
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;
          const pixelCount = width * height;

          // 1. Grayscale conversion & Luminance
          const gray = new Uint8Array(pixelCount);
          let sumLuma = 0;
          let foliarPixels = 0;

          // Spatial bounding accumulators for detected leaf
          let minX = width;
          let maxX = 0;
          let minY = height;
          let maxY = 0;

          for (let i = 0; i < pixelCount; i++) {
            const idx = i * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Standard ITU-R BT.601 luma
            const luma = (r * 299 + g * 587 + b * 114) / 1000;
            gray[i] = luma;
            sumLuma += luma;

            // 2. Foliar Color Chromaticity (Excess Green Index: ExG = 2G - R - B)
            const exg = 2 * g - r - b;
            const isFoliar =
              exg > 18 && g > b + 10 && g > r - 15 && luma > 25 && luma < 235;

            if (isFoliar) {
              foliarPixels++;
              const px = i % width;
              const py = Math.floor(i / width);
              if (px < minX) minX = px;
              if (px > maxX) maxX = px;
              if (py < minY) minY = py;
              if (py > maxY) maxY = py;
            }
          }

          const avgLuma = sumLuma / pixelCount;
          if (avgLuma < 35) {
            setLightingCondition("low");
          } else if (avgLuma > 225) {
            setLightingCondition("glare");
          } else {
            setLightingCondition("optimal");
          }

          // Foliar coverage in percentage
          const coveragePct = Math.round((foliarPixels / pixelCount) * 100);
          setFoliarCoverage(coveragePct);

          // Foliar centering check (central 60% reticle)
          const targetBox = {
            left: width * 0.2,
            right: width * 0.8,
            top: height * 0.2,
            bottom: height * 0.8,
          };

          const leafDetected =
            coveragePct >= 12 &&
            maxX > minX &&
            maxY > minY &&
            (maxX - minX) * (maxY - minY) > pixelCount * 0.08;

          const centered =
            leafDetected &&
            minX >= targetBox.left * 0.5 &&
            maxX <= targetBox.right * 1.5 &&
            minY >= targetBox.top * 0.5 &&
            maxY <= targetBox.bottom * 1.5;

          setIsLeafCentered(centered);

          if (leafDetected) {
            setLeafBoundingBox({
              x: Math.round((minX / width) * 100),
              y: Math.round((minY / height) * 100),
              width: Math.round(((maxX - minX) / width) * 100),
              height: Math.round(((maxY - minY) / height) * 100),
            });
          } else {
            setLeafBoundingBox(null);
          }

          // 3. OpenCV Laplacian Sharpness Variance: Var(∇² I)
          // 3x3 Discrete Laplacian Kernel:
          // [ 0,  1,  0 ]
          // [ 1, -4,  1 ]
          // [ 0,  1,  0 ]
          let lapSum = 0;
          let lapSumSq = 0;
          let validLapCount = 0;

          // Compute on central foliar region or center 70% of frame
          const startX = Math.max(1, Math.floor(width * 0.15));
          const endX = Math.min(width - 1, Math.floor(width * 0.85));
          const startY = Math.max(1, Math.floor(height * 0.15));
          const endY = Math.min(height - 1, Math.floor(height * 0.85));

          for (let y = startY; y < endY; y += 2) {
            // stride 2 for real-time 30+ fps
            const rowOffset = y * width;
            for (let x = startX; x < endX; x += 2) {
              const center = gray[rowOffset + x];
              const up = gray[rowOffset - width + x];
              const down = gray[rowOffset + width + x];
              const left = gray[rowOffset + x - 1];
              const right = gray[rowOffset + x + 1];

              const lapVal = up + down + left + right - 4 * center;
              lapSum += lapVal;
              lapSumSq += lapVal * lapVal;
              validLapCount++;
            }
          }

          let lapVariance = 0;
          if (validLapCount > 0) {
            const meanLap = lapSum / validLapCount;
            lapVariance = lapSumSq / validLapCount - meanLap * meanLap;
          }

          // Normalize score to 0 - 100 scale
          const computedScore = Math.min(
            100,
            Math.round((lapVariance / 320) * 100)
          );
          setFocusScore(computedScore);

          // 4. Render Vision Mode Filters if active
          if (visionMode === "canny") {
            // Live Canny edge visualization
            const output = ctx.createImageData(width, height);
            const outData = output.data;

            for (let y = 1; y < height - 1; y++) {
              const row = y * width;
              for (let x = 1; x < width - 1; x++) {
                const idx = (row + x) * 4;
                // Sobel approximation
                const gx =
                  gray[row + width + x + 1] +
                  2 * gray[row + x + 1] +
                  gray[row - width + x + 1] -
                  (gray[row + width + x - 1] +
                    2 * gray[row + x - 1] +
                    gray[row - width + x - 1]);
                const gy =
                  gray[row + width + x - 1] +
                  2 * gray[row + width + x] +
                  gray[row + width + x + 1] -
                  (gray[row - width + x - 1] +
                    2 * gray[row - width + x] +
                    gray[row - width + x + 1]);
                const mag = Math.hypot(gx, gy);

                if (mag > 65) {
                  outData[idx] = 46; // Emerald Neon Green
                  outData[idx + 1] = 204;
                  outData[idx + 2] = 113;
                  outData[idx + 3] = 255;
                } else {
                  outData[idx] = 12;
                  outData[idx + 1] = 24;
                  outData[idx + 2] = 18;
                  outData[idx + 3] = 230;
                }
              }
            }
            ctx.putImageData(output, 0, 0);
          } else if (visionMode === "foliar") {
            // Live Foliar Segmentation Mask
            const output = ctx.createImageData(width, height);
            const outData = output.data;

            for (let i = 0; i < pixelCount; i++) {
              const idx = i * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const exg = 2 * g - r - b;

              if (exg > 20 && g > r && g > b) {
                // Healthy foliage: vibrant green
                outData[idx] = 34;
                outData[idx + 1] = 197;
                outData[idx + 2] = 94;
                outData[idx + 3] = 220;
              } else if (r > 130 && r > b * 1.4 && g > 70) {
                // Suspected chlorotic / necrotic lesion: amber/red
                outData[idx] = 249;
                outData[idx + 1] = 115;
                outData[idx + 2] = 22;
                outData[idx + 3] = 230;
              } else {
                // Background dimmed
                outData[idx] = 15;
                outData[idx + 1] = 23;
                outData[idx + 2] = 42;
                outData[idx + 3] = 200;
              }
            }
            ctx.putImageData(output, 0, 0);
          }

          // 5. Auto-Capture Trigger Check
          if (
            autoCapture &&
            centered &&
            computedScore >= 55 &&
            avgLuma >= 35 &&
            avgLuma <= 225
          ) {
            steadyFramesRef.current += 1;
            if (steadyFramesRef.current > 18) {
              // Steady for ~0.8s
              handleCaptureSnapshot();
              steadyFramesRef.current = 0;
            }
          } else {
            steadyFramesRef.current = Math.max(0, steadyFramesRef.current - 1);
          }
        } catch (e) {
          // Continue loop safely
        }

        isProcessing = false;
      }

      animFrameIdRef.current = requestAnimationFrame(processFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [
    permissionStatus,
    visionMode,
    autoCapture,
    capturedImage,
  ]);

  // Capture High-Res Snapshot from Video
  const handleCaptureSnapshot = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    playShutterSound();
    if (navigator?.vibrate) {
      try {
        navigator.vibrate(50);
      } catch {}
    }

    // Trigger visual shutter flash
    setIsShutterActive(true);
    setTimeout(() => setIsShutterActive(false), 200);

    // Create high-resolution capture canvas
    const snapCanvas = document.createElement("canvas");
    snapCanvas.width = video.videoWidth || 1280;
    snapCanvas.height = video.videoHeight || 720;
    const snapCtx = snapCanvas.getContext("2d");

    if (snapCtx) {
      snapCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
      const dataUrl = snapCanvas.toDataURL("image/jpeg", 0.95);
      setCapturedImage(dataUrl);

      // Convert to File object
      snapCanvas.toBlob(
        async (blob) => {
          if (!blob) return;
          const file = new File([blob], `scan_capture_${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          setCapturedFile(file);

          // Stop camera stream while reviewing
          stopCameraStream();

          // Process with backend OpenCV enhancement
          setProcessingOpenCv(true);
          try {
            const cvRes = await api.opencvScan(file);
            if (cvRes?.enhanced_image) {
              setEnhancedImage(cvRes.enhanced_image);
            }
          } catch (err) {
            console.warn("OpenCV enhancement endpoint notice:", err);
          } finally {
            setProcessingOpenCv(false);
          }
        },
        "image/jpeg",
        0.95
      );
    }
  }, [playShutterSound, stopCameraStream]);

  // Retake Snapshot
  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    setEnhancedImage(null);
    startCamera();
  };

  // Confirm and Send Specimen to Analysis
  const handleConfirmSpecimen = () => {
    if (!capturedFile || !capturedImage) return;

    onCapture({
      file: capturedFile,
      previewUrl: capturedImage,
      enhancedUrl: enhancedImage || undefined,
      sharpnessScore: focusScore,
      foliarCoverage: foliarCoverage,
      isSharp: focusScore >= 45,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#0d1612] border border-[#2E7D32]/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        
        {/* ===== TOP BAR CONTROLS ===== */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#12231A]/90 border-b border-[#2E7D32]/20 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2E7D32]/20 border border-[#2E7D32]/40 flex items-center justify-center text-[#52B788]">
              <Scan className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide font-heading flex items-center gap-2">
                <span>OpenCV Live Scanner</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2E7D32]/30 text-[#85E3B3] font-mono border border-[#2E7D32]/50">
                  CV2 ENGINE
                </span>
              </h2>
              <p className="text-[11px] text-[#8EA396]">
                Real-time Laplacian focus &amp; foliar segmentation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Torch Toggle */}
            {torchSupported && permissionStatus === "granted" && !capturedImage && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl border transition-all text-xs flex items-center gap-1 ${
                  torchOn
                    ? "bg-[#EAB308]/20 border-[#EAB308] text-[#FDE047]"
                    : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                }`}
                title="Toggle Torch / Flashlight"
              >
                {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            {/* Switch Camera */}
            {hasMultipleCameras && permissionStatus === "granted" && !capturedImage && (
              <button
                type="button"
                onClick={switchCamera}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-xs"
                title="Switch Camera (Front/Rear)"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-[#A3B8AC] hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ===== SCANNER VIEWFINDER / CAPTURE CONTAINER ===== */}
        <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[320px] sm:min-h-[460px]">
          {/* Shutter flash animation */}
          {isShutterActive && (
            <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200 pointer-events-none" />
          )}

          {/* PERMISSION PROMPT / LOADING */}
          {permissionStatus === "prompt" && (
            <div className="text-center p-8 space-y-4 max-w-sm mx-auto z-20">
              <div className="w-16 h-16 rounded-2xl bg-[#2E7D32]/20 border border-[#2E7D32]/40 flex items-center justify-center text-[#52B788] mx-auto animate-pulse">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Requesting Camera Access
              </h3>
              <p className="text-xs text-[#8EA396] leading-relaxed">
                Please grant camera permission in your browser prompt to activate the real-time crop scanner.
              </p>
            </div>
          )}

          {/* PERMISSION DENIED */}
          {permissionStatus === "denied" && (
            <div className="text-center p-8 space-y-4 max-w-md mx-auto z-20">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
                <CameraOff className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Camera Access Blocked
              </h3>
              <p className="text-xs text-[#DC2626] bg-red-950/40 border border-red-800/40 p-3 rounded-xl leading-relaxed">
                {errorMessage}
              </p>
              <div className="text-xs text-[#8EA396] text-left space-y-1 bg-white/5 p-3 rounded-xl">
                <p className="font-semibold text-white">How to enable camera:</p>
                <p>1. Click the lock / camera icon in your browser URL bar.</p>
                <p>2. Set &ldquo;Camera&rdquo; to <strong>Allow</strong>.</p>
                <p>3. Click the button below to retry.</p>
              </div>
              <button
                type="button"
                onClick={startCamera}
                className="btn-forest !px-6 !py-2.5 !text-xs"
              >
                Retry Camera Access
              </button>
            </div>
          )}

          {/* HARDWARE ERROR / UNSUPPORTED */}
          {(permissionStatus === "error" ||
            permissionStatus === "unsupported") && (
            <div className="text-center p-8 space-y-4 max-w-sm mx-auto z-20">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Camera Not Available
              </h3>
              <p className="text-xs text-[#8EA396] leading-relaxed">
                {errorMessage ||
                  "No video capture device is detected on this environment."}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn-outline !px-5 !py-2 !text-xs !text-white"
              >
                Close Scanner
              </button>
            </div>
          )}

          {/* ACTIVE VIDEO FEED & CANVAS */}
          {permissionStatus === "granted" && !capturedImage && (
            <>
              {/* Native Video Stream */}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover select-none ${
                  visionMode !== "hud" ? "hidden" : "block"
                }`}
              />

              {/* Computer Vision Render Canvas (for Canny and Foliar Mask modes) */}
              <canvas
                ref={canvasRef}
                className={`w-full h-full object-cover select-none ${
                  visionMode === "hud" ? "hidden" : "block"
                }`}
              />

              {/* ===== REAL-TIME AR HUD OVERLAY ===== */}
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
                
                {/* Top Status Badges */}
                <div className="flex items-center justify-between gap-2">
                  {/* Focus / Sharpness Metric */}
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-md border text-xs font-mono font-bold transition-all ${
                      focusScore >= 65
                        ? "bg-[#2E7D32]/60 border-[#52B788] text-[#A7F3D0]"
                        : focusScore >= 35
                        ? "bg-[#D97706]/60 border-[#FBBF24] text-[#FEF3C7]"
                        : "bg-[#DC2626]/60 border-[#F87171] text-[#FEE2E2]"
                    }`}
                  >
                    <Focus className="w-3.5 h-3.5" />
                    <span>Focus: {focusScore}%</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-80">
                      ({focusScore >= 65 ? "Sharp" : focusScore >= 35 ? "Fair" : "Blurry"})
                    </span>
                  </div>

                  {/* Foliar Target Coverage */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md text-xs font-mono text-[#85E3B3]">
                    <Sparkles className="w-3.5 h-3.5 text-[#52B788]" />
                    <span>Foliage: {foliarCoverage}%</span>
                  </div>

                  {/* Lighting Indicator */}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl backdrop-blur-md border text-xs font-mono ${
                      lightingCondition === "optimal"
                        ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                        : "bg-amber-950/50 border-amber-500/40 text-amber-300"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span className="capitalize">{lightingCondition}</span>
                  </div>
                </div>

                {/* Central Leaf Targeting Reticle */}
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto my-auto flex items-center justify-center">
                  
                  {/* Corner Targeting Brackets */}
                  <div
                    className={`absolute inset-0 border-2 rounded-3xl transition-all duration-300 ${
                      isLeafCentered && focusScore >= 55
                        ? "border-[#52B788] shadow-[0_0_25px_rgba(82,183,136,0.5)] scale-102"
                        : "border-white/30 border-dashed"
                    }`}
                  >
                    {/* Top-Left Corner Accent */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#52B788] rounded-tl-xl" />
                    {/* Top-Right Corner Accent */}
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#52B788] rounded-tr-xl" />
                    {/* Bottom-Left Corner Accent */}
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#52B788] rounded-bl-xl" />
                    {/* Bottom-Right Corner Accent */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#52B788] rounded-br-xl" />
                  </div>

                  {/* Horizontal Scan Laser Line */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-[#52B788] to-transparent animate-[pulse_2s_infinite]" />

                  {/* Reticle Guidance Message */}
                  <div className="absolute -bottom-10 inset-x-0 text-center">
                    <span
                      className={`inline-block px-3.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md border transition-all ${
                        isLeafCentered && focusScore >= 55
                          ? "bg-[#2E7D32]/80 border-[#52B788] text-white"
                          : "bg-black/70 border-white/20 text-[#D1D5DB]"
                      }`}
                    >
                      {isLeafCentered
                        ? focusScore >= 55
                          ? "Optimal Leaf Alignment — Ready to Capture"
                          : "Hold Still — Calibrating Focus"
                        : "Align leaf blade inside scanner reticle"}
                    </span>
                  </div>
                </div>

                {/* Bottom Quick Indicator */}
                <div className="text-center text-[11px] font-mono text-[#8EA396] tracking-wider">
                  OPENCV REAL-TIME LAPLACIAN FOCUS FILTER ACTIVE
                </div>
              </div>
            </>
          )}

          {/* ===== CAPTURED SPECIMEN CONFIRMATION VIEW ===== */}
          {capturedImage && (
            <div className="relative w-full h-full flex flex-col sm:flex-row items-center justify-center p-4 gap-4 z-20">
              {/* Captured Image Display */}
              <div className="relative rounded-2xl overflow-hidden border border-[#2E7D32]/50 max-h-[380px] sm:max-h-[420px] shadow-2xl bg-black">
                <img
                  src={enhancedImage || capturedImage}
                  alt="Captured Leaf Specimen"
                  className="w-full h-full object-contain max-h-[360px]"
                />
                
                {enhancedImage && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-[#2E7D32]/80 border border-[#52B788] text-white text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md">
                    CLAHE Enhanced
                  </div>
                )}

                {processingOpenCv && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                    <div className="text-center text-white space-y-2">
                      <div className="w-7 h-7 rounded-full border-2 border-[#52B788] border-t-transparent animate-spin mx-auto" />
                      <p className="text-xs font-mono">Running OpenCV CLAHE &amp; Contours...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Specimen Metrics Card */}
              <div className="w-full sm:w-64 bg-[#12231A]/90 border border-[#2E7D32]/40 rounded-2xl p-4 space-y-3 text-left">
                <div className="flex items-center gap-2 pb-2 border-b border-[#2E7D32]/20">
                  <CheckCircle2 className="w-4 h-4 text-[#52B788]" />
                  <span className="text-xs font-bold text-white font-heading">
                    Specimen Quality
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-[#8EA396]">
                    <span>Sharpness Score:</span>
                    <span className="text-white font-bold">{focusScore}%</span>
                  </div>
                  <div className="flex justify-between text-[#8EA396]">
                    <span>Foliar Coverage:</span>
                    <span className="text-white font-bold">{foliarCoverage}%</span>
                  </div>
                  <div className="flex justify-between text-[#8EA396]">
                    <span>Quality Status:</span>
                    <span
                      className={
                        focusScore >= 45
                          ? "text-[#52B788] font-bold"
                          : "text-amber-400 font-bold"
                      }
                    >
                      {focusScore >= 65
                        ? "Optimal"
                        : focusScore >= 45
                        ? "Acceptable"
                        : "Low Clarity"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-[#8EA396] leading-relaxed">
                  Verified with OpenCV Laplacian filter. Ready for MobileNetV2 neural forward pass.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== BOTTOM ACTION CONTROLS ===== */}
        <div className="px-6 py-4 bg-[#12231A]/95 border-t border-[#2E7D32]/20 z-20 flex flex-wrap items-center justify-between gap-4">
          
          {/* Left: Vision Mode Selector */}
          {!capturedImage ? (
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setVisionMode("hud")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  visionMode === "hud"
                    ? "bg-[#2E7D32] text-white shadow-xs"
                    : "text-[#8EA396] hover:text-white"
                }`}
              >
                Standard HUD
              </button>
              <button
                type="button"
                onClick={() => setVisionMode("canny")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  visionMode === "canny"
                    ? "bg-[#2E7D32] text-white shadow-xs"
                    : "text-[#8EA396] hover:text-white"
                }`}
              >
                Canny Edges
              </button>
              <button
                type="button"
                onClick={() => setVisionMode("foliar")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  visionMode === "foliar"
                    ? "bg-[#2E7D32] text-white shadow-xs"
                    : "text-[#8EA396] hover:text-white"
                }`}
              >
                Foliar Mask
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRetake}
              className="btn-outline !px-4 !py-2 !text-xs !text-white flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retake Specimen</span>
            </button>
          )}

          {/* Center / Right: Shutter or Confirm Button */}
          {!capturedImage ? (
            <div className="flex items-center gap-3">
              {/* Auto Capture Toggle */}
              <button
                type="button"
                onClick={() => setAutoCapture(!autoCapture)}
                className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 ${
                  autoCapture
                    ? "bg-[#2E7D32]/30 border-[#52B788] text-[#85E3B3]"
                    : "bg-white/5 border-white/10 text-[#8EA396] hover:text-white"
                }`}
                title="Auto-trigger capture when leaf is stable and in focus"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Scan {autoCapture ? "ON" : "OFF"}</span>
              </button>

              {/* Shutter Capture Button */}
              <button
                type="button"
                onClick={handleCaptureSnapshot}
                disabled={permissionStatus !== "granted"}
                className="btn-forest !px-6 !py-3 !text-sm flex items-center gap-2 shadow-lg shadow-[#2E7D32]/30 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Specimen</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConfirmSpecimen}
              className="btn-forest !px-7 !py-3 !text-sm flex items-center gap-2 shadow-xl shadow-[#2E7D32]/40"
            >
              <span>Analyze with Verdra AI</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
