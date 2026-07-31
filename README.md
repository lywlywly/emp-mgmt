# Employee Management

pnpm workspace containing the React client, Express/tRPC API, and shared API
contracts.

## Packages

- `client` — Vite, React, TanStack Query, and the tRPC client.
- `backend` — Express, tRPC, MongoDB/Mongoose, file handling, and email.
- `packages/shared` — Zod request/response schemas and shared TypeScript types.

## Setup

Use Node.js 22 or newer and pnpm 10.33.4.

```sh
pnpm install
cp backend/.env.example backend/.env
```

Set `MONGODB_URI` and a secure `SESSION_SECRET` in `backend/.env`. The default
frontend URL is `http://localhost:5173`; update `FRONTEND_URL` if it differs.

## Run locally

Start the API and frontend in separate terminals:

```sh
pnpm dev:backend
```

```sh
pnpm dev:client
```

The Vite development server proxies `/trpc`, `/files`, and `/templates` to the
API at `http://localhost:4000`.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm build
```

`pnpm build` builds the shared package and backend declarations before the
client. The client imports the backend's `AppRouter` as a type only, so no API
server code is bundled for the browser.

To smoke-test the live onboarding API, set the test credentials expected by
the script and run:

```sh
pnpm --filter emp-mgmt-backend test:http
```
