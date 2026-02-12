# Reddit Clone — Django REST API Backend

Django REST Framework backend for the Reddit Clone application. Provides JWT-authenticated REST APIs for users, communities, posts, and comments, with PostgreSQL (production) and SQLite3 (development) database support.

---

## Table of Contents

- [Technology Stack](#technology-stack)
- [Django Applications](#django-applications)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Communities](#communities)
  - [Posts](#posts)
  - [Comments](#comments)
  - [Health and Monitoring](#health-and-monitoring)
- [Request and Response Examples](#request-and-response-examples)
- [Data Models](#data-models)
- [Setup and Development](#setup-and-development)
- [Environment Variables](#environment-variables)
- [Database Configuration](#database-configuration)
- [Storage Configuration](#storage-configuration)
- [Monitoring](#monitoring)
- [Testing](#testing)
- [Docker](#docker)
- [Admin Panel](#admin-panel)

---

## Technology Stack

| Component | Technology | Version |
|---|---|---|
| Web Framework | Django | 4.2.27 |
| REST API | Django REST Framework | 3.16.1 |
| Authentication | Simple JWT | 5.5.1 |
| WSGI Server | Gunicorn | 22.0.0 |
| Database Driver | psycopg2-binary | 2.9.11 |
| Object Storage | boto3 / django-storages | 1.42.30 / 1.14.6 |
| CORS | django-cors-headers | 4.9.0 |
| Monitoring | django-prometheus | 2.3.1 |
| Image Processing | Pillow | 11.3.0 |
| Environment | django-environ | 0.12.0 |
| Runtime | Python | 3.12 |

---

## Django Applications

| App | Models | Purpose |
|---|---|---|
| `users` | `User` | Custom user model extending `AbstractUser` with JWT authentication |
| `communities` | `Community`, `CommunityMember` | Community CRUD, membership (join/leave), member counting |
| `posts` | `Post`, `PostVote` | Post CRUD, upvote/downvote system, community-filtered listing |
| `comments` | `Comment` | Comment CRUD, post-filtered listing, creator-only deletion |

---

## API Reference

Base URL: `/api/`

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/users/register/` | No | Register new user (returns JWT tokens) |
| POST | `/api/users/login/` | No | Login (returns access + refresh tokens) |
| GET | `/api/users/profile/` | Yes | Get current authenticated user profile |
| POST | `/api/users/token/refresh/` | No | Refresh expired access token |

### Communities

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/communities/` | No | List all communities |
| POST | `/api/communities/` | Yes | Create new community |
| GET | `/api/communities/<id>/` | No | Get community details |
| GET | `/api/communities/user/snippets/` | Yes | Get communities the user has joined |
| POST | `/api/communities/<id>/join/` | Yes | Join a community |
| POST | `/api/communities/<id>/leave/` | Yes | Leave a community |

### Posts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/posts/?community_id=x` | No | List posts (optional community filter) |
| POST | `/api/posts/create/` | Yes | Create new post |
| GET | `/api/posts/<id>/` | No | Get post details |
| DELETE | `/api/posts/<id>/` | Yes | Delete post (creator only) |
| POST | `/api/posts/<id>/vote/` | Yes | Vote on post (+1 upvote / -1 downvote) |
| GET | `/api/posts/votes/?community_id=x` | Yes | Get user vote history |

### Comments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/comments/?post_id=x` | No | List comments for a post |
| POST | `/api/comments/create/` | Yes | Create comment on a post |
| DELETE | `/api/comments/<id>/delete/` | Yes | Delete comment (creator only) |

### Health and Monitoring

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health/readiness/` | Kubernetes readiness probe (checks database connectivity) |
| GET | `/health/liveness/` | Kubernetes liveness probe (returns alive status) |
| GET | `/metrics` | Prometheus metrics (via `django-prometheus`) |

---

## Request and Response Examples

### Register User

**Request:**
```http
POST /api/users/register/
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "user123",
  "password": "securepass123",
  "password2": "securepass123"
}
```

**Response (201):**
```json
{
  "user": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com",
    "display_name": "user123",
    "created_at": "2026-01-29T10:00:00Z"
  },
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Create Community

**Request:**
```http
POST /api/communities/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "id": "programming",
  "privacy_type": "public"
}
```

**Response (201):**
```json
{
  "id": "programming",
  "creator_id": "1",
  "privacy_type": "public",
  "number_of_members": 1,
  "image_url": null,
  "created_at": "2026-01-29T10:00:00Z"
}
```

### Create Post

**Request:**
```http
POST /api/posts/create/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "community_id": "programming",
  "title": "My First Post",
  "body": "This is the post content",
  "image_url": "https://example.com/image.jpg"
}
```

**Response (201):**
```json
{
  "id": 1,
  "community_id": "programming",
  "title": "My First Post",
  "body": "This is the post content",
  "creator_id": "1",
  "user_display_text": "user123",
  "vote_status": 0,
  "number_of_comments": 0,
  "created_at": "2026-01-29T10:00:00Z"
}
```

### Vote on Post

**Request:**
```http
POST /api/posts/1/vote/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "vote_value": 1
}
```

**Response (200):**
```json
{
  "message": "Vote added",
  "vote_status": 1
}
```

Vote values: `1` for upvote, `-1` for downvote. Voting again with the same value removes the vote.

---

## Data Models

### User

| Field | Type | Description |
|---|---|---|
| `id` | AutoField | Primary key |
| `username` | CharField | Unique username |
| `email` | EmailField | Unique email address |
| `display_name` | CharField | Display name (defaults to username) |
| `created_at` | DateTimeField | Account creation timestamp |

### Community

| Field | Type | Description |
|---|---|---|
| `id` | CharField | Primary key (community name slug) |
| `creator_id` | ForeignKey | User who created the community |
| `privacy_type` | CharField | `public`, `restricted`, or `private` |
| `number_of_members` | IntegerField | Member count |
| `image_url` | URLField | Community image (optional) |
| `created_at` | DateTimeField | Creation timestamp |

### Post

| Field | Type | Description |
|---|---|---|
| `id` | AutoField | Primary key |
| `community_id` | ForeignKey | Parent community |
| `creator_id` | ForeignKey | Post author |
| `title` | CharField | Post title |
| `body` | TextField | Post content (optional) |
| `image_url` | URLField | Post image (optional) |
| `vote_status` | IntegerField | Net vote count |
| `number_of_comments` | IntegerField | Comment count |
| `created_at` | DateTimeField | Creation timestamp |

### Comment

| Field | Type | Description |
|---|---|---|
| `id` | AutoField | Primary key |
| `post_id` | ForeignKey | Parent post |
| `creator_id` | ForeignKey | Comment author |
| `text` | TextField | Comment content |
| `created_at` | DateTimeField | Creation timestamp |

---

## Setup and Development

### 1. Install Dependencies

```bash
cd src/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment

Copy the example environment file and edit values:

```bash
cp .env.example .env
```

See [Environment Variables](#environment-variables) for all available settings.

### 3. Database Setup

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

### 4. Run Development Server

```bash
python manage.py runserver 8000
```

The API is available at `http://localhost:8000/api/`.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DJANGO_SECRET_KEY` | Yes | - | Django secret key for cryptographic signing |
| `DJANGO_DEBUG` | No | `True` | Enable debug mode |
| `DJANGO_ALLOWED_HOSTS` | No | `localhost,127.0.0.1` | Comma-separated allowed host headers |
| `DJANGO_CORS_ALLOWED_ORIGINS` | No | `http://localhost:3000` | Comma-separated CORS allowed origins |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | No | - | Comma-separated CSRF trusted origins |
| `DJANGO_SECURE` | No | `False` | Enable HTTPS security settings (HSTS, secure cookies) |
| `DJANGO_EMAIL_BACKEND` | No | console backend | Email backend class |
| `DATABASE_URL` | No | SQLite3 | Database connection string |
| `USE_S3` | No | `False` | Enable AWS S3 for static/media storage |
| `AWS_BUCKET_NAME` | If S3 | - | S3 bucket name |
| `AWS_S3_REGION_NAME` | If S3 | `us-east-1` | S3 bucket region |
| `AWS_S3_CUSTOM_DOMAIN` | If S3 | - | S3 custom domain for URL generation |
| `AWS_ACCESS_KEY_ID` | If S3 | - | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | If S3 | - | AWS secret key |

---

## Database Configuration

### Development (Default)

SQLite3, no configuration required:

```
DATABASE_URL=sqlite:///./db.sqlite3
```

### Production (AWS RDS)

PostgreSQL via connection string:

```
DATABASE_URL=postgresql://username:password@rds-endpoint:5432/dbname
```

The application automatically selects the database engine based on the `DATABASE_URL` scheme. Database connections are wrapped by `django-prometheus` for monitoring.

---

## Storage Configuration

### Development (Default)

Local filesystem storage at `staticfiles/` and `media/` directories.

### Production (AWS S3)

When `USE_S3=True`, the application uses custom storage backends:

| Backend | Path Prefix | Purpose |
|---|---|---|
| `StaticStorage` | `static/` | Collected static files (CSS, JS, images) |
| `MediaStorage` | `media/` | User-uploaded content |

Both backends configure public read access and `Cache-Control: max-age=86400` headers.

---

## Monitoring

- **Prometheus middleware**: `django-prometheus` wraps all HTTP requests and database queries
- **Metrics endpoint**: `GET /metrics` exposes Prometheus-format metrics
- **Health probes**:
  - `GET /health/readiness/` — Returns 200 if database is connected, 503 otherwise
  - `GET /health/liveness/` — Returns 200 if the application process is running

---

## Testing

### Run Tests

```bash
pytest --cov --cov-report=term-missing --cov-report=xml:coverage.xml
```

### Configuration

- **Framework**: pytest with `pytest-django`
- **Config file**: `pytest.ini` (sets `DJANGO_SETTINGS_MODULE` and test discovery paths)
- **Fixtures**: `conftest.py` provides `api_client`, `enable_db_access`, and overrides the database to use in-memory SQLite
- **Coverage**: Configured via `.coveragerc`, excludes migrations, tests, and config files

### Coverage Targets

The CI pipeline enforces coverage reporting. Coverage XML output is sent to SonarQube for quality gate evaluation.

---

## Docker

### Build

```bash
docker build -t reddit-backend:latest .
```

### Image Details

| Property | Value |
|---|---|
| Base Image | `python:3.12-slim` |
| Build | Multi-stage (builder + runtime) |
| Runtime User | `appuser` (non-root, UID 1000) |
| Port | `8000` |
| Server | `gunicorn reddit_api.wsgi:application -w 2 --timeout 300` |
| Static Files | Collected at build time via `collectstatic` |

### Run

```bash
docker run -p 8000:8000 --env-file .env reddit-backend:latest
```

---

## Admin Panel

Django admin is available at `/admin/` with superuser credentials. Provides management interfaces for all models (users, communities, posts, comments).