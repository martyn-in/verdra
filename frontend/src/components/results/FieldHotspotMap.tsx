"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Info,
  Layers,
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { api } from "@/lib/api";

interface FieldHotspotMapProps {
  fieldId?: string;
  onSelectScan?: (scan: any) => void;
}

export default function FieldHotspotMap({
  fieldId = "all",
  onSelectScan,
}: FieldHotspotMapProps) {
  const { t } = useTranslation();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const [hotspots, setHotspots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<
    "prompt" | "granted" | "denied"
  >("prompt");

  // Load real hotspots from backend
  const loadHotspots = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getFieldHotspots(fieldId);
      setHotspots(data.hotspots || []);
    } catch (err: any) {
      setError("Unable to load field coordinates from storage.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHotspots();
  }, [fieldId]);

  // Request browser geolocation on user intent
  const requestCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator?.geolocation) {
      setLocationPermissionStatus("denied");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationPermissionStatus("granted");
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });

        if (mapInstanceRef.current && (window as any).L) {
          const L = (window as any).L;
          mapInstanceRef.current.setView([pos.coords.latitude, pos.coords.longitude], 16);
          L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
            radius: 8,
            fillColor: "#3B82F6",
            color: "#FFFFFF",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          })
            .addTo(mapInstanceRef.current)
            .bindPopup("<b>Your Current Location</b><br/>Ready to pin scan")
            .openPopup();
        }
      },
      (err) => {
        console.warn("Geolocation permission error:", err);
        setLocationPermissionStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Dynamically load Leaflet and initialize map
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;

    const initLeafletMap = () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Center on first hotspot or user location or default farm region
      const defaultCenter: [number, number] =
        hotspots.length > 0
          ? [hotspots[0].latitude, hotspots[0].longitude]
          : userLocation
          ? [userLocation.lat, userLocation.lng]
          : [17.385044, 78.486671]; // Agricultural benchmarking center

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: hotspots.length > 0 ? 15 : 12,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Real OpenStreetMap tile layer (no paid Google API needed)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Plot real stored scans
      const markersGroup = L.featureGroup();

      hotspots.forEach((pin) => {
        if (typeof pin.latitude !== "number" || typeof pin.longitude !== "number") return;

        const colorHex =
          pin.marker_color === "green"
            ? "#22C55E"
            : pin.marker_color === "red"
            ? "#EF4444"
            : "#F59E0B";

        const marker = L.circleMarker([pin.latitude, pin.longitude], {
          radius: 9,
          fillColor: colorHex,
          color: "#0F1F16",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        });

        const dtStr = pin.created_at
          ? new Date(pin.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A";

        const popupContent = `
          <div style="font-family: sans-serif; min-width: 170px; color: #12372A;">
            <div style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: ${colorHex};">
              ● ${pin.status_label || "Specimen"}
            </div>
            <div style="font-weight: bold; font-size: 13px; margin: 2px 0;">${pin.disease || pin.crop}</div>
            <div style="font-size: 11px; color: #555;">Confidence: ${(pin.confidence * 100).toFixed(1)}%</div>
            <div style="font-size: 11px; color: #555;">Severity: ${pin.severity?.percentage !== null ? `${pin.severity?.percentage}%` : pin.severity?.level || "N/A"}</div>
            <div style="font-size: 10px; color: #888; margin-top: 4px;">Time: ${dtStr}</div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on("click", () => {
          if (onSelectScan) onSelectScan(pin);
        });
        marker.addTo(markersGroup);
      });

      markersGroup.addTo(map);

      if (hotspots.length > 1) {
        map.fitBounds(markersGroup.getBounds().pad(0.2));
      }
    };

    // Check if Leaflet CSS already loaded
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Check if Leaflet JS already loaded
    if ((window as any).L) {
      initLeafletMap();
    } else if (!document.getElementById("leaflet-script")) {
      const script = document.createElement("script");
      script.id = "leaflet-script";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => {
        if (isMounted) initLeafletMap();
      };
      document.body.appendChild(script);
    }

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [hotspots, userLocation]);

  return (
    <div className="p-6 rounded-3xl bg-[#0f1f16] border border-[#2E7D32]/30 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2E7D32]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#2E7D32]/20 border border-[#2E7D32]/40 flex items-center justify-center text-[#52B788]">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-heading">
              {t("map.title", "Field Hotspot Map")}
            </h3>
            <p className="text-xs text-[#8EA396]">
              Real geospatial distribution of verified crop health scans.
            </p>
          </div>
        </div>

        {/* Action / Legend */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={requestCurrentLocation}
            className="btn-outline !px-3.5 !py-1.5 !text-xs !text-white flex items-center gap-1.5"
            title="Detect GPS location for new scans"
          >
            <Navigation className="w-3.5 h-3.5 text-[#52B788]" />
            <span>My Location</span>
          </button>

          <button
            type="button"
            onClick={loadHotspots}
            className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 text-xs"
            title="Refresh Pins"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Marker Legend Bar */}
      <div className="flex items-center justify-between gap-4 p-2.5 rounded-2xl bg-black/40 border border-white/5 text-xs font-mono">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[#8EA396]">{t("map.marker_healthy", "Healthy")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-[#8EA396]">{t("map.marker_moderate", "Moderate Concern")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-[#8EA396]">{t("map.marker_high", "High Risk")}</span>
          </div>
        </div>

        <span className="text-[#8EA396]">
          {hotspots.length} {t("map.total_pins", "Total Pinned Scans")}
        </span>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[360px] sm:h-[440px] rounded-2xl overflow-hidden border border-[#2E7D32]/30 bg-[#09110d]">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {loading && (
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-xs flex items-center justify-center">
            <div className="text-center text-white space-y-2">
              <div className="w-7 h-7 rounded-full border-2 border-[#52B788] border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-mono">Loading real field coordinates...</p>
            </div>
          </div>
        )}

        {hotspots.length === 0 && !loading && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center p-6">
            <div className="bg-[#0f1f16]/90 border border-[#2E7D32]/40 rounded-2xl p-4 text-center max-w-sm pointer-events-auto backdrop-blur-md shadow-xl">
              <Info className="w-6 h-6 text-[#52B788] mx-auto mb-2" />
              <h4 className="text-xs font-bold text-white mb-1">No Pinned Coordinates Yet</h4>
              <p className="text-[11px] text-[#8EA396] leading-relaxed">
                Allow location permission during your next leaf scan to automatically plot real specimen pins on this OpenStreetMap view.
              </p>
            </div>
          </div>
        )}
      </div>

      {locationPermissionStatus === "denied" && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-xs text-amber-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{t("map.location_denied", "Location was not saved. Disease analysis can continue.")}</span>
        </div>
      )}
    </div>
  );
}
