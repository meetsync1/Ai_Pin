# Render Deployment, Security, & Cron Job Plan

> **Status: ✅ IMPLEMENTED** — All phases have been coded and are ready for deployment.

To deploy your FastAPI backend securely, keep it awake, and make it robust for production, we need to make a series of enhancements to your backend. This plan covers deployment (via Docker), server keep-alive mechanisms, app authentication, rate limiting, data retention, and audio validation.

## 1. Security: App Authentication ✅
To ensure that only your mobile app can communicate with the backend, we will implement a static API key approach:
*   **Shared Secret (`APP_SECRET_KEY`)**: We will define a strong, random secret key. This will be stored securely in Render as an Environment Variable.
*   **Mobile App Headers**: The React Native app must be updated to include this key in all HTTP requests (e.g., `X-App-Secret: <your-secret-key>`).
*   **FastAPI Verification**: We will create a FastAPI Dependency that intercepts incoming requests on protected routes (like `/api/transcribe`), checks for the `X-App-Secret` header, and verifies it against our environment variable. Unauthorized requests will be blocked with a `401 Unauthorized` response.

## 2. Security: Rate Limiting ✅
To prevent abuse (spamming expensive transcription/LLM APIs) and accidental infinite loops, we will implement IP-based rate limiting:
*   **Library (`slowapi`)**: We will add the `slowapi` package to `requirements.txt`. It is the standard rate-limiter for FastAPI.
*   **In-Memory Storage**: Because Render's free tier has an ephemeral disk and no free Redis, we will use an in-memory rate limiter. (Note: This means rate limits reset if the server restarts or wakes up from sleep).
*   **Endpoints Limits**: We will apply strict limits to heavy routes. For example:
    *   `5 requests / minute` per IP on the `/api/transcribe` endpoint.
    *   `30 requests / minute` per IP on standard GET endpoints.

## 3. Audio Validation (Pre-processing) ✅
To save API costs and prevent processing errors, we will validate incoming audio before sending it to the transcription API:
*   **Empty Audio Check**: Reject files that are 0 bytes or completely empty.
*   **Duration/Size Check**: We will implement a check (using file size heuristics or a lightweight library like `wave` or `mutagen`) to ensure the audio is longer than 3 seconds. If it's shorter, the backend will return a specific error (e.g., `400 Bad Request - Audio too short`) so the app can silently ignore it or notify the user.

## 4. Data Retention (Auto-Delete after 10 Days) ✅
To manage database size and comply with data privacy best practices, we will implement an automatic cleanup routine:
*   **Background Cleanup Task**: We will create a scheduled task within the FastAPI app that runs periodically (e.g., once every 24 hours).
*   **SQLite Deletion**: This task will run a SQL query (`DELETE FROM sessions WHERE created_at < ...`) to remove any sessions, transcripts, and summaries older than 10 days.
*   *(Note: While Render's Free tier ephemeral storage will automatically wipe everything on a server restart/deploy, having this logic ensures your database won't grow infinitely if the server stays awake continuously, and prepares the code for future persistent hosting).*

## 5. Dockerization ✅
To make the application portable, reliable, and ensure consistent restarts:
*   **Dockerfile**: We will create a `Dockerfile` that packages your Python environment, installs `requirements.txt`, and runs the `uvicorn` server. 
*   **Render Docker Deploy**: Instead of relying on Render's default Python environment, we will deploy it as a Docker Web Service. This gives you complete control over the environment and ensures that if the server crashes, Docker/Render will reliably restart the exact same container state.

## 6. Server Keep-Alive (Cron Job) ✅
*   **Self-Pinging Task**: We will add a background loop that runs when the FastAPI server starts, making a request to its own public URL (`BACKEND_PUBLIC_URL`) every 9-10 minutes to reset Render's 15-minute inactivity timer.
*   **New `/keep-alive` Endpoint**: We will add a simple endpoint (`GET /keep-alive`) that the background task will call.
*   **External Cron (Recommended)**: To guarantee it **wakes up** if Render forcefully restarts it, you should use a free external service like **cron-job.org** to hit your `https://your-app-name.onrender.com/keep-alive` endpoint every 10 minutes.

---

## Render Environment Variables (Required)

| Variable | Example | Description |
|---|---|---|
| `BACKEND_PUBLIC_URL` | `https://your-app.onrender.com` | Public URL for self-ping keep-alive |
| `APP_SECRET_KEY` | `my-super-secret-key-abc123` | Shared secret for app authentication |
| `EXPO_PUBLIC_SARVAM_API_KEY` | *your key* | Sarvam AI API key |
| `EXPO_PUBLIC_SARVAM_BASE_URL` | *your url* | Sarvam AI base URL |
| `GROQ_API_KEY` | *your key* | Groq LLM API key |
| `DATA_RETENTION_DAYS` | `10` | Days before auto-deleting old data (default: 10) |

## Render Dashboard Settings

| Setting | Value |
|---|---|
| **Environment** | Docker |
| **Root Directory** | `backend` |
| **Health Check Path** | `/health` |
