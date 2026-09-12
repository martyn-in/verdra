// ============================================
// Verdra — Utility Functions
// ============================================

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatConfidence(value?: number | null): string {
  if (value === undefined || value === null || isNaN(value)) return "0.0%";
  const pct = value > 1 ? value : value * 100;
  return `${pct.toFixed(1)}%`;
}

export function getRiskColor(level: string): string {
  switch (level.toLowerCase()) {
    case "low": return "#2E7D32";
    case "moderate": return "#F59E0B";
    case "high": return "#EA580C";
    case "critical": return "#DC2626";
    default: return "#6B7280";
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case "low": return "#2E7D32";
    case "mild": return "#52B788";
    case "moderate": return "#F59E0B";
    case "severe": return "#DC2626";
    default: return "#6B7280";
  }
}

export function getHealthColor(isHealthy: boolean): string {
  return isHealthy ? "#2E7D32" : "#DC2626";
}

export function formatDiseaseName(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("Tomato Tomato", "Tomato")
    .replace("Pepper Bell", "Pepper");
}

export function extractCropName(prediction: string): string {
  const raw = prediction.split("_")[0] || prediction.split(" ")[0];
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function compressImage(file: File, maxWidth = 1024): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        0.85
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
