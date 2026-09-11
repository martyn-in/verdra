"""
AgriVisionAI — Weather Route
GET /api/weather — Fetch current weather data.
"""
from fastapi import APIRouter, HTTPException, Query
from services import weather_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/weather")
async def get_weather(
    lat: float = Query(default=None),
    lon: float = Query(default=None),
    city: str = Query(default=None),
):
    """Fetch weather data by coordinates or city name."""
    if lat is not None and lon is not None:
        result = await weather_service.get_weather_by_coords(lat, lon)
    elif city:
        result = await weather_service.get_weather_by_city(city)
    else:
        result = await weather_service.get_weather_by_city("Hyderabad")

    return result
