# FestOS — Event Lifecycle Management System
## Manav Rachna University

A full-stack event management platform with AI-powered chatbot, real-time Socket.io updates, QR-based check-in, Razorpay payment integration, and multi-level approval workflows.

---

## 🏗️ Architecture

```
FestOS/
├── server/     Node.js + Express + MongoDB + Socket.io  (port 5000)
└── client/     React + Vite + Tailwind CSS              (port 5173)
```

---

## 🛠️ Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| MongoDB | ≥ 6.0 (local or Atlas) |
| Redis | ≥ 7.0 (optional — app runs without it) |

---

## 🚀 How to Run

### Step 1 — Clone the repo
```bash
git clone https://github.com/ianurag2004/apiprojectqrlast.git
cd apiprojectqrlast
```

### Step 2 — Set up the Backend
```bash
cd server
npm install
```

Copy the example env file and fill in your values:
```bash
cp .env.example .env
```

Edit `server/.env`:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
REDIS_URL=redis://localhost:6379
CLIENT_URL=http://localhost:5173

# Google Gemini AI (free key from https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key

# Razorpay (test keys from https://dashboard.razorpay.com/app/keys)
RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
# Registration fee in paise (e.g. 19900 = ₹199 | set 0 for free events)
REG_FEE_PAISE=0
```

Start the backend:
```bash
npm run dev
# ✅ Running on http://localhost:5000
```

### Step 3 — Seed Demo Users (optional but recommended)
```bash
node scripts/reseedDemoUsers.js
```

### Step 4 — Set up the Frontend
```bash
cd ../client
npm install
npm run dev
# ✅ Opens at http://localhost:5173
```

---

## 🔐 Demo Accounts

All demo accounts use password: **`demo1234`**

| Role | Email | Access |
|------|-------|--------|
| Organizer | `organizer@demo.festos` | Create & manage events |
| HOD | `hod@demo.festos` | Department approvals |
| Dean | `dean@demo.festos` | Final approvals |
| Student | `student@demo.festos` | Register for events via QR |
| Admin | `admin@demo.festos` | Full access |

---

## 📱 QR Registration Flow

1. **Organizer** opens *Registrations* page → selects event → clicks **QR Code**
2. A QR is generated — display it at the venue or share the link
3. **Student** scans QR → lands on public form (no login needed)
4. Fills details → pays via Razorpay → gets a personal entry QR ticket

---

## 📡 API Overview

| Resource | Endpoint |
|----------|----------|
| Auth | `POST /api/auth/register`, `/login`, `/refresh`, `/logout` |
| Events | `GET /api/events`, `POST /api/events`, `PATCH /:id/approve` |
| Registrations | `POST /api/registrations`, `POST /scan` |
| Payments | `POST /api/payments/create-order`, `POST /verify` |
| QR | `GET /api/payments/event-qr/:eventId` |
| Volunteers | `GET /api/volunteers/event/:id` |
| Analytics | `POST /api/analytics/event/:id/generate` |
| AI Chat | `POST /api/ai/chat` |

---

## 🔌 Real-time Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join:event` | client → server | Join event room |
| `registration:new` | server → client | New registration |
| `checkin:update` | server → client | QR check-in update |
| `approval:status` | server → client | Approval change |

---

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access |
| `hod` | Approve events (step 1), view all |
| `dean` | Approve events (step 2) |
| `organizer` | Create events, manage volunteers & registrations |
| `volunteer` | View events, log hours |
| `participant` | Register for events via QR, view public events |

---

## 📊 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS v3 |
| State | Zustand |
| Charts | Recharts |
| Real-time | Socket.io |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Cache | Redis (ioredis) — optional |
| Auth | JWT (access 15min + refresh 7d) |
| AI Chatbot | Google Gemini API |
| Payments | Razorpay |
| QR Codes | qrcode (npm) |

---

## 🎓 Built for Manav Rachna University
FestOS digitises the full event lifecycle — from proposal and approval to registration, payment, and check-in — for campus fests and events.
