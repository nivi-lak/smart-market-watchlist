from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import yfinance as yf

import models
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Market Watchlist API")

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CATEGORY_THRESHOLDS = {
    "HIGH_BETA": 3.0,
    "LARGE_CAP": 1.2,
    "STABLE": 0.75
}

class TickerCreate(BaseModel):
    symbol: str
    asset_category: str = "LARGE_CAP"

@app.get("/api/watchlist")
def get_watchlist(db: Session = Depends(get_db)):
    items = db.query(models.WatchlistItem).all()
    response = []

    for item in items:
        is_stale = False
        current_price = item.cached_price

        # Fetch market data with graceful fallback
        try:
            ticker = yf.Ticker(item.symbol)
            fast_info = ticker.fast_info
            fetched_price = fast_info['lastPrice']
            
            if fetched_price is not None:
                current_price = round(float(fetched_price), 2)
                item.cached_price = current_price
                item.last_fetched_at = datetime.utcnow()
                db.commit()
            else:
                is_stale = True
        except Exception:
            is_stale = True

        # Snapshot comparison logic
        last_snapshot = db.query(models.UserVisitSnapshot)\
            .filter(models.UserVisitSnapshot.symbol == item.symbol)\
            .order_by(models.UserVisitSnapshot.captured_at.desc())\
            .first()

        diff_pct = 0.0
        has_meaningful_change = False
        threshold = CATEGORY_THRESHOLDS.get(item.asset_category, 1.2)

        if last_snapshot and current_price:
            baseline = last_snapshot.snapshot_price
            diff_pct = round(((current_price - baseline) / baseline) * 100, 2)
            if abs(diff_pct) >= threshold:
                has_meaningful_change = True

        response.append({
            "id": item.id,
            "symbol": item.symbol,
            "category": item.asset_category,
            "price": current_price,
            "is_stale": is_stale,
            "last_fetched_at": item.last_fetched_at.isoformat() if item.last_fetched_at else None,
            "diff_since_last_visit": diff_pct,
            "threshold_used": threshold,
            "has_meaningful_change": has_meaningful_change,
            "has_baseline": last_snapshot is not None
        })

    return response

@app.post("/api/watchlist", status_code=status.HTTP_201_CREATED)
def add_ticker(payload: TickerCreate, db: Session = Depends(get_db)):
    sym = payload.symbol.upper().strip()
    if db.query(models.WatchlistItem).filter(models.WatchlistItem.symbol == sym).first():
        raise HTTPException(status_code=400, detail="Ticker already present in watchlist.")
    
    new_item = models.WatchlistItem(symbol=sym, asset_category=payload.asset_category)
    db.add(new_item)
    db.commit()
    return {"message": "Success"}

@app.delete("/api/watchlist/{symbol}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticker(symbol: str, db: Session = Depends(get_db)):
    item = db.query(models.WatchlistItem).filter(models.WatchlistItem.symbol == symbol.upper()).first()
    if item:
        db.delete(item)
        db.commit()
    return None

@app.post("/api/snapshot")
def capture_snapshot(db: Session = Depends(get_db)):
    items = db.query(models.WatchlistItem).all()
    for item in items:
        if item.cached_price is not None:
            snap = models.UserVisitSnapshot(symbol=item.symbol, snapshot_price=item.cached_price)
            db.add(snap)
    db.commit()
    return {"message": "Visit snapshot recorded"}