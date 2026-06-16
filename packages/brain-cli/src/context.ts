import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { createBrainConfig } from "@florence/brain-core";

export function createCliContext(rootDir = findWorkspaceRoot(process.cwd())) {
  return {
    rootDir,
    config: createBrainConfig(rootDir),
    dbPath: path.join(rootDir, ".brain", "brain.sqlite"),
  };
}

function findWorkspaceRoot(startDir: string): string {
  let currentDir = startDir;

  while (true) {
    const packageJsonPath = path.join(currentDir, "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(
        readFileSync(packageJsonPath, "utf-8"),
      ) as {
        workspaces?: unknown;
      };

      if (Array.isArray(packageJson.workspaces)) {
        return currentDir;
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return startDir;
    }

    currentDir = parentDir;
  }
}
