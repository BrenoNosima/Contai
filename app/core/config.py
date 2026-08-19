import os

from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY: str = os.getenv(
    "GROQ_API_KEY",
    "",
)

# Modelo padrão do Groq. Este valor deve refletir os modelos liberados na conta
# ativa da chave; a lista real disponível para esta chave foi consultada e o
# modelo abaixo está ativo no momento.
GROQ_MODEL: str = os.getenv(
    "GROQ_MODEL",
    "openai/gpt-oss-20b",
)

# String de conexão do banco. Por padrão aponta para um PostgreSQL local
# (ver docker-compose.yml). Pode ser sobrescrita via variável de
# ambiente DATABASE_URL — inclusive para apontar para um MySQL, desde
# que o driver correspondente esteja instalado (ex:
# "mysql+pymysql://user:pass@host:3306/breno_finance"). Os relatórios em
# app/repositories/transaction_repository.py usam funções nativas do
# PostgreSQL (date_trunc), então MySQL é suportado para o restante da
# aplicação, mas os relatórios agregados foram escritos e testados para
# PostgreSQL.
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://breno:breno@localhost:5432/breno_finance",
)

CORS_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]
