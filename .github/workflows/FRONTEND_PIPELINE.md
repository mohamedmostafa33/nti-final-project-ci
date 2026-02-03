# Frontend CI Pipeline Documentation

## Overview
This document describes the automated CI/CD pipeline for the frontend application (Next.js), implemented using GitHub Actions.

## Trigger Conditions
- **Manual Dispatch**: Can be triggered manually via workflow_dispatch with choice input `build-frontend` (True/False)
- **Automatic**: Triggers when changes are detected in `src/frontend/**` directory
- **Execution Condition**: Runs if frontend changes detected OR manual trigger set to True

## Pipeline Stages

### 1. Detect Changes
**Purpose**: Determine if frontend code has been modified

- Uses `dorny/paths-filter` to monitor `src/frontend/**` directory
- Outputs `frontend_changed` flag for conditional execution
- Skips subsequent jobs if no frontend changes detected

### 2. Build and Test Frontend
**Prerequisites**: Frontend changes detected OR manual trigger

#### Environment Setup
- Node.js 18 installation
- NPM cache enabled for faster builds
- Dependency installation from `package-lock.json` with legacy peer deps

#### Security Scanning - Dependencies
**OWASP Dependency Check**
- Scans `package.json` for known vulnerabilities
- Enables retired vulnerability checks
- Fails pipeline on CVSS score >= 7
- Generates HTML report (not uploaded as artifact)

#### Environment Configuration
- Creates `.env.local` file with `NEXT_PUBLIC_API_URL` secret
- Required for build-time environment variable injection

#### Code Quality Checks
**ESLint**
- Lints TypeScript/TSX files (`.ts`, `.tsx` extensions)
- Configured to fail on any warnings (`--max-warnings 0`)
- Non-blocking: Continues pipeline even if linting fails (`|| true`)

**TypeScript Type Check**
- Validates TypeScript types without emitting files (`--noEmit`)
- Blocking: Pipeline fails if type errors detected

#### Application Build
**Next.js Production Build**
- Builds static and server-side rendered pages
- Disables Next.js telemetry (`NEXT_TELEMETRY_DISABLED=1`)
- Generates `.next` directory with optimized production bundles

#### Code Quality Analysis
**SonarQube Scan**
- Static code analysis for bugs, code smells, and security hotspots
- Coverage integration via `coverage/lcov.info`
- Quality Gate enforcement

**Exclusions**:
- Test files (`*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`)
- Node modules and build artifacts
- Configuration files
- Public assets and output directories

#### Container Build
- Docker image build with commit SHA tagging
- Image naming: `reddit-frontend:{COMMIT_SHA}`
- Multi-stage build for optimized image size

#### Security Scanning - Container
**Trivy Scan**
- Scans Docker image for vulnerabilities
- Checks Alpine OS packages and Node.js dependencies
- Fails on CRITICAL or HIGH severity issues
- Ignores unfixed vulnerabilities
- Uses `.trivyignore` file for accepted risk exceptions

**Current Ignored Vulnerabilities**:
- CVE-2025-64756 (glob) - npm CLI dependency
- CVE-2026-23745/23950/24842 (tar) - npm CLI dependency
- CVE-2024-21538 (cross-spawn) - Build-time only
- GHSA-h25m-26qc-wcjf (Next.js DoS) - Requires PPR feature enabled

#### Image Distribution
- AWS credentials configuration
- Amazon ECR authentication
- Image tagging for ECR: `{AWS_ECR_ACCOUNT_URL}/reddit-frontend:{COMMIT_SHA}`
- Push to AWS ECR repository

## Configuration Requirements

### GitHub Secrets
- `NEXT_PUBLIC_API_URL`: Backend API endpoint URL
- `SONAR_TOKEN`: SonarQube authentication token
- `SONAR_HOST_URL`: SonarQube server URL
- `AWS_ACCESS_KEY_ID`: AWS access key for ECR authentication
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `AWS_ECR_ACCOUNT_URL`: AWS ECR repository URL

### Environment Variables
- `NEXT_TELEMETRY_DISABLED`: Disables Next.js anonymous telemetry (default: 1)
- `AWS_REGION`: AWS region for ECR (default: us-east-1)

## Technology Stack
- **Framework**: Next.js 14.2.35
- **Runtime**: Node.js 18
- **Language**: TypeScript 5.3.3
- **Package Manager**: NPM with legacy peer dependencies support
- **Base Image**: node:18-alpine3.21

## Artifacts Generated
- OWASP Dependency Check HTML report (local, not uploaded)
- Next.js production build (`.next` directory)
- SonarQube analysis metadata (`.scannerwork/report-task.txt`)
- Docker image in AWS ECR

## Failure Scenarios
Pipeline will fail if:
- OWASP finds vulnerabilities with CVSS >= 7
- TypeScript type check fails
- Next.js build fails
- SonarQube Quality Gate fails
- Trivy detects CRITICAL or HIGH vulnerabilities (excluding ignored CVEs)
- ECR push fails

## Pipeline Flow Summary
```
1. Detect Changes
   └─> If frontend_changed OR manual trigger
       ├─> Setup Node.js 18
       ├─> Install Dependencies (npm ci)
       ├─> OWASP Dependency Check (Security)
       ├─> Create .env.local File
       ├─> Run ESLint (Non-blocking)
       ├─> TypeScript Type Check (Blocking)
       ├─> Build Next.js Application
       ├─> SonarQube Analysis (Code Quality)
       ├─> SonarQube Quality Gate
       ├─> Build Docker Image
       ├─> Trivy Scan (Container Security)
       ├─> Configure AWS Credentials
       ├─> ECR Login
       ├─> Tag Docker Image
       └─> Push to AWS ECR
```

## Maintenance Notes
- Update Node.js version in workflow if Next.js requirements change
- Review `.trivyignore` file quarterly and remove entries when fixes available
- Next.js 15.x upgrade pending: Current version causes infinite reload loops
- Monitor OWASP CVSS threshold based on security policy
- Keep SonarQube exclusions aligned with project structure
- ESLint is non-blocking to allow pipeline continuation during development

## Known Issues
- Next.js 15.x compatibility: Upgrade blocked due to infinite reload issue
- Accepted security risks documented in `src/frontend/.trivyignore`
- ESLint failures do not block pipeline (`|| true` flag)
