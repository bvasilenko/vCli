import { z } from "zod";
import fs from "fs-extra";
import path from "node:path";

export const VcliConfigSchema = z
  .object({
    registry: z
      .string()
      .url()
      .default(
        "https://cdn.jsdelivr.net/npm/@booga/vRegistry@latest/dist/registry.json"
      ),
    componentsDir: z.string().default("src/components"),
    packageManager: z.enum(["bun", "pnpm", "npm", "yarn"]).default("bun"),
  })
  .strict();

export type VcliConfig = z.infer<typeof VcliConfigSchema>;

const CONFIG_FILENAME = "vcli.config.json";

export async function loadConfig(cwd: string): Promise<VcliConfig> {
  const configPath = path.join(cwd, CONFIG_FILENAME);
  const raw = (await fs.pathExists(configPath))
    ? await fs.readJson(configPath)
    : {};
  return VcliConfigSchema.parse(raw);
}

export async function saveConfig(
  cwd: string,
  config: VcliConfig
): Promise<void> {
  const configPath = path.join(cwd, CONFIG_FILENAME);
  await fs.writeJson(configPath, config, { spaces: 2 });
}
