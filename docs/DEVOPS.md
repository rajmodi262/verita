# Verita — DevOps / SDLC Pipeline

Verita is built as a full software-engineering lifecycle, not just application code. Every phase
below maps to a **real, working artifact in this repository** — nothing is decorative.

> Note on tooling: some classic tools in the lifecycle (Maven/Gradle/Ant, JUnit/TestNG/Selenium)
> are Java-specific. Verita is a **Python + TypeScript/React** stack, so those phases use the
> equivalent industry-standard tools for this stack (Vite, pytest, Vitest). The *phase* is what
> matters; the tool is chosen to fit the technology.

| # | Phase | Industry tools | Verita's implementation | Where it lives | Status |
|---|-------|----------------|-------------------------|----------------|--------|
| 1 | **Planning** | Jira, Trello, Asana | GitHub Issues + templates + roadmap | `.github/ISSUE_TEMPLATE/`, `docs/ROADMAP.md`, `docs/IMPLEMENTATION.md` | ✅ |
| 2 | **Coding** | VS Code, IntelliJ | VS Code workspace config + EditorConfig | `.vscode/`, `.editorconfig` | ✅ |
| 3 | **Version Control** | Git, GitHub | Git repository with history | `.git/`, `.gitignore` | ✅ |
| 4 | **Build** | Maven, Gradle, Ant | Vite + tsc (frontend); Make task runner | `frontend/` build, `Makefile` | ✅ |
| 5 | **Testing** | JUnit, Selenium, TestNG | **pytest** (backend) + Vitest-ready (frontend) | `backend/tests/`, `backend/pytest.ini` | ✅ 8 tests passing |
| 6 | **CI** | Jenkins, GitHub Actions | **GitHub Actions** — test + build + image build | `.github/workflows/ci.yml` | ✅ |
| 7 | **Containerization** | Docker | Multi-stage Dockerfiles + compose | `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml` | ✅ |
| 8 | **Deployment (CD)** | Kubernetes, OpenShift | K8s Deployment + Service manifests | `deploy/k8s/` | ✅ manifests |
| 9 | **Monitoring** | Prometheus, Grafana | Live **`/metrics`** endpoint + dashboards | `app/main.py`, `monitoring/` | ✅ serving metrics |
| 10 | **Feedback / Logging** | ELK, Splunk | Structured **JSON logs** (collector-ready) | `backend/app/logging_config.py` | ✅ |

---

## How to run / verify each phase

**5 · Testing**
```bash
cd backend && python -m pytest -q      # 8 tests: profiler + recommender
```

**6 · CI** — runs automatically on every push/PR (`.github/workflows/ci.yml`): backend pytest,
frontend type-check + build, then a Docker image build gate.

**7 · Containerization**
```bash
docker compose up --build
# frontend :5173 · backend :8000 · prometheus :9090 · grafana :3000
```

**8 · Deployment**
```bash
kubectl apply -f deploy/k8s/
```

**9 · Monitoring** — with the backend running:
```bash
curl http://localhost:8000/metrics     # Prometheus exposition (http_requests_total, latency histograms)
# Prometheus scrapes it (monitoring/prometheus.yml); Grafana dashboard in monitoring/grafana-dashboard.json
```

**10 · Logging** — the backend emits one JSON object per log line:
```json
{"ts": "2026-...Z", "level": "INFO", "logger": "verita", "message": "..."}
```
Ready to ship to ELK / Loki / CloudWatch without regex parsing.

---

## Pipeline at a glance

```
Plan ──> Code ──> Commit ──> CI (test + build) ──> Containerize ──> Deploy (K8s)
 │                                                                       │
 └──────────────── Feedback (logs) <── Monitor (Prometheus/Grafana) <────┘
```
