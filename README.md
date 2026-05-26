# @booga/vcli

`npx @booga/vcli demo` to see the vBlocks marketing page in your browser with zero install.

Scaffold a pre-populated Vite + React + vBlocks project with one command. Add components from the registry, build with vSsg, lint with vLint.

Shadcn-style add: source lives in your repo, no runtime dep on the CLI.

## Quickstart

```sh
npx @booga/vcli demo
```

```sh
booga init my-site
cd my-site && bun run dev
```

Pass `--template=blank` for a bare Vite + React + Tailwind + vUi starter with no vBlocks deps.

## Install

```sh
bun add -g @booga/vcli
```

## Commands

| Command | Description |
|---|---|
| `booga demo` | serve bundled vBlocks marketing page (zero install) |
| `booga init [name]` | scaffold pre-populated vBlocks project (default) |
| `booga add <id>...` | add component(s) from registry |
| `booga list [--category=]` | print registry |
| `booga build [--config=]` | build with vSsg |
| `booga check` | lint with vLint |

## Config

`vcli.config.json` at project root:

```json
{
  "componentsDir": "src/components",
  "packageManager": "bun"
}
```

## License

MIT (c) 2026 bvasilenko

Code of conduct: https://www.contributor-covenant.org/version/2/1/code_of_conduct/
