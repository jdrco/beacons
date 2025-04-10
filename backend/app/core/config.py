from pydantic import Field
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database settings
    database_url: str = Field(..., env="DATABASE_URL")
    postgres_user: Optional[str] = Field(None, env="POSTGRES_USER")
    postgres_password: Optional[str] = Field(None, env="POSTGRES_PASSWORD") 
    postgres_db: Optional[str] = Field(None, env="POSTGRES_DB")
    
    # Security settings
    secret_key: str = Field(..., env="SECRET_KEY")
    algorithm: str = Field(default="HS256", env="ALGORITHM")
    access_token_expire_minutes: int = Field(default=180, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # Mail settings
    mail_username: str = Field(..., env="MAIL_USERNAME")
    mail_password: str = Field(..., env="MAIL_PASSWORD")
    mail_from: str = Field(..., env="MAIL_FROM")
    mail_port: int = Field(default=587, env="MAIL_PORT")
    mail_server: str = Field(default="smtp.gmail.com", env="MAIL_SERVER")
    mail_starttls: bool = Field(default=True, env="MAIL_STARTTLS")
    mail_ssl_tls: bool = Field(default=False, env="MAIL_SSL_TLS")
    
    # URL settings
    backend_url: str = Field(default="http://localhost:8000", env="BACKEND_URL")
    frontend_url: str = Field(default="http://localhost:3000", env="FRONTEND_URL")

    class Config:
        env_file = ".env.prod"
        env_file_encoding = "utf-8"
        extra = "ignore"  # This allows extra fields in the environment without validation errors

settings = Settings()
