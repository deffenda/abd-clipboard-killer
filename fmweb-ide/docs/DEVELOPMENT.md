# Development Setup

## Prerequisites

- Node.js 20+
- pnpm 10+

## Install

```bash
cd fmweb-ide
pnpm install
```

## Environment (connector)

Create `apps/connector/.env.local` (or root `.env.local`) as needed:

```bash
FM_HOST=https://your-filemaker-host
FM_FILE=YourDatabase
FM_USERNAME=your_user
FM_PASSWORD=your_password
FM_VERIFY_TLS=true
MANIFEST_SIGNING_SECRET=change-me
```

If `FM_*` vars are omitted, connector runs in mock data mode.

Optional runtime/ide connector target:

```bash
NEXT_PUBLIC_CONNECTOR_URL=http://localhost:3002
CONNECTOR_URL=http://localhost:3002
```

Optional dev port overrides (if 3000/3001/3002 are in use):

```bash
IDE_WEB_PORT=3000
RUNTIME_WEB_PORT=3001
CONNECTOR_PORT=3002
```

## Run all apps

```bash
pnpm dev
```

Default URLs:

- IDE: `http://localhost:3000`
- Runtime: `http://localhost:3001`
- Connector: `http://localhost:3002`

## Key endpoints

- Connector health/version: `/api/health`, `/api/version`
- FileMaker internal API: `/api/fm/*`
- Runtime auth: `/api/auth/login`, `/api/auth/logout`
- Publish API: `/api/publish`, `/api/publish/latest`, `/api/publish/versions?admin=1`

## Quality checks

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Useful local flow

1. Open IDE and generate or edit a project.
2. Connect data (mock or live FileMaker).
3. Run pre-publish checks and publish from IDE.
4. Open Runtime and test list/detail/portal pages.
