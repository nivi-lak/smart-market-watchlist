# Smart Market Watchlist & Intelligence Engine

The **Smart Market Watchlist** is an end-to-end financial intelligence application built to solve a core market-tracking problem: surfacing meaningful asset price shifts relative to user baselines without getting lost in daily market noise.

🔗 **Live Demo:** [https://smart-market-watc-git-f3cb20-nivedithaa-lakshmanasamys-projects.vercel.app/](https://smart-market-watc-git-f3cb20-nivedithaa-lakshmanasamys-projects.vercel.app/)

⚙️ **Backend API:** [https://smart-market-watchlist-6a1a.onrender.com](https://smart-market-watchlist-6a1a.onrender.com) 

---

## Technical Stack & Architecture

* **Backend:** FastAPI (Python), SQLite, SQLAlchemy, JWT Authentication
* **Frontend:** React (Vite), Tailwind CSS, Recharts
* **Deployment:** Render (FastAPI Web Service) & Vercel (React Static Hosting)

---

## Key Technical Features

1. **Volatility-Weighted Threshold Model:** Flags price shifts exceeding category risk limits:
   * **Large Cap (`LARGE_CAP`):** Threshold $\pm 1.2\%$
   * **High Beta (`HIGH_BETA`):** Threshold $\pm 3.0\%$
   * **Stable ETF (`STABLE`):** Threshold $\pm 0.75\%$
2. **Session Baseline Capture & Reset:** Allows users to capture point-in-time reference baselines (`Save Visit Snapshot`) or reset deltas back to $0.00\%$ (`Reset Baseline`).
3. **Data Quality Resilience:** Automatically falls back to database-cached prices (`cached_price`) with visual `Cached (Fallback)` warning badges during third-party API rate-limiting or outages.
4. **Interactive Simulation Controls:** Features inline `+3.5% Rally` and `-3.5% Drop` buttons to evaluate anomaly detection triggers in real time.

---

## Local Setup Instructions

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000
```
### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Deployment Architecture
* Backend Deployment (Render): The FastAPI engine runs as a Web Service configured with uvicorn main:app --host 0.0.0.0 --port $PORT and automatic database persistence.

* Frontend Deployment (Vercel): The React client is hosted as a Vite build output configured with URL rewrite rules for seamless client-side routing.

## Documentation & Walkthrough

For detailed screenshot walkthroughs, architectural diagrams, and user flow explanations, visit the [Walkthrough Guide](docs/WALKTHROUGH.md).