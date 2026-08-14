from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routers import users, auth, students, teachers, courses, reviews

# fastapi app instance
app = FastAPI()

# for enabling API routes
app.include_router(users.api_router)
app.include_router(auth.api_router)
app.include_router(students.api_router)
app.include_router(teachers.api_router)
app.include_router(courses.api_router)
app.include_router(reviews.api_router)


# for cross-origin resource sharing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
