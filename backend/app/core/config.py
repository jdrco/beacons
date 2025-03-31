from pydantic import Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = Field(..., env="DATABASE_URL")

    secret_key: str = Field(..., env="SECRET_KEY")
    algorithm: str = Field(default="HS256", env="ALGORITHM")
    access_token_expire_minutes: int = Field(default=180, env="ACCESS_TOKEN_EXPIRE_MINUTES")

    mail_username: str = Field(..., env="MAIL_USERNAME")
    mail_password: str = Field(..., env="MAIL_PASSWORD")
    mail_from: str = Field(..., env="MAIL_FROM")
    mail_port: int = Field(default=587)
    mail_server: str = Field(default="smtp.gmail.com")
    mail_starttls: bool = Field(default=True)
    mail_ssl_tls: bool = Field(default=False)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
