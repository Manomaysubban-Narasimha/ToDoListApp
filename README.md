# ToDoListApp

A FastAPI backend with a Next.js frontend to manage todos.

## Backend (FastAPI)

From the repository root:

```bash
cd app
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn sqlalchemy
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.

## Frontend (Next.js)

From the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` to use the UI. If your API runs on a different host or port, set:

```bash
export NEXT_PUBLIC_API_BASE="http://localhost:8000"
```
