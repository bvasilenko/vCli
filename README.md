# @booga/vcli

`npx @booga/vcli demo` — zero-install vBlocks marketing page in the browser.

Component scaffolding CLI for vsuite. `booga init` spins up a Vite + React + Tailwind + vUi project. `booga add <id>` vendors a component from the registry into `src/components/`. `booga build` delegates to vSsg. `booga check` delegates to vLint.

Shadcn-style add: source lives in your repo, no runtime dep on the CLI.

## Install

```sh
bun add -g @booga/vcli
```

## Commands

| Command | Description |
|---|---|
| `booga demo` | serve bundled vBlocks marketing page (zero install) |
| `booga init [name]` | scaffold project (`--template=vblocks-marketing` for pre-populated landing page) |
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

MIT © 2026 bvasilenko

Code of conduct: https://www.contributor-covenant.org/version/2/1/code_of_conduct/
