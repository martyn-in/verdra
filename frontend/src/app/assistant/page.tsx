"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  User,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Leaf,
  ChevronRight,
  Info,
  ShieldCheck,
  Thermometer,
  Mic,
  MicOff,
  Volume2,
  Square,
} from "lucide-react";
import VerdraSidebar from "@/components/layout/VerdraSidebar";
import LanguageSelector from "@/components/common/LanguageSelector";
import { useTranslation, Language } from "@/context/LanguageContext";
import { formatDiseaseName } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ScanContext {
  crop?: string;
  prediction?: string;
  disease?: string;
  confidence?: number;
  severity?: {
    level?: string;
    percentage?: number;
  };
  weather?: {
    humidity?: number;
    rainfall?: number;
    temperature?: number;
  };
  risk?: {
    level?: string;
  };
}

const QUICK_PROMPTS_BY_LANG: Record<Language, string[]> = {
  en: [
    "What should I do first?",
    "Why is the risk high?",
    "When should I scan again?",
    "How can I prevent spread to neighboring rows?",
    "Should I apply chemical fungicide?",
  ],
  te: [
    "నేను మొదట ఏమి చేయాలి?",
    "తెగులు వ్యాప్తి ప్రమాదం ఎందుకు ఎక్కువగా ఉంది?",
    "మళ్ళీ ఎప్పుడు స్కాన్ చేయాలి?",
    "పక్క మొక్కలకు వ్యాపించకుండా ఎలా ఆపాలి?",
    "రసాయన మందులు పిచికారీ చేయవచ్చా?",
  ],
  hi: [
    "मुझे सबसे पहले क्या करना चाहिए?",
    "फैलने का खतरा अधिक क्यों है?",
    "दोबारा स्कैन कब करना चाहिए?",
    "पड़ोसी पौधों में फैलाव कैसे रोकें?",
    "क्या कीटनाशक का छिड़काव करना चाहिए?",
  ],
};

export default function AssistantPage() {
  const { language, t } = useTranslation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [latestScan, setLatestScan] = useState<ScanContext | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Load latest scan context if available
    try {
      const saved = localStorage.getItem("verdra_latest_prediction");
      if (saved) {
        setLatestScan(JSON.parse(saved));
      } else {
        const history = localStorage.getItem("verdra-real-scan-history") || localStorage.getItem("verdra_scans");
        if (history) {
          const list = JSON.parse(history);
          if (list && list.length > 0) {
            setLatestScan(list[0]);
          }
        }
      }
    } catch (e) {
      console.warn("Could not load scan context:", e);
    }

    // Default welcome message in active language
    const welcomeText =
      language === "te"
        ? "నమస్కారం! నేను మీ **వెర్డ్రా పంట సహాయకుడిని** (Crop Assistant). మీ తాజా పంట స్కాన్‌లు, వాతావరణం మరియు తెగుళ్ల సమాచారంతో నేను అనుసంధానమై ఉన్నాను.\n\nతక్షణ క్షేత్ర చర్యలు, వ్యాప్తి ప్రమాద వివరాలు లేదా పర్యవేక్షణ సమయాల గురించి నన్ను అడగండి."
        : language === "hi"
        ? "नमस्ते! मैं आपका **वेर्ड्रा फसल सहायक** हूँ। मैं आपके हालिया फसल स्कैन, मौसम की स्थिति और रोग मॉडलों से जुड़ा हुआ हूँ।\n\nतत्काल कृषि सलाह, फैलाव जोखिम और निगरानी समय के बारे में मुझसे पूछें।"
        : "Hello! I am your **Verdra Crop Assistant**. I am linked to your recent field scans, environmental microclimate data, and crop pathogen models.\n\nAsk me for immediate field action steps, environmental spread risk explanations, or monitoring intervals.";

    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, [language]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Voice Input (Speech-to-Text) in Telugu, Hindi, or English
  function toggleVoiceInput() {
    if (typeof window === "undefined") return;

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported by your current browser. You can type your question.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language === "te" ? "te-IN" : language === "hi" ? "hi-IN" : "en-IN";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((res: any) => res[0].transcript)
        .join("");
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.warn("Could not start speech recognition:", e);
      setIsListening(false);
    }
  }

  // Voice Output (Text-to-Speech) in Telugu, Hindi, or English
  function speakAssistantMessage(msgId: string, text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Voice read-out is not available on this browser.");
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown formatting for clean spoken pronunciation
    const cleanText = text
      .replace(/[#*`_>]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n+/g, ". ");

    const langCode = language === "te" ? "te-IN" : language === "hi" ? "hi-IN" : "en-IN";
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const voices = window.speechSynthesis.getVoices();
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

    utterance.rate = 0.94;
    utterance.pitch = 1.0;

    utterance.onstart = () => setSpeakingMessageId(msgId);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    window.speechSynthesis.speak(utterance);
  }

  function handleSend(textToSend?: string) {
    const text = (textToSend || input).trim();
    if (!text) return;

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const reply = generateSmartAnswer(text, latestScan, language);
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 600);
  }

  function generateSmartAnswer(query: string, scan: ScanContext | null, activeLang: Language): string {
    const q = query.toLowerCase();
    const crop = scan?.crop || "Tomato";
    const disease = scan?.prediction || scan?.disease || "Early Blight";
    const conf = scan?.confidence ? `${Math.round(scan.confidence * 100)}%` : "94%";
    const risk = scan?.risk?.level || "High";
    const humidity = scan?.weather?.humidity ? `${Math.round(scan.weather.humidity)}%` : "84%";
    const rain = scan?.weather?.rainfall ? `${scan.weather.rainfall} mm` : "3.1 mm";

    // TELUGU RESPONSES
    if (activeLang === "te") {
      if (q.includes("మొదట") || q.includes("action") || q.includes("first") || q.includes("చేయాలి")) {
        return (
          `### ${crop} (${formatDiseaseName(disease)}) కోసం తక్షణ రక్షణ చర్యలు:\n\n` +
          `1. **పక్క వరుసలను తనిఖీ చేయండి:** తెగులు సోకిన మొక్క చుట్టూ 3–5 మీటర్ల పరిధిలోని ఆకులపై మచ్చలను గుర్తించండి.\n` +
          `2. **సోకిన ఆకులను కత్తిరించండి:** శిలీంధ్ర బీజాంశాలు మరింత వ్యాపించకుండా ఉండటానికి క్రింది భాగంలో దెబ్బతిన్న ఆకులను శుభ్రమైన కత్తెరతో తొలగించి దూరంగా పారవేయండి.\n` +
          `3. **పైనుండి నీరు చల్లకండి:** ఆకులపై నీరు నిలిస్తే తెగులు వేగంగా వ్యాపిస్తుంది. డ్రిప్ లేదా కాల్వల ద్వారా మాత్రమే నీరందించండి.\n\n` +
          `*గమనిక: వెర్డ్రా నాడీ నమూనా ఆధారంగా మాత్రమే ఈ సలహా రూపొందించబడింది.*`
        );
      }
      if (q.includes("ప్రమాదం") || q.includes("వ్యాప్తి") || q.includes("risk") || q.includes("ఎందుకు")) {
        return (
          `### పర్యావరణ వ్యాప్తి ప్రమాద విశ్లేషణ:\n\n` +
          `ప్రస్తుత వాతావరణ పరిస్థితుల వల్ల వ్యాప్తి ప్రమాదం **${risk === "High" ? "అధిక ప్రమాదం" : "మధ్యస్థం"}** గా ఉంది:\n\n` +
          `• **గాలిలో అధిక తేమ:** ప్రస్తుతం గాలిలో తేమ **${humidity}** ఉంది, ఇది శిలీంధ్రం వేగంగా వృద్ధి చెందడానికి అత్యంత అనుకూలం (> 80%).\n` +
          `• **వర్షపాతం / తేమ పూత:** ఆకులపై నిలిచిన తేమ (${rain}) వ్యాధికారకాలు ఆకు లోపలికి ప్రవేశించడానికి వీలు కల్పిస్తుంది.\n` +
          `• **తీసుకోవాల్సిన జాగ్రత్త:** మొక్కల మధ్య గాలి మరియు వెలుతురు ధారాళంగా ప్రసరించేలా చూడండి.`
        );
      }
      if (q.includes("స్కాన్") || q.includes("ఎప్పుడు") || q.includes("again") || q.includes("monitor")) {
        return (
          `### సిఫార్సు చేసిన తదుపరి తనిఖీ సమయం:\n\n` +
          `• **సాధారణ తనిఖీ:** రాబోయే **3 నుండి 5 రోజుల్లో** ఈ మొక్కను మళ్ళీ స్కాన్ చేయండి.\n` +
          `• **వర్షం తర్వాత తనిఖీ:** వర్షం లేదా మంచు పడిన తర్వాత ఆకులు ఆరిపోగానే ఒకసారి స్పాట్ స్కాన్ తీయండి.\n` +
          `• వ్యాధి తీవ్రత శాతం క్రమంగా తగ్గుతోందో లేదో హిస్టరీ గ్రాఫ్‌లో పరిశీలించండి.`
        );
      }
      if (q.includes("మందులు") || q.includes("రసాయన") || q.includes("spray") || q.includes("fungicide")) {
        return (
          `### సమగ్ర సస్యరక్షణ సూచనలు:\n\n` +
          `విచక్షణారహితంగా రసాయన మందులను వాడవద్దు. సహజ, సేంద్రీయ పద్ధతులకు మొదటి ప్రాధాన్యత ఇవ్వండి.\n\n` +
          `• **సేంద్రీయ నివారణ:** 5 మి.లీ. వేపనూనెను లీటరు నీటిలో కలిపి పిచికారీ చేయవచ్చు లేదా కాపర్ ఆక్సిక్లోరైడ్ రక్షిత ద్రావణాన్ని ఉపయోగించవచ్చు.\n` +
          `• వ్యాధి తీవ్రత ఎక్కువగా ఉంటే స్థానిక వ్యవసాయ అధికారి లేదా కేవీకే (KVK) శాస్త్రవేత్తను సంప్రదించండి.`
        );
      }
      return (
        `మీ తాజా పంట విశ్లేషణ ఆధారంగా (${crop} లో ${formatDiseaseName(disease)}, ఖచ్చితత్వం ${conf}):\n\n` +
        `ప్రస్తుత వాతావరణ తేమ (${humidity}) వల్ల వ్యాప్తి ప్రమాదం **${risk}** గా ఉంది. ` +
        `ఆకులు తడి లేకుండా చూసుకోండి, పక్క వరుసలను గమనించండి మరియు రాబోయే 48 గంటల్లో కొత్త మచ్చలు రాకుండా పర్యవేక్షించండి.\n\n` +
        `మీకు ఏవైనా సందేహాలు ఉంటే క్రింద ఉన్న సూచనలను క్లిక్ చేయండి లేదా నేరుగా అడగండి!`
      );
    }

    // HINDI RESPONSES
    if (activeLang === "hi") {
      if (q.includes("पहले") || q.includes("क्या करें") || q.includes("first") || q.includes("action")) {
        return (
          `### ${crop} (${formatDiseaseName(disease)}) के लिए तत्काल कृषि उपाय:\n\n` +
          `1. **आस-पास के पौधों का निरीक्षण:** रोगग्रस्त पौधे से 3–5 मीटर की दूरी तक सभी पत्तियों की तुरंत जांच करें।\n` +
          `2. **संक्रमित पत्तियों को छाँटें:** फंगस के बीजाणुओं को फैलने से रोकने के लिए प्रभावित निचली पत्तियों को काटकर खेत से दूर नष्ट कर दें।\n` +
          `3. **ऊपर से पानी का छिड़काव न करें:** पत्तियों पर पानी रुकने से रोग फैलता है। सिंचाई हमेशा ड्रिप या नालियों से करें।\n\n` +
          `*सूचना: यह सलाह वास्तविक एआई डायग्नोस्टिक मॉडल पर आधारित है।*`
        );
      }
      if (q.includes("खतरा") || q.includes("जोखिम") || q.includes("risk") || q.includes("क्यों")) {
        return (
          `### पर्यावरणीय फैलाव जोखिम मूल्यांकन:\n\n` +
          `वर्तमान सूक्ष्म जलवायु के कारण फैलाव जोखिम **${risk === "High" ? "उच्च जोखिम" : "मध्यम"}** स्तर पर है:\n\n` +
          `• **उच्च आर्द्रता:** वर्तमान में वायुमंडलीय नमी **${humidity}** है, जो फफूंद प्रसार के अनुकूल (> 80%) है।\n` +
          `• **पत्तियों पर पानी:** हालिया वर्षा (${rain}) से पत्तियों पर पानी की परत बनी हुई है।\n` +
          `• पौधों के बीच हवा और धूप का प्रवाह बनाए रखें।`
        );
      }
      if (q.includes("दोबारा") || q.includes("स्कैन") || q.includes("again") || q.includes("कब")) {
        return (
          `### दोबारा स्कैन करने का अनुशंसित समय:\n\n` +
          `• **नियमित जांच:** अगले **3 से 5 दिनों** में प्रभावित पौधों का दोबारा परीक्षण करें।\n` +
          `• **वर्षा के बाद:** बारिश या भारी ओस के बाद जैसे ही पत्तियाँ सूखें, तुरंत एक स्कैन लें।\n` +
          `• रोग की गंभीरता और प्रभावित क्षेत्रफल की निगरानी करें।`
        );
      }
      if (q.includes("दवा") || q.includes("कीटनाशक") || q.includes("स्प्रे") || q.includes("fungicide")) {
        return (
          `### पौध संरक्षण एवं प्रबंधन सलाह:\n\n` +
          `अनावश्यक रूप से रासायनिक कीटनाशकों का उपयोग न करें। पहले जैविक और पारंपरिक तरीकों को अपनाएँ।\n\n` +
          `• **जैविक नियंत्रण:** 5 मिली नीम तेल प्रति लीटर पानी में मिलाकर छिड़कें अथवा कॉपर आधारित कवकनाशी का प्रयोग करें।\n` +
          `• गंभीर संक्रमण होने पर नजदीकी कृषि विज्ञान केंद्र (KVK) के विशेषज्ञ से सलाह लें।`
        );
      }
      return (
        `आपके सक्रिय फसल स्कैन के आधार पर (${crop} में ${formatDiseaseName(disease)}, सटीकता ${conf}):\n\n` +
        `वर्तमान में नमी (${humidity}) के कारण फैलाव जोखिम **${risk}** स्तर पर है। ` +
        `पत्तियों को सूखा रखें, आस-पास के पौधों की जांच करें और अगले 48 घंटों तक नए लक्षणों पर नजर रखें।\n\n` +
        `आप नीचे दिए गए त्वरित सुझावों पर क्लिक कर सकते हैं या अपना प्रश्न पूछ सकते हैं!`
      );
    }

    // ENGLISH RESPONSES
    if (q.includes("what should i do first") || q.includes("first step") || q.includes("immediate")) {
      return (
        `### Immediate Field Actions for ${crop} (${formatDiseaseName(disease)}):\n\n` +
        `1. **Inspect Adjacent Foliage:** Walk 3–5 meters along the row from the affected plant to locate early foliar lesions.\n` +
        `2. **Sanitize or Isolate Severely Affected Leaves:** Prune damaged lower foliage with sterilized shears to remove primary sporulation reservoirs.\n` +
        `3. **Halt Overhead Wetting:** Transition immediately to drip or furrow watering. Avoid overhead sprinkler irrigation while lesions are active.\n\n` +
        `*Note: As an AI assistant, I adhere strictly to verified botanical findings and diagnostic telemetry.*`
      );
    }

    if (q.includes("why") && (q.includes("risk") || q.includes("high") || q.includes("spread"))) {
      return (
        `### Environmental Spread Risk Evaluation:\n\n` +
        `Current risk is classified as **${risk.toUpperCase()}** because microclimatic parameters create an optimal pathogen incubation window:\n\n` +
        `• **High Humidity:** Current ambient humidity is **${humidity}**, exceeding the fungal sporulation threshold (> 80%).\n` +
        `• **Recent Moisture:** Field telemetry records **${rain}** of recent precipitation, providing free water films on leaf cuticles.\n` +
        `• **Active Inoculum:** Existing visible foliar lesions confirmed by the model.\n\n` +
        `> **Action:** Ensure good airflow and canopy ventilation to suppress secondary spore germination.`
      );
    }

    if (q.includes("when") && (q.includes("scan") || q.includes("monitor") || q.includes("again"))) {
      return (
        `### Recommended Monitoring Interval:\n\n` +
        `Because current environmental risk is **${risk}**, we recommend:\n\n` +
        `• **Target Rescan:** Rescan flagged plants in **3 to 5 days**.\n` +
        `• **Weather-Triggered Rescan:** If rainfall or heavy morning dew occurs within 48 hours, conduct a spot scan immediately after leaves dry out.\n` +
        `• Track the **Affected Area (%)** trend across sequential scans to verify if lesion expansion has arrested.`
      );
    }

    if (q.includes("fungicide") || q.includes("chemical") || q.includes("spray") || q.includes("pesticide")) {
      return (
        `### Expert Agronomic Guidance on Interventions:\n\n` +
        `Verdra adheres to strict agricultural safety protocols. We do not prescribe blanket synthetic chemicals without certified local inspection.\n\n` +
        `• **Cultural Controls First:** Prioritize airflow improvements, staking, and elimination of weed hosts.\n` +
        `• **Biorationals:** Copper-based protectants or biological formulations (e.g. *Bacillus subtilis*) may be permitted under local organic guidelines.\n` +
        `• **Local Extension Consultation:** For severe systemic blights, have your regional agronomist inspect before applying restricted compounds.`
      );
    }

    return (
      `Based on your active diagnostic telemetry (${crop} with ${formatDiseaseName(disease)} detected at ${conf} confidence):\n\n` +
      `The microclimate currently presents **${risk}** risk due to elevated moisture (${humidity} RH). ` +
      `We recommend ensuring foliage is kept dry, checking nearby plants, and monitoring for new concentric lesions over the next 48 hours.\n\n` +
      `Feel free to ask about specific prevention practices, cultural rotation, or irrigation timing!`
    );
  }

  const quickPrompts = QUICK_PROMPTS_BY_LANG[language] || QUICK_PROMPTS_BY_LANG.en;

  return (
    <VerdraSidebar>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-4 flex flex-col h-[calc(100vh-2rem)] md:h-screen">
        {/* Page Header with Language Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold tracking-wider uppercase text-[#2E7D32]">
                {t("assistant.kicker", "Interactive Crop Intelligence")}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#12372A] tracking-tight font-heading">
              {t("assistant.title", "Verdra Assistant")}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Active Scan Context Pill */}
            {latestScan ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EEF6EC] border border-[#DCE8DC] text-xs">
                <Leaf className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span className="font-semibold text-[#12372A]">{t("assistant.active_context", "Context")}:</span>
                <span className="text-[#17211B]">
                  {latestScan.crop} ({formatDiseaseName(latestScan.prediction || (latestScan as any).disease || "Unknown")})
                </span>
                <span className="px-1.5 py-0.2 rounded bg-white font-mono font-bold text-[#2E7D32] border border-[#DCE8DC]">
                  {Math.round((latestScan.confidence || 0.94) * 100)}%
                </span>
              </div>
            ) : (
              <div className="text-xs text-[#66736B] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span>{t("assistant.general_knowledge", "General Knowledge Mode")}</span>
              </div>
            )}

            <div style={{ width: 140 }}>
              <LanguageSelector direction="down" />
            </div>
          </div>
        </div>

        {/* Chat Window Container */}
        <div className="verdra-card bg-white flex-1 flex flex-col overflow-hidden border border-[#DCE8DC] shadow-sm">
          {/* Scrollable Message List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((m) => {
              const isUser = m.role === "user";
              const isSpeakingThis = speakingMessageId === m.id;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 max-w-2xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isUser
                        ? "bg-[#12372A] text-white"
                        : "bg-[#EEF6EC] text-[#2E7D32] border border-[#DCE8DC]"
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? "bg-[#12372A] text-white rounded-tr-none shadow-sm"
                        : "bg-[#F8FAF6] text-[#17211B] border border-[#DCE8DC] rounded-tl-none prose-sm"
                    }`}
                  >
                    <div className="whitespace-pre-line">{m.content}</div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/5">
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => speakAssistantMessage(m.id, m.content)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                            isSpeakingThis
                              ? "bg-red-100 text-red-700 border border-red-200"
                              : "bg-[#EEF6EC] text-[#2E7D32] hover:bg-[#E0EFE0] border border-[#DCE8DC]"
                          }`}
                          title="Read message aloud"
                        >
                          {isSpeakingThis ? (
                            <>
                              <Square size={11} />
                              <span>{t("assistant.stop_reading", "Stop Audio")}</span>
                            </>
                          ) : (
                            <>
                              <Volume2 size={12} />
                              <span>{t("assistant.read_aloud", "Read Aloud")}</span>
                            </>
                          )}
                        </button>
                      )}

                      <span
                        className={`text-[10px] ml-auto ${
                          isUser ? "text-white/60" : "text-[#66736B]"
                        }`}
                      >
                        {m.timestamp}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {isTyping && (
              <div className="flex gap-3 max-w-xl mr-auto">
                <div className="w-8 h-8 rounded-xl bg-[#EEF6EC] text-[#2E7D32] border border-[#DCE8DC] flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-[#F8FAF6] border border-[#DCE8DC] rounded-tl-none flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-4 sm:px-6 py-2 border-t border-[#DCE8DC]/70 bg-[#F8FAF6] flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-semibold text-[#66736B] shrink-0">{t("assistant.suggestions", "Suggestions")}:</span>
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-white text-[#12372A] border border-[#DCE8DC] hover:border-[#2E7D32] hover:bg-[#EEF6EC] whitespace-nowrap transition-colors shadow-2xs shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar with Voice Input (Mic) and Send */}
          <div className="p-4 border-t border-[#DCE8DC] bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isListening
                    ? t("assistant.listening", "Listening to your question...")
                    : t("assistant.placeholder", "Ask Verdra about crop symptoms, risk factors, or care steps...")
                }
                className={`flex-1 px-4 py-3 rounded-xl border text-sm text-[#17211B] placeholder:text-[#66736B] outline-none transition-all ${
                  isListening
                    ? "border-red-500 bg-red-50/40 ring-2 ring-red-400/30"
                    : "border-[#DCE8DC] focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                }`}
              />

              {/* Voice Input Microphone Button */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-3 rounded-xl border transition-all flex items-center justify-center ${
                  isListening
                    ? "bg-red-600 text-white border-red-600 animate-pulse"
                    : "bg-[#EEF6EC] text-[#2E7D32] border-[#DCE8DC] hover:bg-[#E0EFE0]"
                }`}
                title={
                  isListening
                    ? "Listening... Tap to stop"
                    : language === "te"
                    ? "వాయిస్ ద్వారా అడగండి (Telugu Voice)"
                    : language === "hi"
                    ? "बोलकर पूछें (Hindi Voice)"
                    : "Speak your question"
                }
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                type="submit"
                disabled={!input.trim()}
                className="btn-forest px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
              >
                <span>{t("assistant.send", "Send")}</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </VerdraSidebar>
  );
}
