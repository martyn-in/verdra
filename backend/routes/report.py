"""
AgriVisionAI — Report Route
POST /api/report — Generate PDF crop health report.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Union, Any
from datetime import datetime
from services import report_service
import io
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class ReportRequest(BaseModel):
    scan_id: Optional[str] = None
    farmer_name: Optional[str] = "Farmer"
    farm_name: Optional[str] = "My Farm"
    scan_date: Optional[str] = None
    crop: str = "Unknown"
    prediction: str = "Unknown"
    confidence: float = 0.0
    is_healthy: bool = False
    severity: Optional[Union[str, dict]] = "N/A"
    infected_percentage: Optional[float] = 0.0
    top_predictions: list = []
    weather: Optional[dict] = None
    risk: Optional[dict] = None
    recommendations: Optional[dict] = None


@router.post("/report")
async def generate_report(request: ReportRequest):
    """Generate a PDF crop health report."""
    try:
        data = request.model_dump()
        if isinstance(data.get("severity"), dict):
            sev_dict = data["severity"]
            data["infected_percentage"] = sev_dict.get("infected_percentage", data.get("infected_percentage", 0.0))
            data["severity"] = sev_dict.get("severity", "N/A")

        if not data.get("scan_date"):
            data["scan_date"] = datetime.now().strftime("%Y-%m-%d %H:%M")

        pdf_bytes = report_service.generate_report(data)
        filename = f"Verdra_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report.")
