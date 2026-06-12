import { expect, test as base } from "@playwright/test";
import type { ScaffolderServer } from "./scaffolder-test-utils.js";
import { startScaffolderServer } from "./scaffolder-test-utils.js";

interface ScaffolderFixtures {
  readonly baseUrl: string;
}

interface ScaffolderWorkerFixtures {
  readonly scaffolderServer: ScaffolderServer;
}

export const test = base.extend<
  ScaffolderFixtures,
  ScaffolderWorkerFixtures
>({
  scaffolderServer: [
    async ({}, use) => {
      const server = await startScaffolderServer();
      try {
        await use(server);
      } finally {
        server.server.close();
      }
    },
    { scope: "worker" },
  ],
  baseUrl: async ({ scaffolderServer }, use) => {
    await use(scaffolderServer.baseUrl);
  },
});

export { expect };
