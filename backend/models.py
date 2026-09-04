from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from database import Base

class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True, nullable=False)
    asset_category = Column(String, default="LARGE_CAP") # LARGE_CAP, HIGH_BETA, STABLE
    cached_price = Column(Float, nullable=True)
    last_fetched_at = Column(DateTime, nullable=True)

class UserVisitSnapshot(Base):
    __tablename__ = "user_visit_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True, nullable=False)
    snapshot_price = Column(Float, nullable=False)
    captured_at = Column(DateTime, default=datetime.utcnow)