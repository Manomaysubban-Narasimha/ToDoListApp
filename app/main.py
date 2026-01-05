from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select, case, func, asc, desc
from datetime import datetime

from .database import Base, engine, get_db
from .models import Todo
from .schemas import TodoCreate, TodoUpdate, TodoOut

app = FastAPI(title="Todo Backend (FastAPI + SQLAlchemy + SQLite)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Minimal approach: create tables on startup (no migrations).
Base.metadata.create_all(bind=engine)

SortBy = str  # keep simple for now


def apply_sort(stmt, sort_by: str, order: str):
    order_fn = asc if order == "asc" else desc

    if sort_by == "created_at":
        return stmt.order_by(order_fn(Todo.created_at), order_fn(Todo.id))

    if sort_by == "title":
        # Case-insensitive alphabetical sort
        return stmt.order_by(order_fn(func.lower(Todo.title)), order_fn(Todo.id))

    # Default: deadline (NULL deadlines should go last)
    # We do: ORDER BY (deadline IS NULL), deadline, id
    nulls_last_flag = case((Todo.deadline.is_(None), 1), else_=0)
    return stmt.order_by(order_fn(nulls_last_flag), order_fn(Todo.deadline), order_fn(Todo.id))


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/todos", response_model=TodoOut, status_code=201)
def create_todo(payload: TodoCreate, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    todo = Todo(
        title=payload.title.strip(),
        description=payload.description,
        deadline=payload.deadline,
        completed=False,
        created_at=now,
        updated_at=now,
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


@app.get("/todos", response_model=list[TodoOut])
def list_todos(
    db: Session = Depends(get_db),
    sort_by: SortBy = Query(default="deadline", pattern="^(deadline|created_at|title)$"),
    order: str = Query(default="asc", pattern="^(asc|desc)$"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    stmt = select(Todo)
    stmt = apply_sort(stmt, sort_by=sort_by, order=order)
    stmt = stmt.limit(limit).offset(offset)
    todos = db.execute(stmt).scalars().all()
    return todos


@app.get("/todos/{todo_id}", response_model=TodoOut)
def get_todo(todo_id: int, db: Session = Depends(get_db)):
    todo = db.get(Todo, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


@app.put("/todos/{todo_id}", response_model=TodoOut)
def update_todo(todo_id: int, payload: TodoUpdate, db: Session = Depends(get_db)):
    todo = db.get(Todo, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    if payload.title is not None:
        todo.title = payload.title.strip()
    if payload.description is not None:
        todo.description = payload.description
    if payload.deadline is not None or payload.deadline is None:
        # This allows explicitly setting deadline to null too.
        todo.deadline = payload.deadline
    if payload.completed is not None:
        todo.completed = payload.completed

    todo.updated_at = datetime.utcnow()

    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


@app.delete("/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    todo = db.get(Todo, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(todo)
    db.commit()
    return None
