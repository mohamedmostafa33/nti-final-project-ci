# Backend CI Pipeline Documentation

## Overview
This document describes the automated CI/CD pipeline for the backend application, implemented using GitHub Actions.

## Trigger Conditions
- **Manual Dispatch**: Can be triggered manually via workflow_dispatch with choice input `build-backend` (True/False)
- **Automatic**: Triggers when changes are detected in `src/backend/**` directory
- **Execution Condition**: Runs if backend changes detected OR manual trigger set to True

## Pipeline Stages

### 1. Detect Changes
**Purpose**: Determine if backend code has been modified

- Uses `dorny/paths-filter` to monitor `src/backend/**` directory
- Outputs `backend_changed` flag for conditional execution
- Skips subsequent jobs if no backend changes detected

### 2. Build and Test Backend
**Prerequisites**: Backend changes detected OR manual trigger

#### Environment Setup
- Python 3.12 installation
- Dependency installation from `requirements.txt`
- Environment configuration via `.env` file

#### Security Scanning - Dependencies
**OWASP Dependency Check**
- Scans `requirements.txt` for known vulnerabilities
- Enables retired vulnerability checks
- Fails pipeline on CVSS score >= 7
- Generates HTML report (not uploaded as artifact)

#### Application Testing
- Database migrations execution
- Pytest with coverage analysis (target: 95%)
- Coverage report generation (XML format)

#### Code Quality Analysis
**SonarQube Scan**
- Static code analysis for bugs, code smells, and security hotspots
- Coverage integration via `coverage.xml`
- Quality Gate enforcement

**Exclusions**:
- Test files and test utilities
- Database migrations
- Configuration files and documentation
- Build artifacts and cache directories

#### Static File Collection
- Django staticfiles collection for production deployment

#### Container Build
- Docker image build with commit SHA tagging
- Image naming: `backend-app:{COMMIT_SHA}` (no version prefix)

#### Security Scanning - Container
**Trivy Scan**
- Scans Docker image for vulnerabilities
- Checks both OS packages and application dependencies
- Fails on CRITICAL or HIGH severity issues
- Ignores unfixed vulnerabilities

#### Image Distribution
- AWS credentials configuration
- Amazon ECR authentication
- Push to AWS ECR repository: `{AWS_ECR_ACCOUNT_URL}/backend-app:{COMMIT_SHA}`

## Configuration Requirements

### GitHub Secrets
- `DJANGO_SECRET_KEY`: Django application secret key
- `SONAR_TOKEN`: SonarQube authentication token
- `SONAR_HOST_URL`: SonarQube server URL
- `AWS_ACCESS_KEY_ID`: AWS access key for ECR authentication
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `AWS_ECR_ACCOUNT_URL`: AWS ECR repository URL

### Environment Variables
- `USE_S3`: S3 storage flag (default: False)
- `AWS_REGION`: AWS region for ECR (default: us-east-1)

## Artifacts Generated
- OWASP Dependency Check HTML report (local, not uploaded)
- Coverage XML report (`coverage.xml`)
- SonarQube analysis metadata (`.scannerwork/report-task.txt`)
- Docker image in AWS ECR

## Failure Scenarios
Pipeline will fail if:
- OWASP finds vulnerabilities with CVSS >= 7
- Tests fail or coverage drops below threshold
- SonarQube Quality Gate fails
- Trivy detects CRITICAL or HIGH vulnerabilities in Docker image

## Pipeline Flow Summary
```
1. Detect Changes
   └─> If backend_changed OR manual trigger
       ├─> Setup Python 3.12
       ├─> Install Dependencies
       ├─> OWASP Dependency Check (Security)
       ├─> Create .env File
       ├─> Database Migrations
       ├─> Run Tests + Coverage
       ├─> SonarQube Analysis (Code Quality)
       ├─> SonarQube Quality Gate
       ├─> Collect Static Files
       ├─> Build Docker Image
       ├─> Trivy Scan (Container Security)
       ├─> Configure AWS Credentials
       ├─> ECR Login
       └─> Push to AWS ECR
```

## Maintenance Notes
- Update Python version in workflow if application requirements change
- Review and update OWASP CVSS threshold based on security policy
- Keep SonarQube exclusions aligned with project structure
- Monitor Trivy scan results for dependency updates
