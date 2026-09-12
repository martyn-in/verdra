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

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.warn("Speech synthesis notice:", e);
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
      <div className="flex items-center gap-2 text-xs text-[#8EA396]">
        <VolumeX className="w-4 h-4 text-neutral-400" />
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
        gap: 8,
        padding: "6px 12px",
        background: "rgba(18, 55, 42, 0.05)",
        border: "1px solid #DCE6DC",
        borderRadius: 14,
      }}
    >
      {!isPlaying ? (
        <button
          type="button"
          onClick={() => handleSpeak(activeVoiceLang)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "6px 12px",
            background: "#12372A",
            color: "#FFFFFF",
            borderRadius: 10,
            border: "none",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
          title="Play voice report in active language"
        >
          <Volume2 size={15} color="#4ADE80" />
          <span>
            {activeVoiceLang === "te"
              ? "వినండి (తెలుగు)"
              : activeVoiceLang === "hi"
              ? "सुनें (हिन्दी)"
              : "Read Aloud (Voice)"}
          </span>
        </button>
      ) : (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {isPaused ? (
            <button
              type="button"
              onClick={handleResume}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 10px",
                background: "#2E7D32",
                color: "white",
                borderRadius: 9,
                border: "none",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Play size={13} />
              <span>{t("result.resume", "Resume")}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 10px",
                background: "#E8F0E6",
                color: "#12372A",
                borderRadius: 9,
                border: "1px solid #C4D9C2",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Pause size={13} />
              <span>{t("result.pause", "Pause")}</span>
            </button>
          )}

          <button
            type="button"
            onClick={stopSpeech}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 10px",
              background: "#FEE2E2",
              color: "#DC2626",
              borderRadius: 9,
              border: "1px solid #FECACA",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Square size={13} />
            <span>{t("result.stop", "Stop")}</span>
          </button>
        </div>
      )}

      {/* Direct Vernacular Language Buttons */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 2 }}>
        <button
          type="button"
          onClick={() => handleSpeak("te")}
          style={{
            padding: "4px 8px",
            fontSize: 11,
            fontWeight: activeVoiceLang === "te" ? 800 : 500,
            background: activeVoiceLang === "te" ? "#E8F5E9" : "transparent",
            color: activeVoiceLang === "te" ? "#2E7D32" : "#556059",
            border: activeVoiceLang === "te" ? "1px solid #A5D6A7" : "1px solid transparent",
            borderRadius: 8,
            cursor: "pointer",
          }}
          title="తెలుగులో వినండి (Listen in Telugu)"
        >
          తెలుగు
        </button>

        <button
          type="button"
          onClick={() => handleSpeak("hi")}
          style={{
            padding: "4px 8px",
            fontSize: 11,
            fontWeight: activeVoiceLang === "hi" ? 800 : 500,
            background: activeVoiceLang === "hi" ? "#E8F5E9" : "transparent",
            color: activeVoiceLang === "hi" ? "#2E7D32" : "#556059",
            border: activeVoiceLang === "hi" ? "1px solid #A5D6A7" : "1px solid transparent",
            borderRadius: 8,
            cursor: "pointer",
          }}
          title="हिन्दी में सुनें (Listen in Hindi)"
        >
          हिन्दी
        </button>

        <button
          type="button"
          onClick={() => handleSpeak("en")}
          style={{
            padding: "4px 8px",
            fontSize: 11,
            fontWeight: activeVoiceLang === "en" ? 800 : 500,
            background: activeVoiceLang === "en" ? "#E8F5E9" : "transparent",
            color: activeVoiceLang === "en" ? "#2E7D32" : "#556059",
            border: activeVoiceLang === "en" ? "1px solid #A5D6A7" : "1px solid transparent",
            borderRadius: 8,
            cursor: "pointer",
          }}
          title="Listen in English"
        >
          English
        </button>
      </div>
    </div>
  );
}
