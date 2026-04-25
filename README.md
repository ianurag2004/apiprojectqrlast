# FestOS — AI-Driven Fest & Event Lifecycle Management System
## Manav Rachna University

A full-stack event management platform with AI-powered predictions, real-time Socket.io updates, QR check-in, and multi-level approval workflows.

---

## 🏗️ Architecture

```
FestOS/
├── ai-service/     Python Flask + scikit-learn (port 8000)
├── server/         Node.js + Express + MongoDB + Redis + Socket.io (port 5000)
├── client/         React + Vite + Tailwind CSS (port 5173)
└── postman/        Postman API collection
```

## 🛠️ Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| Python | ≥ 3.10 |
| MongoDB | ≥ 6.0 (local or Atlas) |
| Redis | ≥ 7.0 (optional — app degrades gracefully) |

---

## 🚀 Quick Start

### 1. AI Service (Python)
```bash
cd ai-service
pip install -r requirements.txt
python app.py
# Starts on http://localhost:8000
# Models auto-train on first run from seed data
```

### 2. Backend (Node.js)
```bash
cd server
# Edit .env with your MongoDB URI and secrets
npm install
npm run dev
# Starts on http://localhost:5000
```

### 3. Frontend (React)
```bash
cd client
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## 🔑 Environment Variables

### `server/.env`
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/festos
JWT_SECRET=your_super_secret_key
JWT_REFRESH_SECRET=your_refresh_secret
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:8000
CLIENT_URL=http://localhost:5173
```

### `client/.env`
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 📡 API Overview

| Service | Base URL |
|---------|----------|
| Auth    | `POST /api/auth/register`, `/login`, `/refresh`, `/logout` |
| Events  | `GET/POST /api/events`, `PATCH /:id/approve` |
| Budget  | `GET /api/budgets/event/:id/ai-suggest` |
| Registrations | `POST /api/registrations`, `POST /scan` (QR) |
| Volunteers | `GET /api/volunteers/event/:id/balance` |
| Analytics | `POST /api/analytics/event/:id/generate` |
| AI Proxy | `POST /api/ai/predict/turnout`, `/optimize/budget` |

### Import Postman Collection
`postman/FestOS.postman_collection.json`

---

## 🤖 AI Engine (Python/scikit-learn)

| Endpoint | Model | Purpose |
|----------|-------|---------|
| `/api/predict/turnout` | GradientBoostingRegressor | Predict attendance |
| `/api/optimize/budget` | LinearRegression | Optimal budget allocation |
| `/api/balance/volunteers` | KMeans + Z-Score | Workload balancing |
| `/api/score/engagement` | RandomForestRegressor | Post-event scoring |

Models are trained automatically on 60 historical event records when the service starts.

---

## 🔌 Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join:event` | client→server | Join event room |
| `registration:new` | server→client | New registration |
| `checkin:update` | server→client | QR check-in |
| `approval:status` | server→client | Approval change |
| `volunteer:alert` | server→client | Workload alert |
| `analytics:ready` | server→client | Report generated |

---

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access |
| `hod` | Approve (step 1), view all |
| `dean` | Approve (step 2) |
| `finance` | Approve (step 3), budget |
| `organizer` | Create events, manage volunteers |
| `volunteer` | View events, update hours |
| `participant` | Register, view public events |

---

## 📊 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS v3 |
| State | Zustand + persist |
| Charts | Recharts |
| QR | qrcode.react + html5-qrcode |
| Real-time | Socket.io |
| Backend | Express.js |
| Database | MongoDB + Mongoose |
| Cache | Redis (ioredis) |
| Auth | JWT (access 15min + refresh 7d) |
| AI | Flask + scikit-learn |

---

## 🎓 Built for Manav Rachna University
FestOS aligns with CO/PO outcomes for teamwork, project management, and leadership competencies.
