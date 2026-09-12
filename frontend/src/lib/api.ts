// ============================================
// Verdra — Production API Client
// ============================================

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "https://verdra.onrender.com"
).replace(/\/+$/, "");

export function getApiUrl(): string {
  return API_URL || "https://verdra.onrender.com";
}

export class ApiError extends Error {
  status: number;
  payload?: any;
  constructor(message: string, status: number = 500, payload?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Distinguish between browser CORS blocks and genuine network/server disconnects.
 * Standard fetch throws a generic TypeError: Failed to fetch for both cases.
 * By probing /health with mode: 'no-cors':
 * - If the probe succeeds: network is connected and host is reachable, meaning the original request was blocked by CORS policy.
 * - If the probe fails: network is offline or backend is unreachable.
 */
export async function classifyNetworkOrCorsError(baseUrl: string = getApiUrl()): Promise<string> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "Crop analysis service unavailable.";
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    await fetch(`${baseUrl}/health`, {
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    // If no-cors succeeded, host is reachable, so standard fetch failure was due to CORS policy block
    return "Backend connection blocked.";
  } catch {
    // If no-cors also failed/timed out, host is unreachable or network failed
    return "Crop analysis service unavailable.";
  }
}

export async function handleFetchError(err: any, baseUrl: string = getApiUrl()): Promise<never> {
  if (
    err instanceof Error &&
    (err.message.includes("Failed to fetch") ||
      err.message.includes("NetworkError") ||
      err.message.includes("Network request failed") ||
      err.message.includes("fetch failed") ||
      err.name === "TypeError")
  ) {
    const classified = await classifyNetworkOrCorsError(baseUrl);
    throw new ApiError(classified, 0);
  }
  throw err instanceof Error ? err : new Error(String(err));
}

export async function handleResponseError(
  response: Response,
  defaultMessage: string = "Crop analysis failed."
): Promise<never> {
  if (response.status === 404) {
    throw new ApiError("Prediction endpoint not found.", 404);
  }
  if (response.status === 500) {
    throw new ApiError("AI model service error.", 500);
  }
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    throw new ApiError("Crop analysis service unavailable.", response.status);
  }

  const payload = await response.json().catch(() => null);
  const message =
    payload?.detail?.message ||
    (typeof payload?.detail === "string" ? payload.detail : null) ||
    payload?.message ||
    defaultMessage;

  throw new ApiError(message, response.status, payload);
}

/**
 * Resize high-resolution smartphone camera captures (8MB-15MB) to max 1600px at 0.92 JPEG.
 * This preserves 100% of fine leaf veins and lesion details while reducing file size from ~10MB to ~300KB,
 * preventing mobile network timeouts and request drops.
 */
export async function optimizeImageForInference(file: File, maxDim: number = 1600): Promise<File> {
  if (typeof window === "undefined" || !file || !file.type || !file.type.startsWith("image/")) {
    return file;
  }
  // Fast path: if file is already compact (<= 1.2MB), do not compress
  if (file.size <= 1.2 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim && file.size <= 2 * 1024 * 1024) {
        return resolve(file);
      }
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          const cleanName = file.name.replace(/\.[^.]+$/, ".jpg");
          const optimizedFile = new File([blob], cleanName, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(optimizedFile);
        },
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export async function healthCheck() {
  const baseUrl = getApiUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/health`, { cache: "no-store" });
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }

  if (!response.ok) {
    await handleResponseError(response, "Backend health check failed");
  }

  return response.json();
}

export async function analyzeCrop(file: File, crop?: string, fieldTag?: string) {
  const baseUrl = getApiUrl();
  const formData = new FormData();
  formData.append("file", file);

  if (crop && crop !== "Auto Detect" && crop !== "auto") {
    formData.append("crop", crop);
  }

  if (fieldTag) {
    formData.append("field_tag", fieldTag);
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/predict`, {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }

  if (!response.ok) {
    await handleResponseError(response, "Crop analysis failed.");
  }

  return response.json();
}

export async function checkQuality(file: File) {
  const baseUrl = getApiUrl();
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/check-quality`, {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }

  if (!response.ok) {
    await handleResponseError(response, "Image quality check failed.");
  }

  return response.json();
}

export interface ImageCheckResult {
  object: string;
  plant: string;
  crop_supported: boolean;
  confidence: number;
  action: "CONTINUE" | "STOP";
  detected_object?: string;
  detected_plant?: string;
  is_crop_leaf?: boolean;
  supported_crop?: boolean;
}

export async function checkImageVision(file: File): Promise<ImageCheckResult> {
  const baseUrl = getApiUrl();
  const formData = new FormData();
  formData.append("image", file);
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/image-check`, {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }

  if (!response.ok) {
    await handleResponseError(response, "Image validation check failed.");
  }

  return response.json();
}

export async function processOpenCvScan(file: File) {
  const baseUrl = getApiUrl();
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/scan/opencv-process`, {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }

  if (!response.ok) {
    await handleResponseError(response, "OpenCV scan processing failed.");
  }
  return response.json();
}

export async function getSeverity(file: File) {
  const baseUrl = getApiUrl();
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/severity`, {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }

  if (!response.ok) {
    await handleResponseError(response, "Severity estimation failed.");
  }
  return response.json();
}

export async function getGradcam(file: File) {
  const baseUrl = getApiUrl();
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/gradcam`, {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }

  if (!response.ok) {
    await handleResponseError(response, "Grad-CAM generation failed.");
  }
  return response.json();
}

export async function calculateRisk(data: {
  disease: string;
  crop?: string;
  temperature?: number;
  humidity?: number;
  rainfall?: number;
  wind_speed?: number;
  severity?: string;
  infected_percentage?: number;
}) {
  const baseUrl = getApiUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }

  if (!response.ok) {
    await handleResponseError(response, "Spread risk calculation failed.");
  }
  return response.json();
}

export async function fetchWeather(params: { lat?: number; lon?: number; city?: string } = {}) {
  const baseUrl = getApiUrl();
  const searchParams = new URLSearchParams();
  if (params.lat !== undefined) searchParams.set("lat", String(params.lat));
  if (params.lon !== undefined) searchParams.set("lon", String(params.lon));
  if (params.city) searchParams.set("city", params.city);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/weather?${searchParams.toString()}`);
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }

  if (!response.ok) {
    await handleResponseError(response, "Failed to fetch weather data.");
  }
  return response.json();
}

export async function getDiseases() {
  const baseUrl = getApiUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/diseases`);
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }
  if (!response.ok) {
    await handleResponseError(response, "Failed to fetch diseases.");
  }
  return response.json();
}

export async function getDiseaseById(id: string) {
  const baseUrl = getApiUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/diseases/${id}`);
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }
  if (!response.ok) {
    await handleResponseError(response, `Failed to fetch disease ${id}.`);
  }
  return response.json();
}

export async function generateReport(data: Record<string, unknown>): Promise<Blob> {
  const baseUrl = getApiUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }
  if (!response.ok) {
    await handleResponseError(response, "Failed to generate report.");
  }
  return response.blob();
}

export async function getModelPerformance() {
  const baseUrl = getApiUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/model/performance`);
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }
  if (!response.ok) {
    await handleResponseError(response, "Failed to fetch model performance.");
  }
  return response.json();
}

export function resolveApiAsset(url?: string): string | undefined {
  if (!url) return undefined;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export async function batchPredict(
  files: File[],
  options: { crop?: string; farm_id?: string; field_id?: string; batch_name?: string } = {}
) {
  const baseUrl = getApiUrl();
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));

  if (options.crop && options.crop !== "Auto Detect" && options.crop !== "auto") {
    formData.append("crop", options.crop);
  }
  if (options.farm_id) formData.append("farm_id", options.farm_id);
  if (options.field_id) formData.append("field_id", options.field_id);
  if (options.batch_name) formData.append("batch_name", options.batch_name);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/batch-predict`, {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }

  if (!response.ok) {
    await handleResponseError(response, "Batch scan analysis failed.");
  }

  return response.json();
}

export async function registerPlant(data: { plant_tag: string; crop?: string; farm_id?: string; field_id?: string; notes?: string }) {
  const baseUrl = getApiUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/plants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }
  if (!response.ok) {
    await handleResponseError(response, "Failed to register plant.");
  }
  return response.json();
}

export async function getPlantTimeline(plantId: string) {
  const baseUrl = getApiUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/plants/${encodeURIComponent(plantId)}/timeline`);
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }
  if (!response.ok) {
    await handleResponseError(response, `Failed to fetch timeline for plant ${plantId}.`);
  }
  return response.json();
}

export async function getFieldHotspots(fieldId: string = "all") {
  const baseUrl = getApiUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/fields/${encodeURIComponent(fieldId)}/hotspots`);
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }
  if (!response.ok) {
    await handleResponseError(response, `Failed to fetch hotspots for field ${fieldId}.`);
  }
  return response.json();
}

export async function getFieldAlerts(fieldId: string = "all", params: { time_window_hours?: number; spatial_radius_meters?: number; min_matching_scans?: number } = {}) {
  const baseUrl = getApiUrl();
  const searchParams = new URLSearchParams();
  if (params.time_window_hours) searchParams.set("time_window_hours", params.time_window_hours.toString());
  if (params.spatial_radius_meters) searchParams.set("spatial_radius_meters", params.spatial_radius_meters.toString());
  if (params.min_matching_scans) searchParams.set("min_matching_scans", params.min_matching_scans.toString());

  const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/fields/${encodeURIComponent(fieldId)}/alerts${query}`);
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }
  if (!response.ok) {
    await handleResponseError(response, `Failed to fetch alerts for field ${fieldId}.`);
  }
  return response.json();
}

export async function createShareLink(scanId: string, scanData?: any, expiryDays: number = 7) {
  const baseUrl = getApiUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scan_id: scanId, scan_data: scanData, expiry_days: expiryDays }),
    });
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }
  if (!response.ok) {
    await handleResponseError(response, "Failed to create share link.");
  }
  return response.json();
}

export async function getSharedCase(token: string) {
  const baseUrl = getApiUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/share/${encodeURIComponent(token)}`);
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }
  if (!response.ok) {
    await handleResponseError(response, "Shared case not found or expired.");
  }
  return response.json();
}

export async function revokeShareLink(token: string) {
  const baseUrl = getApiUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/share/${encodeURIComponent(token)}`, {
      method: "DELETE",
    });
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }
  if (!response.ok) {
    await handleResponseError(response, "Failed to revoke share link.");
  }
  return response.json();
}

export async function getScan(scanId: string): Promise<any> {
  const baseUrl = getApiUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/scans/${encodeURIComponent(scanId)}`, {
      cache: "no-store",
    });
  } catch (err) {
    await handleFetchError(err, baseUrl);
  }
  if (!response.ok) {
    await handleResponseError(response, "Scan record not found.");
  }
  return response.json();
}

export const api = {
  health: healthCheck,
  predict: analyzeCrop,
  severity: getSeverity,
  gradcam: getGradcam,
  risk: calculateRisk,
  weather: fetchWeather,
  diseases: getDiseases,
  disease: getDiseaseById,
  report: generateReport,
  modelPerformance: getModelPerformance,
  checkQuality,
  imageCheck: checkImageVision,
  opencvScan: processOpenCvScan,
  batchPredict,
  registerPlant,
  getPlantTimeline,
  getFieldHotspots,
  getFieldAlerts,
  createShareLink,
  getSharedCase,
  revokeShareLink,
  getScan,
  optimizeImageForInference,
};
