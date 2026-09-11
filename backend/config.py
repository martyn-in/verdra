"""
AgriVisionAI Backend Configuration
"""
import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "AgriVisionAI"
    app_env: str = "development"
    cors_origins: str = "http://localhost:3000,http://localhost:8000"

    # Model
    model_path: str = os.path.join(os.path.dirname(__file__), "..", "models", "agri_vision_model.keras")
    class_names_path: str = os.path.join(os.path.dirname(__file__), "..", "ml", "class_names.json")

    # Weather
    openweathermap_api_key: str = ""
    openweather_api_key: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Optional LLM
    openai_api_key: str = ""
    llm_provider: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
