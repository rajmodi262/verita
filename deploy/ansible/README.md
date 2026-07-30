# Verita — Ansible Deployment

Provisions a fresh Linux (Ubuntu/Debian) host and deploys the full Verita
stack — Postgres, FastAPI backend, React frontend, Prometheus and Grafana —
via Docker Compose, gated on the backend health endpoint.

This is the VM/bare-metal deployment path; `../k8s/` holds the Kubernetes
manifests for a cluster deployment.

## Prerequisites

- Ansible on the control machine (`pipx install ansible` or `pip install ansible`)
- SSH access to the target host with a sudo-capable user

## Usage

```bash
# 1. Install the required collection
ansible-galaxy collection install -r requirements.yml

# 2. Point inventory.ini at your server (ansible_host, ansible_user)

# 3. (Optional) validate before running
ansible-playbook -i inventory.ini deploy.yml --syntax-check
ansible-playbook -i inventory.ini deploy.yml --check

# 4. Deploy
ansible-playbook -i inventory.ini deploy.yml
```

## What it does

1. Installs Docker Engine + the Compose plugin from Docker's apt repository.
2. Clones (or fast-forwards) this repository to `/opt/verita`.
3. Builds images and starts the stack with `docker compose`.
4. Polls `http://localhost:8000/health` until it returns `200`.
5. Prints the deployed service URLs (backend, frontend, Grafana, Prometheus).

Re-running is idempotent — only new commits or changed images cause updates.
