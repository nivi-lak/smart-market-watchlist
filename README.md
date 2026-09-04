# Smart Market Watchlist & Change Engine

A volatility-adjusted market intelligence tool designed to surface **meaningful market shifts** rather than raw price noise since a user's last baseline visit.

---

## Key Design Philosophy & Features

### 1. Volatility-Weighted Threshold Model
Rather than applying a single uniform percentage rule across all equities, assets are grouped into distinct risk tiers with tailored anomaly thresholds:
* **Large Cap (`LARGE_CAP`):** Threshold $\pm 1.2\%$
* **High Beta (`HIGH_BETA`):** Threshold $\pm 3.0\%$
* **Stable ETF (`STABLE`):** Threshold $\pm 0.75\%$

Moves exceeding these relative limits automatically flag a **Meaningful Move** badge and populate the top-level **Attention Digest**.

### 2. Session-Based Baseline Capture & Resets
* **Point-in-Time Persistence:** Users capture baseline price snapshots (`Save Visit Snapshot`), creating a persistent reference footprint stored in SQLite.
* **On-Demand Baseline Reset:** The `Reset Baseline` mechanism allows instant clearing of historical deltas back to $0.00\%$ without losing tracked ticker configurations.

### 3. Graceful System Resilience & Degradation
* **Cached Price Fallbacks:** If the third-party financial API (`yfinance`) encounters rate limits or network degradation, the engine seamlessly falls back to local database-cached records (`cached_price`) while displaying a `Cached (Fallback)` warning label.

---

## Technical Stack

* **Backend:** Python (FastAPI, SQLAlchemy, SQLite, JWT Security)
* **Frontend:** React (Vite, Tailwind CSS, Recharts)
* **Data Sources:** Yahoo Finance (`yfinance`) with local DB fallback caching

---

## Local Setup & Running Instructions

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
### Frontend Setup
```bash
cd frontend
npm install
npm run dev
