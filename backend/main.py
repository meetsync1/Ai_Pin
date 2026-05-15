import asyncio
import io
import json
import os
import sqlite3
import time
import wave
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mutagen import File as MutagenFile
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

APP_DIR = Path(__file__).resolve().parent
ROOT_DIR = APP_DIR.parent
load_dotenv(ROOT_DIR / ".env")

SARVAM_API_KEY    = os.getenv("EXPO_PUBLIC_SARVAM_API_KEY", "")
SARVAM_BASE_URL   = os.getenv("EXPO_PUBLIC_SARVAM_BASE_URL", "").rstrip("/")
SARVAM_WEBHOOK_SECRET = os.getenv("EXPO_PUBLIC_SARVAM_WEBHOOK_SECRET", "")
BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL", "").rstrip("/")
USE_WEBHOOK = os.getenv("USE_WEBHOOK", "false").lower() == "true"

# ── App Authentication ────────────────────────────────────────────────────────
APP_SECRET_KEY = os.getenv("APP_SECRET_KEY", "")

# ── Groq (OpenAI-compatible) ──────────────────────────────────────────────────
GROQ_API_KEY  = os.getenv("GROQ_API_KEY", "")
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
GROQ_MODEL    = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Sarvam batch API path (versioned at route level)
SARVAM_JOB_BASE = "/speech-to-text/job/v1"

# ── Data Retention ────────────────────────────────────────────────────────────
DATA_RETENTION_DAYS = int(os.getenv("DATA_RETENTION_DAYS", "10"))
MIN_AUDIO_DURATION_S = 3  # reject audio shorter than 3 seconds

DB_PATH = APP_DIR / "transcriptor_backend.db"

# ── Simplified English-only prompt ───────────────────────────────────────────
SYSTEM_PROMPT = """You are a professional meeting summarizer. The transcript may contain Hindi, English, or code-mixed Hindi-English (Hinglish). Always output in English only.

Output ONLY valid JSON with exactly this shape — no markdown, no extra keys:

{
  "summary": "A clear 3-5 sentence English summary of the entire conversation. Preserve names and key technical terms.",
  "key_points": [
    "Concise English bullet — one distinct point per item",
    "..."
  ],
    "action_items": [
        "Action item phrased as a short imperative",
        "..."
    ]
}

Rules:
- summary: high-level narrative, 3-5 sentences, English only.
- key_points: 4-8 items, each a single crisp sentence, English only.
- action_items: 2-6 items if any are implied, otherwise [].
- Do NOT include any other fields.""".strip()

# ── Rate Limiter Setup ────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Transcriptor Backend", version="0.3.0")

# Register rate-limit exceeded handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Authentication Dependency ─────────────────────────────────────────────────
async def verify_app_secret(request: Request) -> None:
    """Verify that the request contains a valid X-App-Secret header."""
    if not APP_SECRET_KEY:
        # If no secret is configured, skip auth (local dev)
        return
    provided = request.headers.get("X-App-Secret", "")
    if provided != APP_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: invalid or missing X-App-Secret header")


# ── Audio Validation ──────────────────────────────────────────────────────────
async def validate_audio_files(files: List[UploadFile]) -> List[UploadFile]:
    """Validate uploaded audio files: reject empty or too-short audio (< 3 seconds)."""
    validated: List[UploadFile] = []
    for f in files:
        content = await f.read()
        await f.seek(0)  # reset for later reading

        # Empty file check
        if len(content) == 0:
            raise HTTPException(status_code=400, detail=f"Empty audio file: {f.filename}")

        # Try to detect duration
        duration = _get_audio_duration(content, f.filename or "audio.wav")
        if duration is not None and duration < MIN_AUDIO_DURATION_S:
            raise HTTPException(
                status_code=400,
                detail=f"Audio too short ({duration:.1f}s < {MIN_AUDIO_DURATION_S}s): {f.filename}",
            )
        validated.append(f)
    return validated


def _get_audio_duration(content: bytes, filename: str) -> Optional[float]:
    """Try to get audio duration using wave (for WAV) or mutagen (for other formats)."""
    # Try standard wave module first (most reliable for WAV)
    try:
        with wave.open(io.BytesIO(content), "rb") as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            if rate > 0:
                return frames / float(rate)
    except Exception:
        pass

    # Fallback to mutagen for other audio formats (mp3, ogg, m4a, etc.)
    try:
        audio = MutagenFile(io.BytesIO(content), filename=filename)
        if audio and audio.info and hasattr(audio.info, "length"):
            return float(audio.info.length)
    except Exception:
        pass

    # If we can't determine duration, use file-size heuristic
    # WAV 16kHz 16-bit mono ≈ 32,000 bytes/sec → 3s ≈ 96,000 bytes
    # Be conservative: only reject if clearly too small
    if len(content) < 48_000:  # ~1.5s even at low quality
        return 1.0  # Signal it's too short

    return None  # Can't determine, let it through


# ── Data Retention Cleanup ────────────────────────────────────────────────────
def cleanup_old_data() -> int:
    """Delete sessions, transcripts, and summaries older than DATA_RETENTION_DAYS."""
    cutoff_ms = now_ms() - (DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    with get_conn() as conn:
        # Find old session IDs
        old_sessions = conn.execute(
            "SELECT id FROM sessions WHERE created_at < ?", [cutoff_ms]
        ).fetchall()
        old_ids = [row["id"] for row in old_sessions]

        if not old_ids:
            return 0

        placeholders = ",".join("?" for _ in old_ids)
        conn.execute(f"DELETE FROM transcripts WHERE session_id IN ({placeholders})", old_ids)
        conn.execute(f"DELETE FROM summaries WHERE session_id IN ({placeholders})", old_ids)
        conn.execute(f"DELETE FROM sessions WHERE id IN ({placeholders})", old_ids)
    return len(old_ids)


async def data_retention_task() -> None:
    """Background task that runs daily to clean up old data."""
    while True:
        await asyncio.sleep(86400)  # 24 hours
        try:
            deleted = cleanup_old_data()
            if deleted > 0:
                print(f"[retention] Cleaned up {deleted} sessions older than {DATA_RETENTION_DAYS} days")
        except Exception as e:
            print(f"[retention] Cleanup failed: {e}")


def now_ms() -> int:
    return int(time.time() * 1000)


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS sessions (
              id TEXT PRIMARY KEY,
              created_at INTEGER NOT NULL,
              status TEXT,
              job_id TEXT,
              context_tag TEXT,
              num_speakers INTEGER,
              source_type TEXT
            );
            CREATE TABLE IF NOT EXISTS transcripts (
              session_id TEXT NOT NULL,
              chunk_index INTEGER NOT NULL,
              raw_diarized TEXT,
              processed_text TEXT,
              word_count INTEGER,
              PRIMARY KEY (session_id, chunk_index)
            );
            CREATE TABLE IF NOT EXISTS summaries (
              session_id TEXT PRIMARY KEY,
              summary_json TEXT,
              created_at INTEGER
            );
            """
        )


def save_session(session_id: str, status: str, job_id: Optional[str], context_tag: str, num_speakers: int, source_type: str) -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO sessions (id, created_at, status, job_id, context_tag, num_speakers, source_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [session_id, now_ms(), status, job_id, context_tag, num_speakers, source_type],
        )


def update_session_status(session_id: str, status: str) -> None:
    with get_conn() as conn:
        conn.execute("UPDATE sessions SET status = ? WHERE id = ?", [status, session_id])


def update_session_job(session_id: str, job_id: str) -> None:
    with get_conn() as conn:
        conn.execute("UPDATE sessions SET job_id = ? WHERE id = ?", [job_id, session_id])


def save_chunks(session_id: str, chunks: List[Dict[str, Any]]) -> None:
    with get_conn() as conn:
        conn.executemany(
            "INSERT OR REPLACE INTO transcripts (session_id, chunk_index, raw_diarized, processed_text, word_count) VALUES (?, ?, ?, ?, ?)",
            [
                [session_id, chunk["chunk_index"], chunk["raw_diarized"], chunk["processed_text"], chunk["word_count"]]
                for chunk in chunks
            ],
        )


def save_summary(session_id: str, summary: Dict[str, Any]) -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO summaries (session_id, summary_json, created_at) VALUES (?, ?, ?)",
            [session_id, json.dumps(summary), now_ms()],
        )


def get_session_by_job(job_id: str) -> Optional[str]:
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM sessions WHERE job_id = ?", [job_id]).fetchone()
        return row["id"] if row else None


def get_session_payload(session_id: str) -> Dict[str, Any]:
    with get_conn() as conn:
        session = conn.execute("SELECT * FROM sessions WHERE id = ?", [session_id]).fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        transcripts = conn.execute(
            "SELECT * FROM transcripts WHERE session_id = ? ORDER BY chunk_index ASC",
            [session_id],
        ).fetchall()
        summary_row = conn.execute("SELECT * FROM summaries WHERE session_id = ?", [session_id]).fetchone()

    summary = json.loads(summary_row["summary_json"]) if summary_row else None
    return {
        "session_id": session["id"],
        "job_id": session["job_id"],
        "status": session["status"],
        "context_tag": session["context_tag"],
        "num_speakers": session["num_speakers"],
        "source_type": session["source_type"],
        "chunks": [
            {
                "chunk_index": row["chunk_index"],
                "raw_diarized": row["raw_diarized"],
                "processed_text": row["processed_text"],
                "word_count": row["word_count"],
            }
            for row in transcripts
        ],
        "summary": summary,
    }


def remove_filler(text: str) -> str:
    import re
    patterns = [
        r"\b(um|uh|like|you know|i mean|basically|literally|right\?|okay so)\b",
        r"\b(matlab|haan haan|theek hai theek hai|toh toh|aur aur)\b",
        r"(\.\.\.|\.\.\.)",
        r"\s{2,}",
    ]
    cleaned = text
    for pattern in patterns:
        cleaned = re.sub(pattern, " ", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def format_timestamp(seconds: float) -> str:
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"


def parse_diarized(entries: List[Dict[str, Any]], speaker_labels: Optional[Dict[str, str]] = None) -> str:
    speaker_labels = speaker_labels or {}
    lines: List[str] = []
    for entry in entries:
        speaker_id = str(entry.get("speaker_id", "0"))
        label = speaker_labels.get(speaker_id, f"Speaker {int(speaker_id) + 1}")
        timestamp = format_timestamp(float(entry.get("start_time_seconds", 0)))
        transcript = remove_filler(str(entry.get("transcript", "")))
        lines.append(f"[{timestamp}] {label}: {transcript}")
    return "\n".join(lines)


def tokenize(text: str) -> List[str]:
    import re
    return re.findall(r"[a-z0-9]+", text.lower())


def count_words(text: str) -> int:
    return len(tokenize(text))


def smart_truncate(formatted_transcript: str, target_ratio: float = 0.7) -> str:
    lines = [line for line in formatted_transcript.split("\n") if line]
    if not lines:
        return formatted_transcript
    first_ten = int(len(lines) * 0.1)
    last_ten  = int(len(lines) * 0.1)
    middle    = lines[first_ten : len(lines) - last_ten]
    if not middle:
        return formatted_transcript
    doc_count = len(middle) or 1
    doc_freq: Dict[str, int] = {}
    tokenized = []
    for line in middle:
        tokens = tokenize(line)
        tokenized.append(tokens)
        for token in set(tokens):
            doc_freq[token] = doc_freq.get(token, 0) + 1
    scored = []
    for idx, tokens in enumerate(tokenized):
        term_freq: Dict[str, int] = {}
        for token in tokens:
            term_freq[token] = term_freq.get(token, 0) + 1
        score = 0.0
        for token, tf in term_freq.items():
            df  = doc_freq.get(token, 1)
            idf = float(doc_count) / float(df) if df > 0 else 0.0
            score += tf * idf
        scored.append((score, idx, middle[idx]))
    keep_count = max(1, int(len(middle) * target_ratio))
    top = sorted(scored, key=lambda item: item[0], reverse=True)[:keep_count]
    top_sorted = [item[2] for item in sorted(top, key=lambda item: item[1])]
    return "\n".join(lines[:first_ten] + top_sorted + lines[len(lines) - last_ten :])


def normalize_outputs(outputs: Any) -> List[Dict[str, Any]]:
    if isinstance(outputs, list):
        return outputs
    if isinstance(outputs, dict) and isinstance(outputs.get("outputs"), list):
        return outputs["outputs"]
    return []


def build_chunks(outputs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    chunks: List[Dict[str, Any]] = []
    for index, output in enumerate(outputs):
        diarized = output.get("diarized_transcript", {}) or {}
        entries  = diarized.get("entries", []) if isinstance(diarized, dict) else []
        formatted = parse_diarized(entries)
        words     = count_words(formatted)
        processed = smart_truncate(formatted) if words > 6000 else formatted
        chunks.append(
            {
                "chunk_index": index,
                "raw_diarized": json.dumps(diarized),
                "processed_text": processed,
                "word_count": words,
            }
        )
    return chunks


def require_env() -> None:
    if not SARVAM_API_KEY or not SARVAM_BASE_URL:
        raise HTTPException(status_code=500, detail="Sarvam API env vars missing")
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY missing — set it in .env")


def sarvam_url(path: str) -> str:
    return f"{SARVAM_BASE_URL}{SARVAM_JOB_BASE}{path}"


async def sarvam_create_job(num_speakers: int, callback_url: Optional[str], callback_token: Optional[str]) -> str:
    require_env()
    job_params: Dict[str, Any] = {
        "model": "saaras:v3",
        "mode": "codemix",
        "with_diarization": True,
        "num_speakers": num_speakers,
    }
    payload: Dict[str, Any] = {"job_parameters": job_params}
    if callback_url and callback_token:
        payload["callback"] = {"url": callback_url, "auth_token": callback_token}

    headers = {"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"}
    url = sarvam_url("")
    print(f"[Sarvam] createJob → POST {url}")
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload, headers=headers)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Sarvam createJob failed ({response.status_code}): {response.text}")
    data   = response.json()
    job_id = data.get("job_id")
    if not job_id:
        raise HTTPException(status_code=502, detail=f"Sarvam createJob missing job_id: {data}")
    print(f"[Sarvam] job created: {job_id}")
    return str(job_id)


async def sarvam_get_upload_links(job_id: str, filenames: List[str]) -> Dict[str, str]:
    headers = {"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"}
    url = sarvam_url("/upload-files")
    print(f"[Sarvam] getUploadLinks → POST {url} files={filenames}")
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json={"job_id": job_id, "files": filenames}, headers=headers)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Sarvam getUploadLinks failed ({response.status_code}): {response.text}")
    data = response.json()
    upload_urls = data.get("upload_urls") or {}
    return {name: info["file_url"] for name, info in upload_urls.items()}


async def sarvam_put_file_to_azure(signed_url: str, content: bytes) -> None:
    async with httpx.AsyncClient(timeout=300.0) as client:
        response = await client.put(
            signed_url,
            content=content,
            headers={"x-ms-blob-type": "BlockBlob", "Content-Type": "audio/wav"},
        )
    if response.status_code >= 300 or response.status_code < 200:
        raise HTTPException(status_code=502, detail=f"Azure upload failed ({response.status_code}): {response.text[:200]}")


async def sarvam_upload_files(job_id: str, files: List[UploadFile]) -> List[str]:
    file_data: List[tuple] = []
    for i, file in enumerate(files):
        content = await file.read()
        name    = file.filename or f"audio_{i}.wav"
        file_data.append((name, content))
    filenames   = [name for name, _ in file_data]
    upload_map  = await sarvam_get_upload_links(job_id, filenames)
    for name, content in file_data:
        signed_url = upload_map.get(name)
        if not signed_url:
            raise HTTPException(status_code=502, detail=f"No upload URL for file: {name}")
        print(f"[Sarvam] uploading {name} ({len(content)} bytes) to Azure")
        await sarvam_put_file_to_azure(signed_url, content)
    return filenames


async def sarvam_start_job(job_id: str) -> None:
    headers = {"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"}
    url = sarvam_url(f"/{job_id}/start")
    print(f"[Sarvam] startJob → POST {url}")
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, headers=headers)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Sarvam startJob failed ({response.status_code}): {response.text}")


async def sarvam_get_status(job_id: str) -> Dict[str, Any]:
    headers = {"api-subscription-key": SARVAM_API_KEY}
    url = sarvam_url(f"/{job_id}/status")
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(url, headers=headers)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Sarvam getStatus failed ({response.status_code}): {response.text}")
    return response.json()


async def sarvam_get_download_links(job_id: str, filenames: List[str]) -> Dict[str, str]:
    headers = {"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"}
    url = sarvam_url("/download-files")
    print(f"[Sarvam] getDownloadLinks → POST {url} files={filenames}")
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json={"job_id": job_id, "files": filenames}, headers=headers)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Sarvam getDownloadLinks failed ({response.status_code}): {response.text}")
    data = response.json()
    download_urls = data.get("download_urls") or {}
    return {name: info["file_url"] for name, info in download_urls.items()}


async def sarvam_download_output_json(signed_url: str) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.get(signed_url)
    if response.status_code >= 300:
        raise HTTPException(status_code=502, detail=f"Azure download failed ({response.status_code})")
    return response.json()


async def sarvam_get_outputs(job_id: str, input_filenames: List[str]) -> Any:
    status      = await sarvam_get_status(job_id)
    job_details = status.get("job_details") or []
    output_filenames: List[str] = []
    for detail in job_details:
        inputs  = detail.get("inputs") or []
        outputs = detail.get("outputs") or []
        if inputs and outputs and detail.get("state") == "Success":
            output_filenames.append(outputs[0]["file_name"])
    if not output_filenames:
        output_filenames = [f"{Path(name).stem}_output.json" for name in input_filenames]
    download_map = await sarvam_get_download_links(job_id, output_filenames)
    results = []
    for out_name in output_filenames:
        signed_url = download_map.get(out_name)
        if signed_url:
            data = await sarvam_download_output_json(signed_url)
            results.append(data)
    return results


async def wait_for_job(job_id: str, max_wait_s: int = 600, interval_s: int = 4) -> Dict[str, Any]:
    start = time.time()
    while time.time() - start < max_wait_s:
        status = await sarvam_get_status(job_id)
        state  = (status.get("job_state") or "").lower()
        if state in ("completed", "failed"):
            return status
        print(f"[Sarvam] job {job_id} state={state!r}, waiting…")
        await asyncio.sleep(interval_s)
    raise HTTPException(status_code=504, detail="Sarvam job timed out")


async def summarize_with_groq(processed_transcript: str) -> Dict[str, Any]:
    """Call Groq (OpenAI-compatible) to produce summary + key_points."""
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": GROQ_MODEL,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "Transcript (speaker-labelled with timestamps):\n\n"
                    + processed_transcript
                ),
            },
        ],
        "max_tokens": 1200,
        "temperature": 0.3,
    }
    print(f"[Groq] summarizing via {GROQ_BASE_URL}/chat/completions model={GROQ_MODEL}")
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(f"{GROQ_BASE_URL}/chat/completions", json=payload, headers=headers)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Groq request failed ({response.status_code}): {response.text}")
    data    = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
    try:
        result = json.loads(content)
        if not isinstance(result.get("action_items"), list):
            result["action_items"] = []
        return result
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Groq returned invalid JSON")


async def process_job(
    session_id: str, job_id: str, context_tag: str, num_speakers: int, input_filenames: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Wait for Sarvam job, download diarized transcripts, summarize via Groq."""
    status = await wait_for_job(job_id)
    state  = (status.get("job_state") or "").lower()
    if state == "failed":
        update_session_status(session_id, "failed")
        raise HTTPException(status_code=502, detail=status.get("error_message") or "Sarvam job failed")

    raw_outputs = await sarvam_get_outputs(job_id, input_filenames or [])
    outputs     = normalize_outputs(raw_outputs)
    chunks      = build_chunks(outputs)
    save_chunks(session_id, chunks)

    # Summarize combined transcript
    combined = "\n\n".join(c["processed_text"] for c in chunks if c["processed_text"])
    summary  = None
    if combined.strip():
        try:
            summary = await summarize_with_groq(combined)
            save_summary(session_id, summary)
        except Exception as exc:
            print(f"[Groq] summarization failed: {exc}")

    update_session_status(session_id, "ready")
    return {
        "session_id": session_id,
        "job_id": job_id,
        "status": "ready",
        "chunks": chunks,
        "summary": summary,
    }


async def process_job_background(
    session_id: str, job_id: str, context_tag: str, num_speakers: int, input_filenames: Optional[List[str]] = None
) -> None:
    try:
        await process_job(session_id, job_id, context_tag, num_speakers, input_filenames)
    except Exception as exc:
        print(f"[background] job {job_id} failed: {exc}")
        update_session_status(session_id, "failed")


async def keep_awake_task():
    """Background task to ping the server every 10 minutes to prevent Render free tier from sleeping."""
    while True:
        await asyncio.sleep(600)  # 10 minutes
        if BACKEND_PUBLIC_URL:
            url = f"{BACKEND_PUBLIC_URL}/keep-alive"
            print(f"[keep_awake] Pinging self at {url} to prevent sleep...")
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.get(url)
            except Exception as e:
                print(f"[keep_awake] Ping failed: {e}")


@app.on_event("startup")
async def on_startup() -> None:
    init_db()
    print(f"[startup] DB ready at {DB_PATH}")
    print(f"[startup] Sarvam job base: {SARVAM_BASE_URL}{SARVAM_JOB_BASE}")
    print(f"[startup] Groq model: {GROQ_MODEL} @ {GROQ_BASE_URL}")
    print(f"[startup] Webhook mode: {USE_WEBHOOK}")
    print(f"[startup] Auth: {'ENABLED' if APP_SECRET_KEY else 'DISABLED (no APP_SECRET_KEY)'}")
    print(f"[startup] Data retention: {DATA_RETENTION_DAYS} days")
    if not GROQ_API_KEY:
        print("[startup] WARNING: GROQ_API_KEY is not set!")

    # Start background tasks
    asyncio.create_task(keep_awake_task())
    asyncio.create_task(data_retention_task())

    # Run cleanup once on startup too
    try:
        deleted = cleanup_old_data()
        if deleted > 0:
            print(f"[startup] Cleaned up {deleted} old sessions")
    except Exception as e:
        print(f"[startup] Initial cleanup failed: {e}")


@app.get("/keep-alive")
async def keep_alive() -> Dict[str, str]:
    """Endpoint for self-ping and external cron jobs (like cron-job.org) to keep server awake."""
    return {"status": "awake", "time": str(now_ms())}


@app.get("/health")
@limiter.limit("30/minute")
async def health_check(request: Request) -> Dict[str, Any]:
    issues = []
    if not SARVAM_API_KEY:
        issues.append("EXPO_PUBLIC_SARVAM_API_KEY missing")
    if not SARVAM_BASE_URL:
        issues.append("EXPO_PUBLIC_SARVAM_BASE_URL missing")
    if not GROQ_API_KEY:
        issues.append("GROQ_API_KEY missing")
    if not APP_SECRET_KEY:
        issues.append("APP_SECRET_KEY missing (auth disabled)")
    return {
        "status": "ok" if not issues else "degraded",
        "issues": issues,
        "sarvam_job_base": f"{SARVAM_BASE_URL}{SARVAM_JOB_BASE}",
        "groq_model": GROQ_MODEL,
        "groq_base": GROQ_BASE_URL,
        "webhook_mode": USE_WEBHOOK,
        "auth_enabled": bool(APP_SECRET_KEY),
        "data_retention_days": DATA_RETENTION_DAYS,
    }


@app.post("/api/transcribe", dependencies=[Depends(verify_app_secret)])
@limiter.limit("5/minute")
async def transcribe(
    request: Request,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    session_id: Optional[str] = Form(None),
    context_tag: str = Form("business_meeting"),
    num_speakers: int = Form(2),
    source_type: str = Form("live"),
    wait_for_completion: bool = Form(True),
) -> Dict[str, Any]:
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    # Validate audio files (reject empty or < 3 seconds)
    files = await validate_audio_files(files)

    if not session_id:
        session_id = f"sess_{now_ms()}"

    callback_url   = None
    callback_token = None
    if USE_WEBHOOK and BACKEND_PUBLIC_URL and SARVAM_WEBHOOK_SECRET:
        callback_url   = f"{BACKEND_PUBLIC_URL}/webhook/sarvam"
        callback_token = SARVAM_WEBHOOK_SECRET

    job_id = await sarvam_create_job(num_speakers, callback_url, callback_token)
    save_session(session_id, "transcribing", job_id, context_tag, num_speakers, source_type)

    input_filenames = await sarvam_upload_files(job_id, files)
    await sarvam_start_job(job_id)

    if wait_for_completion:
        return await process_job(session_id, job_id, context_tag, num_speakers, input_filenames)

    background_tasks.add_task(
        process_job_background, session_id, job_id, context_tag, num_speakers, input_filenames
    )
    return {"session_id": session_id, "job_id": job_id, "status": "transcribing"}


@app.get("/api/session/{session_id}", dependencies=[Depends(verify_app_secret)])
@limiter.limit("30/minute")
async def get_session(request: Request, session_id: str) -> Dict[str, Any]:
    return get_session_payload(session_id)


@app.post("/api/session/{session_id}/retry-summary", dependencies=[Depends(verify_app_secret)])
@limiter.limit("5/minute")
async def retry_summary(request: Request, session_id: str) -> Dict[str, Any]:
    payload  = get_session_payload(session_id)
    combined = "\n\n".join(c["processed_text"] for c in payload.get("chunks", []) if c.get("processed_text"))
    if not combined.strip():
        raise HTTPException(status_code=400, detail="No transcript available to summarize")
    summary = await summarize_with_groq(combined)
    save_summary(session_id, summary)
    update_session_status(session_id, "ready")
    return {"session_id": session_id, "status": "ready", "summary": summary}


@app.post("/webhook/sarvam")
async def sarvam_webhook(request: Request, background_tasks: BackgroundTasks) -> Dict[str, str]:
    token = request.headers.get("X-SARVAM-JOB-CALLBACK-TOKEN")
    if SARVAM_WEBHOOK_SECRET and token != SARVAM_WEBHOOK_SECRET:
        raise HTTPException(status_code=403, detail="Invalid token")
    payload   = await request.json()
    job_id    = payload.get("job_id")
    job_state = payload.get("job_state")
    if not job_id:
        raise HTTPException(status_code=400, detail="Missing job_id")
    session_id = get_session_by_job(str(job_id))
    if not session_id:
        raise HTTPException(status_code=404, detail="Session not found")
    if job_state == "FAILED":
        update_session_status(session_id, "failed")
        return {"status": "failed"}
    if job_state == "COMPLETED":
        row        = get_session_payload(session_id)
        context_tag = row.get("context_tag") or "business_meeting"
        num_speakers = int(row.get("num_speakers") or 2)
        background_tasks.add_task(process_job_background, session_id, str(job_id), context_tag, num_speakers)
    return {"status": "accepted"}
