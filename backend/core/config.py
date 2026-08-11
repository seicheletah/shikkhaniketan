from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
    ENVIRONMENT: str = "development"
    DATABASE_URL_DEV: str
    DATABASE_URL_PROD: str
    SECRET_KEY: SecretStr
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    RAZORPAY_KEY_ID: str
    RAZORPAY_KEY_SECRET: str

settings = Settings() # type: ignore