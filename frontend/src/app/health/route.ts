import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    model_loaded: true,
    supported_crops: ["Tomato", "Pepper"],
    classes_count: 8,
    version: "2.4.0",
    engine: "Verdra Edge Hybrid Neural Inference",
  });
}
