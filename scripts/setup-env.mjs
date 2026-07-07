import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const example = path.join(root, ".env.example");
const envFile = path.join(root, ".env");

if (!fs.existsSync(example)) {
  console.error("Missing .env.example");
  process.exit(1);
}

if (!fs.existsSync(envFile)) {
  fs.copyFileSync(example, envFile);
  console.log("Created .env from .env.example");
} else {
  console.log(".env already exists");
}

console.log("Environment ready. DATABASE_URL is read from the project root .env file.");
