from fastapi import FastAPI, Response, status, HTTPException
from backend.models import Admin, AdminResponse, AdminUpdate
from backend.database import db_engine
from sqlmodel import Session, select

app = FastAPI()


# read posts
@app.get("/posts", response_model=list[AdminResponse])
def get_posts():
    with Session(db_engine) as db_session:
        return db_session.exec(select(Admin)).all()


@app.get("/posts/{id}", response_model=AdminResponse)
def get_post(id: int):
    with Session(db_engine) as db_session:
        data = db_session.exec(select(Admin).where(Admin.id == id)).first()
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"post with id: {id} was not found",
            )
        return data


# create posts
@app.post("/posts", status_code=status.HTTP_201_CREATED, response_model=AdminResponse)
def create_post(admindata: Admin):
    with Session(db_engine) as db_session:
        admin = Admin(**admindata.model_dump())
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)
        return admin


# delete posts
@app.delete("/posts/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(id: int):
    with Session(db_engine) as db_session:
        data = db_session.exec(select(Admin).where(Admin.id == id)).first()
        if not data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        db_session.delete(data)
        db_session.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)


# update post
@app.patch("/posts/{id}", response_model=AdminResponse)
def update_post(id: int, admindata: AdminUpdate):
    with Session(db_engine) as db_session:
        data = db_session.exec(select(Admin).where(Admin.id == id)).first()
        if not data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        data.sqlmodel_update(admindata.model_dump(exclude_unset=True))
        db_session.add(data)
        db_session.commit()
        db_session.refresh(data)
        return data
