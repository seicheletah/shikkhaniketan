print("THIS IS MY MAIN.PY RUNNING")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routers.v1.api import api_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)