# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-25

### Added

- `booga init [name]` — scaffold Vite + React + Tailwind + vUi project
- `booga add <component>...` — copy re-export stub from registry into `src/components/`
- `booga list [--category=]` — print registry catalog
- `booga build [--config=]` — delegate to `@booga/vssg` generate pipeline
- `booga check` — delegate to `@booga/vlint` over project source
- `VcliConfigSchema` — `zod` config schema with `registry`, `componentsDir`, `packageManager`
- Registry source wraps `@booga/vregistry` (baked-in data, no network dependency)
- Demo: `demo/` renders a vsuite landing page via `booga build`
