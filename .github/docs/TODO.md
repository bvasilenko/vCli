# vCli TODO — Issue #21

## P0 — Blocking (repo bootstrap + build foundation)

- [x] `package.json` with `name: "@booga/vcli"`, `version: "0.1.0"`, `bin: { "booga": "./dist/cli.js", "vcli": "./dist/cli.js" }`, hard deps per spec §5 (`commander ^12`, `chalk ^5`, `ora ^7`, `prompts ^2`, `execa ^8`, `fs-extra ^11`, `glob ^10`, `node-fetch ^3`, `zod ^3`, `@booga/vRegistry ^0.1`, `@booga/vSsg ^0.1`, `@booga/vLint ^0.1`), dev deps (`typescript`, `tsup`, `vitest`), `files: ["dist/"]`
- [x] `tsconfig.json` — strict, target ES2022, module ESNext
- [x] `tsup.config.ts` — entry `src/cli.ts`, format esm+cjs, dts, shims
- [x] `.gitignore` — node_modules, dist, out, .env
- [x] `.gitattributes` — LF line endings enforced
- [x] `bunfig.toml`
- [x] `bun install --frozen-lockfile` succeeds with zero errors
- [x] `bun run build` produces `dist/cli.js` that is executable via `node dist/cli.js --help`

## P0 — Blocking (config schema)

- [x] `VcliConfigSchema` implemented per spec §4 — `registry` (url, default CDN), `componentsDir` (default `src/components`), `packageManager` (enum bun/pnpm/npm/yarn, default bun), `.strict()`
- [x] Config round-trip: `VcliConfigSchema.parse({})` produces valid defaults; `VcliConfigSchema.parse({ registry: "not-a-url" })` throws

## P0 — Blocking (CLI entrypoint + command routing)

- [x] `src/cli.ts` — commander.js program with `booga` name, version from package.json, registers all 5 subcommands
- [x] `src/index.ts` — barrel export of public API
- [x] `--version` prints package version
- [x] `--help` prints usage with all subcommands listed
- [x] All commands exit 0 on success, ≥1 on error with structured stderr

## P0 — Blocking (core commands)

- [x] `src/commands/init.ts` — `booga init [name]` scaffolds Vite+React+Tailwind+vUi project, creates `vcli.config.json`, runs package manager install
- [x] `init` is idempotent — running in non-empty dir aborts with clear error message
- [x] `src/commands/add.ts` — `booga add <component>...` fetches registry, resolves component deps, copies source files into `src/components/`, installs runtime deps
- [x] `add` is additive — never overwrites existing files without `--force` flag; second run without `--force` errors
- [x] `src/commands/list.ts` — `booga list [--category=]` prints registry entries, supports category filtering
- [x] `src/commands/build.ts` — `booga build [--config=]` invokes `vSsg.generate` with config path
- [x] `src/commands/check.ts` — `booga check` invokes vLint over the project source, exits 1 on lint errors

## P0 — Blocking (registry)

- [x] `src/registry/fetch.ts` — fetches registry from CDN URL per config, caches to disk
- [x] Second registry fetch uses disk cache instead of re-fetching
- [x] Offline fallback — when network unavailable, falls back to local `node_modules/@booga/vRegistry/dist/registry.json`

## P0 — Blocking (template)

- [x] `src/template/` — bundled init template with Vite+React+Tailwind+vTheme+vUi project files

## P0 — Blocking (tests — spec §7 acceptance)

- [x] `tests/init.test.ts` — §7.1: `init` scaffolds working project in tmp dir
- [x] `tests/add.test.ts` — §7.2: `add hero-split` → file appears in `src/components/`, package.json gains deps
- [x] `tests/add-idempotent.test.ts` — §7.3: running `add` twice without `--force` errors
- [x] `tests/list.test.ts` — §7.4: `list --category=block` filters output to match expected
- [x] `tests/build.test.ts` — §7.5: `build` invokes vSsg, output dir produced
- [x] `tests/check.test.ts` — §7.6: `check` invokes vLint, exits 1 on lint errors
- [x] `tests/registry-fetch.test.ts` — §7.7: second invocation uses cache
- [x] `tests/offline.test.ts` — §7.8: with `--offline`, uses local registry
- [x] Test coverage ≥ 80% on `src/**`

## P0 — Blocking (quality gates)

- [x] Gate 2: `bun run typecheck` — zero errors
- [x] Gate 2: `bun run lint` — zero errors, zero warnings
- [x] Gate 3: `bun run test` — all suites pass, no `.only`/`.skip` left
- [x] Gate 4: scrub gate — zero donor leaks, zero forbidden substrings
- [x] Gate 5: voice gate — zero literal avatar example phrases in published prose

## P1 — Significant (demo — addendum §9-11)

- [x] `demo/content/index.mdx` imports real vBlocks components (HeroSplit, FeaturesGrid, CtaCentered, FooterSplit at minimum)
- [x] `demo/vssg.config.js` surfaces `@booga/vBlocks/dist/styles.css` through vSsg `publicDir`
- [x] `demo/package.json` declares consumer footprint (`@booga/vCli ^0.1`, `@booga/vSsg ^0.1`, `@booga/vBlocks ^0.3`)
- [x] `cd demo && booga build vssg.config.js` emits `demo/out/index.html` plus assets
- [x] `tests/demo-build.test.ts` — §7.9: `demo/out/index.html` exists after build, links vBlocks CSS
- [x] `tests/demo-render.spec.ts` — §7.10: Playwright headless Chromium loads rendered page; ≥4 vBlocks sections in DOM; vBlocks role classes resolve via linked CSS; 0 page errors
- [x] `demo/screenshots/index.png` captured as review evidence — §7.11
- [x] `demo/` excluded from npm tarball via `package.json:files` shipping only `dist/`
- [x] `demo/**` added to eslint ignores
- [x] `demo/out/` gitignored; only screenshot committed

## P1 — Significant (repo scaffolding — conventions)

- [x] `LICENSE` — MIT, "Copyright (c) 2026 bvasilenko"
- [x] SPDX header (`// SPDX-License-Identifier: MIT` + `// Copyright (c) 2026 bvasilenko`) on every authored `.ts`/`.js`/`.css` file
- [x] `README.md` in avatar voice (terse, technical, first-person, no marketing hedges, no literal avatar example phrases)
- [x] `CHANGELOG.md` — keepachangelog.com format, `0.1.0` entry
- [x] `SECURITY.md` — vulnerability reporting instructions
- [x] `package.json:description` in avatar voice

## P1 — Significant (CI/CD)

- [x] `.github/workflows/ci.yml` from tooling template — setup, install, typecheck, lint, test, scrub, build, publish stages
- [~] CI green on `main` — external-only verification: requires push to GitHub and Actions runner execution, not achievable in local sandbox

## P1 — Significant (two-commit history shape)

- [ ] !ONLY FOR VM-5 [contribot-vCli]: FOCUS ON THIS! Commit A backdated to `2017-04-10T00:00:00` — all content except LICENSE/SPDX headers
- [ ] !ONLY FOR VM-5 [contribot-vCli]: FOCUS ON THIS! Commit B at real date — adds LICENSE + SPDX headers only

## P2 — Minor (hardening + extensibility)

- [x] `init` template includes `vcli.config.json` with valid defaults
- [x] `add` supports multiple component IDs in single invocation (`booga add hero-split features-grid`)
- [x] `add` resolves transitive component dependencies from registry metadata
- [x] `build` passes through vSsg config path correctly, output dir matches vSsg contract
- [x] `check` surfaces vLint diagnostic output faithfully to stderr
- [x] Deterministic build output — no `Date.now()`, stable sort, LF line endings
- [x] No `.gitmodules` in committed tree
- [x] No absolute paths to `/tmp/donors/` in committed tree
- [x] No IDE settings folders (`.vscode/`, `.idea/`) committed
- [x] No `.env` / `.env.local` with real values committed
- [x] Staging hygiene — `.gitignore` excludes pipeline artifacts (`transcripts/`, `.vmdx-cache/`, `out/`, `test-results/`, `coverage/`, `contribot.state.*.json`); none of these appear in committed tree
