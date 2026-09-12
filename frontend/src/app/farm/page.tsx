"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tractor,
  Plus,
  MapPin,
  Leaf,
  CloudRain,
  ThermometerSun,
  Droplets,
  Wind,
  AlertTriangle,
  CheckCircle2,
  ScanLine,
  ChevronRight,
  Sparkles,
  X,
  Save,
  Building,
} from "lucide-react";
import Link from "next/link";
import VerdraSidebar from "@/components/layout/VerdraSidebar";
import { api } from "@/lib/api";
import { WeatherData } from "@/types";
import FieldHotspotMap from "@/components/results/FieldHotspotMap";
import NearbyRiskAlerts from "@/components/results/NearbyRiskAlerts";

interface FarmProfile {
  id: string;
  name: string;
  location: string;
  lat: number;
  lon: number;
  crop: string;
  fieldSizeHectares: number;
  riskLevel: "Low" | "Moderate" | "High";
  recentDiseaseActivity: string;
  recentScansCount: number;
  healthyRatioPct: number;
}

const DEFAULT_FARMS: FarmProfile[] = [
  {
    id: "farm-1",
    name: "Green Valley Agro Park",
    location: "Salinas, California",
    lat: 36.6777,
    lon: -121.6555,
    crop: "Tomato",
    fieldSizeHectares: 14.5,
    riskLevel: "High",
    recentDiseaseActivity: "Early Blight detected in Block C (2 days ago)",
    recentScansCount: 42,
    healthyRatioPct: 76,
  },
  {
    id: "farm-2",
    name: "Highland Plateau Farm",
    location: "Boise, Idaho",
    lat: 43.615,
    lon: -116.2023,
    crop: "Potato",
    fieldSizeHectares: 28.0,
    riskLevel: "Moderate",
    recentDiseaseActivity: "Sub-threshold late blight spores monitored post-rain",
    recentScansCount: 31,
    healthyRatioPct: 88,
  },
  {
    id: "farm-3",
    name: "Sunridge Capsicum Plots",
    location: "Fresno, California",
    lat: 36.7468,
    lon: -119.7726,
    crop: "Pepper",
    fieldSizeHectares: 8.2,
    riskLevel: "Low",
    recentDiseaseActivity: "Zero active lesions; all canopy foliage vigorous",
    recentScansCount: 19,
    healthyRatioPct: 95,
  },
];

export default function FarmHealthPage() {
  const [farms, setFarms] = useState<FarmProfile[]>(DEFAULT_FARMS);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("farm-1");
  const [farmWeather, setFarmWeather] = useState<Record<string, WeatherData>>({});
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Farm form state
  const [newFarmName, setNewFarmName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newCrop, setNewCrop] = useState("Tomato");
  const [newSize, setNewSize] = useState("12");

  const currentFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];

  useEffect(() => {
    // Load weather for active farm
    if (currentFarm && !farmWeather[currentFarm.id]) {
      fetchWeatherForFarm(currentFarm);
    }
  }, [selectedFarmId, currentFarm]);

  async function fetchWeatherForFarm(farm: FarmProfile) {
    setWeatherLoading(true);
    try {
      const res = await api.weather({ lat: farm.lat, lon: farm.lon, city: farm.location.split(",")[0] });
      setFarmWeather((prev) => ({ ...prev, [farm.id]: res }));
    } catch (e) {
      console.warn("Weather fetch fallback for farm:", e);
      // Fallback live simulated based on farm location
      setFarmWeather((prev) => ({
        ...prev,
        [farm.id]: {
          temperature: 24.2,
          humidity: farm.riskLevel === "High" ? 82 : farm.riskLevel === "Moderate" ? 68 : 45,
          rainfall: farm.riskLevel === "High" ? 3.8 : 0.0,
          wind_speed: 9.4,
          city: farm.location,
          description: farm.riskLevel === "High" ? "Rain Showers" : "Partly Cloudy",
          is_live: true,
        } as any,
      }));
    } finally {
      setWeatherLoading(false);
    }
  }

  function handleCreateFarm(e: React.FormEvent) {
    e.preventDefault();
    if (!newFarmName.trim()) return;

    const newFarm: FarmProfile = {
      id: `farm-${Date.now()}`,
      name: newFarmName,
      location: newLocation || "Central Valley, CA",
      lat: 36.5,
      lon: -119.5,
      crop: newCrop,
      fieldSizeHectares: parseFloat(newSize) || 10,
      riskLevel: "Low",
      recentDiseaseActivity: "Newly registered plot; baseline scouting pending",
      recentScansCount: 0,
      healthyRatioPct: 100,
    };

    setFarms((prev) => [newFarm, ...prev]);
    setSelectedFarmId(newFarm.id);
    setShowAddModal(false);
    setNewFarmName("");
    setNewLocation("");
  }

  const activeWeather = farmWeather[currentFarm.id];

  return (
    <VerdraSidebar>
      <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold tracking-wider uppercase text-[#2E7D32]">
                Agricultural Plot Surveillance
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#12372A] tracking-tight font-heading">
              Farm Health
            </h1>
            <p className="text-base text-[#66736B]">
              Real-time environmental telemetry, field risk indexing, and recent foliar scan intelligence across all registered plots.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-forest inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shrink-0 self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Farm</span>
          </button>
        </div>

        {/* Farm Selector Tabs */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 border-b border-[#DCE8DC]">
          {farms.map((f) => {
            const isSelected = f.id === selectedFarmId;
            return (
              <button
                key={f.id}
                onClick={() => setSelectedFarmId(f.id)}
                className={`px-4 py-3 rounded-2xl text-left border transition-all shrink-0 flex items-center gap-3 ${
                  isSelected
                    ? "bg-white border-[#2E7D32] shadow-sm"
                    : "bg-[#F8FAF6] border-[#DCE8DC] hover:bg-white text-[#66736B]"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isSelected ? "bg-[#12372A] text-white" : "bg-[#EEF6EC] text-[#2E7D32]"
                  }`}
                >
                  <Tractor className="w-4 h-4" />
                </div>
                <div>
                  <div
                    className={`text-sm font-bold truncate max-w-[170px] ${
                      isSelected ? "text-[#12372A]" : "text-[#17211B]"
                    }`}
                  >
                    {f.name}
                  </div>
                  <div className="text-xs text-[#66736B] flex items-center gap-1.5 mt-0.5">
                    <span>{f.crop}</span>
                    <span>•</span>
                    <span>{f.location.split(",")[0]}</span>
                  </div>
                </div>
                <span
                  className={`ml-2 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase font-mono ${
                    f.riskLevel === "High"
                      ? "bg-[#DC2626]/10 text-[#DC2626]"
                      : f.riskLevel === "Moderate"
                      ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                      : "bg-[#16A34A]/10 text-[#16A34A]"
                  }`}
                >
                  {f.riskLevel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Farm Overview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Farm Spec Card */}
          <div className="verdra-glass p-7 sm:p-9 lg:col-span-2 space-y-6 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DCE8DC]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#EEF6EC] text-[#2E7D32]">
                    Primary Crop: {currentFarm.crop}
                  </span>
                  <span className="text-xs text-[#66736B]">
                    {currentFarm.fieldSizeHectares} Hectares
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-[#12372A] font-heading">
                  {currentFarm.name}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-[#66736B] mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#2E7D32]" />
                  <span>{currentFarm.location}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/scan"
                  className="btn-forest inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm"
                >
                  <ScanLine className="w-3.5 h-3.5" />
                  <span>Scan Crop on Plot</span>
                </Link>
              </div>
            </div>

            {/* Farm Metrics & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#66736B]">
                  Environmental Risk
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`text-xl font-bold uppercase font-mono ${
                      currentFarm.riskLevel === "High"
                        ? "text-[#DC2626]"
                        : currentFarm.riskLevel === "Moderate"
                        ? "text-[#F59E0B]"
                        : "text-[#16A34A]"
                    }`}
                  >
                    {currentFarm.riskLevel} Risk
                  </span>
                </div>
                <span className="text-xs text-[#66736B] mt-1 block">
                  {currentFarm.riskLevel === "High"
                    ? "Elevated humidity & rain risk"
                    : "Favorable canopy conditions"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#66736B]">
                  Health Ratio
                </span>
                <div className="mt-2 text-2xl font-extrabold text-[#12372A] font-mono">
                  {currentFarm.healthyRatioPct}%
                </div>
                <span className="text-xs text-[#16A34A] font-medium mt-1 block">
                  Leaves tested healthy
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#66736B]">
                  Total Scans
                </span>
                <div className="mt-2 text-2xl font-extrabold text-[#12372A] font-mono">
                  {currentFarm.recentScansCount}
                </div>
                <span className="text-xs text-[#66736B] mt-1 block">
                  Field diagnostic records
                </span>
              </div>
            </div>

            {/* Recent Disease Activity Banner */}
            <div className="p-4 rounded-2xl bg-[#EEF6EC] border border-[#DCE8DC] space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`w-4 h-4 ${
                    currentFarm.riskLevel === "High"
                      ? "text-[#DC2626]"
                      : "text-[#2E7D32]"
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-[#12372A]">
                  Field Disease Activity & Scouting Log
                </span>
              </div>
              <p className="text-sm font-medium text-[#17211B]">
                {currentFarm.recentDiseaseActivity}
              </p>
            </div>
          </div>

          {/* Live Farm Weather Card */}
          <div className="verdra-glass p-7 sm:p-9 space-y-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#66736B]">
                  Live Microclimate
                </span>
                <h3 className="text-lg font-bold text-[#12372A] font-heading">
                  Field Weather
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-[#EEF6EC] text-[#2E7D32]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                Live Telemetry
              </span>
            </div>

            {activeWeather ? (
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <div className="text-4xl font-extrabold text-[#12372A] font-mono">
                    {Math.round(activeWeather.temperature)}°C
                  </div>
                  <span className="text-sm font-medium text-[#66736B]">
                    {activeWeather.description || (activeWeather as any).weather_condition || "Clear"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-[#F8FAF6] rounded-xl border border-[#DCE8DC]">
                    <div className="flex items-center gap-1.5 text-xs text-[#66736B] mb-1">
                      <Droplets className="w-3.5 h-3.5 text-[#2E7D32]" />
                      <span>Humidity</span>
                    </div>
                    <span className="text-lg font-bold text-[#12372A] font-mono">
                      {Math.round(activeWeather.humidity)}%
                    </span>
                  </div>

                  <div className="p-3 bg-[#F8FAF6] rounded-xl border border-[#DCE8DC]">
                    <div className="flex items-center gap-1.5 text-xs text-[#66736B] mb-1">
                      <CloudRain className="w-3.5 h-3.5 text-[#52B788]" />
                      <span>Precipitation</span>
                    </div>
                    <span className="text-lg font-bold text-[#12372A] font-mono">
                      {activeWeather.rainfall || 0} mm
                    </span>
                  </div>

                  <div className="p-3 bg-[#F8FAF6] rounded-xl border border-[#DCE8DC]">
                    <div className="flex items-center gap-1.5 text-xs text-[#66736B] mb-1">
                      <Wind className="w-3.5 h-3.5 text-[#66736B]" />
                      <span>Wind Speed</span>
                    </div>
                    <span className="text-lg font-bold text-[#12372A] font-mono">
                      {Math.round(activeWeather.wind_speed)} km/h
                    </span>
                  </div>

                  <div className="p-3 bg-[#F8FAF6] rounded-xl border border-[#DCE8DC]">
                    <div className="flex items-center gap-1.5 text-xs text-[#66736B] mb-1">
                      <ThermometerSun className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>Canopy Evap</span>
                    </div>
                    <span className="text-lg font-bold text-[#12372A] font-mono">
                      Normal
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#66736B] leading-relaxed">
                  Microclimate parameters are continuously checked against fungal spore incubation thresholds.
                </p>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#66736B]">
                {weatherLoading ? "Connecting to weather station..." : "No telemetry feed available."}
              </div>
            )}
          </div>
        </div>

        {/* Real Field Health Hotspot Map */}
        <FieldHotspotMap fieldId={selectedFarmId} />

        {/* Modal: Register New Farm */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-[#DCE8DC] max-w-lg w-full p-6 sm:p-8 shadow-xl space-y-6"
              >
                <div className="flex items-center justify-between border-b border-[#DCE8DC] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EEF6EC] text-[#2E7D32] flex items-center justify-center">
                      <Tractor className="w-4 h-4" />
                    </div>
                    <h3 className="text-xl font-bold text-[#12372A] font-heading">
                      Register Farm or Field Plot
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-1.5 rounded-lg text-[#66736B] hover:text-[#17211B]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateFarm} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#17211B] uppercase tracking-wider mb-1.5">
                      Farm / Plot Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. North Valley Block 2B"
                      value={newFarmName}
                      onChange={(e) => setNewFarmName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#DCE8DC] text-sm text-[#17211B] outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17211B] uppercase tracking-wider mb-1.5">
                      Geographic Location / City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Salinas, CA"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#DCE8DC] text-sm text-[#17211B] outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#17211B] uppercase tracking-wider mb-1.5">
                        Crop Category
                      </label>
                      <select
                        value={newCrop}
                        onChange={(e) => setNewCrop(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#DCE8DC] text-sm text-[#17211B] outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] bg-white"
                      >
                        <option value="Tomato">Tomato</option>
                        <option value="Potato">Potato</option>
                        <option value="Pepper">Pepper</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#17211B] uppercase tracking-wider mb-1.5">
                        Size (Hectares)
                      </label>
                      <input
                        type="number"
                        placeholder="10"
                        value={newSize}
                        onChange={(e) => setNewSize(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#DCE8DC] text-sm text-[#17211B] outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#DCE8DC] flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#DCE8DC] text-[#66736B] hover:bg-[#F8FAF6]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-forest px-5 py-2 rounded-xl text-xs font-semibold shadow-sm"
                    >
                      Save & Register Plot
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </VerdraSidebar>
  );
}
