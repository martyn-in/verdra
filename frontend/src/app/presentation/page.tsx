"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Leaf, Brain, CloudRain, Shield,
  ScanLine, Users, Play, Layers, Code,
} from "lucide-react";
import Link from "next/link";

const slides = [
  {
    id: 1,
    title: "Verdra",
    subtitle: "AI-Powered Crop Health Intelligence",
    tagline: "Detect Early. Predict Spread. Protect Yield.",
    content: [
      "Real deep learning crop disease diagnosis from foliar images",
      "End-to-end pipeline: neural classification → Grad-CAM → severity → live climate risk",
      "Evaluated at 99.17% held-out test accuracy — zero mock predictions",
    ],
    icon: Leaf,
    bg: "linear-gradient(135deg, #060B08, #0D261A)",
    textColor: "#fff",
  },
  {
    id: 2,
    title: "The Agricultural Problem",
    subtitle: "Crop diseases cause 20–40% global yield destruction annually",
    content: [
      "Late symptom identification leads to irreversible acreage necrosis",
      "Rural growers lack immediate access to certified plant pathologists",
      "Manual visual inspection is subjective, slow, and error-prone",
      "Atmospheric humidity and temperature accelerate undetected pathogen spread",
      "Existing tools: either fake heuristics or prohibitively expensive lab assays",
    ],
    icon: Shield,
    bg: "linear-gradient(135deg, #0A140F, #15271F)",
    textColor: "#fff",
  },
  {
    id: 3,
    title: "Our Vision Architecture",
    subtitle: "Comprehensive AI foliar diagnostic & epidemiological command system",
    content: [
      "📸 Foliar image input with automated blur and lighting quality gating",
      "🧠 MobileNetV2 neural transfer network computes 256-d convolutional feature embeddings",
      "🔍 Grad-CAM spatial saliency heatmaps project exact neural attention",
      "📊 Automated color-space segmentation measures necrotic tissue percentage",
      "🌡️ Real-time OpenWeatherMap API integration for live atmospheric telemetry",
      "⚠️ Pathogen biology risk engine calculates spatial propagation index",
      "📋 Curated agricultural care protocols (immediate, preventive, monitoring)",
      "📄 One-click auditable PDF diagnostic health report export",
    ],
    icon: Brain,
    bg: "linear-gradient(135deg, #060B08, #102B1D)",
    textColor: "#fff",
  },
  {
    id: 4,
    title: "Production Technology Stack",
    subtitle: "Audited enterprise engineering",
    content: [
      "Frontend: Next.js 15 (App Router) + React 19 + TypeScript + Framer Motion + Tailwind CSS",
      "Backend: Python 3 FastAPI with async vectorized execution",
      "Deep Learning: TensorFlow / Keras 3 MobileNetV2 transfer model (Conv_1 backbone)",
      "Explainability: Dynamic Grad-CAM gradient backpropagation",
      "Climate Telemetry: Genuine OpenWeatherMap Live API integration",
      "Data & Auth: Supabase (PostgreSQL + RLS + Auth)",
      "Analytics: Vectorized Recharts epidemiological trend curves",
      "Multilingual: English, Hindi, Telugu localization",
    ],
    icon: Code,
    bg: "linear-gradient(135deg, #08100C, #13241B)",
    textColor: "#fff",
  },
  {
    id: 5,
    title: "Explainable AI (Grad-CAM)",
    subtitle: "Visual proof of genuine neural attention",
    content: [
      "Feature maps extracted directly from final convolutional bottleneck (Conv_1)",
      "Target class gradients computed via backward pass to weight feature activations",
      "Bilinear spatial interpolation aligns 7x7 attention grid over 224x224 leaf foliage",
      "Interactive opacity slider lets agronomists inspect tissue under heatmaps",
      "Eliminates black-box distrust — proves AI looks at real lesions, not background artifacts",
    ],
    icon: Layers,
    bg: "linear-gradient(135deg, #09120D, #0A2215)",
    textColor: "#fff",
  },
  {
    id: 6,
    title: "Atmospheric Risk Synergy",
    subtitle: "Real weather data powering spread epidemiology",
    content: [
      "Synchronized directly with OpenWeatherMap live REST API",
      "Real temperature, relative humidity, precipitation, and wind velocity",
      "Validated with strict integrity states: 'LIVE WEATHER API' vs labeled fallback",
      "Pathogen-specific biological thresholds (e.g. Phytophthora flourishes at >80% RH)",
      "Dynamic risk score: 0–100 index synthesized with visual foliar severity",
    ],
    icon: CloudRain,
    bg: "linear-gradient(135deg, #060B08, #0C1E15)",
    textColor: "#fff",
  },
  {
    id: 7,
    title: "Audited Evaluation Rigor",
    subtitle: "Untouched held-out test split benchmark",
    content: [
      "Held-out test accuracy: 99.17% (238/240 correct)",
      "Macro F1 score: 99.17% across all 8 production crop pathology classes",
      "Inference latency: 8.87 ms per image (instantaneous real-time diagnosis)",
      "Zero train/test leakage — evaluated on dedicated independent split",
      "Full confusion matrix and per-class precision/recall auditable on /model-performance",
    ],
    icon: ScanLine,
    bg: "linear-gradient(135deg, #060B08, #102B1D)",
    textColor: "#fff",
  },
  {
    id: 8,
    title: "Empowering Agriculture",
    subtitle: "Scalable decision support for food security",
    content: [
      "Reduces diagnosis time from 3–5 days (lab test) to under 10 milliseconds",
      "Prevents unnecessary broad-spectrum chemical over-application",
      "Enables early ring containment before airborne spore propagation",
      "Actionable treatment recommendations for both organic and conventional growers",
      "Auditable PDF reports for agricultural extension and crop insurance validation",
    ],
    icon: Users,
    bg: "linear-gradient(135deg, #0A140F, #15271F)",
    textColor: "#fff",
  },
  {
    id: 9,
    title: "Explore Live Platform",
    subtitle: "Fully operational end-to-end",
    content: [
      "🌿 Foliar Diagnostic Scanner → /scan",
      "🎬 1-Click Interactive AI Demo → /demo",
      "📊 99.17% Model Benchmark Audit → /model-performance",
      "📚 Pathogen Knowledge Base → /diseases",
      "🤖 AI Field Copilot Chatbot → /assistant",
      "📈 Acreage Health Analytics → /analytics",
    ],
    icon: Play,
    bg: "linear-gradient(135deg, #060B08, #0D261A)",
    textColor: "#fff",
  },
];

export default function PresentationPage() {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];

  function next() { if (current < slides.length - 1) setCurrent(current + 1); }
  function prev() { if (current > 0) setCurrent(current - 1); }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: slide.bg }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4 }}
          className="flex-1 flex items-center justify-center p-8"
        >
          <div className="max-w-4xl w-full">
            {/* Slide number */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Leaf className="w-5 h-5" style={{ color: slide.textColor, opacity: 0.5 }} />
                <span className="text-sm font-medium" style={{ color: slide.textColor, opacity: 0.5 }}>
                  Verdra
                </span>
              </div>
              <span className="text-sm font-mono" style={{ color: slide.textColor, opacity: 0.4 }}>
                {current + 1} / {slides.length}
              </span>
            </div>

            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <slide.icon className="w-8 h-8" />
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-3"
              style={{ fontFamily: "var(--font-heading)", color: slide.textColor }}>
              {slide.title}
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl mb-8" style={{ color: slide.textColor, opacity: 0.7 }}>
              {slide.subtitle}
            </p>

            {/* Tagline */}
            {slide.tagline && (
              <div className="inline-flex items-center px-5 py-2 rounded-full mb-8"
                style={{ background: "rgba(255,255,255,0.15)", color: slide.textColor }}>
                <span className="text-sm font-semibold">{slide.tagline}</span>
              </div>
            )}

            {/* Content */}
            <div className="space-y-3">
              {slide.content.map((item, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}>
                  {item ? (
                    <div className="flex items-start gap-3">
                      <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: slide.textColor, opacity: 0.4 }} />
                      <span className="text-base" style={{ color: slide.textColor, opacity: 0.85 }}>{item}</span>
                    </div>
                  ) : (
                    <div className="h-2" />
                  )}
                </motion.div>
              ))}
            </div>

            {/* Demo links on last slide */}
            {current === slides.length - 1 && (
              <div className="flex flex-wrap gap-3 mt-10">
                <Link href="/scan" className="btn-primary !text-sm">
                  <ScanLine className="w-4 h-4" /> Try Scanner
                </Link>
                <Link href="/dashboard" className="btn-secondary !text-sm !border-emerald !text-emerald">
                  <Play className="w-4 h-4 fill-current" />
                  <span>Launch Verdra Dashboard</span>
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="p-6 flex items-center justify-between">
        <button onClick={prev} disabled={current === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-20"
          style={{ color: slide.textColor }}>
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        {/* Progress dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className="w-2.5 h-2.5 rounded-full transition-all"
              style={{
                background: i === current ? (slide.textColor === "#fff" ? "#52B788" : "#2E7D32") : `${slide.textColor}30`,
                transform: i === current ? "scale(1.3)" : "scale(1)",
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        <button onClick={next} disabled={current === slides.length - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-20"
          style={{ color: slide.textColor }}>
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
