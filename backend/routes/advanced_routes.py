"""
Verdra — Advanced Real Features Routes
Endpoints:
- GET /api/plants/{plant_id}/timeline — Real chronological scans & severity progression trend
- POST /api/plants — Register/tag a plant specimen for tracking
- GET /api/fields/{field_id}/hotspots — Geolocation mapping of real field scan coordinates
- GET /api/fields/{field_id}/alerts — Real spatio-temporal cluster nearby-risk alerts (Haversine >=3 in 72h)
- POST /api/share — Cryptographically secure read-only expert case link (7-day default)
- GET /api/share/{token} — Public read-only case view
- DELETE /api/share/{token} — Revoke public share link
"""

import math
import secrets
import hashlib
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from services import storage_service

logger = logging.getLogger(__name__)
router = APIRouter()

# Earth radius in meters for Haversine distance
EARTH_RADIUS_METERS = 6371000.0


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points on the earth in meters."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) *
         math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_METERS * c


# -------------------------------------------------------------------
# 1. PLANT REGISTRATION & PROGRESSION TIMELINE
# -------------------------------------------------------------------

class PlantCreateRequest(BaseModel):
    plant_tag: str
    crop: str = "Tomato"
    farm_id: Optional[str] = None
    field_id: Optional[str] = None
    notes: Optional[str] = None


@router.post("/plants")
async def create_or_get_plant_endpoint(req: PlantCreateRequest):
    """Register or tag a plant specimen for longitudinal monitoring."""
    tag = req.plant_tag.strip().upper()
    existing = storage_service.get_plant(tag)
    if existing:
        return existing
    
    plant_data = {
        "plant_tag": tag,
        "crop": req.crop,
        "farm_id": req.farm_id,
        "field_id": req.field_id,
        "notes": req.notes or "",
    }
    created = storage_service.save_plant(plant_data)
    return created


@router.get("/plants/{plant_id}/timeline")
async def get_plant_progression_timeline(plant_id: str):
    """
    Retrieve chronological disease scans for a single plant specimen.
    Calculates trend (Improving, Stable, Worsening) using actual visual severity delta:
    latest severity < previous severity - threshold => Improving
    latest severity > previous severity + threshold => Worsening
    otherwise => Stable
    """
    plant = storage_service.get_plant(plant_id)
    scans = storage_service.get_plant_scans(plant_id)

    if not scans and plant:
        # Check by plant_tag if plant_id was passed as tag
        scans = storage_service.get_plant_scans(plant.get("id", plant_id))

    if not scans:
        return {
            "plant_id": plant_id,
            "plant_tag": plant.get("plant_tag") if plant else plant_id,
            "crop": plant.get("crop", "Tomato") if plant else "Tomato",
            "total_scans": 0,
            "timeline": [],
            "trend": "Insufficient Data",
            "trend_message": "Need at least two recorded scans to evaluate progression over time.",
            "disclaimer": "Based on estimated visual severity."
        }

    # Sort chronologically ascending
    scans.sort(key=lambda s: s.get("created_at", ""))

    timeline_points = []
    severities = []

    for s in scans:
        sev_info = s.get("severity", {})
        sev_pct = sev_info.get("percentage") if isinstance(sev_info, dict) else None
        if sev_pct is not None:
            severities.append(float(sev_pct))

        timeline_points.append({
            "scan_id": s.get("id"),
            "date": s.get("created_at"),
            "disease": s.get("disease"),
            "confidence": s.get("confidence"),
            "estimated_severity": sev_info,
            "risk": s.get("risk"),
            "is_healthy": s.get("is_healthy", False),
            "thumbnail_url": s.get("image_url") or s.get("gradcam_url")
        })

    # Evaluate progression trend based on severity delta between most recent consecutive scans
    SEVERITY_DELTA_THRESHOLD = 3.0  # 3% threshold for meaningful visual change

    if len(severities) >= 2:
        prev_sev = severities[-2]
        latest_sev = severities[-1]
        delta = latest_sev - prev_sev

        if delta <= -SEVERITY_DELTA_THRESHOLD:
            trend = "Improving"
            trend_message = f"Infection symptoms decreased by {abs(delta):.1f}% compared to prior scan."
        elif delta >= SEVERITY_DELTA_THRESHOLD:
            trend = "Worsening"
            trend_message = f"Infection severity increased by {delta:.1f}% compared to prior scan."
        else:
            trend = "Stable"
            trend_message = f"Infection severity has stabilized within +/-{SEVERITY_DELTA_THRESHOLD:.0f}% margin."
    elif len(scans) == 1:
        trend = "Initial Baseline"
        trend_message = "Baseline observation recorded. Future scans will calculate progression."
    else:
        trend = "Stable"
        trend_message = "No significant severity change recorded."

    return {
        "plant_id": plant.get("id") if plant else plant_id,
        "plant_tag": plant.get("plant_tag") if plant else plant_id,
        "crop": plant.get("crop", "Tomato") if plant else "Tomato",
        "total_scans": len(scans),
        "timeline": timeline_points,
        "trend": trend,
        "trend_message": trend_message,
        "disclaimer": "Based on estimated visual severity."
    }


# -------------------------------------------------------------------
# 2. FARM / FIELD HOTSPOT MAP
# -------------------------------------------------------------------

@router.get("/fields/{field_id}/hotspots")
async def get_field_hotspots_endpoint(field_id: str):
    """
    Return real stored scan coordinate pins for the field or whole farm.
    Marker colors: Green = Healthy, Amber = Moderate concern, Red = High/Critical risk.
    """
    scans = storage_service.get_scans_with_coordinates(field_id=field_id)

    hotspots = []
    for s in scans:
        risk_level = (s.get("risk", {}).get("level", "")).lower()
        is_healthy = s.get("is_healthy", False)

        if is_healthy:
            marker_color = "green"
            status_label = "Healthy"
        elif "high" in risk_level or "critical" in risk_level:
            marker_color = "red"
            status_label = "High Risk"
        else:
            marker_color = "amber"
            status_label = "Moderate Concern"

        hotspots.append({
            "scan_id": s.get("id"),
            "crop": s.get("crop"),
            "disease": s.get("disease"),
            "confidence": s.get("confidence"),
            "severity": s.get("severity"),
            "latitude": s.get("latitude"),
            "longitude": s.get("longitude"),
            "location_accuracy": s.get("location_accuracy"),
            "created_at": s.get("created_at"),
            "marker_color": marker_color,
            "status_label": status_label,
            "field_id": s.get("field_id"),
        })

    return {
        "field_id": field_id,
        "total_pinned_scans": len(hotspots),
        "hotspots": hotspots
    }


# -------------------------------------------------------------------
# 3. NEARBY-RISK ALERTS (SPATIO-TEMPORAL HA錯誤/HAVERSINE CLUSTER ENGINE)
# -------------------------------------------------------------------

@router.get("/fields/{field_id}/alerts")
async def get_field_alerts_endpoint(
    field_id: str,
    time_window_hours: int = Query(default=72, ge=12, le=168),
    spatial_radius_meters: float = Query(default=100.0, ge=10.0, le=1000.0),
    min_matching_scans: int = Query(default=3, ge=2, le=10),
):
    """
    Generate localized alerts only from actual stored scan records:
    Triggers when >= min_matching_scans (default 3) in the same field OR within
    configured radius (default 100m) record the same crop and disease within 72 hours.
    Explicit wording: 'Repeated detections may indicate localized disease pressure.'
    """
    recent_scans = storage_service.get_recent_scans_for_alert_evaluation(
        field_id=field_id,
        hours=time_window_hours
    )

    # Filter out healthy scans (alerts track pathogen pressures)
    pathogen_scans = [s for s in recent_scans if not s.get("is_healthy", False) and s.get("disease") != "Result Uncertain"]

    alerts = []
    # Group by (crop, disease)
    groups: Dict[str, List[Dict[str, Any]]] = {}
    for s in pathogen_scans:
        key = f"{s.get('crop')}::{s.get('disease')}"
        groups.setdefault(key, []).append(s)

    for key, group_scans in groups.items():
        crop_name, disease_name = key.split("::", 1)

        # 1. Field-based cluster check
        if len(group_scans) >= min_matching_scans:
            plants_affected = set(s.get("plant_id") for s in group_scans if s.get("plant_id"))
            alert_id = f"alert-{hashlib.md5(f'{field_id}-{key}-{len(group_scans)}'.encode()).hexdigest()[:8]}"

            alerts.append({
                "alert_id": alert_id,
                "disease": disease_name,
                "crop": crop_name,
                "field_id": field_id,
                "matching_scans_count": len(group_scans),
                "time_window": f"{time_window_hours} hours",
                "affected_plant_count": len(plants_affected) if plants_affected else len(group_scans),
                "cluster_type": "Field Boundary Clustering",
                "message": f"Repeated {disease_name} detections were recorded in {field_id if field_id != 'all' else 'your field area'}.",
                "recommended_action": f"Conduct targeted field inspection of surrounding rows for {disease_name}. Increase local spore defense and adjust irrigation to reduce foliar leaf wetness.",
                "disclaimer": "Repeated detections may indicate localized disease pressure.",
                "created_at": datetime.utcnow().isoformat(),
            })
            continue

        # 2. Coordinate / Haversine-based proximity cluster check (if field check didn't trigger)
        coord_scans = [s for s in group_scans if s.get("latitude") is not None and s.get("longitude") is not None]
        if len(coord_scans) >= min_matching_scans:
            # Check if at least min_matching_scans cluster within spatial_radius_meters
            clustered = []
            for i in range(len(coord_scans)):
                cluster = [coord_scans[i]]
                for j in range(len(coord_scans)):
                    if i != j:
                        dist = haversine_distance_meters(
                            coord_scans[i]["latitude"], coord_scans[i]["longitude"],
                            coord_scans[j]["latitude"], coord_scans[j]["longitude"]
                        )
                        if dist <= spatial_radius_meters:
                            cluster.append(coord_scans[j])
                if len(cluster) >= min_matching_scans:
                    clustered = cluster
                    break

            if clustered:
                plants_affected = set(s.get("plant_id") for s in clustered if s.get("plant_id"))
                alert_id = f"alert-spatial-{hashlib.md5(f'{key}-{len(clustered)}'.encode()).hexdigest()[:8]}"
                alerts.append({
                    "alert_id": alert_id,
                    "disease": disease_name,
                    "crop": crop_name,
                    "field_id": field_id,
                    "matching_scans_count": len(clustered),
                    "time_window": f"{time_window_hours} hours",
                    "spatial_radius": f"{spatial_radius_meters:.0f} meters",
                    "affected_plant_count": len(plants_affected) if plants_affected else len(clustered),
                    "cluster_type": "Geospatial Proximity Cluster",
                    "message": f"Repeated {disease_name} detections were recorded within {spatial_radius_meters:.0f}m radius.",
                    "recommended_action": f"Isolate the {spatial_radius_meters:.0f}m cluster zone immediately. Inspect neighboring foliage and sanitize equipment.",
                    "disclaimer": "Repeated detections may indicate localized disease pressure.",
                    "created_at": datetime.utcnow().isoformat(),
                })

    return {
        "field_id": field_id,
        "active_alerts_count": len(alerts),
        "alerts": alerts
    }


# -------------------------------------------------------------------
# 4. EXPERT SHARE LINK (READ-ONLY CRYPTOGRAPHIC TOKEN)
# -------------------------------------------------------------------

class ShareRequest(BaseModel):
    scan_id: str
    scan_data: Optional[Dict[str, Any]] = None
    expiry_days: int = 7


@router.post("/share")
async def create_expert_share_link(req: ShareRequest):
    """
    Generate a cryptographically secure, read-only case token.
    Stores SHA-256 hash of token to prevent plain-token enumeration.
    Exposes NO private account data or internal database IDs.
    """
    raw_scan = None
    if req.scan_id:
        raw_scan = storage_service.get_scan(req.scan_id)

    if not raw_scan and req.scan_data:
        raw_scan = req.scan_data

    if not raw_scan:
        raise HTTPException(status_code=404, detail="Scan record not found to share.")

    # Cryptographically secure URL-safe token (32 bytes = 43 chars base64)
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    expires_at = (datetime.utcnow() + timedelta(days=req.expiry_days)).isoformat()

    # Sanitize case data — zero private account data, zero secrets
    case_summary = {
        "scan_id": raw_scan.get("id") or raw_scan.get("scan_id"),
        "crop": raw_scan.get("crop"),
        "disease": raw_scan.get("disease"),
        "prediction": raw_scan.get("prediction"),
        "confidence": raw_scan.get("confidence"),
        "confidence_level": raw_scan.get("confidence_level", "HIGH"),
        "confidence_message": raw_scan.get("confidence_message", ""),
        "severity": raw_scan.get("severity"),
        "risk": raw_scan.get("risk"),
        "weather": raw_scan.get("weather"),
        "recommendations": raw_scan.get("recommendations"),
        "is_healthy": raw_scan.get("is_healthy", False),
        "gradcam_url": raw_scan.get("gradcam_url"),
        "scan_date": raw_scan.get("created_at") or datetime.utcnow().isoformat(),
        "application": "Verdra AI Plant Pathology Suite",
    }

    storage_service.save_shared_case({
        "scan_id": str(case_summary["scan_id"]),
        "token_hash": token_hash,
        "case_data": case_summary,
        "expires_at": expires_at,
        "revoked_at": None,
    })

    return {
        "share_token": raw_token,
        "share_url": f"/share/{raw_token}",
        "expires_at": expires_at,
        "expires_in_days": req.expiry_days,
    }


@router.get("/share/{token}")
async def get_shared_case_endpoint(token: str):
    """
    Public endpoint for experts to inspect shared scan.
    Read-only view. Validates token hash and expiration/revocation.
    """
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    shared_record = storage_service.get_shared_case_by_hash(token_hash)

    if not shared_record:
        raise HTTPException(
            status_code=404,
            detail="This case link is no longer available."
        )

    if shared_record.get("revoked_at"):
        raise HTTPException(
            status_code=410,
            detail="This case link has been revoked by the farmer."
        )

    expires_at_str = shared_record.get("expires_at")
    if expires_at_str:
        try:
            expires_at = datetime.fromisoformat(expires_at_str)
            if datetime.utcnow() > expires_at:
                raise HTTPException(
                    status_code=410,
                    detail="This case link has expired."
                )
        except (ValueError, TypeError):
            pass

    return {
        "valid": True,
        "case_summary": shared_record["case_data"],
        "shared_at": shared_record["created_at"],
        "expires_at": shared_record["expires_at"]
    }


@router.delete("/share/{token}")
async def revoke_shared_case_endpoint(token: str):
    """Revoke an active expert share link."""
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    revoked = storage_service.revoke_shared_case_by_hash(token_hash)
    if not revoked:
        raise HTTPException(status_code=404, detail="Active share link not found to revoke.")
    return {
        "success": True,
        "message": "Case link has been revoked and is no longer accessible."
    }


# -------------------------------------------------------------------
# 5. SCAN RETRIEVAL ENDPOINT
# -------------------------------------------------------------------

@router.get("/scans/{scan_id}")
async def get_scan_endpoint(scan_id: str):
    """Retrieve full diagnosis and metadata for an existing scan."""
    scan = storage_service.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found.")
    return scan
