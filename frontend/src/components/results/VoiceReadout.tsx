"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  Square,
  Globe,
  Loader2,
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
  const { language, setLanguage, t, getDiseaseKnowledge } = useTranslation();

  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeVoiceLang, setActiveVoiceLang] = useState<Language>(language);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Sync active voice language with global language when it changes
  useEffect(() => {
    setActiveVoiceLang(language);
  }, [language]);

  const stopAllAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, [stopAllAudio]);

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
        Mild: "తేలికపాటి",
        Moderate: "మధ్యస్థం",
        High: "తీవ్రం",
        Severe: "అత్యంత తీవ్రం",
        Healthy: "ఆరోగ్యకరం",
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
        Healthy: "स्वस्थ",
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
        Low: "తక్కువ ప్రమాదం",
        Moderate: "మధ్యస్థ ప్రమాదం",
        High: "అధిక ప్రమాదం",
        Critical: "తీవ్రమైన ప్రమాదం",
      };
      return trans[raw] || raw;
    } else if (targetLang === "hi") {
      const trans: Record<string, string> = {
        Low: "कम जोखिम",
        Moderate: "मध्यम जोखिम",
        High: "उच्च जोखिम",
        Critical: "गंभीर जोखिम",
      };
      return trans[raw] || raw;
    }

    return raw;
  };

  // Crop translation
  const getLocalizedCrop = (targetLang: Language): string => {
    const c = (crop || "").toLowerCase();
    if (targetLang === "te") {
      if (c.includes("tomato")) return "టమాటా";
      if (c.includes("potato")) return "బంగాళాదుంప";
      if (c.includes("pepper")) return "మిరప";
      return crop || "పంట";
    }
    if (targetLang === "hi") {
      if (c.includes("tomato")) return "टमाटर";
      if (c.includes("potato")) return "आलू";
      if (c.includes("pepper")) return "शिमला मिर्च";
      return crop || "फसल";
    }
    return crop || "Crop";
  };

  // Disease translation
  const getLocalizedDisease = (targetLang: Language): string => {
    const knowledge = getDiseaseKnowledge(disease);
    if (targetLang === "te") {
      if (/healthy/i.test(disease)) return "ఆరోగ్యకరమైన ఆకు";
      if (knowledge?.canonical_name) {
        if (/late blight/i.test(disease)) return "లేట్ బ్లైట్ తెగులు";
        if (/early blight/i.test(disease)) return "ఎర్లీ బ్లైట్ తెగులు";
        if (/bacterial spot/i.test(disease)) return "బాక్టీరియల్ ఆకుమచ్చ తెగులు";
        return knowledge.canonical_name;
      }
      return (disease || "").replace(/_/g, " ");
    }
    if (targetLang === "hi") {
      if (/healthy/i.test(disease)) return "स्वस्थ पत्ती";
      if (/late blight/i.test(disease)) return "झुलसा रोग (लेट ब्लाइट)";
      if (/early blight/i.test(disease)) return "अगेती झुलसा (अर्घ ब्लाइट)";
      if (/bacterial spot/i.test(disease)) return "जीवाणु धब्बा रोग";
      return (disease || "").replace(/_/g, " ");
    }
    return (disease || "Leaf Condition").replace(/_/g, " ");
  };

  // Construct spoken script
  const buildSpokenScript = (targetLang: Language): { text: string; langCode: string } => {
    const confPct = getConfidenceNumber();
    const locCrop = getLocalizedCrop(targetLang);
    const locDisease = getLocalizedDisease(targetLang);
    const sevText = getSeverityText(targetLang);
    const riskText = getRiskText(targetLang);
    const knowledge = getDiseaseKnowledge(disease);

    if (targetLang === "te") {
      const action =
        knowledge?.immediate_actions?.[0] ||
        immediateAction ||
        "సోకిన ఆకులను కత్తిరించండి మరియు తేమను తగ్గించండి.";
      return {
        text: `వెర్డ్రా పంట రోగ నిర్ధారణ నివేదిక. పంట: ${locCrop}. నిర్ధారణ: ${locDisease}. ఖచ్చితత్వం: ${confPct} శాతం. వ్యాధి తీవ్రత: ${sevText}. వ్యాప్తి ప్రమాదం: ${riskText}. తక్షణ సలహా: ${action}`,
        langCode: "te",
      };
    } else if (targetLang === "hi") {
      const action =
        knowledge?.immediate_actions?.[0] ||
        immediateAction ||
        "संक्रमित पत्तियों को छाँटें और नमी को नियंत्रित करें।";
      return {
        text: `वेर्ड्रा फसल स्वास्थ्य रिपोर्ट। फसल: ${locCrop}। रोग: ${locDisease}। सटीकता: ${confPct} प्रतिशत। गंभीरता: ${sevText}। फैलाव जोखिम: ${riskText}। तत्काल सलाह: ${action}`,
        langCode: "hi",
      };
    } else {
      const action =
        immediateAction ||
        knowledge?.immediate_actions?.[0] ||
        "Inspect foliage and prune affected leaves immediately.";
      return {
        text: `Verdra crop health analysis. Target crop: ${locCrop}. Diagnosis: ${locDisease}. Confidence: ${confPct} percent. Severity: ${sevText}. Spread risk: ${riskText}. Immediate action: ${action}`,
        langCode: "en",
      };
    }
  };

  const handleSpeak = async (targetLang: Language = activeVoiceLang) => {
    stopAllAudio();
    setActiveVoiceLang(targetLang);
    setIsLoading(true);

    const { text, langCode } = buildSpokenScript(targetLang);

    // Primary: Native Vernacular Audio via /api/tts endpoint
    try {
      const ttsUrl = `/api/tts?text=${encodeURIComponent(text)}&lang=${langCode}`;
      const audio = new Audio(ttsUrl);
      audioRef.current = audio;

      audio.oncanplay = () => {
        setIsLoading(false);
      };

      audio.onplay = () => {
        setIsPlaying(true);
        setIsPaused(false);
        setIsLoading(false);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
        audioRef.current = null;
      };

      audio.onerror = (e) => {
        console.warn("Audio element error, falling back to browser synthesis:", e);
        fallbackSpeechSynthesis(text, langCode);
      };

      await audio.play();
      return;
    } catch (err) {
      console.warn("Audio play failed, falling back to speech synthesis:", err);
      fallbackSpeechSynthesis(text, langCode);
    }
  };

  const fallbackSpeechSynthesis = (text: string, langCode: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsLoading(false);
      setIsPlaying(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      const voices = window.speechSynthesis.getVoices();
      const match =
        voices.find((v) => v.lang.toLowerCase().startsWith(langCode)) ||
        voices.find((v) => v.lang.toLowerCase().includes("in")) ||
        voices[0];

      if (match) utterance.voice = match;
      utterance.rate = 0.92;

      utterance.onstart = () => {
        setIsPlaying(true);
        setIsPaused(false);
        setIsLoading(false);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setIsLoading(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const handlePause = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPaused(true);
    } else if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleResume = () => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
      setIsPaused(false);
    } else if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

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
      {!isPlaying && !isLoading ? (
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
      ) : isLoading ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            background: "#1b4332",
            color: "#ffffff",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <Loader2 size={17} className="animate-spin" color="#4ade80" />
          <span>
            {activeVoiceLang === "te"
              ? "వాయిస్ సిద్ధమవుతోంది..."
              : activeVoiceLang === "hi"
              ? "आवाज़ लोड हो रही है..."
              : "Generating Audio..."}
          </span>
        </div>
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
            onClick={stopAllAudio}
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
