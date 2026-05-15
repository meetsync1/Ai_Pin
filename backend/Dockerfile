# ── Stage: Python runtime ─────────────────────────────────────────────────────
FROM python:3.11-slim

# Prevent Python from buffering stdout/stderr (important for Docker logs)
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# Render injects PORT at runtime; default to 10000 (Render's default)
ENV PORT=10000
EXPOSE ${PORT}

# Health check — Render uses this to determine container health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/health')" || exit 1

# Run the server
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
