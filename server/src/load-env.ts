import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = path.resolve(serverDir, "..");

const envPaths = [
  path.join(projectRoot, ".env"),
  path.join(projectRoot, "prisma", ".env"),
  path.join(serverDir, ".env"),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

export { projectRoot };
