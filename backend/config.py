import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    ZHIPU_API_KEY = os.getenv('ZHIPU_API_KEY', '')
    AMAP_API_KEY = os.getenv('AMAP_API_KEY', '')
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
