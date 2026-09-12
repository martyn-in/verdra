"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  MapPin,
  Eye,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { api } from "@/lib/api";

interface NearbyRiskAlertsProps {
  fieldId?: string;
  onAlertClicked?: (alert: any) => void;
}

export default function NearbyRiskAlerts({
  fieldId = "all",
  onAlertClicked,
}: NearbyRiskAlertsProps) {
  const { t } = useTranslation();

  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAlerts = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getFieldAlerts(fieldId);
      setAlerts(data.alerts || []);
    } catch (err: any) {
      setError("Unable to evaluate localized cluster alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [fieldId]);

  if (alerts.length === 0 && !loading) {
    return null; // Keep UI clean when there are no active clusters
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
            {t("alerts.title", "Nearby-Risk Alerts")} ({alerts.length})
          </h4>
        </div>

        <button
          type="button"
          onClick={loadAlerts}
          className="text-[11px] text-[#8EA396] hover:text-white flex items-center gap-1 font-mono"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="space-y-3">
        {alerts.map((alt) => (
          <div
            key={alt.alert_id}
            onClick={() => onAlertClicked && onAlertClicked(alt)}
            className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-3 hover:bg-amber-950/40 transition-colors cursor-pointer group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-bold text-amber-300 font-heading">
                  {alt.disease} Cluster Alert
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/50 text-amber-200 border border-amber-700/50">
                  {alt.matching_scans_count} matching scans
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-[#8EA396] font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {alt.time_window}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {alt.field_id !== "all" ? alt.field_id : "Field Sector"}
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-200 leading-relaxed font-sans">
              {alt.message}
            </p>

            <div className="p-3 rounded-xl bg-black/40 border border-amber-500/20 text-xs text-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-white block">Recommended Action:</span>
                <span>{alt.recommended_action}</span>
              </div>
            </div>

            <div className="text-[10px] text-[#8EA396] font-mono italic">
              * {alt.disclaimer || t("alerts.disclaimer", "Repeated detections may indicate localized disease pressure.")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
