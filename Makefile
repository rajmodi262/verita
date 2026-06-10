# Verita — task runner (Phase 4, Build). Cross-platform via `make <target>`.

.PHONY: help install dev test build docker-build up down

help:
	@echo "install      Install backend + frontend deps"
	@echo "dev          Run backend (8000) and frontend (5173) for local dev"
	@echo "test         Run backend pytest + frontend build check"
	@echo "build        Production build of the frontend"
	@echo "docker-build Build backend + frontend images"
	@echo "up / down    Start / stop the full stack via docker-compose"

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

dev:
	cd backend && uvicorn app.main:app --reload --port 8000 &
	cd frontend && npm run dev

test:
	cd backend && python -m pytest -q
	cd frontend && npm run build

build:
	cd frontend && npm run build

docker-build:
	docker build -t verita-backend ./backend
	docker build -t verita-frontend ./frontend

up:
	docker compose up --build

down:
	docker compose down
