// ============================================
// Verdra — TypeScript Types
// ============================================

export interface PredictionResult {
  class_name: string;
  confidence: number;
}

export interface DeveloperDebugInfo {
  model_filename: string;
  model_loaded: boolean;
  inference_time_ms: number;
  predicted_class: string;
  raw_confidence: number;
  device?: string;
  classes_evaluated?: number;
  confidence_level?: string;
  weights_sha256?: string;
}

export interface PredictResponse {
  prediction: string;
  confidence: number;
  is_healthy: boolean;
  crop: string;
  top_predictions: PredictionResult[];
  image_quality: ImageQuality;
  selected_crop: string;
  detected_object?: string;
  developer_debug?: DeveloperDebugInfo;
}

export interface ImageQuality {
  pass: boolean;
  overall: string; // "Good" | "Fair" | "Poor"
  resolution_ok: boolean;
  brightness_ok: boolean;
  blur_score: number;
  width: number;
  height: number;
}

export interface SeverityResult {
  severity: string;
  infected_percentage: number;
  category: string;
  description: string;
  health_score?: number;
}

export interface GradCAMResult {
  heatmap_base64?: string;
  overlay_base64?: string;
  heatmap?: string;
  overlay?: string;
  original?: string;
  prediction?: string;
  confidence?: number;
  target_class?: string;
  predicted_class?: string;
  target_conv_layer?: string;
  explanation_text?: string;
  model_verified?: boolean;
}

export interface PerClassMetric {
  crop: string;
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
}

export interface ModelPerformanceData {
  model_architecture: string;
  model_filename: string;
  dataset_name: string;
  evaluation_timestamp: string;
  evaluation_note: string;
  num_classes: number;
  num_test_images: number;
  dataset_split: {
    training_samples: number;
    validation_samples: number;
    test_samples: number;
    total_samples: number;
  };
  test_accuracy: number;
  precision_macro: number;
  recall_macro: number;
  f1_macro: number;
  precision_weighted: number;
  recall_weighted: number;
  f1_weighted: number;
  class_distribution: Record<string, number>;
  per_class: Record<string, PerClassMetric>;
  confusion_matrix: number[][];
  mean_inference_latency_ms: number;
  live_model_status?: {
    model_loaded: boolean;
    model_filename: string;
    num_classes_active: number;
    prediction_mode: string;
    framework: string;
  };
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  wind_speed: number;
  description: string;
  icon?: string;
  city: string;
  country?: string;
  is_live?: boolean;
  is_fallback?: boolean;
  status?: string;
  source?: string;
  warning?: string;
  fallback_warning?: string;
  last_updated?: string;
}

export interface RiskResult {
  risk_level: string; // "Low" | "Moderate" | "High" | "Critical"
  risk_score: number;
  contributing_factors: string[];
  explanation: string;
}

export interface RecommendationData {
  disease_name: string;
  crop: string;
  description: string;
  symptoms: string[];
  causes: string[];
  immediate_actions: string[];
  preventive_actions: string[];
  monitoring_advice: string[];
  environmental_considerations: string[];
  expert_escalation: string;
}

export interface DiseaseInfo {
  id: string;
  name: string;
  slug: string;
  crop: string;
  pathogen_type: string;
  description: string;
  symptoms: string[];
  causes: string[];
  prevention: string[];
  environmental_conditions: string;
  risk_level: string;
  immediate_actions: string[];
  preventive_actions: string[];
  monitoring_advice: string[];
  expert_escalation: string;
}

export interface ScanRecord {
  id: string;
  user_id: string;
  farm_id?: string;
  image_url: string;
  crop: string;
  prediction: string;
  confidence: number;
  severity: string;
  infected_percentage: number;
  risk_level: string;
  temperature?: number;
  humidity?: number;
  rainfall?: number;
  is_healthy: boolean;
  created_at: string;
  top_predictions?: PredictionResult[];
  recommendations?: RecommendationData;
  weather?: WeatherData;
  risk?: RiskResult;
  gradcam_base64?: string;
}

export interface Farm {
  id: string;
  user_id: string;
  farm_name: string;
  location_name: string;
  latitude?: number;
  longitude?: number;
  crop: string;
  field_size?: number;
  planting_date?: string;
  created_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  farm_id?: string;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  preferred_language: string;
  email?: string;
  created_at: string;
}

export interface AnalysisState {
  step: number;
  label: string;
  progress: number;
}

export const ANALYSIS_STEPS: AnalysisState[] = [
  { step: 1, label: "Image Preprocessing", progress: 15 },
  { step: 2, label: "AI Disease Detection", progress: 40 },
  { step: 3, label: "Severity Analysis", progress: 60 },
  { step: 4, label: "Environmental Risk Evaluation", progress: 80 },
  { step: 5, label: "Recommendation Generation", progress: 100 },
];

export interface CompleteDiagnosis {
  prediction: PredictResponse;
  severity: SeverityResult;
  gradcam: GradCAMResult | null;
  weather: WeatherData | null;
  risk: RiskResult | null;
  recommendations?: RecommendationData | Record<string, unknown> | null;
  imageUrl: string;
  scanDate: string;
}
