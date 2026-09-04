from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import yfinance as yf
import auth
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

class UserAuth(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TickerCreate(BaseModel):
    symbol: str
    asset_category: str = "LARGE_CAP"

# 1. Register User
@app.post("/api/register", status_code=status.HTTP_201_CREATED)
def register(user_data: UserAuth, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = auth.get_password_hash(user_data.password)
    user = models.User(email=user_data.email, hashed_password=hashed_pwd)
    db.add(user)
    db.commit()
    return {"message": "User created successfully"}

# 2. Login Token Endpoint
@app.post("/api/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/watchlist")
def get_watchlist(
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    items = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == current_user.id).all()
    response = []

    for item in items:
        is_stale = False
        current_price = item.cached_price

        # Fetch live price ONLY if cached price is missing
        if current_price is None:
            try:
                ticker = yf.Ticker(item.symbol)
                fetched_price = ticker.fast_info['lastPrice']

                if fetched_price is not None:
                    current_price = round(float(fetched_price), 2)
                    item.cached_price = current_price
                    item.last_fetched_at = datetime.utcnow()
                    db.commit()
                else:
                    is_stale = True
            except Exception:
                is_stale = True

        last_snapshot = db.query(models.UserVisitSnapshot)\
            .filter(
                models.UserVisitSnapshot.symbol == item.symbol,
                models.UserVisitSnapshot.user_id == current_user.id
            )\
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
def add_ticker(
    payload: TickerCreate, 
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    sym = payload.symbol.upper().strip()
    existing = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.symbol == sym,
        models.WatchlistItem.user_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Ticker already present in your watchlist.")

    new_item = models.WatchlistItem(
        symbol=sym, 
        asset_category=payload.asset_category,
        user_id=current_user.id
    )
    db.add(new_item)
    db.commit()
    return {"message": "Success"}

@app.delete("/api/watchlist/{symbol}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticker(
    symbol: str, 
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    item = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.symbol == symbol.upper(),
        models.WatchlistItem.user_id == current_user.id
    ).first()
    
    if item:
        db.delete(item)
        db.commit()
    return None

@app.post("/api/snapshot")
def capture_snapshot(
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    items = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == current_user.id).all()
    for item in items:
        if item.cached_price is not None:
            snap = models.UserVisitSnapshot(
                symbol=item.symbol, 
                snapshot_price=item.cached_price,
                user_id=current_user.id
            )
            db.add(snap)
    db.commit()
    return {"message": "Visit snapshot recorded"}

# Simulation Route
@app.post("/api/simulate-move/{symbol}")
def simulate_move(
    symbol: str, 
    pct_change: float = 3.5, 
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    item = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.symbol == symbol.upper(),
        models.WatchlistItem.user_id == current_user.id
    ).first()
    
    if not item or not item.cached_price:
        raise HTTPException(status_code=404, detail="Ticker not found or missing price.")
    
    # Artificially shift cached price by pct_change
    item.cached_price = round(item.cached_price * (1 + (pct_change / 100)), 2)
    item.last_fetched_at = datetime.utcnow()
    db.commit()
    return {"message": f"Simulated {pct_change}% shift for {symbol}", "new_price": item.cached_price}