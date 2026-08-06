from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routers import users, auth, students

# fastapi app instance
app = FastAPI()

app.include_router(users.api_router)
app.include_router(auth.api_router)
app.include_router(students.api_router)

# for cross-origin resource sharing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
