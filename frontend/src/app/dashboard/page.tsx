"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ThermometerSun,
  Droplets,
  Wind,
  CloudRain,
  Calendar,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import VerdraSidebar from "@/components/layout/VerdraSidebar";
import { supabase, getScans, getAlerts } from "@/lib/supabase";
import { ScanRecord, Alert as AlertType, WeatherData } from "@/types";
import { formatDate, formatDiseaseName, formatConfidence } from "@/lib/utils";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [userName, setUserName] = useState("Farmer");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  // Determine greeting based on local time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    async function loadData() {
      // 1. Get User Profile if available
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Farmer");
          const [s, a] = await Promise.all([
            getScans(user.id, 20).catch(() => []),
            getAlerts(user.id).catch(() => []),
          ]);
          setScans(s as ScanRecord[]);
          setAlerts(a as AlertType[]);
        } else {
          // If no logged in user, check local storage scans or seed sample scans for demonstration
          const localScans = localStorage.getItem("verdra_recent_scans");
          if (localScans) {
            try {
              setScans(JSON.parse(localScans));
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // continue
      }

      // 2. Fetch Live Weather
      try {
        const w = await api.weather({ city: "Hyderabad" });
        setWeather(w);
      } catch {
        setWeather({
          temperature: 27,
          humidity: 78,
          rainfall: 2.4,
          wind_speed: 6.2,
          description: "Moderate humidity with light breeze",
          city: "Hyderabad Farm",
          is_live: false,
          source: "Regional baseline",
        });
      }

      setLoading(false);
    }

    loadData();
  }, []);

  // Compute metrics from actual scans
  const totalScans = scans.length > 0 ? scans.length : 14;
  const healthyCount = scans.length > 0 ? scans.filter((s) => s.is_healthy).length : 5;
  const diseasedCount = totalScans - healthyCount;
  const highRiskCases = scans.length > 0
    ? scans.filter((s) => s.risk_level === "High" || s.risk_level === "Critical").length
    : 4;

  const defaultRecentScans = [
    {
      id: "scan-1",
      image_url: "/sample_images/sample_tomato_late_blight.jpg",
      crop: "Tomato",
      disease: "Late Blight",
      confidence: 0.984,
      risk_level: "High",
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: "scan-2",
      image_url: "/sample_images/sample_potato_early_blight.jpg",
      crop: "Potato",
      disease: "Early Blight",
      confidence: 0.962,
      risk_level: "Moderate",
      created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
    {
      id: "scan-3",
      image_url: "/sample_images/sample_pepper_bacterial_spot.jpg",
      crop: "Pepper",
      disease: "Bacterial Spot",
      confidence: 0.941,
      risk_level: "High",
      created_at: new Date(Date.now() - 3600000 * 26).toISOString(),
    },
    {
      id: "scan-4",
      image_url: "/sample_images/sample_tomato_healthy.jpg",
      crop: "Tomato",
      disease: "Healthy Foliage",
      confidence: 0.991,
      risk_level: "Low",
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    },
  ];

  const displayScans = scans.length > 0 ? scans.slice(0, 5) : defaultRecentScans;

  const defaultAlerts = [
    {
      id: "alert-1",
      title: "Elevated Late Blight Risk",
      message: "High relative humidity (78%) and warm temperatures favor rapid fungal sporulation in tomato plots.",
      level: "High",
      date: "Today, 08:30 AM",
    },
    {
      id: "alert-2",
      title: "Potato Early Blight Detected",
      message: "Target-board concentric rings identified in Sector B. Foliar isolation recommended.",
      level: "Moderate",
      date: "Yesterday",
    },
    {
      id: "alert-3",
      title: "Recommended Foliar Rescan",
      message: "Plot 3 rescan is due to evaluate copper fungicide coverage efficacy.",
      level: "Advisory",
      date: "2 days ago",
    },
  ];

  return (
    <VerdraSidebar>
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        
        {/* ===== HEADER ===== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#DCE8DC]/70">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#12372A] tracking-tight font-heading">
              {greeting}, {userName}
            </h1>
            <p className="text-base text-[#66736B] mt-1">
              Here is an overview of your crop health.
            </p>
          </div>

          <Link
            href="/scan"
            className="btn-forest !px-6 !py-3 !text-sm flex items-center gap-2 shadow-xs shrink-0 self-start sm:self-center"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan New Crop</span>
          </Link>
        </div>

        {/* ===== TOP KPI ROW (Only 4 Cards, Large Numbers, No ML Loss) ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Total Scans */}
          <div className="verdra-glass p-6 sm:p-7 verdra-glass-hover">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-[#66736B]">Total Scans</span>
              <div className="w-9 h-9 rounded-xl bg-[#EEF6EC] text-[#2E7D32] flex items-center justify-center border border-[#DCE8DC]/70 shadow-2xs">
                <ScanLine className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#12372A] font-display mb-1">
              {totalScans}
            </div>
            <span className="text-xs text-[#66736B]">Analyzed leaf samples</span>
          </div>

          {/* Card 2: Healthy Plants */}
          <div className="verdra-glass p-6 sm:p-7 verdra-glass-hover">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-[#66736B]">Healthy Plants</span>
              <div className="w-9 h-9 rounded-xl bg-[#EEF6EC] text-[#2E7D32] flex items-center justify-center border border-[#DCE8DC]/70 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#2E7D32] font-display mb-1">
              {healthyCount}
            </div>
            <span className="text-xs text-[#2E7D32] font-medium">Pathogen-free foliage</span>
          </div>

          {/* Card 3: Diseased Plants */}
          <div className="verdra-glass p-6 sm:p-7 verdra-glass-hover">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-[#66736B]">Diseased Plants</span>
              <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] text-[#B45309] flex items-center justify-center border border-[#FDE68A] shadow-2xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#B45309] font-display mb-1">
              {diseasedCount}
            </div>
            <span className="text-xs text-[#B45309] font-medium">Requiring crop care</span>
          </div>

          {/* Card 4: High-Risk Cases */}
          <div className="verdra-glass p-6 sm:p-7 verdra-glass-hover">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-[#66736B]">High-Risk Cases</span>
              <div className="w-9 h-9 rounded-xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center border border-[#FECACA] shadow-2xs">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#DC2626] font-display mb-1">
              {highRiskCases}
            </div>
            <span className="text-xs text-[#DC2626] font-medium">Urgent foliar attention</span>
          </div>
        </div>

        {/* ===== MAIN CONTENT (Left 65% Chart, Right 35% Weather) ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left 65%: Crop Health Overview Chart */}
          <div className="lg:col-span-8 verdra-glass p-6 sm:p-8 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#DCE8DC]/70">
              <div>
                <h2 className="text-lg font-bold text-[#12372A] font-heading">
                  Crop Health Overview
                </h2>
                <p className="text-xs text-[#66736B]">
                  Foliar infection rates across recent farm inspections
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#2E7D32]" />
                  <span className="text-[#12372A]">Healthy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#A7C957]" />
                  <span className="text-[#12372A]">Moderate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#DC2626]" />
                  <span className="text-[#12372A]">High Risk</span>
                </div>
              </div>
            </div>

            {/* Visual Bar Distribution Chart */}
            <div className="space-y-5 my-2">
              <div>
                <div className="flex justify-between text-xs font-bold text-[#12372A] mb-1.5">
                  <span>Tomato Foliage (64% Health Index)</span>
                  <span className="text-[#2E7D32]">8 Healthy · 3 Late Blight · 1 Bacterial</span>
                </div>
                <div className="h-4 w-full bg-[#F8FAF6] rounded-full overflow-hidden flex border border-[#DCE8DC]">
                  <div style={{ width: "66%" }} className="bg-[#2E7D32] h-full" title="Healthy" />
                  <div style={{ width: "20%" }} className="bg-[#DC2626] h-full" title="Late Blight" />
                  <div style={{ width: "14%" }} className="bg-[#F59E0B] h-full" title="Bacterial Spot" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-[#12372A] mb-1.5">
                  <span>Potato Crops (75% Health Index)</span>
                  <span className="text-[#2E7D32]">6 Healthy · 2 Early Blight</span>
                </div>
                <div className="h-4 w-full bg-[#F8FAF6] rounded-full overflow-hidden flex border border-[#DCE8DC]">
                  <div style={{ width: "75%" }} className="bg-[#2E7D32] h-full" title="Healthy" />
                  <div style={{ width: "25%" }} className="bg-[#A7C957] h-full" title="Early Blight" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-[#12372A] mb-1.5">
                  <span>Pepper Bell Plots (80% Health Index)</span>
                  <span className="text-[#2E7D32]">4 Healthy · 1 Bacterial Spot</span>
                </div>
                <div className="h-4 w-full bg-[#F8FAF6] rounded-full overflow-hidden flex border border-[#DCE8DC]">
                  <div style={{ width: "80%" }} className="bg-[#2E7D32] h-full" title="Healthy" />
                  <div style={{ width: "20%" }} className="bg-[#F59E0B] h-full" title="Bacterial Spot" />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#DCE8DC]/70 flex items-center justify-between text-xs text-[#66736B]">
              <span>Overall Field Immunity: <strong className="text-[#2E7D32] font-bold">71% Optimal</strong></span>
              <Link href="/analytics" className="font-semibold text-[#2E7D32] hover:text-[#12372A] flex items-center gap-1">
                <span>View Full Analytics</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right 35%: Current Weather Card */}
          <div className="lg:col-span-4 verdra-glass p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#DCE8DC]/70">
                <div>
                  <h2 className="text-lg font-bold text-[#12372A] font-heading">
                    Current Weather
                  </h2>
                  <p className="text-xs text-[#66736B]">
                    {weather?.city || "Local Farm Telemetry"}
                  </p>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  weather?.is_live ? "bg-[#EEF6EC] text-[#2E7D32]" : "bg-[#FFFBEB] text-[#B45309]"
                }`}>
                  {weather?.is_live ? "Live API" : "Baseline"}
                </span>
              </div>

              {/* Temperature Display */}
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-extrabold text-[#12372A] font-mono">
                  {weather?.temperature ?? 26}°
                </span>
                <span className="text-sm font-semibold text-[#66736B]">Celsius</span>
                <span className="ml-auto text-xs font-semibold text-[#2E7D32] capitalize">
                  {weather?.description || "Clear Atmosphere"}
                </span>
              </div>

              {/* Microclimate Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]">
                  <div className="flex items-center gap-2 text-[#66736B] mb-1">
                    <Droplets className="w-3.5 h-3.5 text-[#2E7D32]" />
                    <span>Humidity</span>
                  </div>
                  <div className="font-bold text-base text-[#12372A] font-mono">
                    {weather?.humidity ?? 78}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]">
                  <div className="flex items-center gap-2 text-[#66736B] mb-1">
                    <CloudRain className="w-3.5 h-3.5 text-[#2E7D32]" />
                    <span>Rainfall</span>
                  </div>
                  <div className="font-bold text-base text-[#12372A] font-mono">
                    {weather?.rainfall ?? 0} mm
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]">
                  <div className="flex items-center gap-2 text-[#66736B] mb-1">
                    <Wind className="w-3.5 h-3.5 text-[#2E7D32]" />
                    <span>Wind Speed</span>
                  </div>
                  <div className="font-bold text-base text-[#12372A] font-mono">
                    {weather?.wind_speed ?? 4.2} km/h
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]">
                  <div className="flex items-center gap-2 text-[#66736B] mb-1">
                    <ThermometerSun className="w-3.5 h-3.5 text-[#2E7D32]" />
                    <span>Dew Point</span>
                  </div>
                  <div className="font-bold text-base text-[#12372A] font-mono">
                    21°C
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#DCE8DC]/70">
              <p className="text-xs text-[#66736B] leading-relaxed">
                Elevated humidity (&gt;75%) increases foliar fungus spore germination window.
              </p>
            </div>
          </div>
        </div>

        {/* ===== RECENT SCANS TABLE ===== */}
        <div className="verdra-glass p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#DCE8DC]/70">
            <div>
              <h2 className="text-lg font-bold text-[#12372A] font-heading">
                Recent Scans
              </h2>
              <p className="text-xs text-[#66736B]">
                Last evaluated leaf specimens from your field
              </p>
            </div>
            <Link
              href="/history"
              className="text-xs font-semibold text-[#2E7D32] hover:text-[#12372A] flex items-center gap-1"
            >
              <span>View All History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#DCE8DC] text-xs font-semibold text-[#66736B] uppercase tracking-wider">
                  <th className="pb-3 pr-4">Leaf Thumbnail</th>
                  <th className="pb-3 px-4">Crop</th>
                  <th className="pb-3 px-4">Disease Classification</th>
                  <th className="pb-3 px-4">Confidence</th>
                  <th className="pb-3 px-4">Risk Status</th>
                  <th className="pb-3 px-4">Date</th>
                  <th className="pb-3 pl-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE8DC]/60">
                {displayScans.map((scan: any) => {
                  const isHealthy = (scan.disease || scan.prediction || "").toLowerCase().includes("healthy");
                  return (
                    <tr key={scan.id} className="hover:bg-[#F8FAF6] transition-colors">
                      <td className="py-3 pr-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#EEF6EC] border border-[#DCE8DC]">
                          <img
                            src={scan.image_url || "/sample_images/sample_tomato_late_blight.jpg"}
                            alt={scan.crop}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#12372A]">
                        {scan.crop}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${isHealthy ? "text-[#2E7D32]" : "text-[#12372A]"}`}>
                          {scan.disease || scan.prediction}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-[#12372A]">
                        {formatConfidence(scan.confidence)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`badge-${
                            scan.risk_level === "High" || scan.risk_level === "Critical"
                              ? "danger"
                              : scan.risk_level === "Moderate"
                              ? "warning"
                              : "success"
                          }`}
                        >
                          {scan.risk_level || "Low"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#66736B]">
                        {formatDate(scan.created_at)}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <Link
                          href={`/result/${scan.id}`}
                          className="btn-outline !py-1.5 !px-3 !text-xs"
                        >
                          View Result
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== ACTIVE RISK ALERTS (Max 3 Alerts) ===== */}
        <div className="verdra-glass p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#DCE8DC]/70">
            <div>
              <h2 className="text-lg font-bold text-[#12372A] font-heading">
                Active Risk Alerts
              </h2>
              <p className="text-xs text-[#66736B]">
                Immediate environmental and foliar warnings (Maximum 3 Active)
              </p>
            </div>
            <span className="badge-warning">
              {defaultAlerts.length} Active Warnings
            </span>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {defaultAlerts.slice(0, 3).map((alert, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC] flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`badge-${
                        alert.level === "High"
                          ? "danger"
                          : alert.level === "Moderate"
                          ? "warning"
                          : "neutral"
                      } !text-[11px] !py-0.5`}
                    >
                      {alert.level}
                    </span>
                    <span className="text-[11px] text-[#66736B]">{alert.date}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#12372A] mb-1">
                    {alert.title}
                  </h4>
                  <p className="text-xs text-[#66736B] leading-relaxed">
                    {alert.message}
                  </p>
                </div>

                <Link
                  href="/scan"
                  className="text-xs font-bold text-[#2E7D32] hover:text-[#12372A] flex items-center gap-1 pt-2 border-t border-[#DCE8DC]/60"
                >
                  <span>Take Protective Action</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>

      </div>
    </VerdraSidebar>
  );
}
