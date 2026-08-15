from fastapi import APIRouter
from backend.api.routers import (
    users,
    auth,
    students,
    teachers,
    courses,
    reviews,
    purchase,
    media,
)

# main API route
api_router = APIRouter(prefix="/api/v1")

# for enabling API routes
api_router.include_router(users.api_router)
api_router.include_router(auth.api_router)
api_router.include_router(students.api_router)
api_router.include_router(teachers.api_router)
api_router.include_router(courses.api_router)
api_router.include_router(reviews.api_router)
api_router.include_router(purchase.api_router)
api_router.include_router(media.api_router)
