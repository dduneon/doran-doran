from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "도란도란 API"
    database_url: str = "postgresql+asyncpg://dorandoran:dorandoran@localhost:5432/dorandoran"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    google_maps_api_key: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()
