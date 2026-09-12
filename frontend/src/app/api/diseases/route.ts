import { NextResponse } from "next/server";

const DISEASES = [
  {
    id: "tomato_early_blight",
    name: "Tomato Early Blight",
    crop: "Tomato",
    scientific_name: "Alternaria solani",
    pathogen_type: "Fungal",
    description: "Common foliar fungal disease causing dark brown concentric rings ('target spots') on older leaves, progressing upwards.",
    symptoms: [
      "Concentric dark rings with yellow chlorotic halos on lower foliage",
      "Premature defoliation exposing fruit to sunscald",
      "Dark sunken lesions near plant stem base",
    ],
    environmental_conditions: {
      temperature_range: "24°C – 29°C (Warm)",
      humidity_threshold: "> 80% Relative Humidity",
      favorable_weather: "Alternating wet and dry warm periods with heavy dew",
    },
    preventive_actions: [
      "Apply 2-3 year crop rotation away from solanaceous plants",
      "Use drip irrigation to keep foliage dry and mulch soil beds",
      "Stake and prune indeterminate vines to improve canopy airflow",
    ],
    monitoring_advice: [
      "Inspect lower leaves weekly starting 3 weeks post-transplant",
      "Re-scan foliage within 4-7 days if warm humid weather persists",
    ],
  },
  {
    id: "tomato_late_blight",
    name: "Tomato Late Blight",
    crop: "Tomato",
    scientific_name: "Phytophthora infestans",
    pathogen_type: "Oomycete",
    description: "Devastating water-mold disease that spreads rapidly in cool, wet weather, destroying foliage and rotting fruit within days.",
    symptoms: [
      "Irregular water-soaked greasy lesions turning dark purple-brown",
      "White fuzzy sporulation visible on leaf undersides in high humidity",
      "Rapid foliar collapse and stem rot under damp conditions",
    ],
    environmental_conditions: {
      temperature_range: "15°C – 22°C (Cool to Mild)",
      humidity_threshold: "> 90% Relative Humidity",
      favorable_weather: "Frequent rainfall, persistent fog, and extended leaf wetness",
    },
    preventive_actions: [
      "Destroy and bag cull piles immediately to eliminate overwintering inoculum",
      "Apply preventive copper hydroxide sprays before forecast rain events",
      "Ensure wide spacing to facilitate maximum canopy air circulation",
    ],
    monitoring_advice: [
      "Scout daily during prolonged cool wet spells",
      "Re-scan every 2-3 days under active rain advisories",
    ],
  },
  {
    id: "pepper_bacterial_spot",
    name: "Pepper Bacterial Spot",
    crop: "Pepper",
    scientific_name: "Xanthomonas campestris pv. vesicatoria",
    pathogen_type: "Bacterial",
    description: "Persistent seed-borne bacterial infection creating small pustular water-soaked lesions across pepper foliage and fruits.",
    symptoms: [
      "Small circular to irregular dark brown lesions with yellow halos",
      "Severe premature defoliation under rain-driven overhead conditions",
      "Raised scab-like pustules on pepper pod surfaces",
    ],
    environmental_conditions: {
      temperature_range: "24°C – 30°C (Warm to Hot)",
      humidity_threshold: "> 85% Relative Humidity",
      favorable_weather: "Warm rain showers and splashing sprinkler irrigation",
    },
    preventive_actions: [
      "Plant certified pathogen-free treated seed stocks",
      "Avoid overhead sprinkler irrigation to minimize splash dispersal",
      "Spray copper bactericide combined with mancozeb for synergism",
    ],
    monitoring_advice: [
      "Scout foliage after heavy rainfall or high humidity spikes",
      "Re-scan symptomatic leaves within 5 days",
    ],
  },
  {
    id: "tomato_healthy",
    name: "Tomato Healthy",
    crop: "Tomato",
    scientific_name: "Solanum lycopersicum",
    pathogen_type: "Vigorous Plant",
    description: "Optimal physiological plant condition with active chlorophyll and no detectable necrotic foliar lesions.",
    symptoms: [
      "Uniform green coloration across leaf lamina",
      "Intact foliar margins with no chlorosis or necrosis",
      "Active vegetative transpiration and turgidity",
    ],
    environmental_conditions: {
      temperature_range: "20°C – 28°C",
      humidity_threshold: "50% – 70% Relative Humidity",
      favorable_weather: "Adequate sunlight with well-drained soil moisture",
    },
    preventive_actions: [
      "Maintain consistent soil moisture through drip lines",
      "Apply balanced macro/micronutrient foliar fertilizer",
      "Monitor for early pest arrivals (aphids, whiteflies)",
    ],
    monitoring_advice: [
      "Standard weekly scouting to ensure continued vigor",
    ],
  },
];

export async function GET() {
  return NextResponse.json(DISEASES);
}
