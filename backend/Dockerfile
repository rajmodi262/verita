# Phase 7 — Containerization (backend)
FROM python:3.11-slim

WORKDIR /app

# System deps for scientific Python wheels are bundled, so just install requirements.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

# Production: no --reload, bind all interfaces inside the container network.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
