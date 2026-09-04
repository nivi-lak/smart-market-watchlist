from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True, nullable=False)
    asset_category = Column(String, default="LARGE_CAP")
    cached_price = Column(Float, nullable=True)
    last_fetched_at = Column(DateTime, nullable=True)
    
    # Bind watchlist item to specific user
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

class UserVisitSnapshot(Base):
    __tablename__ = "user_visit_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True, nullable=False)
    snapshot_price = Column(Float, nullable=False)
    captured_at = Column(DateTime, default=datetime.utcnow)
    
    # Bind snapshot to specific user
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)