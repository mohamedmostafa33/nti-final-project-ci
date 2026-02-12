# Frontend CI Pipeline

## Overview

Automated CI pipeline for the Next.js frontend application, implemented in GitHub Actions. The pipeline runs dependency scanning, linting, type checking, building, code quality analysis, container building, and deploys the image to AWS ECR. On success, it updates Helm values in the CD repository to trigger GitOps deployment via ArgoCD.

**Workflow file:** `frontend-ci.yml`

---

## Trigger Conditions

| Trigger | Mechanism | Description |
|---|---|---|
| Manual | `workflow_dispatch` | Choice input `build-frontend` (True/False) |
| Automatic | `dorny/paths-filter` | Detects changes in `src/frontend/**` |
| Execution | Conditional | Runs if frontend changes detected OR manual trigger set to True |

---

## Pipeline Stages

### 1. Detect Changes

- Checks out the repository with full git history (`fetch-depth: 0`)
- Uses `dorny/paths-filter@v3` to monitor `src/frontend/**`
- Outputs `frontend_changed` flag to control downstream job execution

### 2. Build and Test Frontend

Runs when `frontend_changed == true` OR `build-frontend == True`.

#### 2.1 Environment Setup

- Installs Node.js 18 via `actions/setup-node@v4`
- Enables npm cache with dependency path `./src/frontend/package-lock.json`
- Installs dependencies with `npm ci --legacy-peer-deps`

The `--legacy-peer-deps` flag is required due to peer dependency conflicts between Chakra UI packages and React 18.

#### 2.2 OWASP Dependency Check

| Property | Value |
|---|---|
| Tool | `dependency-check/Dependency-Check_Action@main` |
| Project Name | `nti-final-project-frontend` |
| Scan Target | `./src/frontend/package.json` |
| Output Format | HTML |
| Retired Checks | Enabled |
| Fail Threshold | CVSS >= 7 |

Scans npm packages for known CVEs. The HTML report is generated locally but not uploaded as an artifact.

#### 2.3 Environment Configuration

Creates `.env.local` with `NEXT_PUBLIC_API_URL` from `secrets.NEXT_PUBLIC_API_URL`. This variable is required at build time for Next.js public environment variable injection.

#### 2.4 ESLint

| Property | Value |
|---|---|
| Command | `npx eslint . --ext .ts,.tsx --max-warnings 0` |
| Extensions | `.ts`, `.tsx` |
| Max Warnings | 0 |
| Blocking | No (`\|\| true` — pipeline continues on failure) |

ESLint is non-blocking to allow pipeline continuation during active development. Warnings are logged but do not fail the build.

#### 2.5 TypeScript Type Check

| Property | Value |
|---|---|
| Command | `npx tsc --noEmit` |
| Blocking | Yes (pipeline fails on type errors) |

Validates TypeScript types without emitting compiled JavaScript files.

#### 2.6 Next.js Production Build

| Property | Value |
|---|---|
| Command | `npm run build` |
| Telemetry | Disabled (`NEXT_TELEMETRY_DISABLED=1`) |
| Output | `.next` directory with standalone build |
| Blocking | Yes (pipeline fails on build errors) |

Builds the Next.js application in production mode with standalone output configured in `next.config.js`.

#### 2.7 SonarQube Analysis

| Property | Value |
|---|---|
| Action | `SonarSource/sonarqube-scan-action@v6` |
| Project Key | `nti-final-project-frontend` |
| Project Name | `NTI Final Project - Frontend` |
| Sources | `src` |
| Coverage Report | `coverage/lcov.info` |

**Exclusions:**

- `**/*.test.ts`, `**/*.test.tsx`, `**/*.spec.ts`, `**/*.spec.tsx` — Test files
- `**/node_modules/**` — Third-party dependencies
- `**/.next/**` — Build output
- `**/public/**`, `**/out/**` — Static assets
- `**/*.config.js`, `**/*.config.ts` — Configuration files

#### 2.8 SonarQube Quality Gate

Uses `SonarSource/sonarqube-quality-gate-action@v1` to enforce the quality gate. Reads scan metadata from `src/frontend/.scannerwork/report-task.txt`. Pipeline fails if the quality gate condition is not met.

#### 2.9 Docker Image Build

| Property | Value |
|---|---|
| Working Directory | `./src/frontend` |
| Tag Format | `reddit-frontend:{COMMIT_SHA}` |
| SHA Source | `git rev-parse --short HEAD` |
| Build Arg | `NEXT_PUBLIC_API_URL` (injected from secrets) |

Builds a 3-stage Docker image:

| Stage | Base Image | Purpose |
|---|---|---|
| `deps` | `node:18-alpine3.21` | Install node_modules |
| `builder` | `node:18-alpine3.21` | Build Next.js application |
| `runner` | `node:18-alpine3.21` | Minimal runtime with standalone output |

#### 2.10 Trivy Container Scan

| Property | Value |
|---|---|
| Action | `aquasecurity/trivy-action@master` |
| Image Ref | `reddit-frontend:{COMMIT_SHA}` |
| Output Format | Table |
| Exit Code | `1` (fails on findings) |
| Severity | `CRITICAL,HIGH` |
| Ignore Unfixed | `true` |
| Ignore File | `src/frontend/.trivyignore` |

**Currently Ignored Vulnerabilities:**

| CVE / Advisory | Package | Reason |
|---|---|---|
| CVE-2025-64756 | glob (npm CLI) | npm internal dependency, not used at runtime |
| CVE-2026-23745 | tar (npm CLI) | npm internal dependency, not used at runtime |
| CVE-2026-23950 | tar (npm CLI) | npm internal dependency, not used at runtime |
| CVE-2026-24842 | tar (npm CLI) | npm internal dependency, not used at runtime |
| CVE-2024-21538 | cross-spawn | Build-time dependency only, not in runtime image |
| GHSA-h25m-26qc-wcjf | Next.js | DoS vulnerability requires PPR (Partial Pre-Rendering) feature, which is not enabled |
| CVE-2026-25639 | axios | Addressed in application-level request handling |

#### 2.11 AWS ECR Push

1. Configures AWS credentials via `aws-actions/configure-aws-credentials@v2`
2. Authenticates to ECR via `aws ecr get-login-password`
3. Tags image: `{AWS_ECR_ACCOUNT_URL}/reddit-frontend:{COMMIT_SHA}`
4. Pushes to ECR

#### 2.12 Update Helm Values in CD Repository

| Property | Value |
|---|---|
| Tool | `yq` (Mike Farah's YAML processor) |
| Target File | `helm-charts/frontend/values.yaml` |
| Target Key | `.deployment.image` |
| New Value | `{AWS_ECR_ACCOUNT_URL}/reddit-frontend:{COMMIT_SHA}` |
| Commit Message | `chore(frontend): update image tag to {COMMIT_SHA}` |
| Branch | `main` |

Steps:

1. Clones the CD repository using `CD_REPO_TOKEN` for authentication
2. Installs `yq` for YAML manipulation
3. Updates `deployment.image` in `helm-charts/frontend/values.yaml`
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
| `AWS_REGION` | Workflow | `us-east-1` | AWS region for ECR operations |

---

## Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL (build-time injection) |
| `SONAR_TOKEN` | SonarQube authentication token |
| `SONAR_HOST_URL` | SonarQube server URL |
| `AWS_ACCESS_KEY_ID` | AWS credentials for ECR |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials for ECR |
| `AWS_ECR_ACCOUNT_URL` | ECR registry URL (e.g., `123456789.dkr.ecr.us-east-1.amazonaws.com`) |
| `CD_REPO_TOKEN` | GitHub PAT for pushing to CD repository |
| `CD_REPO_URL` | CD repository path (e.g., `org/nti-final-project-cd`) |
| `N8N_WEBHOOK_URL` | n8n webhook URL for pipeline notifications |

---

## Artifacts Generated

| Artifact | Location | Uploaded |
|---|---|---|
| OWASP Dependency Check report | Local HTML | No |
| Next.js production build | `.next` directory | No |
| SonarQube scan metadata | `.scannerwork/report-task.txt` | No |
| Docker image | AWS ECR | Yes |
| Helm values update | CD repository | Yes (git push) |

---

## Failure Scenarios

The pipeline fails if:

| Condition | Stage |
|---|---|
| OWASP finds vulnerabilities with CVSS >= 7 | Dependency Check |
| TypeScript type check errors | Type Check |
| Next.js build fails | Application Build |
| SonarQube Quality Gate is not passed | Code Quality |
| Trivy detects CRITICAL or HIGH vulnerabilities | Container Scan |
| ECR authentication or push fails | Image Distribution |
| CD repository update fails | Helm Update |

Note: ESLint failures do NOT fail the pipeline (non-blocking with `|| true`).

---

## Pipeline Flow

```
Detect Changes
└── If frontend_changed OR manual trigger
    ├── Setup Node.js 18
    ├── Install Dependencies (npm ci --legacy-peer-deps)
    ├── OWASP Dependency Check
    ├── Create .env.local File
    ├── ESLint (non-blocking)
    ├── TypeScript Type Check
    ├── Build Next.js Application
    ├── SonarQube Analysis
    ├── SonarQube Quality Gate
    ├── Build Docker Image (reddit-frontend:{SHA})
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

- Update Node.js version in workflow if Next.js requirements change
- Review `.trivyignore` entries quarterly and remove when fixes are available
- Next.js 15.x upgrade is blocked due to an infinite reload loop issue
- Keep SonarQube exclusions aligned with project directory structure
- Monitor OWASP CVSS threshold based on organizational security policy
- ESLint is intentionally non-blocking — reconsider when codebase lint compliance improves
- Review n8n webhook payload format if notification requirements change

---

## Known Issues

| Issue | Impact | Status |
|---|---|---|
| Next.js 15.x upgrade | Infinite reload loop in browser | Blocked — staying on 14.2.35 |
| ESLint non-blocking | Lint warnings do not fail the pipeline | Intentional |
| `--legacy-peer-deps` | Required for Chakra UI peer dependency conflicts | Ongoing |
| Accepted Trivy CVEs | 7 vulnerabilities in `.trivyignore` | Reviewed quarterly |