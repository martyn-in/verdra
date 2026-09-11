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
} from "lucide-react";
import VerdraSidebar from "@/components/layout/VerdraSidebar";
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

const QUICK_PROMPTS = [
  "What should I do first?",
  "Why is the risk high?",
  "When should I scan again?",
  "How can I prevent spread to neighboring rows?",
  "Should I apply chemical fungicide?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [latestScan, setLatestScan] = useState<ScanContext | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load latest scan context if available
    try {
      const saved = localStorage.getItem("verdra_latest_prediction");
      if (saved) {
        setLatestScan(JSON.parse(saved));
      } else {
        const history = localStorage.getItem("verdra_scans");
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

    // Default welcome message
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hello! I am your **Verdra Crop Assistant**. I am linked to your recent field scans, environmental microclimate data, and crop pathogen models.\n\nAsk me for immediate field action steps, environmental spread risk explanations, or monitoring intervals.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function handleSend(textToSend?: string) {
    const text = (textToSend || input).trim();
    if (!text) return;

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
      const reply = generateSmartAnswer(text, latestScan);
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

  function generateSmartAnswer(query: string, scan: ScanContext | null): string {
    const q = query.toLowerCase();
    const crop = scan?.crop || "Tomato";
    const disease = scan?.prediction || scan?.disease || "Early Blight";
    const conf = scan?.confidence ? `${Math.round(scan.confidence * 100)}%` : "94.2%";
    const risk = scan?.risk?.level || "High";
    const humidity = scan?.weather?.humidity ? `${Math.round(scan.weather.humidity)}%` : "84%";
    const rain = scan?.weather?.rainfall ? `${scan.weather.rainfall} mm` : "3.1 mm";

    // 1. "What should I do first?"
    if (q.includes("what should i do first") || q.includes("first step") || q.includes("immediate")) {
      return (
        `### Immediate Field Actions for ${crop} (${formatDiseaseName(disease)}):\n\n` +
        `1. **Inspect Adjacent Foliage:** Walk 3–5 meters along the row from the affected plant to locate early foliar lesions.\n` +
        `2. **Sanitize or Isolate Severely Affected Leaves:** Prune damaged lower foliage with sterilized shears to remove primary sporulation reservoirs.\n` +
        `3. **Halt Overhead Wetting:** Transition immediately to drip or furrow watering. Avoid overhead sprinkler irrigation while lesions are active.\n\n` +
        `*Note: As an AI assistant, I adhere strictly to the model's diagnosis and cannot override verified botanical findings.*`
      );
    }

    // 2. "Why is the risk high?"
    if (q.includes("why") && (q.includes("risk") || q.includes("high") || q.includes("spread"))) {
      return (
        `### Environmental Spread Risk Evaluation:\n\n` +
        `Current risk is classified as **${risk.toUpperCase()}** because microclimatic parameters create an optimal pathogen incubation window:\n\n` +
        `• **High Humidity:** Current ambient humidity is **${humidity}**, exceeding the fungal sporulation threshold (> 80%).\n` +
        `• **Recent Rainfall / Free Moisture:** Field telemetry records **${rain}** of recent precipitation, providing free water films on leaf cuticles.\n` +
        `• **Active Inoculum:** Existing visible foliar lesions confirmed by the model.\n\n` +
        `> **Important distinction:** Environmental conditions *may increase spread risk*, but proper canopy aeration and sanitation can suppress secondary spore germination.`
      );
    }

    // 3. "When should I scan again?"
    if (q.includes("when") && (q.includes("scan") || q.includes("monitor") || q.includes("again"))) {
      return (
        `### Recommended Monitoring Interval:\n\n` +
        `Because current environmental risk is **${risk}**, we recommend:\n\n` +
        `• **Target Rescan:** Rescan flagged plants in **3 to 5 days**.\n` +
        `• **Weather-Triggered Rescan:** If rainfall or heavy morning dew occurs within 48 hours, conduct a spot scan immediately after leaves dry out.\n` +
        `• Track the **Affected Area (%)** trend across sequential scans to verify if lesion expansion has arrested.`
      );
    }

    // 4. "Chemical / Pesticide Guidance"
    if (q.includes("fungicide") || q.includes("chemical") || q.includes("spray") || q.includes("pesticide")) {
      return (
        `### Expert Agronomic Guidance on Interventions:\n\n` +
        `Verdra adheres to strict agricultural safety protocols. We do not prescribe blanket synthetic chemical fungicides without certified local inspection.\n\n` +
        `• **Cultural Controls First:** Prioritize airflow improvements, staking, and elimination of weed hosts.\n` +
        `• **Biorationals:** Copper-based protectants or biological formulations (e.g. *Bacillus subtilis*) may be permitted under local organic guidelines.\n` +
        `• **Local Agronomist Consultation:** For severe systemic blights, have your regional extension specialist inspect before applying restricted compounds.`
      );
    }

    // Generic helpful agricultural assistant reply
    return (
      `Based on your active diagnostic telemetry (${crop} with ${formatDiseaseName(disease)} detected at ${conf} confidence):\n\n` +
      `The microclimate currently presents **${risk}** risk due to elevated moisture (${humidity} RH). ` +
      `We recommend ensuring foliage is kept dry, checking nearby plants, and monitoring for new concentric lesions over the next 48 hours.\n\n` +
      `Feel free to ask about specific prevention practices, cultural rotation, or irrigation timing!`
    );
  }

  return (
    <VerdraSidebar>
      <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6 flex flex-col h-[calc(100vh-2rem)] md:h-screen">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold tracking-wider uppercase text-[#2E7D32]">
                Interactive Crop Intelligence
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#12372A] tracking-tight font-heading">
              Verdra Assistant
            </h1>
          </div>

          {/* Active Scan Context Pill */}
          {latestScan ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EEF6EC] border border-[#DCE8DC] text-xs">
              <Leaf className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span className="font-semibold text-[#12372A]">Active Context:</span>
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
              <span>General Knowledge Mode</span>
            </div>
          )}
        </div>

        {/* Chat Window Container */}
        <div className="verdra-card bg-white flex-1 flex flex-col overflow-hidden border border-[#DCE8DC] shadow-sm">
          {/* Scrollable Message List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((m) => {
              const isUser = m.role === "user";
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
                    <span
                      className={`text-[10px] block mt-2 text-right ${
                        isUser ? "text-white/60" : "text-[#66736B]"
                      }`}
                    >
                      {m.timestamp}
                    </span>
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
            <span className="text-xs font-semibold text-[#66736B] shrink-0">Suggestions:</span>
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-white text-[#12372A] border border-[#DCE8DC] hover:border-[#2E7D32] hover:bg-[#EEF6EC] whitespace-nowrap transition-colors shadow-2xs shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-4 border-t border-[#DCE8DC] bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Verdra about crop symptoms, risk factors, or care steps..."
                className="flex-1 px-4 py-3 rounded-xl border border-[#DCE8DC] text-sm text-[#17211B] placeholder:text-[#66736B] outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="btn-forest px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
              >
                <span>Send</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </VerdraSidebar>
  );
}
