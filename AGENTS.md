# AGENTS.md

## Repo Shape

- Single-package TypeScript Express API.
- Server entrypoint is `src/server.ts`; route mount table is `src/routes/index.ts`.
- Request flow is `routes -> controllers -> service -> Prisma`; shared Prisma client lives in `src/config/db.ts`.
- Auth middleware extends `Express.Request` via `src/types/express.d.ts`; keep that file in sync if you change `req.user` or `req.accessToken`.
- Async controller error wrapping currently comes from `wrapAsync` in `src/util/util.ts`; `src/wrappers/index.ts` defines a similar helper but is not what controllers use.

## Commands

- Use `pnpm`, not npm: `package.json` declares `packageManager: pnpm@10.14.0` even though `package-lock.json` is also present.
- Install deps: `pnpm install`.
- Dev server: `pnpm dev`.
- Build: `pnpm build`.
- Run built server: `pnpm start`.
- Prisma client generate: `pnpm db:generate`.
- Prisma schema validate: `pnpm db:validate`.
- Typecheck (no script exists): `pnpm exec tsc --noEmit`.
- Prisma schema sync: `pnpm db:push`.

## Prisma / Data

- Source of truth is `prisma/schema.prisma`, and the datasource provider there is MongoDB.
- `pnpm migrate` is only a compatibility alias for `prisma db push`; Prisma Migrate is not part of the current MongoDB workflow.
- Do not recreate SQL-style migration history under `prisma/migrations/`; apply schema changes with `db push`.
- `postinstall` runs `prisma generate`; if you edit `prisma/schema.prisma`, regenerate the client before relying on build/runtime behavior.

## Runtime Gotchas

- `src/server.ts` hardcodes port `4000`; `PORT` is currently ignored.
- CORS only allows `http://localhost:3005` and `https://tide-focus-web.vercel.app`; requests with no `Origin` header are allowed.
- Auth endpoints set cookies with `httpOnly: true`, `secure: true`, `sameSite: "none"` even in local dev. Browser testing over plain HTTP will not match curl/Postman behavior.
- Required env vars are declared in `src/types/env.d.ts`: `DATABASE_URL`, access/refresh token secrets and expiries, and temporary-token cache prefix/TTL.
- Role constants are duplicated in `src/service/auth.service.ts` and `src/middleware/authorize.ts`; keep both aligned if roles change.

## Verification

- There is no checked-in test suite or CI workflow.
- There is no working lint command in current repo state: `pnpm exec eslint src --ext .ts` fails because the repo still uses legacy `.eslintrc` with ESLint 9 and no `eslint.config.*`.
- Practical verification is `pnpm exec tsc --noEmit`, `pnpm build`, and targeted endpoint smoke tests against `pnpm dev`.
