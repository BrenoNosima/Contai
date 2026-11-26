from sqlalchemy import Column, DateTime, Integer, String
from app.core.database import Base


class RequestLimit(Base):
    __tablename__ = "request_limits"
    key = Column(String(64), primary_key=True)
    requests = Column(Integer, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
