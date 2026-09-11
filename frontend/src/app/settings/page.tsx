"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Save,
  CheckCircle2,
  CloudSun,
  Shield,
  Bell,
  Sliders,
  Cpu,
  User,
  MapPin,
  Sparkles,
} from "lucide-react";
import VerdraSidebar from "@/components/layout/VerdraSidebar";

export default function SettingsPage() {
  const [farmName, setFarmName] = useState("Green Valley Agro Park");
  const [agronomistName, setAgronomistName] = useState("Lead Crop Consultant");
  const [defaultCity, setDefaultCity] = useState("Salinas, CA");
  const [confidenceThreshold, setConfidenceThreshold] = useState(75);
  const [alertSpreadRisk, setAlertSpreadRisk] = useState(true);
  const [autoDownloadPdf, setAutoDownloadPdf] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  }

  return (
    <VerdraSidebar>
      <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold tracking-wider uppercase text-[#2E7D32]">
                Platform Configuration
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#12372A] tracking-tight font-heading">
              Settings & Preferences
            </h1>
            <p className="text-base text-[#66736B]">
              Customize your agricultural operations profile, live weather station linkage, model inference sensitivity, and risk notification triggers.
            </p>
          </div>

          {savedSuccess && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EEF6EC] border border-[#2E7D32] text-xs font-bold text-[#12372A] animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              <span>Settings Saved Successfully</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Farm Organization Profile */}
          <div className="verdra-glass p-7 sm:p-9 space-y-6 shadow-md">
            <div className="flex items-center gap-3 pb-3 border-b border-[#DCE8DC]">
              <div className="w-8 h-8 rounded-lg bg-[#EEF6EC] text-[#2E7D32] flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#12372A] font-heading">
                  Agricultural Organization Profile
                </h3>
                <p className="text-xs text-[#66736B]">
                  Applied to certified PDF dossiers, scan history headers, and multi-farm summaries.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#17211B] uppercase tracking-wider mb-1.5">
                  Primary Farm / Agro Facility Name
                </label>
                <input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#DCE8DC] text-sm text-[#17211B] outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211B] uppercase tracking-wider mb-1.5">
                  Agronomist / Operator In-Charge
                </label>
                <input
                  type="text"
                  value={agronomistName}
                  onChange={(e) => setAgronomistName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#DCE8DC] text-sm text-[#17211B] outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#17211B] uppercase tracking-wider mb-1.5">
                  Default Weather Station & Microclimate Region
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#66736B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={defaultCity}
                    onChange={(e) => setDefaultCity(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#DCE8DC] text-sm text-[#17211B] outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Model Inference & Telemetry Parameters */}
          <div className="verdra-glass p-7 sm:p-9 space-y-6 shadow-md">
            <div className="flex items-center gap-3 pb-3 border-b border-[#DCE8DC]">
              <div className="w-8 h-8 rounded-lg bg-[#EEF6EC] text-[#2E7D32] flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#12372A] font-heading">
                  Diagnostic Model Parameters
                </h3>
                <p className="text-xs text-[#66736B]">
                  Thresholds for disease classification confidence and automated spread risk alerting.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-[#17211B] uppercase tracking-wider">
                    Minimum Softmax Confidence Flag
                  </label>
                  <span className="text-xs font-mono font-bold text-[#2E7D32]">
                    {confidenceThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                  className="w-full accent-[#2E7D32] cursor-pointer"
                />
                <span className="text-xs text-[#66736B] block mt-1">
                  Predictions falling below {confidenceThreshold}% prompt an automated recommendation to rescan under diffused lighting.
                </span>
              </div>

              <div className="pt-3 border-t border-[#DCE8DC]/70 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alertSpreadRisk}
                    onChange={(e) => setAlertSpreadRisk(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2E7D32] accent-[#2E7D32] cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-semibold text-[#17211B] block">
                      Elevated Spread Risk Alerts
                    </span>
                    <span className="text-xs text-[#66736B]">
                      Display prominent warning banners on the dashboard whenever ambient humidity exceeds 80% with recent rain.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDownloadPdf}
                    onChange={(e) => setAutoDownloadPdf(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2E7D32] accent-[#2E7D32] cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-semibold text-[#17211B] block">
                      Auto-Archive PDF Dossiers
                    </span>
                    <span className="text-xs text-[#66736B]">
                      Automatically compile an agronomic PDF report for every scanned leaf.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Engine & Runtime Specs */}
          <div className="verdra-glass p-7 sm:p-9 space-y-4 shadow-md">
            <div className="flex items-center gap-3 pb-3 border-b border-[#DCE8DC]">
              <div className="w-8 h-8 rounded-lg bg-[#EEF6EC] text-[#2E7D32] flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#12372A] font-heading">
                  System Architecture & Runtime
                </h3>
                <p className="text-xs text-[#66736B]">
                  Verdra Deep Learning Production Stack
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-[#F8FAF6] rounded-xl border border-[#DCE8DC]">
                <span className="text-[#66736B] block">Core Platform</span>
                <span className="text-sm font-bold text-[#12372A]">Verdra v2.4.0</span>
              </div>
              <div className="p-3.5 bg-[#F8FAF6] rounded-xl border border-[#DCE8DC]">
                <span className="text-[#66736B] block">Inference Engine</span>
                <span className="text-sm font-bold text-[#12372A]">Keras 3 / TensorFlow</span>
              </div>
              <div className="p-3.5 bg-[#F8FAF6] rounded-xl border border-[#DCE8DC]">
                <span className="text-[#66736B] block">Live Weather Feed</span>
                <span className="text-sm font-bold text-[#16A34A]">OpenWeatherMap API</span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="btn-forest inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </VerdraSidebar>
  );
}
