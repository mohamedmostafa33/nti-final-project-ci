# Backend CI Pipeline

## Overview

Automated CI pipeline for the Django REST API backend, implemented in GitHub Actions. The pipeline runs security scanning, testing, code quality analysis, container building, and deploys the image to AWS ECR. On success, it updates Helm values in the CD repository to trigger GitOps deployment via ArgoCD.

**Workflow file:** `backend-ci.yml`

---

## Trigger Conditions

| Trigger | Mechanism | Description |
|---|---|---|
| Manual | `workflow_dispatch` | Choice input `build-backend` (True/False) |
| Automatic | `dorny/paths-filter` | Detects changes in `src/backend/**` |
| Execution | Conditional | Runs if backend changes detected OR manual trigger set to True |

---

## Pipeline Stages

### 1. Detect Changes

- Checks out the repository with full git history (`fetch-depth: 0`)
- Uses `dorny/paths-filter@v3` to monitor `src/backend/**`
- Outputs `backend_changed` flag to control downstream job execution

### 2. Build and Test Backend

Runs when `backend_changed == true` OR `build-backend == True`.

#### 2.1 Environment Setup

- Installs Python 3.12 via `actions/setup-python@v4`
- Upgrades pip and installs all dependencies from `requirements.txt`

#### 2.2 OWASP Dependency Check

| Property | Value |
|---|---|
| Tool | `dependency-check/Dependency-Check_Action@main` |
| Project Name | `nti-final-project-backend` |
| Scan Target | `./src/backend/requirements.txt` |
| Output Format | HTML |
| Retired Checks | Enabled |
| Fail Threshold | CVSS >= 7 |

Scans Python packages for known CVEs. The HTML report is generated locally but not uploaded as an artifact.

#### 2.3 Environment Configuration

Creates a `.env` file with the following variables:

| Variable | Source |
|---|---|
| `USE_S3` | Pipeline env variable (default: `True`) |
| `DJANGO_SECRET_KEY` | `secrets.DJANGO_SECRET_KEY` |
| `DJANGO_DEBUG` | `True` |
| `DATABASE_URL` | `sqlite:///./db.sqlite3` |
| `DJANGO_ALLOWED_HOSTS` | `*` |
| `DJANGO_SECURE` | `False` |
| `DJANGO_EMAIL_BACKEND` | `django.core.mail.backends.console.EmailBackend` |
| `AWS_BUCKET_NAME` | `secrets.AWS_BUCKET_NAME` |
| `AWS_S3_REGION_NAME` | Pipeline env `AWS_REGION` (default: `us-east-1`) |
| `AWS_S3_CUSTOM_DOMAIN` | `secrets.AWS_S3_CUSTOM_DOMAIN` |
| `AWS_ACCESS_KEY_ID` | `secrets.AWS_ACCESS_KEY_ID` |
| `AWS_SECRET_ACCESS_KEY` | `secrets.AWS_SECRET_ACCESS_KEY` |

#### 2.4 Database Migrations

Runs `python manage.py migrate` to apply all Django migrations against the SQLite3 test database.

#### 2.5 Unit Tests and Coverage

| Property | Value |
|---|---|
| Framework | pytest with `pytest-django` |
| Command | `pytest --cov --cov-report=term-missing --cov-report=xml:coverage.xml` |
| Output | Terminal coverage report + XML for SonarQube |
| Database | In-memory SQLite3 (overridden in `conftest.py`) |

#### 2.6 SonarQube Analysis

| Property | Value |
|---|---|
| Action | `SonarSource/sonarqube-scan-action@v6` |
| Project Key | `nti-final-project-backend` |
| Project Name | `NTI Final Project - Backend` |
| Sources | `.` (project base directory) |
| Coverage Report | `coverage.xml` |
| Python Version | `3.12` |

**Exclusions:**

- `**/migrations/**` — Auto-generated database migrations
- `**/tests.py`, `**/test_*.py`, `**/conftest.py` — Test files
- `**/__pycache__/**`, `**/.pytest_cache/**` — Cache directories
- `**/htmlcov/**`, `**/staticfiles/**`, `**/media/**` — Build artifacts
- `**/*.coverage`, `**/coverage.xml` — Coverage data
- `**/*.sqlite3` — Database files
- `**/.env*`, `**/.gitignore`, `**/.dockerignore` — Config files
- `**/*.pyc`, `**/*.pyo` — Compiled bytecode
- `**/pytest.ini`, `**/.coveragerc`, `**/run_tests.sh`, `**/*.md` — Config and docs

#### 2.7 SonarQube Quality Gate

Uses `SonarSource/sonarqube-quality-gate-action@v1` to enforce the quality gate. Reads scan metadata from `src/backend/.scannerwork/report-task.txt`. Pipeline fails if the quality gate condition is not met.

#### 2.8 Collect Static Files

Runs `python manage.py collectstatic --noinput` to prepare Django static assets for the Docker build.

#### 2.9 Docker Image Build

| Property | Value |
|---|---|
| Working Directory | `./src/backend` |
| Tag Format | `reddit-backend:{COMMIT_SHA}` |
| SHA Source | `git rev-parse --short HEAD` |

Builds a multi-stage Docker image from `python:3.12-slim` with a non-root runtime user.

#### 2.10 Trivy Container Scan

| Property | Value |
|---|---|
| Action | `aquasecurity/trivy-action@master` |
| Image Ref | `reddit-backend:{COMMIT_SHA}` |
| Output Format | Table |
| Exit Code | `1` (fails on findings) |
| Severity | `CRITICAL,HIGH` |
| Ignore Unfixed | `true` |
| Ignore File | `src/backend/.trivyignore` |

**Currently Ignored Vulnerabilities:**

| CVE | Package | Reason |
|---|---|---|
| CVE-2026-1207 | Django | SQL injection via RasterField — not used in project |
| CVE-2026-1287 | Django | SQL injection via column aliases — ORM with validated inputs only |
| CVE-2026-1312 | Django | SQL injection via `order_by()` — all inputs are validated |
| CVE-2026-25990 | Pillow | Out-of-bounds write on PSD images — no PSD processing |

#### 2.11 AWS ECR Push

1. Configures AWS credentials via `aws-actions/configure-aws-credentials@v2`
2. Authenticates to ECR via `aws ecr get-login-password`
3. Tags image: `{AWS_ECR_ACCOUNT_URL}/reddit-backend:{COMMIT_SHA}`
4. Pushes to ECR

#### 2.12 Update Helm Values in CD Repository

| Property | Value |
|---|---|
| Tool | `yq` (Mike Farah's YAML processor) |
| Target File | `helm-charts/backend/values.yaml` |
| Target Key | `.deployment.image` |
| New Value | `{AWS_ECR_ACCOUNT_URL}/reddit-backend:{COMMIT_SHA}` |
| Commit Message | `chore(backend): update image tag to {COMMIT_SHA}` |
| Branch | `main` |

Steps:

1. Clones the CD repository using `CD_REPO_TOKEN` for authentication
2. Installs `yq` for YAML manipulation
3. Updates `deployment.image` in `helm-charts/backend/values.yaml`
4. Commits with metadata (commit SHA, run ID)
5. Pushes to `main` branch
6. ArgoCD detects the change and syncs the deployment

#### 2.13 Notification (n8n Webhook)

Sends a POST request to the n8n webhook URL on both success and failure.

**Payload:**

```json
{
  "status": "success | failure",
  "repo": "<github-repository>",
  "commit": "<full-commit-sha>",
  "actor": "<github-actor>",
  "env": "production"
}
```

- `if: success()` — Sends success notification after all steps complete
- `if: failure()` — Sends failure notification if any step fails

---

## Pipeline Environment Variables

| Variable | Scope | Default | Description |
|---|---|---|---|
| `USE_S3` | Workflow | `True` | Enables S3 storage for Django static/media |
| `AWS_REGION` | Workflow | `us-east-1` | AWS region for ECR operations |

---

## Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `DJANGO_SECRET_KEY` | Django application secret key |
| `SONAR_TOKEN` | SonarQube authentication token |
| `SONAR_HOST_URL` | SonarQube server URL |
| `AWS_ACCESS_KEY_ID` | AWS credentials for ECR and S3 |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials for ECR and S3 |
| `AWS_ECR_ACCOUNT_URL` | ECR registry URL (e.g., `123456789.dkr.ecr.us-east-1.amazonaws.com`) |
| `AWS_BUCKET_NAME` | S3 bucket name for static/media |
| `AWS_S3_CUSTOM_DOMAIN` | S3 custom domain for URL generation |
| `CD_REPO_TOKEN` | GitHub PAT for pushing to CD repository |
| `CD_REPO_URL` | CD repository path (e.g., `org/nti-final-project-cd`) |
| `N8N_WEBHOOK_URL` | n8n webhook URL for pipeline notifications |

---

## Artifacts Generated

| Artifact | Location | Uploaded |
|---|---|---|
| OWASP Dependency Check report | Local HTML | No |
| Coverage XML report | `coverage.xml` | No (consumed by SonarQube) |
| SonarQube scan metadata | `.scannerwork/report-task.txt` | No |
| Docker image | AWS ECR | Yes |
| Helm values update | CD repository | Yes (git push) |

---

## Failure Scenarios

The pipeline fails if:

| Condition | Stage |
|---|---|
| OWASP finds vulnerabilities with CVSS >= 7 | Dependency Check |
| pytest tests fail | Unit Tests |
| SonarQube Quality Gate is not passed | Code Quality |
| Trivy detects CRITICAL or HIGH vulnerabilities | Container Scan |
| ECR authentication or push fails | Image Distribution |
| CD repository update fails | Helm Update |

---

## Pipeline Flow

```
Detect Changes
└── If backend_changed OR manual trigger
    ├── Setup Python 3.12
    ├── Install Dependencies
    ├── OWASP Dependency Check
    ├── Create .env File
    ├── Database Migrations
    ├── Run pytest + Coverage
    ├── SonarQube Analysis
    ├── SonarQube Quality Gate
    ├── Collect Static Files
    ├── Build Docker Image (reddit-backend:{SHA})
    ├── Trivy Container Scan
    ├── Configure AWS Credentials
    ├── ECR Login
    ├── Tag + Push to ECR
    ├── Update Helm Values in CD Repository
    ├── [Success] Notify n8n
    └── [Failure] Notify n8n
```

---

## Maintenance Notes

- Update Python version in workflow if application requirements change
- Review `.trivyignore` entries quarterly and remove when fixes are available
- Keep SonarQube exclusions aligned with project directory structure
- Monitor OWASP CVSS threshold based on organizational security policy
- Review n8n webhook payload format if notification requirements change