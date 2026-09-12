"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  Square,
  AlertCircle,
} from "lucide-react";
import { useTranslation, Language } from "@/context/LanguageContext";

interface VoiceReadoutProps {
  crop: string;
  disease: string;
  confidence: number;
  confidenceLevel?: string;
  confidenceMessage?: string;
  severity?: { level?: string; percentage?: number | null };
  risk?: { level?: string; explanation?: string };
  immediateAction?: string;
}

export default function VoiceReadout({
  crop,
  disease,
  confidence,
  confidenceLevel,
  confidenceMessage,
  severity,
  risk,
  immediateAction,
}: VoiceReadoutProps) {
  const { language, t } = useTranslation();

  const [supported, setSupported] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
    }
  }, []);

  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  // Construct vernacular spoken script based on language
  const buildSpokenScript = (): { text: string; langCode: string } => {
    const confPct = (confidence * 100).toFixed(0);
    const sevText = severity?.percentage !== null && severity?.percentage !== undefined
      ? `${severity.percentage}%`
      : severity?.level || "Moderate";
    const riskLvl = risk?.level || "Moderate";

    if (language === "te") {
      // Telugu Script
      const actionText = immediateAction ? `తక్షణ సలహా: ${immediateAction}` : "";
      return {
        text: `వెర్డ్రా పంట ఆరోగ్య నివేదిక. పంట: ${crop}. నిర్ధారణ: ${disease}. ఖచ్చితత్వం: ${confPct} శాతం. వ్యాధి తీవ్రత: ${sevText}. వ్యాప్తి ప్రమాదం: ${riskLvl}. ${actionText}`,
        langCode: "te-IN",
      };
    } else if (language === "hi") {
      // Hindi Script
      const actionText = immediateAction ? `तत्काल सलाह: ${immediateAction}` : "";
      return {
        text: `वेर्ड्रा फसल स्वास्थ्य रिपोर्ट। फसल: ${crop}। निदान: ${disease}। सटीकता: ${confPct} प्रतिशत। गंभीरता: ${sevText}। फैलाव जोखिम: ${riskLvl}। ${actionText}`,
        langCode: "hi-IN",
      };
    } else {
      // English (India) Script
      const actionText = immediateAction ? `Immediate action: ${immediateAction}` : "";
      return {
        text: `Verdra crop health analysis. Crop: ${crop}. Diagnosis: ${disease}. Confidence: ${confPct} percent. Severity: ${sevText}. Risk: ${riskLvl}. ${actionText}`,
        langCode: "en-IN",
      };
    }
  };

  const handleReadResult = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }

    window.speechSynthesis.cancel();

    const { text, langCode } = buildSpokenScript();
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Pick best matching voice
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice =
      voices.find((v) => v.lang === langCode) ||
      voices.find((v) => v.lang.startsWith(langCode.slice(0, 2))) ||
      voices.find((v) => v.lang === "en-IN") ||
      voices[0];

    if (matchingVoice) {
      utterance.voice = matchingVoice;
      utterance.lang = matchingVoice.lang;
    } else {
      utterance.lang = langCode;
    }

    utterance.rate = 0.95; // Clear natural pacing
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.warn("Speech synthesis error:", e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePause = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleResume = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  if (!supported) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#8EA396] font-mono">
        <VolumeX className="w-4 h-4 text-neutral-500" />
        <span>{t("result.speech_unsupported", "Voice read-out is unavailable on this device.")}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10">
      {!isPlaying ? (
        <button
          type="button"
          onClick={handleReadResult}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#2E7D32]/30 hover:bg-[#2E7D32]/50 border border-[#2E7D32]/40 text-xs font-medium text-emerald-100 transition-all"
        >
          <Volume2 className="w-4 h-4 text-[#52B788]" />
          <span>{t("result.read_result", "Read Result")}</span>
        </button>
      ) : (
        <>
          {/* Pause / Resume */}
          {isPaused ? (
            <button
              type="button"
              onClick={handleResume}
              className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 text-xs flex items-center gap-1"
              title="Resume Speech"
            >
              <Play className="w-3.5 h-3.5" />
              <span className="text-[11px]">{t("result.resume", "Resume")}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 text-xs flex items-center gap-1"
              title="Pause Speech"
            >
              <Pause className="w-3.5 h-3.5" />
              <span className="text-[11px]">{t("result.pause", "Pause")}</span>
            </button>
          )}

          {/* Stop */}
          <button
            type="button"
            onClick={stopSpeech}
            className="p-2 rounded-xl bg-red-950/60 border border-red-800/40 text-red-300 hover:bg-red-900/60 text-xs flex items-center gap-1"
            title="Stop Speech"
          >
            <Square className="w-3.5 h-3.5" />
            <span className="text-[11px]">{t("result.stop", "Stop")}</span>
          </button>
        </>
      )}
    </div>
  );
}
