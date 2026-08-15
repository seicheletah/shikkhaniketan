from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routers.v1.api import api_router

# fastapi app instance
app = FastAPI()

app.include_router(api_router)

# for cross-origin resource sharing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
