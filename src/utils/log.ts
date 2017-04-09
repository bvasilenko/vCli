import chalk from "chalk";
import ora, { type Ora } from "ora";

export const log = {
  info: (msg: string): void => {
    console.log(chalk.cyan("ℹ"), msg);
  },
  success: (msg: string): void => {
    console.log(chalk.green("✓"), msg);
  },
  warn: (msg: string): void => {
    console.warn(chalk.yellow("⚠"), msg);
  },
  error: (msg: string): void => {
    process.stderr.write(chalk.red("✗") + " " + msg + "\n");
  },
};

export function spinner(text: string): Ora {
  return ora(text).start();
}
