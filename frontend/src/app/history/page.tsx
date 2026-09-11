"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  History as HistoryIcon,
  Search,
  Filter,
  Calendar,
  ChevronRight,
  ScanLine,
  ArrowRight,
  Sprout,
} from "lucide-react";
import VerdraSidebar from "@/components/layout/VerdraSidebar";
import { supabase, getScans } from "@/lib/supabase";
import { formatDate, formatConfidence } from "@/lib/utils";

interface HistoryItem {
  id: string;
  image_url?: string;
  crop: string;
  disease: string;
  confidence: number;
  severity?: string;
  risk_level?: string;
  created_at: string;
  is_healthy?: boolean;
}

export default function HistoryPage() {
  const [scans, setScans] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [cropFilter, setCropFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    async function loadScans() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const dbScans = await getScans(user.id, 50);
          if (dbScans && dbScans.length > 0) {
            setScans(dbScans as unknown as HistoryItem[]);
            return;
          }
        }
      } catch {
        // continue
      }

      // Check local storage for recent scans
      try {
        const local = localStorage.getItem("verdra_recent_scans");
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setScans(parsed);
          }
        }
      } catch {
        // continue
      }
    }
    loadScans();
  }, []);

  // Filter & Search
  const filteredScans = scans
    .filter((item) => {
      const matchSearch =
        item.crop.toLowerCase().includes(search.toLowerCase()) ||
        item.disease.toLowerCase().includes(search.toLowerCase());
      const matchCrop = cropFilter === "all" || item.crop.toLowerCase() === cropFilter.toLowerCase();
      const matchRisk = riskFilter === "all" || (item.risk_level || "").toLowerCase() === riskFilter.toLowerCase();
      return matchSearch && matchCrop && matchRisk;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

  return (
    <VerdraSidebar>
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DCE8DC]/80">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#12372A] tracking-tight font-heading">
              Scan History
            </h1>
            <p className="text-sm text-[#66736B] mt-1">
              Searchable archive of historical crop inspections and pathology results.
            </p>
          </div>

          <Link
            href="/scan"
            className="btn-forest !py-2.5 !px-5 !text-sm flex items-center gap-2 self-start sm:self-center"
          >
            <ScanLine className="w-4 h-4" />
            <span>New Scan</span>
          </Link>
        </div>

        {/* Search and Filters Bar */}
        <div className="verdra-glass p-5 sm:p-6 space-y-3 shadow-xs">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#66736B] absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by crop or disease name..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#DCE8DC] bg-[#F8FAF6] text-sm text-[#12372A] placeholder:text-[#66736B] focus:border-[#2E7D32] focus:outline-none"
              />
            </div>

            {/* Crop Filter */}
            <select
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              className="rounded-xl border border-[#DCE8DC] bg-[#F8FAF6] px-3.5 py-2.5 text-xs font-semibold text-[#12372A] focus:outline-none"
            >
              <option value="all">All Crops</option>
              <option value="tomato">Tomato</option>
              <option value="potato">Potato</option>
              <option value="pepper">Pepper</option>
            </select>

            {/* Risk Filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="rounded-xl border border-[#DCE8DC] bg-[#F8FAF6] px-3.5 py-2.5 text-xs font-semibold text-[#12372A] focus:outline-none"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="moderate">Moderate Risk</option>
              <option value="high">High Risk</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")}
              className="rounded-xl border border-[#DCE8DC] bg-[#F8FAF6] px-3.5 py-2.5 text-xs font-semibold text-[#12372A] focus:outline-none"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>

        {/* History Records List */}
        <div className="verdra-glass overflow-hidden shadow-md">
          {filteredScans.length === 0 ? (
            <div className="p-12 text-center text-[#66736B]">
              <Sprout className="w-10 h-10 mx-auto mb-3 text-[#2E7D32] opacity-40" />
              <h3 className="text-base font-bold text-[#12372A] mb-1">No scan records found</h3>
              <p className="text-xs max-w-sm mx-auto mb-4">
                No archived foliar diagnoses match your current search and filter criteria.
              </p>
              <button
                onClick={() => { setSearch(""); setCropFilter("all"); setRiskFilter("all"); }}
                className="btn-outline !py-2 !px-4 !text-xs"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#DCE8DC]/70">
              {filteredScans.map((scan) => {
                const isHealthy = scan.disease.toLowerCase().includes("healthy");
                return (
                  <Link
                    key={scan.id}
                    href={`/result/${scan.id}`}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#F8FAF6] transition-colors group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Leaf Thumbnail */}
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#EEF6EC] border border-[#DCE8DC] shrink-0">
                        <img
                          src={scan.image_url || "/sample_images/sample_tomato_late_blight.jpg"}
                          alt={scan.crop}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>

                      {/* Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-[#12372A] font-mono">
                            {scan.crop}
                          </span>
                          {(scan as any).fieldTag && (
                            <>
                              <span className="text-xs text-[#66736B]">·</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#EEF6EC] border border-[#DCE8DC] text-[#2E7D32] font-semibold">
                                {(scan as any).fieldTag}
                              </span>
                            </>
                          )}
                          <span className="text-xs text-[#66736B]">·</span>
                          <span className="text-xs text-[#66736B] font-mono">
                            {formatDate(scan.created_at)}
                          </span>
                        </div>
                        <h4 className={`text-base font-bold truncate ${isHealthy ? "text-[#2E7D32]" : "text-[#12372A]"}`}>
                          {scan.disease}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-[#66736B] mt-1 font-mono">
                          <span>Confidence: <strong className="text-[#12372A]">{formatConfidence(scan.confidence)}</strong></span>
                          <span>·</span>
                          <span>Severity: <strong className="text-[#12372A]">{scan.severity || (isHealthy ? "0%" : "Moderate")}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Risk Badge and Arrow */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`badge-${
                          (scan.risk_level || "").toLowerCase() === "high"
                            ? "danger"
                            : (scan.risk_level || "").toLowerCase() === "moderate"
                            ? "warning"
                            : "success"
                        }`}
                      >
                        {scan.risk_level || "Low"} Risk
                      </span>
                      <ChevronRight className="w-5 h-5 text-[#66736B] group-hover:text-[#12372A] transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </VerdraSidebar>
  );
}
