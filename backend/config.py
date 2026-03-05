"""
config.py — Application settings loaded from environment variables or a .env file.

Settings are read once at import time by Pydantic Settings.
The `settings` singleton is imported by other modules.

Environment variables (all optional, with defaults):
  API_KEY          Secret key for X-API-Key authentication. Default: "changeme".
  DEFAULT_LOCALE   Faker locale used when none is specified. Default: "en_US".
  MAX_ROWS         Hard cap on rows per generation request. Default: 10000.
  DATA_DIR         Directory for schema JSON files and .config. Default: "/app/data".
"""
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    api_key: str = "changeme"
    default_locale: str = "en_US"
    max_rows: int = 10000
    data_dir: str = "/app/data"

    class Config:
        env_file = ".env"

settings = Settings()
