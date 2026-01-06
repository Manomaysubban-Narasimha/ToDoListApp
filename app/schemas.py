"""
Pydantic schemas (various shapes that data can take) for the todo app.
"""

from pydantic import BaseModel, Field
from datetime import datetime

class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    deadline: datetime | None = None

class TodoUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    deadline: datetime | None = None
    completed: bool | None = None

class TodoOut(BaseModel):
    id: int
    title: str
    description: str | None
    deadline: datetime | None
    completed: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
