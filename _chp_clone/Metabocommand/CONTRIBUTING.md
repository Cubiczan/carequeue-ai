# Contributing to MetaboCommand

Thanks for your interest. This is an MVP vertical slice proving the Realtime + Presence + RLS patterns end-to-end. The remaining spec sections (Operations Dashboard, Settings UI, test suite) are deliberately left as follow-up work.

## Development setup

See [README.md § Getting started](README.md#getting-started).

## Code conventions

- **TypeScript strict**; no `any`, no non-null assertions, no `as` casts
- **Immutability** — never mutate arrays or objects; prefer spread / `Object.assign`
- **Many small files** — aim for 200–400 lines per file, 800 max
- **Co-locate client components** with their route (e.g. `finance/pulse-agent-view.tsx` next to `finance/page.tsx`)
- **Zod** for every API route payload
- **RLS first** — never bypass RLS from the server except via a deliberate `createServiceClient()` call with justification

## Commit style

Conventional commits:

- `feat:` new feature
- `fix:` bug fix
- `refactor:` restructuring without behavior change
- `docs:` documentation only
- `test:` test changes
- `chore:` tooling, deps, config

Example: `feat: add Harmony Agent operating mode toggle`

## Pull requests

- Keep each PR focused on a single spec section or a single fix
- Include a screenshot for any UI change
- Run `npm run build` locally before opening the PR; CI runs the same check

## Roadmap (help wanted)

See the README's "Out of scope for this MVP slice" section for the next phase of work.
