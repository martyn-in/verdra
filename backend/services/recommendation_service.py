"""
AgriVisionAI — Recommendation Service
Provides actionable recommendations from the disease knowledgebase.
"""
import json
import os
import logging

logger = logging.getLogger(__name__)

_knowledge = None


def _load_knowledge():
    global _knowledge
    path = os.path.join(os.path.dirname(__file__), "..", "data", "disease_knowledge.json")
    try:
        with open(path, "r") as f:
            data = json.load(f)
            _knowledge = {d["id"]: d for d in data["diseases"]}
        logger.info(f"Loaded knowledge for {len(_knowledge)} diseases")
    except Exception as e:
        logger.error(f"Failed to load disease knowledge: {e}")
        _knowledge = {}


def get_recommendations(disease_class: str, severity: str = None) -> dict:
    """Get recommendations for a detected disease."""
    if _knowledge is None:
        _load_knowledge()

    # Map class_name to knowledge ID
    disease_id = _class_to_id(disease_class)
    disease_info = _knowledge.get(disease_id, None)

    if disease_info is None:
        return {
            "found": False,
            "disease_name": disease_class,
            "message": "Detailed recommendations are not yet available for this condition. Please consult a local agricultural expert.",
        }

    # Build structured recommendations
    recommendations = {
        "found": True,
        "disease_name": disease_info["name"],
        "scientific_name": disease_info.get("scientific_name", ""),
        "crop": disease_info["crop"],
        "pathogen_type": disease_info.get("pathogen_type", ""),
        "description": disease_info["description"],
        "symptoms": disease_info["symptoms"],
        "causes": disease_info.get("causes", []),
        "immediate_actions": disease_info.get("immediate_actions", []),
        "preventive_actions": disease_info.get("preventive_actions", []),
        "monitoring_advice": disease_info.get("monitoring_advice", []),
        "environmental_conditions": disease_info.get("environmental_conditions", {}),
        "expert_escalation": disease_info.get("expert_escalation", ""),
    }

    # Add severity-specific urgency
    if severity and severity.lower() in ("severe", "moderate"):
        recommendations["urgency"] = "High"
        recommendations["urgency_note"] = (
            f"With {severity.lower()} infection severity, immediate action is recommended. "
            "Follow the immediate actions below and monitor daily."
        )
    elif severity and severity.lower() == "mild":
        recommendations["urgency"] = "Moderate"
        recommendations["urgency_note"] = (
            "Mild infection detected. Implement preventive measures to stop progression."
        )
    else:
        recommendations["urgency"] = "Low"
        recommendations["urgency_note"] = "Monitor regularly and maintain preventive practices."

    return recommendations


def get_all_diseases() -> list:
    """Return all diseases from the knowledgebase."""
    if _knowledge is None:
        _load_knowledge()
    return list(_knowledge.values())


def get_disease_by_id(disease_id: str) -> dict:
    """Return a specific disease from the knowledgebase."""
    if _knowledge is None:
        _load_knowledge()
    return _knowledge.get(disease_id, None)


def get_assistant_response(question: str, context: dict = None) -> str:
    """
    Generate a contextual response for the AI farmer assistant.
    Uses deterministic knowledgebase responses — no random generation.
    """
    if _knowledge is None:
        _load_knowledge()

    question_lower = question.lower()

    # If we have scan context, use it
    disease_id = None
    disease_info = None
    if context:
        disease_class = context.get("prediction", "")
        disease_id = _class_to_id(disease_class)
        disease_info = _knowledge.get(disease_id, None)

    # Handle common question patterns
    if any(w in question_lower for w in ["what should i do", "what to do", "first step", "action"]):
        if disease_info:
            actions = disease_info.get("immediate_actions", [])
            if actions:
                response = f"For **{disease_info['name']}** on your **{disease_info['crop']}**, here are the recommended immediate actions:\n\n"
                for i, action in enumerate(actions, 1):
                    response += f"{i}. {action}\n"
                return response
        return "Please scan a crop leaf first so I can provide specific recommendations based on the detected condition."

    if any(w in question_lower for w in ["spread", "contagious", "infect other"]):
        if disease_info:
            env = disease_info.get("environmental_conditions", {})
            return (
                f"**{disease_info['name']}** ({disease_info.get('pathogen_type', 'Unknown')} pathogen):\n\n"
                f"- Optimal temperature for spread: {env.get('optimal_temperature', 'varies')}\n"
                f"- Humidity factor: {env.get('humidity', 'varies')}\n"
                f"- Rainfall impact: {env.get('rainfall', 'varies')}\n\n"
                f"The disease spreads through: {disease_info.get('causes', ['unknown mechanisms'])[0] if disease_info.get('causes') else 'various mechanisms'}.\n\n"
                "Monitor conditions closely and implement preventive measures on healthy plants nearby."
            )
        return "Please scan a crop first so I can assess spread risk for the specific disease detected."

    if any(w in question_lower for w in ["monitor", "watch", "check", "inspect"]):
        if disease_info:
            advice = disease_info.get("monitoring_advice", [])
            if advice:
                response = f"Monitoring advice for **{disease_info['name']}**:\n\n"
                for item in advice:
                    response += f"• {item}\n"
                return response
        return "General monitoring: Inspect your crops weekly, checking both upper and lower leaf surfaces. Pay extra attention after rainfall or during humid periods."

    if any(w in question_lower for w in ["explain", "what is", "tell me about", "describe"]):
        if disease_info:
            response = f"**{disease_info['name']}** (*{disease_info.get('scientific_name', '')}*)\n\n"
            response += f"{disease_info['description']}\n\n"
            response += "**Common symptoms:**\n"
            for symptom in disease_info.get("symptoms", [])[:4]:
                response += f"• {symptom}\n"
            return response
        return "Please scan a crop leaf first, and I can explain the detected condition in detail."

    if any(w in question_lower for w in ["prevent", "avoid", "protect", "stop"]):
        if disease_info:
            preventive = disease_info.get("preventive_actions", [])
            if preventive:
                response = f"Prevention strategies for **{disease_info['name']}**:\n\n"
                for i, action in enumerate(preventive, 1):
                    response += f"{i}. {action}\n"
                return response
        return "General prevention: Practice crop rotation, use resistant varieties, maintain proper spacing, and ensure good air circulation."

    if any(w in question_lower for w in ["expert", "professional", "specialist", "help"]):
        if disease_info:
            return f"**When to seek expert help for {disease_info['name']}:**\n\n{disease_info.get('expert_escalation', 'Consult a local agricultural extension officer for guidance.')}\n\n*AgriVisionAI provides AI-assisted screening. Severe or uncertain cases should always be verified by a qualified agricultural expert.*"
        return "If you're unsure about a plant condition, consulting a local agricultural extension officer or plant pathologist is always recommended."

    # Default contextual response
    if disease_info:
        return (
            f"I detected **{disease_info['name']}** on your **{disease_info['crop']}**. "
            f"This is a {disease_info.get('pathogen_type', '').lower()} condition. "
            f"{disease_info['description'][:200]}...\n\n"
            "You can ask me:\n"
            "• \"What should I do first?\"\n"
            "• \"Can this disease spread quickly?\"\n"
            "• \"How should I monitor my plants?\"\n"
            "• \"Explain this disease simply.\"\n"
            "• \"What prevention steps should I take?\""
        )

    return (
        "I'm your AgriVisionAI farming assistant. I can help you understand crop diseases, "
        "provide actionable recommendations, and answer questions about plant health.\n\n"
        "To get started, scan a crop leaf using the **Scan Crop** feature, and I'll be able to "
        "provide specific, contextual advice based on the AI analysis.\n\n"
        "You can also ask general questions about:\n"
        "• Disease prevention\n"
        "• Crop monitoring best practices\n"
        "• When to consult an expert"
    )


def _class_to_id(class_name: str) -> str:
    """Convert model class name to knowledge ID."""
    if not class_name:
        return ""

    mapping = {
        "Pepper_bell_Bacterial_spot": "pepper_bacterial_spot",
        "Pepper_bell_healthy": "pepper_healthy",
        "Potato_Early_Blight": "potato_early_blight",
        "Potato_Late_Blight": "potato_late_blight",
        "Potato_healthy": "potato_healthy",
        "Tomato_Bacterial_spot": "tomato_bacterial_spot",
        "Tomato_Early_Blight": "tomato_early_blight",
        "Tomato_Late_Blight": "tomato_late_blight",
        "Tomato_Leaf_Mold": "tomato_leaf_mold",
        "Tomato_Septoria_leaf_spot": "tomato_septoria_leaf_spot",
        "Tomato_Target_Spot": "tomato_target_spot",
        "Tomato_Spider_mites_Two_spotted_spider_mite": "tomato_spider_mites",
        "Tomato_Tomato_YellowLeaf_Curl_Virus": "tomato_yellow_leaf_curl_virus",
        "Tomato_Tomato_mosaic_virus": "tomato_mosaic_virus",
        "Tomato_healthy": "tomato_healthy",
    }

    return mapping.get(class_name, class_name.lower().replace(" ", "_"))
