from pydantic import Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Existing fields
    database_url: str = Field(..., env="DATABASE_URL")
    secret_key: str = Field(..., env="SECRET_KEY")
    algorithm: str = Field(default="HS256", env="ALGORITHM")
    access_token_expire_minutes: int = Field(default=180, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # New fields for Google OAuth (TODO: maybe take out)
    google_client_id: str = Field(..., env="GOOGLE_CLIENT_ID")
    google_client_secret: str = Field(..., env="GOOGLE_CLIENT_SECRET")
    google_redirect_uri: str = Field(..., env="GOOGLE_REDIRECT_URI")
    
    # Database configuration
    postgres_user: str = Field(..., env="POSTGRES_USER")
    postgres_password: str = Field(..., env="POSTGRES_PASSWORD")
    postgres_db: str = Field(..., env="POSTGRES_DB")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
