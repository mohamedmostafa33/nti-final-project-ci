# Reddit Clone — Next.js Frontend

Next.js 14 application providing the Reddit Clone user interface. Built with Chakra UI for styling, Recoil for state management, and Axios for API communication with the Django backend.

---

## Table of Contents

- [Technology Stack](#technology-stack)
- [Application Structure](#application-structure)
- [Pages](#pages)
- [State Management](#state-management)
- [API Client](#api-client)
- [Components](#components)
- [Security Headers](#security-headers)
- [Setup and Development](#setup-and-development)
- [Environment Variables](#environment-variables)
- [Docker](#docker)
- [Build Configuration](#build-configuration)

---

## Technology Stack

| Component | Technology | Version |
|---|---|---|
| Framework | Next.js | 14.2.35 |
| UI Library | Chakra UI | 2.8.2 |
| State Management | Recoil | 0.7.7 |
| HTTP Client | Axios | 1.13.4 |
| Animation | Framer Motion | 10.18.0 |
| Icons | React Icons | 5.0.1 |
| Date Formatting | Moment.js | 2.30.1 |
| Language | TypeScript | 5.3.3 |
| Linter | ESLint | 8.56.0 |
| Runtime | Node.js | 18 |

---

## Application Structure

```
src/frontend/
├── Dockerfile                 # 3-stage Docker build
├── package.json               # Dependencies and scripts
├── next.config.js             # Next.js configuration
├── tsconfig.json              # TypeScript configuration
├── .trivyignore               # Accepted container vulnerabilities
└── src/
    ├── api/                   # Axios HTTP client configuration
    ├── atoms/                 # Recoil state atoms
    │   ├── authModalAtom.ts   # Authentication modal state
    │   ├── communitiesAtom.ts # Community data and memberships
    │   ├── directoryMenuAtom.ts # Sidebar navigation state
    │   ├── postsAtom.ts       # Post list, selection, and votes
    │   └── userAtom.ts        # Authenticated user state
    ├── chakra/                # Chakra UI theme configuration
    ├── components/            # React components
    ├── hooks/                 # Custom React hooks
    ├── pages/                 # Next.js page routes
    │   ├── _app.tsx           # Application wrapper (providers)
    │   ├── _document.tsx      # Custom HTML document
    │   ├── index.tsx          # Home page
    │   └── r/                 # Community pages (/r/<community>)
    ├── styles/                # Global CSS styles
    └── types/                 # TypeScript type definitions
```

---

## Pages

| Route | File | Description |
|---|---|---|
| `/` | `pages/index.tsx` | Home page with post feed |
| `/r/<community>` | `pages/r/[communityId]/` | Community page with posts |
| `/r/<community>/submit` | `pages/r/[communityId]/submit.tsx` | Create post in community |
| `/r/<community>/comments/<id>` | `pages/r/[communityId]/comments/[pid].tsx` | Post detail with comments |

---

## State Management

The application uses Recoil for global state management with the following atoms:

| Atom | File | Purpose |
|---|---|---|
| `authModalState` | `authModalAtom.ts` | Controls login/register modal visibility and active view |
| `communityState` | `communitiesAtom.ts` | Stores current community, user community snippets |
| `postState` | `postsAtom.ts` | Manages post list, selected post, and vote data |
| `userState` | `userAtom.ts` | Stores authenticated user information and tokens |
| `directoryMenuState` | `directoryMenuAtom.ts` | Controls sidebar directory menu open/close state |

---

## API Client

The `src/api/` directory configures an Axios instance for communication with the Django REST backend:

- Base URL is set via the `NEXT_PUBLIC_API_URL` environment variable
- JWT tokens are attached to requests via interceptors
- Token refresh is handled automatically on 401 responses

---

## Components

Key component groups:

| Directory | Purpose |
|---|---|
| `components/Layout/` | Page layout, navbar, sidebar |
| `components/Modal/` | Authentication modals (login, register) |
| `components/Community/` | Community header, about section, creation modal |
| `components/Posts/` | Post item, post form, post feed, voting |
| `components/Comments/` | Comment list, comment input, comment item |

---

## Security Headers

Configured in `next.config.js` and applied to all routes:

| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `DENY` | Prevents clickjacking via iframe embedding |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer information in requests |
| `Cache-Control` | `public, max-age=3600, must-revalidate` | Browser caching policy (1 hour) |

Additional image security in `next.config.js`:

| Setting | Value | Purpose |
|---|---|---|
| `dangerouslyAllowSVG` | `false` | Blocks SVG processing to prevent XSS |
| `contentDispositionType` | `attachment` | Forces download instead of inline rendering |
| `minimumCacheTTL` | `60` | Minimum image cache time in seconds |

---

## Setup and Development

### 1. Install Dependencies

```bash
cd src/frontend
npm ci --legacy-peer-deps
```

The `--legacy-peer-deps` flag is required due to peer dependency conflicts between Chakra UI and React 18.

### 2. Configure Environment

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

### 3. Run Development Server

```bash
npm run dev
```

The application is available at `http://localhost:3000`.

### 4. Production Build

```bash
npm run build
npm start
```

### Available Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `next dev` | Start development server with hot reload |
| `build` | `next build` | Create optimized production build |
| `start` | `next start -p 3000` | Start production server on port 3000 |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL (e.g., `https://api.yourdomain.com`) |

This variable is injected at build time (not runtime) via the Next.js public environment variable convention. In Docker, it is passed as a `--build-arg`.

---

## Docker

### Build

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com -t reddit-frontend:latest .
```

### Image Details

| Property | Value |
|---|---|
| Base Image | `node:18-alpine3.21` |
| Build | 3-stage (deps, builder, runner) |
| Runtime User | `nextjs` (non-root, UID 1001) |
| Port | `3000` |
| Server | `node server.js` (Next.js standalone) |
| Output Mode | Standalone (self-contained `server.js` with all dependencies) |

### Build Stages

| Stage | Purpose |
|---|---|
| `deps` | Install `node_modules` with `npm ci --legacy-peer-deps` |
| `builder` | Copy modules from deps stage, build Next.js application |
| `runner` | Minimal Alpine image with standalone output, static assets, and public directory |

### Security Hardening

- All stages upgrade OpenSSL to fix known CVEs (CVE-2025-15467, CVE-2025-69419, CVE-2025-69421)
- Runtime container uses non-root user (`nextjs:nodejs`, UID/GID 1001)
- `libc6-compat` installed for Alpine compatibility
- Telemetry disabled via `NEXT_TELEMETRY_DISABLED=1`

### Run

```bash
docker run -p 3000:3000 reddit-frontend:latest
```

---

## Build Configuration

### Next.js (`next.config.js`)

| Setting | Value | Purpose |
|---|---|---|
| `reactStrictMode` | `true` | Enables React strict mode for development warnings |
| `output` | `standalone` | Generates self-contained build for Docker deployment |

### TypeScript (`tsconfig.json`)

- Strict mode enabled
- Target: ES2017
- Module resolution: Bundler
- Path alias: `@/*` maps to `./src/*`

### Known Issues

- Next.js 15.x upgrade blocked due to infinite reload loop issue
- ESLint warnings exist but are non-blocking in the CI pipeline (`|| true`)
- `--legacy-peer-deps` required for `npm ci` due to Chakra UI peer dependency conflicts