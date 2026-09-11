# Verdra — Crop Intelligence System

> **Detect Early. Predict Spread. Protect Yield.**

Verdra is an AI-powered agricultural disease diagnostic and epidemiological spread modeling platform built for farmers, agronomists, and crop protection teams.

---

## Architecture Overview

- **Frontend (`frontend/`)**: Next.js 15 (App Router), React 19, Tailwind CSS, Lucide Icons, Glassmorphism UI.
  - Deployed on **Vercel**: [https://verdrax.vercel.app](https://verdrax.vercel.app)
- **Backend (`backend/`)**: FastAPI, Python 3.11, Uvicorn, MobileNetV2 Neural Network Inference, Grad-CAM Attention Heatmaps, OpenWeatherMap Live Telemetry, Epidemiological Risk Engine.
  - Production-ready for **Render**, **Railway**, or **Google Cloud Run**.

---

## 1-Click Backend Deployment

### Deploying on Render (Recommended)

1. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** → **Web Service**.
2. Select your repository.
3. Configure the following:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
4. Add Environment Variables:
   - `FRONTEND_URL`: `https://verdrax.vercel.app`
5. Click **Create Web Service**. Once deployed, copy your service URL (e.g. `https://verdra-backend.onrender.com`).

*(Alternatively, click **New +** → **Blueprint** and Render will automatically read `render.yaml`).*

### Deploying on Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Railway detects `backend/Dockerfile` or `backend/Procfile` automatically.
3. In **Settings** → **Networking** → Click **Generate Domain**.

---

## Updating Vercel with Your Backend URL

Once your backend is live in the cloud:

```bash
cd frontend

# 1. Set the new production API URL
printf "https://YOUR-NEW-BACKEND-URL.onrender.com" | npx vercel env add NEXT_PUBLIC_API_URL production --force

# 2. Redeploy frontend with new environment baked in
npx vercel --prod --yes
```

---

## Local Development

### Run Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Run Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).
