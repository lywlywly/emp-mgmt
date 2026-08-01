---
marp: true
theme: default
paginate: true
---

# Employee Management

## Full-stack architecture

React client · Express/tRPC API · MongoDB · shared contracts

---

# Workspace

## pnpm monorepo

```text
emp-mgmt/
├── client/             React single-page application
├── backend/            Express + tRPC API
└── packages/shared/    Zod schemas and TypeScript DTOs
```

pnpm manages one install, build, type-check, and lint workflow across all packages.

---

# Application features

## Employee

Invitation registration, onboarding, profile editing, document previews, and sequential OPT status.

## HR

Invitations, onboarding review, employee directory, profile viewing, OPT document review, and reminders.

---

# Backend

## `backend/`

- Express + tRPC routers
- MongoDB + Mongoose models
- `express-session` HTTP-only cookie sessions
- bcrypt password hashing and verification
- Multer image/PDF uploads with a 10 MB limit
- Uploaded file bytes are stored on the server; MongoDB stores their metadata and IDs
- Nodemailer invitation and reminder emails

---

# Backend: file structure

```text
backend/src/
├── trpc/           router, context, guards, procedures
├── models/         Mongoose MongoDB models
├── routes/         plain Express file endpoints
├── middleware/     session and route authorization
├── services/       email delivery
└── app.ts          Express composition
```

---

# Backend: data model

MongoDB collections modeled with Mongoose:

```text
User ── 1:1 ── EmployeeProfile
  │
  ├── 1:1 ── OnboardingApplication
  ├── 1:1 ── OptWorkflow
  └── 1:N ── FileMetadata
```

- `EmployeeProfile` and `OnboardingApplication` embed employee data as value objects.
- Document entries reference `FileMetadata` IDs rather than storing file bytes in MongoDB.
- `Invitation` exists before a `User` account is created.

---

# Backend: two route families

```text
tRPC: /trpc/*
  session cookie → tRPC context → protectedProcedure / hrProcedure
  typed procedures for auth, onboarding, profile, HR, invitations, and OPT

Files: /files/*
  session cookie → requireAuth → Multer / file handler
  upload, preview, and download routes
```

`/trpc/auth.login` and `/trpc/auth.register` set the session cookie used by both pipelines.

---

# Shared package

## `packages/shared/`

Zod schemas define the API contract once:

```ts
onboardingSubmitInputSchema  // request
onboardingApplicationSchema  // response DTO
sessionUserSchema            // authenticated session
uploadedFileSchema           // persisted file metadata
```

Backend validates requests and responses at runtime.
Frontend reuses shared field rules in React Hook Form and infers matching TypeScript types.

---

# Frontend

## `client/`

- Vite + React + TypeScript
- React Router
- TanStack Query + tRPC client
- React Hook Form + Zod
- Tailwind CSS + shadcn/Base UI

Owns routes, cached server state, in-progress form state, local previews, and image cropping.

TanStack Query caches tRPC server data and refreshes affected views after mutations.

---

# Frontend: TanStack Query cache

| Query | Freshness | Update strategy |
| --- | --- | --- |
| `auth.me` | fresh indefinitely | set/invalidate after login, registration, and logout |
| Other tRPC queries | stale immediately | refetch on mount, focus, reconnect, or invalidation |

- Inactive query results remain cached for 5 minutes.
- Regular stale queries automatically refetch on component mount and window focus.
- Mutation success invalidates affected query keys; active screens refetch immediately.

---

# Frontend: file structure

```text
client/src/
├── pages/          route-level screens
├── features/       onboarding, HR, and profile UI
├── components/     shadcn/Base UI primitives
├── layouts/        shared application shell
├── lib/            tRPC client and browser helpers
└── router.tsx      role-aware route tree
```

---

# Frontend: forms

- React Hook Form keeps the in-progress draft in browser memory.
- Zod validates fields and each onboarding step.
- Shared schemas supply domain rules; the client adds browser-only `File` and preview state.

---

# Frontend: file submission

```text
Submit application
  → validate form
  → POST /files with FormData
  → receive file IDs
  → tRPC onboarding.submit
```

Local `File` objects and blob preview URLs stay in the browser; only file metadata and IDs cross tRPC.

---

# End-to-end data flow

```text
React component
  → TanStack Query + tRPC client
  → Vite proxy (/trpc, /files)
  → Express + tRPC / file routes
  → Mongoose
  → MongoDB
```

The browser imports `AppRouter` as a type only, so backend runtime code is never bundled into the client.

---

# Key design

- **Shared contracts:** Zod keeps request and response shapes aligned.
- **Server authority:** role checks, ownership, workflow order, and file limits are enforced by the backend.
- **Browser-only state:** selected `File` objects and blob URLs never enter MongoDB.
- **Cached UI:** TanStack Query refreshes affected views after mutations.

---

# Questions?
