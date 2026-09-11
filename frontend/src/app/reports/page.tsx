"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Calendar,
  Leaf,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  RefreshCw,
  FileCheck,
} from "lucide-react";
import VerdraSidebar from "@/components/layout/VerdraSidebar";
import { api } from "@/lib/api";
import { formatDiseaseName } from "@/lib/utils";

interface SavedReport {
  id: string;
  title: string;
  farm: string;
  crop: string;
  prediction: string;
  confidence: number;
  date: string;
  severity: string;
  risk: string;
  weather: {
    temp: number;
    humidity: number;
    rain: number;
  };
}

const DEFAULT_REPORTS: SavedReport[] = [
  {
    id: "rep-001",
    title: "Salinas Sector 4 Foliar Diagnostic Dossier",
    farm: "Green Valley Agro Park",
    crop: "Tomato",
    prediction: "Early Blight",
    confidence: 0.942,
    date: "2026-09-11 10:15",
    severity: "Moderate (31%)",
    risk: "High",
    weather: { temp: 24.5, humidity: 84, rain: 3.1 },
  },
  {
    id: "rep-002",
    title: "Boise Plot 2B Mid-Season Surveillance",
    farm: "Highland Plateau Farm",
    crop: "Potato",
    prediction: "Late Blight",
    confidence: 0.915,
    date: "2026-09-10 14:30",
    severity: "Severe (58%)",
    risk: "High",
    weather: { temp: 18.2, humidity: 91, rain: 5.4 },
  },
  {
    id: "rep-003",
    title: "Fresno Capsicum Pre-Harvest Verification",
    farm: "Sunridge Capsicum Plots",
    crop: "Pepper",
    prediction: "Healthy",
    confidence: 0.987,
    date: "2026-09-08 09:00",
    severity: "None (0%)",
    risk: "Low",
    weather: { temp: 28.0, humidity: 42, rain: 0.0 },
  },
];

export default function ReportsPage() {
  const [reports, setReports] = useState<SavedReport[]>(DEFAULT_REPORTS);
  const [selectedReport, setSelectedReport] = useState<SavedReport>(DEFAULT_REPORTS[0]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    // Check if there is a latest scan in local storage and prepend it as the newest report
    try {
      const saved = localStorage.getItem("verdra_latest_prediction");
      if (saved) {
        const scan = JSON.parse(saved);
        const newRep: SavedReport = {
          id: `rep-${scan.scan_id || Date.now()}`,
          title: `Field Diagnostic — ${scan.crop} Scan Dossier`,
          farm: "Active Field Plot",
          crop: scan.crop || "Tomato",
          prediction: scan.prediction || "Early Blight",
          confidence: scan.confidence || 0.942,
          date: new Date().toISOString().replace("T", " ").substring(0, 16),
          severity: scan.severity ? `${scan.severity.level} (${scan.severity.percentage}%)` : "Moderate (31%)",
          risk: scan.risk?.level || "High",
          weather: {
            temp: scan.weather?.temperature || 24,
            humidity: scan.weather?.humidity || 84,
            rain: scan.weather?.rainfall || 3.1,
          },
        };
        setReports((prev) => [newRep, ...prev.filter((r) => r.id !== newRep.id)]);
        setSelectedReport(newRep);
      }
    } catch (e) {
      console.warn("Could not parse saved scan for reports:", e);
    }
  }, []);

  async function handleDownloadPdf(report: SavedReport) {
    setGenerating(true);
    try {
      const payload = {
        scan_id: report.id,
        farm_name: report.farm,
        farmer_name: "Field Agronomist",
        scan_date: report.date,
        crop: report.crop,
        prediction: report.prediction,
        confidence: report.confidence,
        is_healthy: report.prediction.toLowerCase().includes("healthy"),
        severity: report.severity,
        infected_percentage: parseFloat(report.severity.match(/\d+/)?.[0] || "31"),
        weather: {
          temperature: report.weather.temp,
          humidity: report.weather.humidity,
          rainfall: report.weather.rain,
        },
        risk: {
          level: report.risk,
          description: `Microclimate shows ${report.weather.humidity}% humidity.`,
        },
        recommendations: {
          immediate: ["Isolate symptomatic leaves", "Avoid overhead wetting"],
          preventive: ["Stake indeterminate vines", "Improve canopy airflow"],
          monitoring: ["Rescan within 3 to 5 days"],
        },
      };

      const blob = await api.report(payload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Verdra_Report_${report.crop}_${report.prediction.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to compile PDF dossier. Please ensure backend is running.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <VerdraSidebar>
      <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold tracking-wider uppercase text-[#2E7D32]">
                Certified Agronomic Records
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#12372A] tracking-tight font-heading">
              Field Reports
            </h1>
            <p className="text-base text-[#66736B]">
              Comprehensive printable PDF dossiers detailing crop leaf pathology, Grad-CAM attention focus, microclimate spread risks, and agronomic care guidance.
            </p>
          </div>

          <button
            onClick={() => handleDownloadPdf(selectedReport)}
            disabled={generating}
            className="btn-forest inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shrink-0 self-start sm:self-center disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{generating ? "Compiling PDF..." : "Download Selected PDF"}</span>
          </button>
        </div>

        {/* Two-Column Dossier Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Report List (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#66736B]">
                Available Field Dossiers
              </span>
              <span className="text-xs font-mono text-[#2E7D32] font-semibold">
                {reports.length} Records
              </span>
            </div>

            <div className="space-y-3">
              {reports.map((rep) => {
                const isSelected = rep.id === selectedReport.id;
                return (
                  <div
                    key={rep.id}
                    onClick={() => setSelectedReport(rep)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white border-[#2E7D32] shadow-sm"
                        : "bg-[#F8FAF6] border-[#DCE8DC] hover:bg-white text-[#66736B]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-[#EEF6EC] text-[#2E7D32]">
                          {rep.crop}
                        </span>
                        <span className="text-xs font-mono text-[#66736B]">{rep.date}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono uppercase ${
                          rep.risk === "High"
                            ? "bg-[#DC2626]/10 text-[#DC2626]"
                            : rep.risk === "Moderate"
                            ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                            : "bg-[#16A34A]/10 text-[#16A34A]"
                        }`}
                      >
                        {rep.risk} Risk
                      </span>
                    </div>

                    <h4
                      className={`text-base font-bold font-heading ${
                        isSelected ? "text-[#12372A]" : "text-[#17211B]"
                      }`}
                    >
                      {rep.title}
                    </h4>

                    <div className="flex items-center justify-between text-xs text-[#66736B] mt-2 pt-2 border-t border-[#DCE8DC]/70">
                      <span>{rep.farm}</span>
                      <span className="font-semibold text-[#12372A]">
                        {formatDiseaseName(rep.prediction)} ({(rep.confidence * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dossier Preview (7 cols) */}
          <div className="lg:col-span-7">
            <div className="verdra-glass p-7 sm:p-9 space-y-6 sticky top-6 shadow-md">
              {/* Dossier Document Header */}
              <div className="border-b border-[#DCE8DC] pb-6 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#2E7D32]">
                      Certified Agronomic Health Record
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#66736B]">
                    ID: {selectedReport.id.toUpperCase()}
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold text-[#12372A] font-heading">
                  {selectedReport.title}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#66736B] pt-1">
                  <span>Farm: <strong className="text-[#17211B]">{selectedReport.farm}</strong></span>
                  <span>Timestamp: <strong className="text-[#17211B]">{selectedReport.date}</strong></span>
                </div>
              </div>

              {/* Diagnosis Summary Block */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#F8FAF6] rounded-xl border border-[#DCE8DC]">
                  <span className="text-xs text-[#66736B] block">Botanical Crop</span>
                  <span className="text-base font-bold text-[#12372A]">{selectedReport.crop}</span>
                </div>

                <div className="p-3 bg-[#F8FAF6] rounded-xl border border-[#DCE8DC]">
                  <span className="text-xs text-[#66736B] block">AI Diagnosis</span>
                  <span className="text-base font-bold text-[#12372A] truncate block">
                    {formatDiseaseName(selectedReport.prediction)}
                  </span>
                </div>

                <div className="p-3 bg-[#F8FAF6] rounded-xl border border-[#DCE8DC]">
                  <span className="text-xs text-[#66736B] block">Confidence</span>
                  <span className="text-base font-bold font-mono text-[#16A34A]">
                    {(selectedReport.confidence * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="p-3 bg-[#F8FAF6] rounded-xl border border-[#DCE8DC]">
                  <span className="text-xs text-[#66736B] block">Spread Risk</span>
                  <span
                    className={`text-base font-bold font-mono ${
                      selectedReport.risk === "High" ? "text-[#DC2626]" : "text-[#16A34A]"
                    }`}
                  >
                    {selectedReport.risk}
                  </span>
                </div>
              </div>

              {/* Environmental Telemetry Snapshot */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#12372A]">
                  Recorded Environmental Microclimate
                </h4>
                <div className="grid grid-cols-3 gap-3 p-4 bg-[#F8FAF6] rounded-2xl border border-[#DCE8DC] text-center">
                  <div>
                    <span className="text-xs text-[#66736B] block">Temperature</span>
                    <span className="text-lg font-extrabold text-[#12372A] font-mono">
                      {selectedReport.weather.temp}°C
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#66736B] block">Relative Humidity</span>
                    <span className="text-lg font-extrabold text-[#12372A] font-mono">
                      {selectedReport.weather.humidity}%
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#66736B] block">Precipitation</span>
                    <span className="text-lg font-extrabold text-[#12372A] font-mono">
                      {selectedReport.weather.rain} mm
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommended Field Actions */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#12372A]">
                  Protocol Prescriptions
                </h4>
                <div className="space-y-2 text-sm text-[#17211B]">
                  <div className="p-3 bg-[#EEF6EC] rounded-xl border border-[#DCE8DC] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#12372A] block">Immediate Containment</strong>
                      <span className="text-xs text-[#66736B]">
                        Inspect nearby plants within 5m radius and prune severely damaged lower leaves.
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F8FAF6] rounded-xl border border-[#DCE8DC] flex items-start gap-2.5">
                    <Leaf className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#12372A] block">Canopy Management</strong>
                      <span className="text-xs text-[#66736B]">
                        Transition to drip irrigation to prevent moisture persistence on leaf cuticles.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PDF Export Actions */}
              <div className="pt-4 border-t border-[#DCE8DC] flex items-center justify-between">
                <span className="text-xs text-[#66736B]">
                  Generates verified 2-page ReportLab PDF
                </span>
                <button
                  onClick={() => handleDownloadPdf(selectedReport)}
                  disabled={generating}
                  className="btn-forest inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{generating ? "Exporting PDF..." : "Export Official PDF"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VerdraSidebar>
  );
}
