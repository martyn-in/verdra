"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  Square,
  Globe,
} from "lucide-react";
import { useTranslation, Language } from "@/context/LanguageContext";

interface VoiceReadoutProps {
  crop: string;
  disease: string;
  confidence?: number;
  confidenceExplanation?: string;
  confidenceLevel?: string;
  confidenceMessage?: string;
  severity?: any;
  risk?: any;
  immediateAction?: string;
}

export default function VoiceReadout({
  crop,
  disease,
  confidence,
  confidenceLevel,
  confidenceMessage,
  confidenceExplanation,
  severity,
  risk,
  immediateAction,
}: VoiceReadoutProps) {
  const { language, setLanguage, t } = useTranslation();

  const [supported, setSupported] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeVoiceLang, setActiveVoiceLang] = useState<Language>(language);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Sync active voice language with global language when it changes
  useEffect(() => {
    setActiveVoiceLang(language);
  }, [language]);

  // Load voices asynchronously and listen for onvoiceschanged
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }

    const updateVoices = () => {
      try {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          setAvailableVoices(v);
        }
      } catch (e) {
        console.warn("Could not load speech synthesis voices:", e);
      }
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  // Safely extract confidence percentage
  const getConfidenceNumber = (): number => {
    if (typeof confidence === "number" && !isNaN(confidence)) {
      return confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
    }
    return 92;
  };

  // Safely extract severity text
  const getSeverityText = (targetLang: Language): string => {
    let raw = "Moderate";
    let pct: number | null = null;
    if (typeof severity === "object" && severity !== null) {
      raw = severity.level || "Moderate";
      if (typeof severity.percentage === "number") pct = severity.percentage;
    } else if (typeof severity === "string") {
      raw = severity;
    }

    if (targetLang === "te") {
      const trans: Record<string, string> = {
        Low: "తక్కువ",
        Mild: "తక్కువ",
        Moderate: "మధ్యస్థం",
        High: "తీవ్రం",
        Severe: "అత్యంత తీవ్రం",
      };
      const localized = trans[raw] || raw;
      return pct !== null ? `${pct}% (${localized})` : localized;
    } else if (targetLang === "hi") {
      const trans: Record<string, string> = {
        Low: "कम",
        Mild: "हल्की",
        Moderate: "मध्यम",
        High: "उच्च",
        Severe: "गंभीर",
      };
      const localized = trans[raw] || raw;
      return pct !== null ? `${pct}% (${localized})` : localized;
    }

    return pct !== null ? `${pct}% (${raw})` : raw;
  };

  // Safely extract risk level
  const getRiskText = (targetLang: Language): string => {
    let raw = "Moderate";
    if (typeof risk === "object" && risk !== null) {
      raw = risk.level || "Moderate";
    } else if (typeof risk === "string") {
      raw = risk;
    }

    if (targetLang === "te") {
      const trans: Record<string, string> = {
        Low: "తక్కువ",
        Moderate: "మధ్యస్థం",
        High: "అధిక ప్రమాదం",
        Critical: "తీవ్ర ప్రమాదం",
      };
      return trans[raw] || raw;
    } else if (targetLang === "hi") {
      const trans: Record<string, string> = {
        Low: "कम",
        Moderate: "मध्यम",
        High: "उच्च जोखिम",
        Critical: "गंभीर जोखिम",
      };
      return trans[raw] || raw;
    }

    return raw;
  };

  // Construct spoken script
  const buildSpokenScript = (targetLang: Language): { text: string; langCode: string } => {
    const confPct = getConfidenceNumber();
    const cleanDisease = (disease || "Leaf Issue").replace(/_/g, " ");
    const sevText = getSeverityText(targetLang);
    const riskText = getRiskText(targetLang);

    if (targetLang === "te") {
      const action = immediateAction || "సోకిన ఆకులను కత్తిరించండి మరియు తేమను తగ్గించండి.";
      return {
        text: `వెర్డ్రా పంట రోగ నిర్ధారణ నివేదిక. పంట: ${crop || "పంట"}. గుర్తింపు: ${cleanDisease}. ఖచ్చితత్వం: ${confPct} శాతం. వ్యాధి తీవ్రత: ${sevText}. వ్యాప్తి ప్రమాదం: ${riskText}. తక్షణ సలహా: ${action}`,
        langCode: "te-IN",
      };
    } else if (targetLang === "hi") {
      const action = immediateAction || "संक्रमित पत्तियों को छाँटें और नमी को नियंत्रित करें।";
      return {
        text: `वेर्ड्रा फसल स्वास्थ्य रिपोर्ट। फसल: ${crop || "फसल"}। रोग का नाम: ${cleanDisease}। सटीकता: ${confPct} प्रतिशत। गंभीरता: ${sevText}। फैलाव जोखिम: ${riskText}। तत्काल सलाह: ${action}`,
        langCode: "hi-IN",
      };
    } else {
      const action = immediateAction || "Inspect foliage and prune affected leaves immediately.";
      return {
        text: `Verdra crop health analysis. Target crop: ${crop || "Crop"}. Diagnosis: ${cleanDisease}. Confidence: ${confPct} percent. Severity: ${sevText}. Spread risk: ${riskText}. Immediate action: ${action}`,
        langCode: "en-IN",
      };
    }
  };

  const handleSpeak = (targetLang: Language = activeVoiceLang) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }

    window.speechSynthesis.cancel();
    setActiveVoiceLang(targetLang);

    const { text, langCode } = buildSpokenScript(targetLang);
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();

    // Priority matching for best natural voice
    const matchingVoice =
      voices.find((v) => v.lang.replace(/_/g, "-").toLowerCase() === langCode.toLowerCase()) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(langCode.slice(0, 2).toLowerCase())) ||
      voices.find((v) => v.lang.replace(/_/g, "-").toLowerCase() === "en-in") ||
      voices[0];

    if (matchingVoice) {
      utterance.voice = matchingVoice;
      utterance.lang = matchingVoice.lang;
    } else {
      utterance.lang = langCode;
    }

    utterance.rate = 0.92; // Natural, clear pacing for field farmers
    utterance.pitch = 1.0;

    const keepAliveRef = { current: null as any };

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      // Chrome audio keep-alive to prevent premature 15s pause bug
      keepAliveRef.current = setInterval(() => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }
      }, 9000);
    };

    const cleanup = () => {
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
        keepAliveRef.current = null;
      }
      setIsPlaying(false);
      setIsPaused(false);
      if (typeof window !== "undefined") {
        delete (window as any).__verdraActiveUtterance;
      }
    };

    utterance.onend = cleanup;
    utterance.onerror = cleanup;

    // Prevent GC in Chromium engines
    if (typeof window !== "undefined") {
      (window as any).__verdraActiveUtterance = utterance;
    }

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
      <div className="flex items-center gap-2 text-sm text-[#8EA396]">
        <VolumeX className="w-5 h-5 text-neutral-400" />
        <span>{t("result.speech_unsupported", "Voice read-out is unavailable on this device.")}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10,
        padding: "8px 14px",
        background: "rgba(18, 55, 42, 0.06)",
        border: "1.5px solid #D1E2D1",
        borderRadius: 16,
        boxShadow: "0 2px 8px rgba(18, 55, 42, 0.05)",
      }}
    >
      {!isPlaying ? (
        <button
          type="button"
          onClick={() => handleSpeak(activeVoiceLang)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            padding: "10px 18px",
            background: "#12372A",
            color: "#FFFFFF",
            borderRadius: 12,
            border: "none",
            fontSize: 14,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(18, 55, 42, 0.25)",
            transition: "all 0.15s ease",
          }}
          title="Play voice report in active language"
        >
          <Volume2 size={19} color="#4ADE80" />
          <span>
            {activeVoiceLang === "te"
              ? "వినండి (తెలుగు వాయిస్)"
              : activeVoiceLang === "hi"
              ? "सुनें (हिन्दी आवाज़)"
              : "Read Aloud (Voice)"}
          </span>
        </button>
      ) : (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {isPaused ? (
            <button
              type="button"
              onClick={handleResume}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 16px",
                background: "#2E7D32",
                color: "white",
                borderRadius: 11,
                border: "none",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(46, 125, 50, 0.2)",
              }}
            >
              <Play size={15} />
              <span>{t("result.resume", "Resume")}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 16px",
                background: "#E8F0E6",
                color: "#12372A",
                borderRadius: 11,
                border: "1.5px solid #A5D6A7",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <Pause size={15} />
              <span>{t("result.pause", "Pause")}</span>
            </button>
          )}

          <button
            type="button"
            onClick={stopSpeech}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 16px",
              background: "#FEE2E2",
              color: "#DC2626",
              borderRadius: 11,
              border: "1.5px solid #FECACA",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            <Square size={15} />
            <span>{t("result.stop", "Stop")}</span>
          </button>
        </div>
      )}

      {/* Prominent Vernacular Language Selector Buttons */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
        <button
          type="button"
          onClick={() => handleSpeak("te")}
          style={{
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: activeVoiceLang === "te" ? 800 : 600,
            background: activeVoiceLang === "te" ? "#E8F5E9" : "rgba(255,255,255,0.8)",
            color: activeVoiceLang === "te" ? "#1B5E20" : "#4A5D52",
            border: activeVoiceLang === "te" ? "2px solid #2E7D32" : "1.5px solid #DCE6DC",
            borderRadius: 11,
            cursor: "pointer",
            boxShadow: activeVoiceLang === "te" ? "0 2px 6px rgba(46,125,50,0.18)" : "none",
            transition: "all 0.15s ease",
          }}
          title="తెలుగులో వినండి (Listen in Telugu)"
        >
          తెలుగు
        </button>

        <button
          type="button"
          onClick={() => handleSpeak("hi")}
          style={{
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: activeVoiceLang === "hi" ? 800 : 600,
            background: activeVoiceLang === "hi" ? "#E8F5E9" : "rgba(255,255,255,0.8)",
            color: activeVoiceLang === "hi" ? "#1B5E20" : "#4A5D52",
            border: activeVoiceLang === "hi" ? "2px solid #2E7D32" : "1.5px solid #DCE6DC",
            borderRadius: 11,
            cursor: "pointer",
            boxShadow: activeVoiceLang === "hi" ? "0 2px 6px rgba(46,125,50,0.18)" : "none",
            transition: "all 0.15s ease",
          }}
          title="हिन्दी में सुनें (Listen in Hindi)"
        >
          हिन्दी
        </button>

        <button
          type="button"
          onClick={() => handleSpeak("en")}
          style={{
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: activeVoiceLang === "en" ? 800 : 600,
            background: activeVoiceLang === "en" ? "#E8F5E9" : "rgba(255,255,255,0.8)",
            color: activeVoiceLang === "en" ? "#1B5E20" : "#4A5D52",
            border: activeVoiceLang === "en" ? "2px solid #2E7D32" : "1.5px solid #DCE6DC",
            borderRadius: 11,
            cursor: "pointer",
            boxShadow: activeVoiceLang === "en" ? "0 2px 6px rgba(46,125,50,0.18)" : "none",
            transition: "all 0.15s ease",
          }}
          title="Listen in English"
        >
          English
        </button>
      </div>
    </div>
  );
}
