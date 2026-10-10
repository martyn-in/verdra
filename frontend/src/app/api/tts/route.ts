import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text") || "";
    const lang = searchParams.get("lang") || "te";

    if (!text) {
      return NextResponse.json({ error: "Missing text parameter" }, { status: 400 });
    }

    // Try local / configured FastAPI backend first
    try {
      const backendUrl = `${BACKEND_URL}/api/tts?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}`;
      const res = await fetch(backendUrl, {
        headers: { "Accept": "audio/mpeg" },
        cache: "no-store",
      });

      if (res.ok) {
        const audioBuffer = await res.arrayBuffer();
        return new NextResponse(audioBuffer, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    } catch (backendErr) {
      console.warn("Backend TTS proxy failed, attempting direct fallback:", backendErr);
    }

    // Secondary fallback: fallback direct Google TTS service
    const cleanLang = lang.startsWith("te") ? "te" : (lang.startsWith("hi") ? "hi" : "en");
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.slice(0, 200))}&tl=${cleanLang}&client=tw-ob`;
    const fallbackRes = await fetch(googleTtsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    if (fallbackRes.ok) {
      const audioBuffer = await fallbackRes.arrayBuffer();
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    return NextResponse.json({ error: "TTS generation failed" }, { status: 502 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
