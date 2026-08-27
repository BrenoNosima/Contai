from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from app.core.database import Base

def utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)

class AuthSession(Base):
    __tablename__ = "auth_sessions"
    id = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    refresh_token_hash = Column(String(64), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    revoked = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    last_used_at = Column(DateTime, nullable=False, default=utc_now)
