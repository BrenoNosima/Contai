from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import declarative_base

from app.core.config import DATABASE_URL

# SQLite só é usado como fallback local (ex: rodar sem Docker/Postgres
# à mão); em produção/desenvolvimento normal, DATABASE_URL aponta para
# PostgreSQL — ver docker-compose.yml e .env.example.
connect_args = (
    {"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite")
    else {}
)

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()
