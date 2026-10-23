# Workflow

## Verifying changes

**There are no tests.** Before considering work done, run:

```sh
pnpm lint          # biome lint .
pnpm exec tsc -b   # type-check (src/paraglide must exist — run pnpm dev or pnpm build once first)
```

Don't run a full `pnpm build` after routine changes — reserve it for build/bundler issues or verifying production output. This is a visual app: verify UI changes by eye in the dev server, not by reading the diff.

Husky's pre-commit hook runs lint-staged (`biome check --write` on staged `*.{ts,tsx,json,mts,css}`), so unformatted code won't get past a commit — but don't rely on it as a substitute for running lint yourself first.

## Commands

```sh
pnpm dev            # http://localhost:3000; /api is proxied to LexFloatServer on http://localhost:8090
pnpm build          # vite build into dist/, then tsc -b
pnpm lint           # biome lint .
pnpm check          # biome lint + format, writing fixes
pnpm generate:api   # regenerate src/lib/api-schema.d.ts from swagger.json
```

- The dev server needs a running LexFloatServer on port 8090 for every API call, including login.
- There are no env vars. The dashboard is served from the same origin as the API, so API paths are relative (`/api/v4/...`).
- `src/routeTree.gen.ts` regenerates when the dev server or build runs — never edit it by hand, but do commit it.
- `src/paraglide/` regenerates from `messages/en.json` when the dev server or build runs — it is gitignored.
- `swagger.json` is gitignored. Copy the current spec from LexFloatServer before running `pnpm generate:api`, and commit the regenerated `src/lib/api-schema.d.ts`.

## Releases

`.github/workflows/releases.yml` is run by hand (workflow dispatch with a version). It builds, zips `dist/` into `dashboard.zip` and attaches it to a GitHub release, which the LexFloatServer build copies into its web root. Keep every asset inside `dist/` with relative or root paths and no external URLs.

## Git

- Default/PR base branch is `main`.
