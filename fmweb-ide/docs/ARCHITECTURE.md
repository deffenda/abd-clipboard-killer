# FMWeb IDE Architecture

## Monorepo structure

- `apps/ide-web`: visual builder (project system, responsive canvas, layers, inspector, actions, data browser, wizard/templates, publish flow).
- `apps/runtime-web`: end-user runtime (auth, signed-manifest loader, list/detail/portal screens, action execution).
- `apps/connector`: server-side gateway for FileMaker Data API, session/auth, publish/version artifacts, caching and metrics.
- `packages/shared`: strict TypeScript domain model (manifest schemas, migrations, checks, responsive helpers, API schemas).
- `packages/ui`: shared primitives (`Text`, `Heading`, `Button`, `Input`, `Select`, `Card`, `Container`) reused by IDE and Runtime.

## Security boundary

FileMaker credentials and tokens stay server-side in `apps/connector`.

- Browser clients call connector internal APIs only.
- Connector stores session cookie (`httpOnly`) and in-memory token cache with TTL.
- `/api/fm/*` routes require authenticated session.
- Runtime manifest loading validates connector-signed artifacts before rendering.

## Connector internals

- `FileMakerClient`: login/logout, layouts/fields, CRUD, `_find`, `_script`, retry/backoff, auto re-login on 401.
- Rate limiting: token bucket per IP.
- Correlation IDs: forwarded in headers and response envelope.
- Caching: TTL for layouts/fields and short TTL for find queries.
- Metrics: in-process counters/latency (`/api/metrics`).

If FileMaker env vars are missing, connector uses a mock in-memory store for local development.

## Manifest and publishing

- Manifest is zod-validated (`schemaVersion`, screens, breakpoints, theme tokens, bindings/actions/events).
- Migration mechanism supports older manifests (`manifest.migrations.ts`).
- IDE pre-publish checks block errors and warn on risky configs.
- Publish artifacts are versioned (`vX.Y.Z`), signed (HMAC), and stored on local filesystem.
- Runtime fetches latest or selected version (admin mode) and verifies signature.

## Runtime flow

1. Runtime requests `/api/runtime/manifest`.
2. Runtime API pulls artifact from connector and verifies signature.
3. Runtime renders list/detail views from manifest.
4. Data operations proxy through `/api/runtime/fm/*` to connector.
5. Session failures return 401; runtime redirects users to `/login`.
