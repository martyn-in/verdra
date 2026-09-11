"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Search,
  Leaf,
  Thermometer,
  Droplets,
  Shield,
  Eye,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  X,
  Calendar,
} from "lucide-react";
import VerdraSidebar from "@/components/layout/VerdraSidebar";
import { api } from "@/lib/api";
import { formatDiseaseName } from "@/lib/utils";

interface DiseaseDetail {
  id: string;
  name: string;
  crop: string;
  scientific_name?: string;
  pathogen_type?: string;
  description?: string;
  symptoms?: string[];
  causes?: string[];
  immediate_actions?: string[];
  preventive_actions?: string[];
  monitoring_advice?: string[];
  environmental_conditions?: {
    optimal_temperature_c?: [number, number];
    humidity_threshold_pct?: number;
    free_moisture_required?: boolean;
    favorable_weather?: string;
    temperature_range?: string;
    humidity_threshold?: string;
  };
  expert_escalation?: string;
}

const FALLBACK_DISEASES: DiseaseDetail[] = [
  {
    id: "tomato_early_blight",
    name: "Tomato Early Blight",
    crop: "Tomato",
    scientific_name: "Alternaria solani",
    pathogen_type: "Fungal",
    description: "Common foliar fungal disease causing dark brown concentric rings ('target spots') on older leaves, progressing upwards.",
    symptoms: [
      "Concentric dark rings with yellow chlorotic halos on lower foliage",
      "Premature defoliation exposing fruit to sunscald",
      "Dark sunken lesions near plant stem base",
    ],
    environmental_conditions: {
      temperature_range: "24°C – 29°C (Warm)",
      humidity_threshold: "> 80% Relative Humidity",
      favorable_weather: "Alternating wet and dry warm periods with heavy dew",
    },
    preventive_actions: [
      "Apply 2-3 year crop rotation away from solanaceous plants",
      "Use drip irrigation to keep foliage dry and mulch soil beds",
      "Stake and prune indeterminate vines to improve canopy airflow",
    ],
    monitoring_advice: [
      "Inspect lower leaves weekly starting 3 weeks post-transplant",
      "Re-scan foliage within 4-7 days if warm humid weather persists",
    ],
    expert_escalation: "If defoliation exceeds 25% across multiple rows, consult an agricultural extension specialist.",
  },
  {
    id: "tomato_late_blight",
    name: "Tomato Late Blight",
    crop: "Tomato",
    scientific_name: "Phytophthora infestans",
    pathogen_type: "Oomycete / Water Mold",
    description: "Devastating water mold causing rapid water-soaked lesions that turn dark brown with white downy fungal growth on leaf undersides.",
    symptoms: [
      "Irregular dark water-soaked lesions with pale green borders",
      "White fuzzy sporulation visible on undersides of leaves in humid mornings",
      "Rapid collapse of petioles and brown greasy lesions on stems",
    ],
    environmental_conditions: {
      temperature_range: "15°C – 22°C (Cool to Mild)",
      humidity_threshold: "> 90% Prolonged Humidity",
      favorable_weather: "Cool, cloudy, and wet periods with frequent rainfall or fog",
    },
    preventive_actions: [
      "Plant certified disease-free transplants and blight-resistant cultivars",
      "Eliminate cull piles and volunteer solanaceous weed hosts",
      "Maintain wide plant spacing to accelerate morning canopy dry-out",
    ],
    monitoring_advice: [
      "Daily scouting during periods of persistent cool drizzle or heavy fog",
      "Immediate quarantine or removal of index plants to contain spread",
    ],
    expert_escalation: "Report early detections immediately to regional agricultural advisory to alert neighboring farms.",
  },
  {
    id: "tomato_bacterial_spot",
    name: "Tomato Bacterial Spot",
    crop: "Tomato",
    scientific_name: "Xanthomonas vesicatoria",
    pathogen_type: "Bacterial",
    description: "Bacterial pathogen that causes numerous small, dark, angular lesions on leaves, stems, and fruit.",
    symptoms: [
      "Small (1-3mm) circular dark spots with water-soaked greasy margins",
      "Spots coalesce into irregular brown blotches causing leaf tearing",
      "Raised scab-like spots on green fruit",
    ],
    environmental_conditions: {
      temperature_range: "25°C – 30°C (Warm to Hot)",
      humidity_threshold: "> 85% High Moisture",
      favorable_weather: "Wind-driven rain, sprinkler irrigation, and warm temperatures",
    },
    preventive_actions: [
      "Use certified pathogen-free seeds treated with hot water",
      "Never work in fields when plants are wet with dew or rain",
      "Sanitize pruning equipment and stakes between rows",
    ],
    monitoring_advice: [
      "Inspect foliage 3-5 days after wind-driven rain events",
      "Differentiate from fungal spots by lack of concentric ring patterns",
    ],
    expert_escalation: "Consult local agronomy extension for verified copper-mancozeb tank mixes if confirmed.",
  },
  {
    id: "potato_early_blight",
    name: "Potato Early Blight",
    crop: "Potato",
    scientific_name: "Alternaria solani",
    pathogen_type: "Fungal",
    description: "Fungal pathogen causing target-like lesions on potato foliage and dry leathery tuber rot.",
    symptoms: [
      "Brown to black spots with concentric rings on older lower leaves",
      "Yellowing tissue surrounding lesions leads to early vine senescence",
      "Dark sunken irregular lesions on tuber skins",
    ],
    environmental_conditions: {
      temperature_range: "20°C – 28°C",
      humidity_threshold: "> 80% with dew",
      favorable_weather: "Warm days followed by cool nights with dew accumulation",
    },
    preventive_actions: [
      "Maintain optimal vine nutrition (especially nitrogen and potassium)",
      "Ensure uniform furrow or drip irrigation to avoid vine stress",
      "Allow skins to mature fully before harvest to prevent tuber entry",
    ],
    monitoring_advice: [
      "Begin scouting at tuber initiation and flowering stage",
      "Rescan canopy weekly during rapid bulking",
    ],
    expert_escalation: "Escalate if symptoms appear on upper third of canopy before tuber bulking is complete.",
  },
  {
    id: "potato_late_blight",
    name: "Potato Late Blight",
    crop: "Potato",
    scientific_name: "Phytophthora infestans",
    pathogen_type: "Oomycete",
    description: "Highly aggressive pathogen capable of destroying entire potato fields within 7 to 10 days in wet conditions.",
    symptoms: [
      "Pale green water-soaked spots rapidly expanding into purplish-brown lesions",
      "Cottony white spore growth at lesion margins on leaf undersides",
      "Foul odor in heavily infected fields due to secondary bacterial breakdown",
    ],
    environmental_conditions: {
      temperature_range: "12°C – 22°C",
      humidity_threshold: "> 90% Continuous",
      favorable_weather: "Consecutive days of rain, overcast skies, and high humidity",
    },
    preventive_actions: [
      "Plant only certified disease-free seed tubers",
      "Destroy all volunteer potato plants and cull piles before planting season",
      "Hill soil generously around tubers to create a physical spore barrier",
    ],
    monitoring_advice: [
      "Scout low-lying field hollows and sheltered hedge rows first",
      "Rescan every 48 hours during active regional blight warnings",
    ],
    expert_escalation: "Trigger emergency local farm advisory notice if active sporulation is confirmed.",
  },
  {
    id: "pepper_bacterial_spot",
    name: "Pepper Bacterial Spot",
    crop: "Pepper",
    scientific_name: "Xanthomonas campestris pv. vesicatoria",
    pathogen_type: "Bacterial",
    description: "Bacterial infection causing severe foliar spotting and defoliation in bell and chili peppers.",
    symptoms: [
      "Small, angular, water-soaked spots turning dark brown or black",
      "Raised blister-like spots on green pepper fruit",
      "Extensive leaf drop leaving fruit exposed to severe sunburn",
    ],
    environmental_conditions: {
      temperature_range: "24°C – 32°C (Warm/Hot)",
      humidity_threshold: "> 85% High Relative Humidity",
      favorable_weather: "High temperatures with frequent thunderstorms and overhead splashing",
    },
    preventive_actions: [
      "Utilize resistant bell pepper hybrid varieties (races 1-5)",
      "Avoid all overhead sprinkler irrigation; convert to soil drip lines",
      "Perform strict weed management of nightshade family weeds",
    ],
    monitoring_advice: [
      "Scout young transplants weekly for seedling lesions",
      "Rescan 4-6 days after major thunder storms",
    ],
    expert_escalation: "Consult state certified crop advisers if systemic field defoliation begins.",
  },
];

export default function DiseaseLibraryPage() {
  const [diseases, setDiseases] = useState<DiseaseDetail[]>(FALLBACK_DISEASES);
  const [search, setSearch] = useState("");
  const [selectedCrop, setSelectedCrop] = useState<string>("all");
  const [selectedDisease, setSelectedDisease] = useState<DiseaseDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDiseases();
  }, []);

  async function loadDiseases() {
    setLoading(true);
    try {
      const res = await api.diseases();
      const list = Array.isArray(res) ? res : res?.diseases;
      if (list && list.length > 0) {
        // Merge backend fields with clean fallback data
        const merged: DiseaseDetail[] = list.map((item: Record<string, unknown>) => {
          const itemName = String(item.name || "");
          const fb = FALLBACK_DISEASES.find(
            (f) => f.name.toLowerCase().includes(itemName.toLowerCase()) || itemName.toLowerCase().includes(f.crop.toLowerCase())
          );
          return {
            id: String(item.id || item.name || "disease"),
            name: String(item.name || fb?.name || "Crop Disease"),
            crop: String(item.crop || fb?.crop || "Tomato"),
            scientific_name: (item.scientific_name as string) || fb?.scientific_name,
            pathogen_type: (item.pathogen_type as string) || fb?.pathogen_type || "Foliar Pathogen",
            description: (item.description as string) || fb?.description,
            symptoms: (item.symptoms as string[]) || fb?.symptoms || [],
            environmental_conditions: (item.environmental_conditions as DiseaseDetail["environmental_conditions"]) || fb?.environmental_conditions,
            preventive_actions: (item.preventive_actions as string[]) || (item.prevention as string[]) || fb?.preventive_actions || [],
            monitoring_advice: (item.monitoring_advice as string[]) || (item.monitoring as string[]) || fb?.monitoring_advice || [],
            expert_escalation: (item.expert_escalation as string) || fb?.expert_escalation,
          };
        });
        setDiseases(merged);
      }
    } catch (e) {
      console.warn("Using curated local disease repository:", e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = diseases.filter((d) => {
    const matchCrop = selectedCrop === "all" || d.crop.toLowerCase() === selectedCrop.toLowerCase();
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.crop.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q) ||
      d.symptoms?.some((s) => s.toLowerCase().includes(q));
    return matchCrop && matchSearch;
  });

  return (
    <VerdraSidebar>
      <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold tracking-wider uppercase text-[#2E7D32]">
              Botanical Pathogen Knowledgebase
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#12372A] tracking-tight font-heading">
            Disease Library
          </h1>
          <p className="text-base text-[#66736B] max-w-3xl">
            Comprehensive foliar diagnostic reference for AI-detected crop pathogens. Curated symptoms, environmental spread triggers, prevention techniques, and monitoring schedules.
          </p>
        </div>

        {/* Search & Crop Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Crop Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-[#DCE8DC] overflow-x-auto">
            {["all", "Tomato", "Potato", "Pepper"].map((crop) => (
              <button
                key={crop}
                onClick={() => setSelectedCrop(crop)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCrop.toLowerCase() === crop.toLowerCase()
                    ? "bg-[#12372A] text-white shadow-sm"
                    : "text-[#66736B] hover:text-[#12372A] hover:bg-[#EEF6EC]"
                }`}
              >
                {crop === "all" ? "All Crops" : crop}
              </button>
            ))}
          </div>

          {/* Search Field */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66736B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search diseases or symptoms..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#DCE8DC] bg-white text-sm text-[#17211B] placeholder:text-[#66736B] outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#66736B] hover:text-[#17211B]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Disease Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((d) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="verdra-glass p-7 verdra-glass-hover flex flex-col justify-between group cursor-pointer"
              onClick={() => setSelectedDisease(d)}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-[#EEF6EC] text-[#2E7D32]">
                        {d.crop}
                      </span>
                      {d.pathogen_type && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#F8FAF6] text-[#66736B] border border-[#DCE8DC]">
                          {d.pathogen_type}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-[#12372A] font-heading group-hover:text-[#2E7D32] transition-colors">
                      {formatDiseaseName(d.name)}
                    </h3>
                    {d.scientific_name && (
                      <span className="text-xs italic text-[#66736B] block mt-0.5">
                        {d.scientific_name}
                      </span>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[#EEF6EC] text-[#2E7D32] flex items-center justify-center shrink-0 group-hover:bg-[#12372A] group-hover:text-white transition-colors">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>

                <p className="text-xs text-[#66736B] line-clamp-2 leading-relaxed">
                  {d.description}
                </p>

                {/* Visual Symptoms */}
                {d.symptoms && d.symptoms.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-[#DCE8DC]/70">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#12372A] flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-[#2E7D32]" />
                      Visual Symptoms
                    </span>
                    <ul className="space-y-1 text-xs text-[#17211B]">
                      {d.symptoms.slice(0, 2).map((s, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 line-clamp-1">
                          <span className="text-[#2E7D32] shrink-0 font-bold">•</span>
                          <span className="truncate">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Environmental Conditions snippet */}
                {d.environmental_conditions && (
                  <div className="p-3 bg-[#F8FAF6] rounded-xl border border-[#DCE8DC] space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[#66736B]">
                      <span className="flex items-center gap-1">
                        <Thermometer className="w-3 h-3 text-[#F59E0B]" />
                        Temp:
                      </span>
                      <span className="font-medium text-[#17211B]">
                        {d.environmental_conditions.temperature_range || "20°C - 28°C"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#66736B]">
                      <span className="flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-[#2E7D32]" />
                        Humidity:
                      </span>
                      <span className="font-medium text-[#17211B]">
                        {d.environmental_conditions.humidity_threshold || "> 80%"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-4 mt-4 border-t border-[#DCE8DC]/70 flex items-center justify-between text-xs font-semibold text-[#2E7D32]">
                <span>View Full Disease Dossier</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="verdra-card p-12 bg-white text-center space-y-3">
            <Leaf className="w-10 h-10 text-[#66736B] mx-auto opacity-50" />
            <h3 className="font-bold text-lg text-[#12372A]">No Diseases Found</h3>
            <p className="text-sm text-[#66736B] max-w-sm mx-auto">
              No matching foliar pathogens for &quot;{search}&quot;. Try clearing filters or searching for alternate terms.
            </p>
          </div>
        )}

        {/* Detailed Modal Dossier */}
        <AnimatePresence>
          {selectedDisease && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-[#DCE8DC] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-xl space-y-6"
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between gap-4 border-b border-[#DCE8DC] pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#EEF6EC] text-[#2E7D32]">
                        {selectedDisease.crop}
                      </span>
                      {selectedDisease.pathogen_type && (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F8FAF6] text-[#66736B] border border-[#DCE8DC]">
                          {selectedDisease.pathogen_type}
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-extrabold text-[#12372A] font-heading">
                      {formatDiseaseName(selectedDisease.name)}
                    </h2>
                    {selectedDisease.scientific_name && (
                      <p className="text-sm italic text-[#66736B] mt-0.5">
                        Scientific Taxon: {selectedDisease.scientific_name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedDisease(null)}
                    className="p-2 rounded-xl text-[#66736B] hover:text-[#17211B] hover:bg-[#F8FAF6] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#66736B]">Overview</h4>
                  <p className="text-sm text-[#17211B] leading-relaxed">
                    {selectedDisease.description}
                  </p>
                </div>

                {/* Visual Symptoms */}
                {selectedDisease.symptoms && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#12372A] flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-[#2E7D32]" />
                      Visual Symptoms
                    </h4>
                    <div className="bg-[#F8FAF6] rounded-2xl p-4 border border-[#DCE8DC] space-y-2">
                      {selectedDisease.symptoms.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-[#17211B]">
                          <span className="text-[#2E7D32] font-bold mt-0.5">•</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Environmental Conditions */}
                {selectedDisease.environmental_conditions && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#12372A] flex items-center gap-1.5">
                      <Thermometer className="w-4 h-4 text-[#F59E0B]" />
                      Environmental Conditions & Spread Triggers
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 bg-[#F8FAF6] rounded-xl border border-[#DCE8DC]">
                        <span className="text-xs text-[#66736B] block">Optimal Temperature</span>
                        <span className="text-sm font-semibold text-[#12372A]">
                          {selectedDisease.environmental_conditions.temperature_range || "22°C - 28°C"}
                        </span>
                      </div>
                      <div className="p-3.5 bg-[#F8FAF6] rounded-xl border border-[#DCE8DC]">
                        <span className="text-xs text-[#66736B] block">Humidity Requirement</span>
                        <span className="text-sm font-semibold text-[#12372A]">
                          {selectedDisease.environmental_conditions.humidity_threshold || "> 80% RH"}
                        </span>
                      </div>
                      {selectedDisease.environmental_conditions.favorable_weather && (
                        <div className="p-3.5 bg-[#F8FAF6] rounded-xl border border-[#DCE8DC] sm:col-span-2">
                          <span className="text-xs text-[#66736B] block">Favorable Microclimate</span>
                          <span className="text-sm font-medium text-[#17211B]">
                            {selectedDisease.environmental_conditions.favorable_weather}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Prevention Techniques */}
                {selectedDisease.preventive_actions && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#12372A] flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-[#16A34A]" />
                      Prevention & Cultural Practices
                    </h4>
                    <div className="bg-[#EEF6EC] rounded-2xl p-4 border border-[#DCE8DC] space-y-2">
                      {selectedDisease.preventive_actions.map((act, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-[#12372A]">
                          <span className="text-[#16A34A] font-bold mt-0.5">✓</span>
                          <span>{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Monitoring Guidance */}
                {selectedDisease.monitoring_advice && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#12372A] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#2E7D32]" />
                      Monitoring & Rescan Guidance
                    </h4>
                    <div className="bg-[#F8FAF6] rounded-2xl p-4 border border-[#DCE8DC] space-y-2">
                      {selectedDisease.monitoring_advice.map((adv, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-[#17211B]">
                          <span className="text-[#2E7D32] font-bold mt-0.5">•</span>
                          <span>{adv}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expert Guidance Note */}
                <div className="p-4 bg-[#F8FAF6] rounded-xl border border-[#DCE8DC] text-xs text-[#66736B] flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-[#12372A]">Expert Guidance:</strong> For severe or uncertain cases, always consult a qualified local agricultural extension agent before applying chemical interventions.
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </VerdraSidebar>
  );
}
