"""
AgriVisionAI — Disease Spread Risk Engine
Combines disease detection + weather + severity to calculate spread risk.
"""
import json
import os
import logging

logger = logging.getLogger(__name__)

_risk_rules = None


def _load_risk_rules():
    global _risk_rules
    rules_path = os.path.join(os.path.dirname(__file__), "..", "data", "disease_risk_rules.json")
    try:
        with open(rules_path, "r") as f:
            _risk_rules = json.load(f)
        logger.info("Disease risk rules loaded")
    except Exception as e:
        logger.error(f"Failed to load risk rules: {e}")
        _risk_rules = {}


def calculate_risk(
    disease: str,
    temperature: float = None,
    humidity: float = None,
    rainfall: float = None,
    severity: str = None,
    infected_percentage: float = 0,
) -> dict:
    """
    Calculate disease spread risk based on environmental and diagnostic factors.
    """
    if _risk_rules is None:
        _load_risk_rules()

    factors = []
    risk_score = 0

    # 1. Disease-specific base risk
    disease_key = disease.lower().replace(" ", "_")
    disease_rules = _risk_rules.get("disease_factors", {})
    base_risk = 0
    for key, rule in disease_rules.items():
        if key in disease_key or disease_key in key:
            base_risk = rule.get("base_risk", 0)
            break
    risk_score += base_risk

    # 2. Humidity factor
    if humidity is not None:
        humidity_rules = _risk_rules.get("humidity_thresholds", {})
        if humidity >= humidity_rules.get("critical", 90):
            risk_score += 30
            factors.append(f"Critical humidity level: {humidity}%")
        elif humidity >= humidity_rules.get("high", 75):
            risk_score += 20
            factors.append(f"High humidity: {humidity}%")
        elif humidity >= humidity_rules.get("moderate", 60):
            risk_score += 10
            factors.append(f"Moderate humidity: {humidity}%")

    # 3. Temperature factor
    if temperature is not None:
        temp_rules = _risk_rules.get("temperature_ranges", {})
        optimal_min = temp_rules.get("fungal_optimal_min", 18)
        optimal_max = temp_rules.get("fungal_optimal_max", 28)
        if optimal_min <= temperature <= optimal_max:
            risk_score += 15
            factors.append(f"Temperature ({temperature}°C) in optimal range for fungal growth")
        elif temperature > optimal_max:
            risk_score += 5
            factors.append(f"Temperature ({temperature}°C) above optimal fungal range")

    # 4. Rainfall factor
    if rainfall is not None and rainfall > 0:
        rain_rules = _risk_rules.get("rainfall_thresholds", {})
        if rainfall >= rain_rules.get("heavy", 10):
            risk_score += 25
            factors.append(f"Heavy rainfall detected: {rainfall}mm")
        elif rainfall >= rain_rules.get("moderate", 3):
            risk_score += 15
            factors.append(f"Moderate rainfall: {rainfall}mm")
        elif rainfall > 0:
            risk_score += 8
            factors.append(f"Light rainfall: {rainfall}mm")

    # 5. Existing infection severity
    severity_scores = {"low": 5, "mild": 15, "moderate": 25, "severe": 40}
    if severity:
        sev_score = severity_scores.get(severity.lower(), 0)
        risk_score += sev_score
        if sev_score > 0:
            factors.append(f"Existing infection severity: {severity} ({infected_percentage:.1f}% affected)")

    # 6. Determine risk level
    if risk_score >= 80:
        risk_level = "Critical"
    elif risk_score >= 55:
        risk_level = "High"
    elif risk_score >= 30:
        risk_level = "Moderate"
    else:
        risk_level = "Low"

    # 7. Generate explanation
    if not factors:
        factors.append("No significant environmental risk factors detected")

    return {
        "risk_level": risk_level,
        "risk_score": min(100, risk_score),
        "factors": factors,
        "contributing_factors": factors,
        "recommendation": _get_risk_recommendation(risk_level),
        "explanation": _get_risk_recommendation(risk_level),
    }


def _get_risk_recommendation(risk_level: str) -> str:
    recommendations = {
        "Critical": "Immediate action required. Disease conditions are highly favorable for rapid spread. Implement control measures now and consult an agricultural expert.",
        "High": "High risk of disease spread. Monitor closely, apply preventive measures, and consider protective treatments as recommended by local agricultural guidance.",
        "Moderate": "Moderate risk. Continue monitoring and implement preventive cultural practices. Watch for changes in weather conditions.",
        "Low": "Low risk currently. Maintain standard crop monitoring and good agricultural practices.",
    }
    return recommendations.get(risk_level, "Monitor your crops regularly.")
