# Reddit Clone — Application Source & CI Pipelines

<p align="center">
  <img src="docs/architecture.webp" alt="DevSecOps Architecture" width="100%"/>
</p>

Full-stack Reddit Clone application with automated DevSecOps CI pipelines. The backend is a Django REST API and the frontend is a Next.js application, both containerized and deployed to AWS EKS via a GitOps workflow.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Application Stack](#application-stack)
- [CI Pipeline Overview](#ci-pipeline-overview)
  - [Backend Pipeline](#backend-pipeline)
  - [Frontend Pipeline](#frontend-pipeline)
  - [Security Gates](#security-gates)
  - [GitOps Integration](#gitops-integration)
- [Backend Application](#backend-application)
  - [Django Apps](#django-apps)
  - [API Endpoints](#api-endpoints)
  - [Database](#database)
  - [Storage](#storage)
  - [Monitoring](#monitoring)
- [Frontend Application](#frontend-application)
  - [Pages and Components](#pages-and-components)
  - [State Management](#state-management)
- [Container Images](#container-images)
- [Environment Configuration](#environment-configuration)
- [Required GitHub Secrets](#required-github-secrets)
- [Project Structure](#project-structure)
- [Related Repositories](#related-repositories)

---

## Architecture Overview

| Property | Value |
|---|---|
| **Backend Framework** | Django 4.2.27 + Django REST Framework 3.16.1 |
| **Frontend Framework** | Next.js 14.2.35 (React 18.2.0) |
| **Language** | Python 3.12 (backend) / TypeScript 5.3.3 (frontend) |
| **Database** | SQLite3 (dev) / PostgreSQL via RDS (production) |
| **Object Storage** | AWS S3 (static files + media) |
| **Container Registry** | AWS ECR |
| **CI/CD** | GitHub Actions (CI) + ArgoCD (CD via GitOps) |
| **Monitoring** | Prometheus metrics via `django-prometheus` |

**End-to-End Flow:**

1. Developer pushes code to this repository
2. GitHub Actions CI pipeline triggers (backend or frontend, based on changed paths)
3. Dependencies are installed and scanned (OWASP Dependency Check)
4. Application is tested, linted, and built
5. Code quality is analyzed (SonarQube + Quality Gate)
6. Docker image is built and scanned (Trivy)
7. Image is pushed to AWS ECR tagged with the commit SHA
8. Helm values in the CD repository are updated with the new image tag
9. ArgoCD detects the change and syncs the deployment to EKS
10. n8n webhook notification is sent on success or failure

---

## Application Stack

### Backend

| Component | Technology | Version |
|---|---|---|
| Web Framework | Django | 4.2.27 |
| REST API | Django REST Framework | 3.16.1 |
| Authentication | SimpleJWT | 5.5.1 |
| WSGI Server | Gunicorn | 22.0.0 |
| Database Driver | psycopg2-binary | 2.9.11 |
| Object Storage | boto3 + django-storages | 1.42.30 / 1.14.6 |
| CORS | django-cors-headers | 4.9.0 |
| Monitoring | django-prometheus | 2.3.1 |
| Image Processing | Pillow | 11.3.0 |
| Testing | pytest + pytest-django + coverage | 8.3.5 / 4.9.0 / 7.10.7 |

### Frontend

| Component | Technology | Version |
|---|---|---|
| Framework | Next.js | 14.2.35 |
| UI Library | Chakra UI | 2.8.2 |
| State Management | Recoil | 0.7.7 |
| HTTP Client | Axios | 1.13.4 |
| Animation | Framer Motion | 10.18.0 |
| Language | TypeScript | 5.3.3 |
| Runtime | Node.js | 18 |

---

## CI Pipeline Overview

Both pipelines are triggered via `workflow_dispatch` (manual) and support automatic execution when changes are detected in the respective source directories.

### Backend Pipeline

| Stage | Tool | Description |
|---|---|---|
| Change Detection | `dorny/paths-filter` | Monitors `src/backend/**` for changes |
| Setup | Python 3.12, pip | Install dependencies from `requirements.txt` |
| Dependency Scan | OWASP Dependency Check | Fails on CVSS >= 7 |
| Unit Tests | pytest + coverage | Runs tests with coverage reporting (XML) |
| Code Quality | SonarQube | Static analysis + Quality Gate enforcement |
| Static Files | `collectstatic` | Prepares Django static assets |
| Docker Build | Docker | Multi-stage build, tagged with commit SHA |
| Image Scan | Trivy | Fails on CRITICAL/HIGH severity |
| Push to ECR | AWS CLI | Tags and pushes to `reddit-backend:{SHA}` |
| Update CD Repo | yq + git | Updates Helm `values.yaml` with new image tag |
| Notification | n8n webhook | Reports success or failure |

### Frontend Pipeline

| Stage | Tool | Description |
|---|---|---|
| Change Detection | `dorny/paths-filter` | Monitors `src/frontend/**` for changes |
| Setup | Node.js 18, npm | Install dependencies with `npm ci --legacy-peer-deps` |
| Dependency Scan | OWASP Dependency Check | Fails on CVSS >= 7 |
| Lint | ESLint | TypeScript/TSX linting (non-blocking) |
| Type Check | TypeScript (`tsc --noEmit`) | Validates types (blocking) |
| Build | `npm run build` | Next.js production build with standalone output |
| Code Quality | SonarQube | Static analysis + Quality Gate enforcement |
| Docker Build | Docker | 3-stage build (deps, builder, runner), tagged with commit SHA |
| Image Scan | Trivy | Fails on CRITICAL/HIGH severity |
| Push to ECR | AWS CLI | Tags and pushes to `reddit-frontend:{SHA}` |
| Update CD Repo | yq + git | Updates Helm `values.yaml` with new image tag |
| Notification | n8n webhook | Reports success or failure |

See [`.github/workflows/BACKEND_PIPELINE.md`](.github/workflows/BACKEND_PIPELINE.md) and [`.github/workflows/FRONTEND_PIPELINE.md`](.github/workflows/FRONTEND_PIPELINE.md) for detailed pipeline documentation.

### Security Gates

Both pipelines enforce multiple security checkpoints:

| Gate | Tool | Threshold | Scope |
|---|---|---|---|
| Dependency Vulnerabilities | OWASP Dependency Check | CVSS >= 7 fails the build | Python packages / npm packages |
| Code Quality | SonarQube Quality Gate | Configurable (bugs, smells, coverage) | Source code |
| Container Vulnerabilities | Trivy | CRITICAL or HIGH severity fails the build | Docker image (OS + app deps) |

Accepted vulnerability exceptions are documented in `.trivyignore` files within each application directory.

### GitOps Integration

After a successful build, the pipeline automatically:

1. Clones the CD repository (`nti-final-project-cd`)
2. Updates `deployment.image` in the corresponding Helm `values.yaml`
3. Commits with message `chore(backend|frontend): update image tag to {SHA}`
4. Pushes to `main` branch
5. ArgoCD detects the change and syncs the deployment

---

## Backend Application

### Django Apps

| App | Models | Purpose |
|---|---|---|
| `users` | `User` | Custom user model with JWT authentication |
| `communities` | `Community`, `CommunityMember` | Create, join, leave communities |
| `posts` | `Post`, `PostVote` | Create, delete, vote on posts |
| `comments` | `Comment` | Create, delete comments on posts |

### API Endpoints

**Authentication:**

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/users/register/` | No | Register new user |
| POST | `/api/users/login/` | No | Login (returns JWT tokens) |
| GET | `/api/users/profile/` | Yes | Get current user profile |
| POST | `/api/users/token/refresh/` | No | Refresh JWT access token |

**Communities:**

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/communities/` | No | List all communities |
| POST | `/api/communities/` | Yes | Create community |
| GET | `/api/communities/<id>/` | No | Get community details |
| GET | `/api/communities/user/snippets/` | Yes | Get user's joined communities |
| POST | `/api/communities/<id>/join/` | Yes | Join community |
| POST | `/api/communities/<id>/leave/` | Yes | Leave community |

**Posts:**

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/posts/?community_id=x` | No | List posts (filtered by community) |
| POST | `/api/posts/create/` | Yes | Create post |
| GET | `/api/posts/<id>/` | No | Get post details |
| DELETE | `/api/posts/<id>/` | Yes | Delete post (creator only) |
| POST | `/api/posts/<id>/vote/` | Yes | Vote on post (+1 / -1) |
| GET | `/api/posts/votes/?community_id=x` | Yes | Get user's votes |

**Comments:**

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/comments/?post_id=x` | No | List comments for a post |
| POST | `/api/comments/create/` | Yes | Create comment |
| DELETE | `/api/comments/<id>/delete/` | Yes | Delete comment (creator only) |

**Health & Monitoring:**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health/readiness/` | Kubernetes readiness probe |
| GET | `/health/liveness/` | Kubernetes liveness probe |
| GET | `/metrics` | Prometheus metrics (via `django-prometheus`) |

### Database

- **Development:** SQLite3 (in-memory during tests)
- **Production:** PostgreSQL via AWS RDS, configured through `DATABASE_URL` environment variable
- **ORM:** Django ORM with Prometheus monitoring wrapper

### Storage

- **Development:** Local filesystem (`/static/`, `/media/`)
- **Production:** AWS S3 with custom storage backends (`StaticStorage`, `MediaStorage`)
- Public read access on S3 for `static/*` and `media/*` prefixes
- Cache-Control headers set to `max-age=86400`

### Monitoring

- `django-prometheus` middleware wraps all requests and database queries
- Prometheus metrics exposed at `/metrics`
- Grafana dashboards configured in the CD repository

---

## Frontend Application

### Pages and Components

A Next.js application providing the Reddit Clone user interface:

- **Community pages** — view, create, and manage communities
- **Post pages** — create posts, vote, view details
- **Comment system** — threaded comments on posts
- **Authentication** — login/register modals with JWT token management
- **Navigation** — directory menu, search, user menu

### State Management

| Atom | Purpose |
|---|---|
| `authModalAtom` | Controls authentication modal state (login/register) |
| `communitiesAtom` | Stores community data and user memberships |
| `postsAtom` | Manages post list, selected post, and votes |
| `userAtom` | Stores authenticated user state |
| `directoryMenuAtom` | Controls sidebar navigation directory |

### Security Headers

Configured in `next.config.js`:

| Header | Value |
|---|---|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Cache-Control` | `public, max-age=3600, must-revalidate` |

---

## Container Images

### Backend

| Property | Value |
|---|---|
| Base Image | `python:3.12-slim` |
| Build | Multi-stage (builder + runtime) |
| Runtime User | `appuser` (non-root) |
| Port | `8000` |
| Server | Gunicorn (2 workers, 300s timeout) |
| Tag Format | `reddit-backend:{commit-sha}` |

### Frontend

| Property | Value |
|---|---|
| Base Image | `node:18-alpine3.21` |
| Build | 3-stage (deps, builder, runner) |
| Runtime User | `nextjs` (non-root, UID 1001) |
| Port | `3000` |
| Server | Next.js standalone server (`node server.js`) |
| Tag Format | `reddit-frontend:{commit-sha}` |
| Build Arg | `NEXT_PUBLIC_API_URL` (injected at build time) |

---

## Environment Configuration

### Backend Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DJANGO_SECRET_KEY` | Django secret key | (generated secret) |
| `DJANGO_DEBUG` | Debug mode | `True` / `False` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost,127.0.0.1` |
| `DJANGO_CORS_ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | Comma-separated CSRF trusted origins | `https://yourdomain.com` |
| `DJANGO_SECURE` | Enable HTTPS security settings | `True` / `False` |
| `DJANGO_EMAIL_BACKEND` | Email backend class | `django.core.mail.backends.console.EmailBackend` |
| `DATABASE_URL` | Database connection string | `postgresql://user:pass@host:5432/db` |
| `USE_S3` | Enable S3 storage | `True` / `False` |
| `AWS_BUCKET_NAME` | S3 bucket name | `reddit-clone-bucket-nti` |
| `AWS_S3_REGION_NAME` | S3 region | `us-east-1` |
| `AWS_S3_CUSTOM_DOMAIN` | S3 custom domain for URL generation | `bucket.s3.amazonaws.com` |
| `AWS_ACCESS_KEY_ID` | AWS access key | (IAM key) |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | (IAM secret) |

### Frontend Environment Variables

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `https://api.yourdomain.com` |

---

## Required GitHub Secrets

| Secret | Used By | Purpose |
|---|---|---|
| `DJANGO_SECRET_KEY` | Backend CI | Django application secret key |
| `NEXT_PUBLIC_API_URL` | Frontend CI | Backend API URL (build-time injection) |
| `SONAR_TOKEN` | Both | SonarQube authentication token |
| `SONAR_HOST_URL` | Both | SonarQube server URL |
| `AWS_ACCESS_KEY_ID` | Both | AWS credentials for ECR and S3 |
| `AWS_SECRET_ACCESS_KEY` | Both | AWS credentials for ECR and S3 |
| `AWS_ECR_ACCOUNT_URL` | Both | ECR registry URL (e.g., `123456789.dkr.ecr.us-east-1.amazonaws.com`) |
| `AWS_BUCKET_NAME` | Backend CI | S3 bucket name for static/media |
| `AWS_S3_CUSTOM_DOMAIN` | Backend CI | S3 custom domain for URLs |
| `CD_REPO_TOKEN` | Both | GitHub PAT for pushing to CD repository |
| `CD_REPO_URL` | Both | CD repository path (e.g., `org/nti-final-project-cd`) |
| `N8N_WEBHOOK_URL` | Both | n8n webhook URL for pipeline notifications |

---

## Project Structure

```
nti-final-project-ci/
├── README.md                                # This file
├── .github/
│   └── workflows/
│       ├── backend-ci.yml                   # Backend CI pipeline
│       ├── frontend-ci.yml                  # Frontend CI pipeline
│       ├── BACKEND_PIPELINE.md              # Backend pipeline documentation
│       └── FRONTEND_PIPELINE.md             # Frontend pipeline documentation
├── docs/
│   └── architecture.webp                    # Architecture diagram
└── src/
    ├── backend/                             # Django REST API
    │   ├── Dockerfile                       # Multi-stage Python build
    │   ├── requirements.txt                 # Python dependencies
    │   ├── manage.py                        # Django management script
    │   ├── pytest.ini                       # Pytest configuration
    │   ├── conftest.py                      # Shared test fixtures
    │   ├── .coveragerc                      # Coverage configuration
    │   ├── .trivyignore                     # Accepted vulnerability exceptions
    │   ├── .env.example                     # Environment variable template
    │   ├── reddit_api/                      # Django project settings
    │   │   ├── settings.py
    │   │   ├── urls.py
    │   │   ├── storage_backends.py
    │   │   ├── views.py                     # Health check endpoints
    │   │   └── wsgi.py
    │   ├── users/                           # User model + JWT auth
    │   ├── communities/                     # Community CRUD + membership
    │   ├── posts/                           # Post CRUD + voting
    │   └── comments/                        # Comment CRUD
    └── frontend/                            # Next.js application
        ├── Dockerfile                       # 3-stage Node.js build
        ├── package.json                     # npm dependencies
        ├── next.config.js                   # Next.js configuration
        ├── tsconfig.json                    # TypeScript configuration
        ├── .trivyignore                     # Accepted vulnerability exceptions
        └── src/
            ├── api/                         # Axios HTTP client
            ├── atoms/                       # Recoil state atoms
            ├── chakra/                      # Chakra UI theme config
            ├── components/                  # React components
            ├── hooks/                       # Custom React hooks
            ├── pages/                       # Next.js pages
            ├── styles/                      # CSS styles
            └── types/                       # TypeScript type definitions
```

---

## Related Repositories

| Repository | Purpose |
|---|---|
| **nti-final-project-infra** | Terraform infrastructure (VPC, EKS, RDS, S3, ECR) |
| **nti-final-project-cd** | Helm charts, ArgoCD configuration, GitOps manifests |