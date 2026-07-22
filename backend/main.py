import os
import psycopg
import time
from fastapi import FastAPI, Response, status, HTTPException
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

app = FastAPI()
load_dotenv()

#db connection check
database_url = os.getenv("DATABASE_URL")
while True:
    try:
        database = psycopg.connect(str(database_url))
        db = database.cursor()
        break
    except Exception as error:
        print('connection failed', error)
        time.sleep(2)

#pydantic data validation schemas
class Post(BaseModel):
    title: str
    content: str
    ishuman: bool = True
    species: Optional[str] = None

class Admin(BaseModel):
        first_name: str     
        last_name: str
        email_id: str

#read posts
@app.get("/posts")
def get_posts():
    db.execute("SELECT * FROM admin")
    data = db.fetchall()
    return{"data": data}

@app.get("/posts/{id}")
def get_post(id: int):
    db.execute(t"SELECT * FROM admin WHERE id={id}")
    data = db.fetchone()
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"post with id: {id} was not found")
    return {"data": data}

#create posts
@app.post("/posts", status_code=status.HTTP_201_CREATED)
def create_post(admindata: Admin):
    db.execute(
        t"INSERT INTO admin (first_name, last_name, email_id) VALUES ({admindata.first_name}, {admindata.last_name}, {admindata.email_id})"
        )
    database.commit()

#delete posts
@app.delete("/posts/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(id: int):
    db.execute(t"SELECT * FROM admin WHERE id={id}")
    data = db.fetchone()
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    db.execute(t"DELETE FROM admin WHERE id={id}")
    database.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

#update post
@app.put("/posts/{id}")
def update_post(id: int, admindata: Admin):
    db.execute(t"SELECT * FROM admin WHERE id={id}")
    data = db.fetchone()
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    db.execute(t"UPDATE admin SET first_name={admindata.first_name}, last_name={admindata.last_name}, email_id={admindata.email_id} WHERE id={id}")
    database.commit()
    return {"message": "post updated successfully"}