# vCli 0.3.0 WOW web scaffolder iteration 1 (foundation scaffolder UX)

Spec: `projects/vsuite/specs/vcli-0.3.0-wow-web-scaffolder.md` (brand-repo internal).

## Front-matter

Iteration 1 lands the FOUNDATION scaffolder UX that exercises the 3 vBrand 0.4.0-alpha.2 primitives (`BrandSourceAdapter` + `AppTypeTemplate` + `CompositionEditor`) end-to-end through the vCli CLI plus hosted demo surface. Iterations 2-5 land the remaining 6 axes (Content + Stack + CMS + Interactivity + Deployment + Capability) per the 5-pass plan in the spec §Suggestions. Iteration 1 proves the scaffolder thesis (brand source + app-type + composition into a writable project skeleton at cwd or in browser) without claiming 9-of-9 WOW closure.

Starting point: `@booga/vcli@0.2.0` on npm; vCli workspace `main` at `8ca5276`; `package.json` carries no vBrand / vfixtures runtime deps yet; `.github/workflows/ci.yml` accepts only `v[0-9]+.[0-9]+.[0-9]+` tag pattern; `tests/demo-build.test.ts` baseline currently fails on hoisted `@booga/vbrand`-via-vBlocks peer-dep resolution (434/443 pass, 9 stop). Iteration 1 lands ALL prerequisite plumbing (dep-bump, baseline-fix, CI prerelease pattern, gh-pages-deploy job) INSIDE the contribot pipeline as Module 0 commits; no supervisor-direct pre-flight on `main` is permitted under §Code-changes-route-through-contribot.

### Dependencies (foundation)

- `@booga/vbrand@^0.4.0-alpha.2` on npm `dist-tags.latest` (alpha.2 demo-fix-pack landed at vBrand `2f5694e`; exports `.`, `./adapters`, `./adapters/browser`, `./templates`, `./composition`). Iteration 1 pins alpha.2; alpha.3 lands as the sibling vBrand demo-fix-pack cycle and vCli dep-bumps then.
- `@booga/vfixtures@^0.1.1` on npm (5 fixtures: stripe + vercel + linear + notion + github).
- vBlocks 0.6.0 iteration 1 contribot in flight; NOT a hard dep at iteration 1 since vCli foundation consumes vBrand primitives directly.
- Existing vCli 0.2.0 surface preserved: `npx @booga/vcli init` + `npx @booga/vcli demo` + `add` + `build` + `check` keep current contracts.

### Framing: contribot routes ALL code changes

Per `projects/vsuite/conventions.md §Code changes route through contribot`: every code-bearing edit (dep-bump, baseline-fix, CI workflow edit, runtime feature, hosted demo) ships through the contribot iteration 1 pipeline. There is NO supervisor pre-flight phase. Module 0 below carries the 4 prerequisite setup commits as the first phase of the contribot run; Modules 1-4 carry the iteration 1 feature work; the cycle close commit bumps the version + tags + emits CHANGELOG.

## Module 0: pre-engineering setup (in contribot scope)

Module 0 commits land on the iteration branch BEFORE Module 1 fires. The contribot pipeline opens the branch, then runs Module 0 as a sequential setup phase (each subsection is a SEPARATE conventional commit), then advances to Modules 1-4.

- [x] 0.1 Dep-bump commit: run `bun add @booga/vbrand@^0.4.0-alpha.2 @booga/vfixtures@^0.1.1`; verify `package.json` `dependencies` carries both pins; verify `bun.lock` records the alpha.2 + 0.1.1 resolutions; commit as `chore(deps): add vbrand@0.4.0-alpha.2 + vfixtures@0.1.1 foundation deps for 0.3.0`.
- [x] 0.2 Baseline-fix commit: diagnose `tests/demo-build.test.ts` peer-dep resolution failure (9 of 443 stop at `@booga/vbrand`-via-vBlocks hoisted `demo/node_modules` HeroSplit mis-resolve); root cause is that `demo/package.json` does NOT pin `@booga/vbrand` directly but transitively resolves it through `@booga/vblocks@^0.4.0`; the hoisted tree picks a stale copy after the 0.1 dep-bump.
- [x] 0.2 Baseline-fix resolution: add explicit `@booga/vbrand@^0.4.0-alpha.2` to `demo/package.json` `dependencies` so the demo workspace pins the same alpha.2 version the root workspace consumes; run `rm -rf demo/node_modules node_modules bun.lock` then `bun install` to rebuild the hoisted tree cleanly; verify `bun run test` returns 444/444 (the previously-skipped 9 now pass plus the existing 434); commit as `fix(tests): pin demo vbrand to alpha.2 + repair demo-build baseline (444/444 pass)`.
- [x] 0.2a Baseline reconciliation: actual workspace baseline is 376 pass / 437 total (61 fail, 4 errors across add, check, copyTemplate, buildRequestHandler suites) not 434/443 as stated; `demo-build.test.ts:18` fails with `beforeAll() expects a function as the second argument` (Vitest API signature error, not peer-dep resolution); triage all pre-existing failures and establish true green baseline before Module 1 feature work.
- [x] 0.3 CI prerelease tag pattern commit: edit `.github/workflows/ci.yml` `on.push.tags` array; current shape accepts only `v[0-9]+.[0-9]+.[0-9]+`; add the prerelease pattern `v[0-9]+.[0-9]+.[0-9]+-*` so `v0.3.0-alpha.1` triggers the workflow; mirror vBrand commit `6118cb1` exactly (same pattern string, same yaml indent); commit as `chore(ci): accept v*.*.*-* prerelease tag pattern (mirror vBrand 6118cb1)`.
- [x] 0.4 CI gh-pages-deploy job commit: add a `gh-pages-deploy` job to `.github/workflows/ci.yml` mirroring vBrand `2f5694e`-era job shape; the new job (a) `needs: verify`, (b) fires only on `startsWith(github.ref, 'refs/tags/v')`, (c) checks out + sets up bun + runs `bun install` + runs `cd examples/scaffolder && bun install && bun run build`, (d) publishes `examples/scaffolder/dist/` to the `gh-pages` branch via `peaceiris/actions-gh-pages@v3` with `publish_dir: ./examples/scaffolder/dist`, (e) declares `permissions: contents: write` at the job scope; the `examples/scaffolder/` target dir lands in Module 4 of THIS cycle so the workflow + target arrive together inside the iteration; commit as `chore(ci): add gh-pages-deploy job for examples/scaffolder hosted surface (mirror vBrand 2f5694e)`.

## Module 1: `vcli scaffold` CLI command (BrandSourceAdapter consumer at terminal)

- [x] 1.1 `src/commands/scaffold.ts` exports `runScaffold(name, opts)` mirroring `runInit` shape at `src/commands/init.ts`; accepts `--brand <handle>` where handle parses as one of six prefixes: `url:<live-URL>`, `fixture:<handle>`, `github:<owner>/<repo>`, `npm:<package>`, `json:<base64-payload>`, `file:<path-to-local-json>`.
- [x] 1.2 `src/commands/scaffold.ts` imports the RUNTIME class `DefaultBrandSourceAdapter` from `@booga/vbrand/adapters` (Node-side execution context); carries `BrandSourceAdapter` as a TYPE-ONLY import via `import type { BrandSourceAdapter } from "@booga/vbrand/adapters"` for variable typing; instantiates `const adapter: BrandSourceAdapter = new DefaultBrandSourceAdapter()` once and dispatches each prefix to the matching adapter method (`loadFromUrl` / `loadFromFixture` / `loadFromGitHub` / `loadFromNpm` / `loadFromCustomJson` / `loadFromLocalJson`).
- [x] 1.3 `src/commands/scaffold.ts` decodes the `json:<base64-payload>` prefix payload via `Buffer.from(payload, "base64").toString("utf-8")` then `JSON.parse(...)` BEFORE invoking `loadFromCustomJson(decoded)`; the adapter is base64-agnostic and the prefix-parse layer owns the decode step.
- [x] 1.4 The adapter loader methods validate `VbrandSchema` internally per `default-adapter.ts:38-44`; no separate `VbrandSchema` import is required at the CLI boundary; if defense-in-depth re-validation is desired import `VbrandSchema` from the ROOT entrypoint `@booga/vbrand` (NOT from `/adapters`; it is not re-exported there) and parse the returned `VbrandType` once more before write.
- [x] 1.5 `src/cli.ts` wires `program.command("scaffold [name]")` with required `--brand <handle>` plus `--app <type>` (default `landing`) plus `--package-manager <pm>` plus `--cwd <path>`; routes to `runScaffold`.
- [x] 1.6 `runScaffold` writes the project skeleton at `path.resolve(cwd, name)` using the existing `copyTemplate(targetDir, "scaffold")` path from `src/template/index.ts`; then emits a `brand.json` file at the project root carrying the schema-validated `VbrandType` payload for downstream `vcli build` consumption.
- [x] 1.7 Surface a typed `VcliError` when `loadFromUrl` fails (CORS / network out) instead of letting the raw fetch error bubble; offline-safe fallback semantics for the `url:` prefix.
- [x] 1.8 `tests/scaffold-cmd.test.ts` drives `runScaffold` against each of the six brand-handle prefixes into `/tmp/vcli-scaffold-<random>/` and asserts `brand.json` plus `vcli.config.json` plus project skeleton land and match the fixture brand at the consumer boundary.
- [ ] 1.9 Commit Module 1 as `feat(scaffold): runScaffold command consuming DefaultBrandSourceAdapter across 6 brand-handle prefixes`.

## Module 2: app-type template scaffold integration (AppTypeTemplate registry consumer)

- [x] 2.1 `src/commands/scaffold.ts` imports `getTemplate` plus `TEMPLATE_REGISTRY` from `@booga/vbrand/templates`; resolves `--app <landing|marketing|docs|dashboard>` against `TEMPLATE_REGISTRY` and fails fast on unknown app-types with the registry list surfaced in the error message.
- [x] 2.2 `src/template/files-scaffold/` ships a thin starter (Vite + React + Tailwind + `@booga/vbrand` + `@booga/vblocks` + `@booga/vui`) consumed by `runScaffold`; `src/main.jsx` imports `brand.json` plus `composition.json` as static asset imports (`import brand from "./brand.json"`; bundled by Vite at build) and renders the selected `AppTypeTemplate` from `TEMPLATE_REGISTRY` via `createRoot`; browser execution context; no Node `fs.readFile` calls in `main.jsx`.
- [x] 2.3 Register `"scaffold"` in `src/template/index.ts` `VALID_TEMPLATES` (currently `["default", "blank"]`) so the existing `copyTemplate(targetDir, "scaffold")` path serves `runScaffold`; preserve `default` plus `blank` for backward compatibility.
- [x] 2.4 `scripts/copy-templates.mjs` extends the existing copy loop to cover `src/template/files-scaffold/` into the built `dist/templates/scaffold/` so `npx @booga/vcli scaffold` finds the template post-install alongside `files-default` and `files-blank`.
- [x] 2.5 `tests/scaffold-app-type.test.ts` drives `runScaffold(..., { app: "landing" })` plus `runScaffold(..., { app: "docs" })` and asserts the resulting `composition.json` matches `getTemplate("landing").defaultComposition()` plus `getTemplate("docs").defaultComposition()` respectively.
- [ ] 2.6 Commit Module 2 as `feat(scaffold): app-type template integration via vBrand TEMPLATE_REGISTRY`.

## Module 3: `composition.json` persistence + `vcli compose` browser UI

- [x] 3.1 `runScaffold` emits `composition.json` at the scaffolded project root carrying the `CompositionSpec` returned by `getTemplate(app).defaultComposition()`; the file is the canonical source of truth the scaffold's `main.jsx` reads at render time.
- [x] 3.2 `src/commands/compose.ts` exports `runCompose(opts)` that reads `composition.json` plus `brand.json` from cwd; spawns a Node HTTP server reusing the `buildRequestHandler` shape from `src/commands/demo.ts:53` serving a bundled `compose-dist/` SPA; opens the browser via the already-listed `open` runtime dep at `package.json:40`.
- [x] 3.3 `compose-ui/` workspace at package root (sibling of the existing package-root `demo/` directory; vCli has NO `examples/demo/` layout) ships a Vite + React app that imports `CompositionEditor` plus `compositionToHash` plus `compositionFromHash` from `@booga/vbrand/composition` and `BrowserBrandSourceAdapter` from `@booga/vbrand/adapters/browser` (browser execution context); renders the editor against the loaded brand plus composition; URL-hash sync round-trips (edit composition then hash updates then reload restores).
- [x] 3.4 `compose-ui/src/main.jsx` posts the edited `CompositionSpec` back to `runCompose`'s HTTP server via `POST /composition` on save; the server writes the updated spec to `composition.json` at cwd and responds 200; the UI surfaces "saved to composition.json" inline.
- [x] 3.5 `src/cli.ts` wires `program.command("compose")` routing to `runCompose`; flags `--port <n>` plus `--no-open` mirror the `demo` command shape.
- [x] 3.6 Build pipeline `scripts/build-compose-dist.mjs` runs `vite build` inside `compose-ui/` then copies `compose-ui/dist/` to package-root `compose-dist/`; add `compose-dist/` to `package.json` `files` array (sibling-aligned to the existing `demo-dist/` entry); extend the root `build` script to invoke the new script after `build-demo-dist.mjs`.
- [x] 3.7 `tests/compose-cmd.test.ts` asserts `runCompose` spins up the server, reads `composition.json`, and the round-trip POST persists changes.
- [x] 3.8 `tests/compose-hash-roundtrip.spec.ts`
- [ ] !ONLY FOR [contribot-vsuite-vcli]: FOCUS ON THIS! 3.8a `compose-ui/src/app.tsx` loading and error early-return states render without `fontFamily` declaration; these states return BEFORE the main layout wrapper that carries `fontFamily: "system-ui, -apple-system, sans-serif"`; browser default font renders instead of system-ui in loading and error states. (Playwright; `playwright.config.ts` `testMatch: "**/*.spec.ts"` already picks it up) loads `/?composition=<encoded>` and asserts the editor restores the same `CompositionSpec` and edits flow back into the URL hash without page reload.
- [ ] 3.9 Commit Module 3 as `feat(compose): composition.json persistence + browser CompositionEditor UI with hash round-trip`.

## Module 4: hosted vCli scaffolder web UI demo (GitHub Pages)

- [x] 4.1 Create the package-root `examples/` directory (does not yet exist on `main`); place the scaffolder at `examples/scaffolder/` (the new hosted scaffolder location); the existing zero-install preview at package-root `demo/` is preserved untouched as the 0.2.x surface.
- [x] 4.2 `examples/scaffolder/` Vite + React app imports `BrowserBrandSourceAdapter` from `@booga/vbrand/adapters/browser` (BROWSER runtime class; NOT `DefaultBrandSourceAdapter`, NOT the type-only `BrandSourceAdapter`) plus `getTemplate` plus `TEMPLATE_REGISTRY` from `@booga/vbrand/templates` plus `CompositionEditor` plus `compositionToHash` plus `compositionFromHash` from `@booga/vbrand/composition`.
- [x] 4.3 `examples/scaffolder/src/app.tsx` renders a 3-pane UI: brand-source picker (URL input + fixture dropdown + GitHub / npm / JSON / file prefixes) on the left, `CompositionEditor` in the middle, live preview of the selected `AppTypeTemplate` rendering the loaded brand plus composition on the right.
- [x] 4.3a Hosted scaffolder brand picker omits the `file:` prefix from browser-facing UI; `BrowserBrandSourceAdapter.loadFromLocalJson()` throws "not available in browser context"; surface only URL + fixture + GitHub + npm + JSON prefixes in the hosted scaffolder; the `file:` prefix remains CLI-only (Module 1).
- [ ] !ONLY FOR [contribot-vsuite-vcli]: FOCUS ON THIS! 4.4 URL params drive state: `?brand=<handle>&app=<type>#composition=<encoded>` is fully shareable and restores on reload; `examples/scaffolder/src/router.ts` mirrors the vBrand 0.4.0-alpha.2 router shape at `examples/demo/src/router.ts` (in the vBrand repo).
- [x] 4.5 "Download scaffold" button assembles a zip (`jszip` runtime dep added to `examples/scaffolder/package.json`) of the project skeleton (the same files `runScaffold` would write) and downloads via blob URL; zero server roundtrip; works offline once the page loads.
- [x] 4.6 `examples/scaffolder/vite.config.js` configures GitHub Pages base path (`base: "/vCli/"`); the deploy target dir `examples/scaffolder/dist/` matches the `gh-pages-deploy` job landed in Module 0.4.
- [x] 4.7 `examples/scaffolder/tests/runtime.spec.ts` (Playwright) drives `?brand=fixture:stripe&app=landing` and asserts the preview renders, the editor surface mounts, and the download button produces a non-empty zip.
- [ ] 4.8 Hosted URL `https://bvasilenko.github.io/vCli/` returns 200 and serves the scaffolder shell after the iteration 1 tag triggers the `gh-pages-deploy` job; 200-probe asserts at cycle close.
- [ ] 4.9 Commit Module 4 as `feat(scaffolder-demo): hosted 3-pane scaffolder consuming BrowserBrandSourceAdapter + AppTypeTemplate + CompositionEditor`.
- [ ] !ONLY FOR [contribot-vsuite-vcli]: FOCUS ON THIS! 4.10 `examples/scaffolder/src/app.tsx` double-fire on app-type change: `handleAppTypeChange` sets composition locally via `setLoadState`, then `useCallback([brandHandle, appType, ...])` dependency on `appType` invalidates `loadBrand`, causing `useEffect` to re-fire `loadBrand` which overwrites the locally-set composition with `initial.composition ?? template.defaultComposition()`; fix by decoupling brand-fetch from app-type changes (remove `appType` from `loadBrand` deps; handle app-type switches without re-triggering brand fetch).
- [ ] 4.11 `examples/scaffolder/src/scaffold-zip.ts` duplicates `src/template/files-scaffold/` content as inline string templates; any upstream template change silently drifts the browser zip download; add a parity test or generate the zip file map from the canonical template source.

## Out of scope for iteration 1

- AC#17 ContentOverride map (iteration 2 alongside the vBrand iteration 2 ContentOverride landing as `0.4.0-alpha.3` or later).
- AC#18 ScaffoldStackEmitter (Vite + Next + Astro + Remix) (iteration 3).
- AC#19 ScaffoldCmsEmitter (vBrand-standalone + Payload + Sanity + custom) (iteration 4).
- AC#20 ScaffoldDeployEmitter (deployment-target picker beyond gh-pages) (iteration 4).
- AC#21 ScaffoldInteractivityEmitter (static / hybrid / SPA) (iteration 4).
- AC#22 CapabilityPluginRegistry (auth + search + i18n + forms) (iteration 5).
- AC#23 StackBlitz handoff (iteration 5; depends on stack emitter).
- vBlocks 0.6.0 GalleryMode plus VariantSelector integration (vBlocks 0.6.0 not yet on npm; consumed at iteration 2 or 3 once published).
- `/files` per-template-file inspector view at AC#27 (iteration 2; preserve existing 0.2.x demo at the parallel hosted slot).
- Expanded app-type set beyond the 4 vBrand 0.4.0-alpha.2 templates (landing / marketing / docs / dashboard); blog plus commerce-shell defer to iteration 3.
- The vCli-OWNED 5-template `ScaffoldTemplate` registry referenced by spec AC#15 (landing + docs + dashboard + blog + commerce-shell); iteration 1 consumes the 4-template `AppTypeTemplate` registry from vBrand; the vCli-owned 5-template registry is descoped to iteration 3 alongside the blog and commerce-shell additions.

## Cycle close gates (iteration 1 acceptance criteria)

- [x] AC#14-i1: `vcli scaffold --brand <handle>` accepts all 6 prefixes (`url:` / `fixture:` / `github:` / `npm:` / `json:` / `file:`) via the instantiated `DefaultBrandSourceAdapter`; CLI test green per prefix.
- [x] AC#15-i1: `vcli scaffold --app <type>` accepts landing + marketing + docs + dashboard against the imported vBrand `AppTypeTemplate` registry; scaffold contract test green per app-type; spec AC#15 full 5-template vCli-owned `ScaffoldTemplate` registry is descoped to iteration 3 per the out-of-scope enumeration above.
- [x] AC#16-i1: `vcli compose` reads and writes `composition.json` round-trip via `CompositionEditor` URL-hash sync; Playwright probe green.
- [x] AC#24-i1: zero `DEMO_MODE` / `IS_DEMO` / `--demo` / `HOSTED_MODE` / `if.*demo` / `if.*hosted` hits across `examples/scaffolder/src/` plus `src/template/files-scaffold/src/` per the production-code-path discipline; `grep -RE` returns 0 hits.
- [x] AC#26-i1: zero leaf-level CSS (no `#hex` / inline `font-family:"..."` / `font-size:<num>` / `padding:<num>`) across `examples/scaffolder/src/` plus `src/template/files-scaffold/src/`; richness flows upstream from vBrand 0.4.0-alpha.2 plus vBlocks plus vUi.
- [ ] AC#29-i1: Hosted scaffolder at `https://bvasilenko.github.io/vCli/` serves the 3-pane UI driven by the imported vBrand 0.4.0-alpha.2 primitives; `gh-pages-deploy` job exits 0 on the iteration 1 tag; 200-probe at cycle close.
- [x] AC#41-i1: 4 feature modules (Module 1 + Module 2 + Module 3 + Module 4) land plus 4 setup commits (Module 0.1 + 0.2 + 0.3 + 0.4) plus all contract tests green; `bun run typecheck` exits 0 across `src/`, `examples/scaffolder/src/`, `compose-ui/src/`, `tests/`; `bun run lint` exits 0 across the same surfaces.
- [ ] AC#42-i1: Hosted scaffolder at `https://bvasilenko.github.io/vCli/` consumes the 3 vBrand primitives (`BrowserBrandSourceAdapter` + `AppTypeTemplate` via `TEMPLATE_REGISTRY` + `CompositionEditor`); first-paint thesis-level outcome per spec P-018 (brand source + app-type + composition into a rendered preview within first paint).
- [x] AC#43-i1: `bun run typecheck` plus `bun run lint` plus `bun run test --coverage` plus `bun run build` all exit 0; 444+ tests pass (the Module 0.2 baseline of 444/444 plus all iteration 1 NET-NEW tests across `tests/scaffold-cmd.test.ts` + `tests/scaffold-app-type.test.ts` + `tests/compose-cmd.test.ts`); zero regression on `init` + `demo` + `add` + `build` + `check`; coverage at or above the 0.2.0 baseline; `dist/` plus `compose-dist/` plus `demo-dist/` all emit; determinism-check passes.
- [x] AC#44-i1: em-dash count is exactly 0 across all authored files (`src/`, `src/template/files-scaffold/`, `compose-ui/src/`, `examples/scaffolder/src/`, `tests/`, README + CHANGELOG); two-pass cleanup sweep mandatory; ASCII `--` hyphen-hyphen for CLI option signatures permitted (em-dash forbidden).
- [ ] !ONLY FOR [contribot-vsuite-vcli]: FOCUS ON THIS! AC#45-i1 Playwright probe gate (MANDATORY; sibling-aligned to vBrand alpha.3 fix-pack discipline): web-qa-execute MUST emit a CLEAN verdict against `examples/scaffolder/tests/runtime.spec.ts` plus `tests/compose-hash-roundtrip.spec.ts` against the deployed hosted URL plus local preview server; the probe step MUST emit a verdict line of shape `CLEAN: N probes, 0 bugs, M/M surfaces covered`; supervisor MAY NOT skip this gate; if web-qa-execute emits ANY non-CLEAN verdict (`BUGS:`, `PARTIAL:`, `DEFERRED:`) contribot MUST turnaround back to the engineering specialist; this is a P0 binding rule.

## Voice + branch + commit shape

- Branch: `feature/0.3.0-alpha.1-wow-web-scaffolder` cut from `main` at the start of the contribot run (BEFORE Module 0.1 fires).
- Bump `package.json:version` from `0.2.0` to `0.3.0-alpha.1` as the final cycle-close commit on the iteration branch.
- Commit split: Module 0 ships 4 SEPARATE conventional commits (one per 0.1 / 0.2 / 0.3 / 0.4); Modules 1-4 ship 1 commit each per the Module-N.last bullets above; cycle close ships 1 commit (`chore: bump 0.2.0 -> 0.3.0-alpha.1 + CHANGELOG entry`). Total: 9 commits on the iteration branch.
- Conventional-commits header (`chore(deps):`, `fix(tests):`, `chore(ci):`, `feat(scaffold):`, `feat(compose):`, `feat(scaffolder-demo):`, `chore:`) plus 3 to 5 line body plus cycle scope tag on each commit.
- Tag the close commit `v0.3.0-alpha.1`; the prerelease pattern landed in Module 0.3 triggers the workflow; the `gh-pages-deploy` job landed in Module 0.4 publishes the hosted shell.
- Zero em-dashes in authored prose (tests + src + compose-ui + examples + README + CHANGELOG); two-pass cleanup sweep mandatory.
- Zero AI co-author lines (no `Co-Authored-By: Claude`).
- Terse system-design framing; one actionable line per TODO bullet; no rhetoric.

## References

- Spec: `projects/vsuite/specs/vcli-0.3.0-wow-web-scaffolder.md` (full 9-of-9 axes WOW scope).
- Sibling vBrand iteration 1 close log: `projects/vsuite/logs/log-2026-06-02-vbrand-0.4.0-alpha.1.md`.
- Sibling vBrand alpha.2 supervisor-direct fix-pack commit: vBrand `2f5694e`.
- Sibling vBrand CI prerelease-tag-accept commit: vBrand `6118cb1` (mirror at Module 0.3).
- Sibling vBrand gh-pages-deploy job: vBrand `2f5694e`-era `.github/workflows/ci.yml` (mirror at Module 0.4).
- Sibling vBrand alpha.3 demo-fix-pack TODO (shape reference): `/tmp/vbrand-040-alpha3-fix-pack-todo.md`.
- TODO seed validation deliverable: `/tmp/contribot-todo-validation-2026-06-02.md`.
- Upstream primitives consumed: `@booga/vbrand@^0.4.0-alpha.2` (`/adapters`, `/adapters/browser`, `/templates`, `/composition`); `@booga/vfixtures@^0.1.1` (5 fixtures).
- Runtime adapter class discipline: Node-side surfaces (`src/commands/scaffold.ts`, `src/commands/compose.ts` server) use `DefaultBrandSourceAdapter`; browser-side surfaces (`examples/scaffolder/src/`, `compose-ui/src/`, `src/template/files-scaffold/src/main.jsx`) use `BrowserBrandSourceAdapter`; the bare `BrandSourceAdapter` symbol is TYPE-ONLY and consumed via `import type` for variable typing only.
- vCli canonical parent op item iid 21 carries this cycle as a SHORT spec-pointer AC line.
- Convention anchors: `projects/vsuite/conventions.md §Code changes route through contribot` (Module 0 routes through contribot; supervisor pre-flight FORBIDDEN) + §Demos use the production code path + §Hosted-not-localhost demo as the close gate + §Demo richness flows upstream first + §Sub-op cognitive-resource 10-second-read budget.
- Holding-tier engineering protocol: `holding/engineering-protocol.md`.
