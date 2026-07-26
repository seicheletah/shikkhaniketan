from sqlmodel import Field, SQLModel, func, Column, DateTime
from datetime import datetime


class AdminBase(SQLModel):
    first_name: str
    last_name: str
    email_id: str
    admin_access: bool


class Admin(AdminBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True), nullable=False, server_default=func.now()
        ),
    )
    admin_access: bool = False


class AdminUpdate(SQLModel):
    first_name: str | None = None
    last_name: str | None = None
    email_id: str | None = None
    admin_access: bool | None = None


class AdminResponse(AdminBase):
    pass
