# To-Do List App — Design Spec

- **Date:** 2026-06-05
- **Status:** Approved (design); pending implementation plan
- **Author:** nk@rootlex.com (with Claude Code)

## 1. Goal

An **iOS-first** to-do list app built with Expo, featuring:

1. **Self-hosted over-the-air (OTA) updates** — top priority. No EAS/paid OTA. The
   app pulls JS/asset updates from our own Bun server using the Expo Updates
   protocol, with code signing.
2. **Local + cloud sync** — offline-first local store that syncs to a backend so
   todos follow the user across devices.
3. **Core to-do scope** — add / edit / complete / delete, due dates, sort &
   filter (all / active / done), persistent storage.

Everything matches the conventions already used in `/home/nithin/pro/iac`:

- **Mobile** mirrors `iac-ccs-parent-mobile`: Expo SDK 54, expo-router,
  expo-updates, NativeWind 4, Zustand, Zod, react-hook-form,
  lucide-react-native, TypeScript strict + path aliases, `app.config.ts` with
  `APP_ENV` env loading and `extra` forwarding.
- **Backend** mirrors `iac-ccs-backend`: Bun + Elysia + Prisma + PostgreSQL +
  Zod + Pino + ulid, layered `routes/ → services/ → repos/`, docker-compose for
  Postgres.

**Runtime:** Bun is the package manager + script runner for both apps. The
backend runs *on* Bun natively (`bun run src/index.ts`). The mobile app uses Bun
for installs/scripts; Metro/Expo handles bundling.

## 2. Non-Goals (v1)

- Categories/tags, reminders/local-notifications, search (deferred — "core" scope).
- Real-time multi-device push sync (we use pull-on-launch + push-on-change, not
  websockets).
- Android as a first-class target. Android `eas.json` profiles are kept for
  later, but iOS is the priority and the only platform we verify in v1.
- App Store / TestFlight distribution. (Requires a paid Apple Developer account —
  Apple's gate, out of scope. Dev runs on simulator + personal device.)

## 3. Repo Layout (monorepo, non-hoisted)

```
to-do-list-app/
  apps/
    mobile/    # Expo SDK 54 app — expo-updates points at our server
    server/    # Bun + Elysia + Prisma + Postgres (sync API + OTA server)
  docs/superpowers/specs/2026-06-05-todo-app-design.md
  README.md
```

Each app installs **independently** (its own `bun.lock` / `node_modules`), the
same way iac keeps its sub-projects separate. This avoids Metro/Expo
workspace-hoisting issues. It is one folder/repo but **not** a hoisted Bun
workspace.

## 4. Backend (`apps/server`)

Mirrors `iac-ccs-backend` structure and naming.

### 4.1 Stack

- Bun + **Elysia** (`@elysiajs/cors`, `@elysiajs/swagger`, `@elysiajs/jwt`)
- **Prisma 7** + **PostgreSQL** (via `@prisma/adapter-pg`)
- **Zod** (request validation), **Pino** (logging), **ulid** (IDs)
- Dev: `bun run --env-file=env/.env.local --watch src/index.ts`
- `docker-compose.yml` for local Postgres

### 4.2 Structure

```
apps/server/
  src/
    index.ts                  # bootstrap + graceful shutdown (mirrors iac)
    app.ts                    # Elysia app: plugins + route mounting
    config/configs.ts         # env-driven config object
    adapters/database.ts      # prisma client
    common/
      logger.ts               # pino
      middleware/auth.ts      # JWT guard
    routes/
      health.routes.ts
      auth.routes.ts
      todo.routes.ts
      updates.routes.ts       # Expo Updates protocol endpoints
    services/
      auth.service.ts
      todo.service.ts
      updates.service.ts
    repos/
      user.repo.ts
      todo.repo.ts
      update.repo.ts
  prisma/schema.prisma
  env/.env.local
  docker-compose.yml
  Dockerfile
  package.json  tsconfig.json  eslint.config.js
```

### 4.3 Data model (Prisma)

```prisma
model User {
  id           String   @id            // ulid
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  todos        Todo[]
}

model Todo {
  id          String    @id            // ulid (client-generatable for offline create)
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  title       String
  notes       String?
  dueAt       DateTime?
  completed   Boolean   @default(false)
  completedAt DateTime?
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt      // drives last-write-wins
  deletedAt   DateTime?                 // soft delete for sync
  @@index([userId, updatedAt])
}

model Update {
  id              String   @id          // ulid (our row id)
  updateId        String                // uuid expo-updates expects in manifest
  runtimeVersion  String
  platform        String                // "ios" | "android"
  channel         String   @default("production")
  storagePath     String                // dir under updates/ holding bundle+assets
  manifestJson    Json                  // precomputed manifest body
  commitHash      String?
  createdAt       DateTime @default(now())
  @@index([runtimeVersion, platform, channel, createdAt])
}
```

### 4.4 Auth

- `POST /auth/register` `{ email, password }` → creates user, returns JWT.
- `POST /auth/login` `{ email, password }` → returns JWT.
- `GET /auth/me` (JWT) → current user.
- Password hashing via **`Bun.password.hash` / `Bun.password.verify`** (argon2id,
  built into Bun — no extra dependency).
- JWT via `@elysiajs/jwt`; access token stored client-side in SecureStore.

### 4.5 Sync API

Offline-first reconciliation, last-write-wins by `updatedAt`, soft-delete for
propagating deletes.

- `POST /todos/sync` (JWT)
  - Request: `{ lastSyncAt: string | null, changes: TodoChange[] }`
  - For each client change: upsert if client `updatedAt` ≥ server `updatedAt`.
  - Response: `{ serverTime, changes: Todo[] }` — all server todos with
    `updatedAt > lastSyncAt` (including soft-deleted rows so deletes propagate).
- Plain REST also exposed for convenience/testing:
  `GET /todos`, `POST /todos`, `PATCH /todos/:id`, `DELETE /todos/:id`.

### 4.6 OTA update server (priority)

Implements the **Expo Updates protocol**, modeled on Expo's open-source
[`custom-expo-updates-server`](https://github.com/expo/custom-expo-updates-server).

Endpoints:

- `GET /api/manifest`
  - Headers/query: `expo-platform` (ios), `expo-runtime-version`,
    `expo-channel-name`, `expo-protocol-version`.
  - Returns a **multipart** response: the `manifest` part (JSON: id, createdAt,
    runtimeVersion, launchAsset, assets[], metadata, extra) plus a
    **code-signing signature** header so the app verifies authenticity.
  - Selects the newest `Update` row matching runtimeVersion/platform/channel.
- `GET /api/assets?asset=<key>&runtimeVersion=<v>&platform=<p>` — serves the JS
  bundle and individual assets with correct content-types and cache headers.
- `POST /api/updates` (admin, authenticated) — publish endpoint: accepts an
  exported `dist/` (bundle + assets + `metadata.json`), stores files under
  `updates/<runtimeVersion>/<updateId>/`, precomputes + stores the manifest, and
  records the `Update` row as the latest.

**Code signing:** generated once via `npx expo-updates codesigning:generate` +
`codesigning:configure`. The private key lives on the server (env/secret); the
public certificate is embedded in the app build. Manifests are signed; the app
rejects unsigned/tampered manifests.

**Runtime version policy:** explicit string `runtimeVersion: "1.0.0"` in v1. OTA
delivers only JS/asset changes compatible with the installed native runtime; a
native dependency change requires bumping `runtimeVersion` + a new native build.

**Publish flow:** `bun run publish:update` (script in `apps/mobile`):
1. `npx expo export --platform ios` → produces `dist/`.
2. POST `dist/` to `POST /api/updates` with the admin token.
3. Server stores files + manifest, marks it latest for that runtimeVersion.

## 5. Mobile (`apps/mobile`)

Mirrors `iac-ccs-parent-mobile`.

### 5.1 Stack

- Expo SDK 54, **expo-router** (`expo-router/entry`)
- **expo-updates** (self-hosted), expo-secure-store, expo-constants,
  expo-splash-screen, expo-status-bar, expo-system-ui
- **NativeWind 4** + tailwind-merge + clsx, **Zustand**, **Zod**,
  **react-hook-form** + `@hookform/resolvers`, **lucide-react-native**, **axios**
- TypeScript strict + path aliases (`@/`, `@features/`, `@components/`,
  `@services/`, `@store/`, `@config/`, `@hooks/`, `@utils/`, `@types/`)

### 5.2 Structure

```
apps/mobile/
  app.config.ts               # APP_ENV loading, extra forwarding, updates.url, runtimeVersion
  eas.json                    # ios dev/preview/prod + apk profiles (kept for later)
  src/
    app/                      # expo-router routes
      _layout.tsx             # providers, splash, on-launch update check
      (auth)/login.tsx
      (auth)/register.tsx
      (app)/_layout.tsx       # auth guard
      (app)/index.tsx         # todo list (filters + sort + due dates)
      modal/todo.tsx          # add/edit (react-hook-form + zod)
      settings.tsx            # account + "Check for updates" + version/updateId
    components/{ui,forms,layout,feedback}/
    features/
      auth/                   # hooks + auth flows
      todos/                  # todo list logic, item components
      updates/                # useUpdates hook (expo-updates wrapper)
    services/
      api/                    # axios client (base URL, JWT interceptor)
    store/
      auth.ts                 # zustand: session/token (persisted in SecureStore)
      todos.ts                # zustand: offline-first todos + sync engine
    config/env.ts             # reads Constants.expoConfig.extra
    theme/  hooks/  types/  utils/  constants/
  tsconfig.json  tailwind.config.js  babel.config.js  metro.config.js
```

### 5.3 OTA in the app

- `app.config.ts`: `updates: { url: <SELF_HOSTED_UPDATES_URL>/api/manifest,
  codeSigningCertificate, codeSigningMetadata }`, `runtimeVersion: "1.0.0"`,
  `updates.checkAutomatically: "ON_LOAD"`.
- `features/updates/useUpdates.ts`: on launch, `Updates.checkForUpdateAsync()`
  → if available, `Updates.fetchUpdateAsync()` → prompt → `Updates.reloadAsync()`.
  Settings screen exposes a manual "Check for updates" button and shows the
  current `Updates.updateId` / `runtimeVersion`.

### 5.4 State + sync (offline-first)

- `store/todos.ts`: source of truth for the UI is the **local** store, persisted
  on-device. All mutations apply locally first (instant, works offline), each
  stamped with a client `updatedAt` and `id` (ulid).
- A sync engine runs on launch and after mutations (debounced): `POST
  /todos/sync` with `lastSyncAt` + pending local changes, merges the server
  response (last-write-wins), updates `lastSyncAt`.
- `store/auth.ts`: token in SecureStore; axios attaches `Authorization: Bearer`.

## 6. Data Flow

1. **Launch** → expo-updates checks `/api/manifest` for a newer bundle for
   `runtimeVersion 1.0.0`; downloads + reloads if found (signature verified).
2. **Auth** → register/login → JWT in SecureStore.
3. **Todos** → read/write local store first (instant, offline) → background
   `/todos/sync` reconciles with Postgres (last-write-wins, soft-delete).

## 7. Error Handling

- **Backend:** Elysia `onError` → Pino structured logs + typed JSON error
  bodies (`{ error: { code, message } }`). Zod validation errors → 422. Auth
  failures → 401. Unknown → 500 (no stack leak in prod).
- **OTA:** manifest endpoint returns 404 when no compatible update exists (app
  silently keeps the embedded bundle). Signature failure on the client → update
  rejected, app keeps running on current bundle.
- **Mobile sync:** network failure → mutations stay queued locally; retried on
  next launch/foreground. UI never blocks on the network.

## 8. Testing

- **Backend (`bun test`):**
  - `repos` unit tests (todo upsert/soft-delete, update selection).
  - `services` unit tests (sync last-write-wins reconciliation; password
    hashing/verify; manifest building + signing).
  - `routes` integration tests (auth happy/sad path, `/todos/sync` round-trip,
    `/api/manifest` returns correct signed manifest for a runtimeVersion).
- **Mobile (jest-expo + @testing-library/react-native):**
  - sync engine reducer (merge/conflict cases), store logic.
  - key components (todo item, list filters, add/edit form validation).
  - `useUpdates` hook with mocked `expo-updates`.

## 9. "Free" Guarantees

- OTA: **100% self-hosted** on the Bun server — no EAS Update, no quota, no cost.
- Backend: runs locally / on any VPS with Bun + Postgres (docker-compose).
- iOS dev: simulator + personal device for free. Production App Store
  distribution still needs a paid Apple Developer account (Apple's requirement,
  not bypassable in code).
- Android: APK profiles retained in `eas.json`; local `expo run:android` / gradle
  builds remain available for free.

## 10. Open Risks / Notes

- Self-hosted Expo Updates protocol details (multipart format, code-signing
  headers, asset key derivation) must match the protocol version the installed
  `expo-updates` expects — we follow the `custom-expo-updates-server` reference
  closely and pin `expo-protocol-version`.
- `runtimeVersion` discipline: any native change (new native module) requires a
  rebuild + runtimeVersion bump; OTA cannot ship native code.
- Sync is last-write-wins (no field-level merge) — acceptable for a single-user
  todo app; documented so future multi-editor scenarios know the limitation.
