from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SIA API"
    environment: str = "development"
    database_url: str = "postgresql+asyncpg://sia:local-development-only@localhost:5432/sia"
    redis_url: str = "redis://localhost:6379/0"
    clerk_jwks_url: str = ""
    clerk_issuer: str = ""
    clerk_audience: str = ""
    clerk_secret_key: str = ""
    invitation_expires_days: int = 7
    rate_limit_requests: int = 60
    rate_limit_window_seconds: int = 60

    model_config = SettingsConfigDict(env_file=".env", env_prefix="SIA_", extra="ignore")


settings = Settings()
