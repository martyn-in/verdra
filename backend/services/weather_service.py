"""
AgriVisionAI — Real Weather Service
Integrates with OpenWeatherMap API for live environmental data.
Enforces strict jury rules:
- Returns "Live Weather API" with live telemetry when API succeeds.
- Returns "Weather API unavailable" / "Live weather service unavailable." if API fails.
- Never silently substitutes baseline weather in production/jury mode.
- In development mode, clearly labels any baseline as "DEMO / FALLBACK DATA".
"""
import os
import time
import httpx
import logging
from config import get_settings

logger = logging.getLogger(__name__)

# In-memory cache to prevent exceeding free-tier rate limits during live demos
_weather_cache = {}
CACHE_TTL = 600  # 10 minutes


def _get_api_key() -> str:
    """Retrieve OpenWeatherMap API key from environment variables or settings."""
    settings = get_settings()
    key = (
        os.environ.get("OPENWEATHERMAP_API_KEY")
        or os.environ.get("OPENWEATHER_API_KEY")
        or getattr(settings, "openweathermap_api_key", "")
        or ""
    ).strip()
    if not key or "your-" in key or key == "your-openweathermap-api-key":
        return ""
    return key


async def get_weather_by_coords(lat: float, lon: float) -> dict:
    """Fetch live weather data by geographical coordinates."""
    cache_key = f"coord_{round(lat, 2)}_{round(lon, 2)}"
    cached = _get_from_cache(cache_key)
    if cached:
        return cached

    api_key = _get_api_key()
    if not api_key:
        logger.info("OpenWeatherMap API key not configured")
        return _handle_weather_failure("OpenWeatherMap API key not configured", city=f"Lat {lat:.2f}, Lon {lon:.2f}")

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": api_key,
        "units": "metric"
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            result = _parse_live_weather(data)
            _set_cache(cache_key, result)
            return result
    except httpx.HTTPStatusError as e:
        logger.warning(f"Weather API HTTP error: {e.response.status_code}")
        return _handle_weather_failure(f"HTTP error {e.response.status_code}", city=f"Lat {lat:.2f}, Lon {lon:.2f}")
    except Exception as e:
        logger.warning(f"Weather API network error: {e}")
        return _handle_weather_failure(str(e), city=f"Lat {lat:.2f}, Lon {lon:.2f}")


async def get_weather_by_city(city: str) -> dict:
    """Fetch live weather data by city name."""
    cache_key = f"city_{city.lower().strip()}"
    cached = _get_from_cache(cache_key)
    if cached:
        return cached

    api_key = _get_api_key()
    if not api_key:
        logger.info(f"OpenWeatherMap API key not configured for city '{city}'")
        return _handle_weather_failure("OpenWeatherMap API key not configured", city=city)

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "q": city,
        "appid": api_key,
        "units": "metric"
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            result = _parse_live_weather(data)
            _set_cache(cache_key, result)
            return result
    except httpx.HTTPStatusError as e:
        logger.warning(f"Weather API HTTP error: {e.response.status_code}")
        return _handle_weather_failure(f"HTTP error {e.response.status_code}", city=city)
    except Exception as e:
        logger.warning(f"Weather API network error: {e}")
        return _handle_weather_failure(str(e), city=city)


def _parse_live_weather(data: dict) -> dict:
    """Parse genuine OpenWeatherMap response with verified live source metadata."""
    main = data.get("main", {})
    weather = data.get("weather", [{}])[0]
    wind = data.get("wind", {})
    rain = data.get("rain", {})

    rain_val = rain.get("1h", 0) or rain.get("3h", 0) or 0.0

    return {
        "available": True,
        "is_live": True,
        "is_fallback": False,
        "status": "LIVE",
        "source": "OpenWeatherMap Live API",
        "temperature": round(float(main.get("temp", 0)), 1),
        "feels_like": round(float(main.get("feels_like", 0)), 1),
        "humidity": round(float(main.get("humidity", 0)), 1),
        "pressure": int(main.get("pressure", 1013)),
        "wind_speed": round(float(wind.get("speed", 0)), 1),
        "wind_direction": int(wind.get("deg", 0)),
        "rainfall_1h": round(float(rain_val), 1),
        "rainfall": round(float(rain_val), 1),
        "description": weather.get("description", "clear sky"),
        "icon": weather.get("icon", "01d"),
        "city": data.get("name", "Local Station"),
        "country": data.get("sys", {}).get("country", ""),
        "last_updated": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
    }


def _handle_weather_failure(reason: str, city: str = "Regional Agricultural Baseline") -> dict:
    """
    Handles API failure or missing keys according to strict jury standards.
    Never silently substitutes baseline in production. In dev mode, clearly labels as DEMO / FALLBACK DATA.
    """
    settings = get_settings()
    app_env = (os.environ.get("APP_ENV") or settings.app_env or "development").lower()
    is_prod = app_env in ["production", "prod"]

    if is_prod:
        # Strict jury/production mode: no fallback weather, explicit UNAVAILABLE status
        return {
            "available": False,
            "is_live": False,
            "is_fallback": False,
            "status": "UNAVAILABLE",
            "source": "OpenWeatherMap Live API",
            "error": "Live weather service unavailable.",
            "warning": "Live weather service unavailable.",
            "fallback_warning": "Live weather service unavailable.",
            "city": city,
            "temperature": None,
            "humidity": None,
            "rainfall": None,
            "wind_speed": None,
            "description": "Live weather service unavailable.",
            "last_updated": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        }

    # Development mode: visibly labeled DEMO / FALLBACK DATA, never claim LIVE
    return {
        "available": True,
        "is_live": False,
        "is_fallback": True,
        "status": "UNAVAILABLE",
        "source": "DEMO / FALLBACK DATA",
        "warning": f"Live weather API unavailable ({reason}). Using DEMO / FALLBACK DATA.",
        "fallback_warning": "DEMO / FALLBACK DATA",
        "temperature": 24.0,
        "feels_like": 25.0,
        "humidity": 75.0,
        "pressure": 1012,
        "wind_speed": 3.2,
        "rainfall_1h": 0.0,
        "rainfall": 0.0,
        "description": "DEMO / FALLBACK DATA (API Not Configured)",
        "icon": "02d",
        "city": city,
        "country": "IN",
        "last_updated": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
    }


def _get_from_cache(key: str):
    if key in _weather_cache:
        val, ts = _weather_cache[key]
        if time.time() - ts < CACHE_TTL:
            return val
    return None


def _set_cache(key: str, data: dict):
    _weather_cache[key] = (data, time.time())
