"""
Text-to-Speech (TTS) Endpoint
Provides reliable audio streaming for vernacular languages (Telugu, Hindi, English).
Solves the browser limitation where macOS / Windows lacks a native Telugu TTS voice.
"""
import io
import logging
import hashlib
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(tags=["tts"])

# In-memory LRU cache for synthesized speech clips (avoids re-synthesizing same text)
_AUDIO_CACHE: dict[str, bytes] = {}
_MAX_CACHE_ITEMS = 64


class TTSRequest(BaseModel):
    text: str
    lang: str = "te"


def _synthesize_audio(text: str, lang: str) -> bytes:
    clean_text = text.strip()[:600] # Cap text length for fast synthesis
    clean_lang = "te" if lang.startswith("te") else ("hi" if lang.startswith("hi") else "en")
    
    cache_key = hashlib.md5(f"{clean_lang}:{clean_text}".encode("utf-8")).hexdigest()
    if cache_key in _AUDIO_CACHE:
        return _AUDIO_CACHE[cache_key]

    try:
        from gtts import gTTS
        tts = gTTS(text=clean_text, lang=clean_lang, slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        audio_bytes = fp.getvalue()

        # Evict oldest if cache is full
        if len(_AUDIO_CACHE) >= _MAX_CACHE_ITEMS:
            oldest_key = next(iter(_AUDIO_CACHE))
            del _AUDIO_CACHE[oldest_key]

        _AUDIO_CACHE[cache_key] = audio_bytes
        return audio_bytes
    except Exception as e:
        logger.error(f"TTS synthesis error for lang '{clean_lang}': {e}")
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(e)}")


@router.get("/tts")
async def get_text_to_speech(
    text: str = Query(..., description="Text to synthesize into speech"),
    lang: str = Query("te", description="Language code (te, hi, en)"),
):
    """Stream audio/mpeg for requested text and language."""
    audio_bytes = _synthesize_audio(text, lang)
    return Response(content=audio_bytes, media_type="audio/mpeg")


@router.post("/tts")
async def post_text_to_speech(req: TTSRequest):
    """POST variant for longer text payloads."""
    audio_bytes = _synthesize_audio(req.text, req.lang)
    return Response(content=audio_bytes, media_type="audio/mpeg")
