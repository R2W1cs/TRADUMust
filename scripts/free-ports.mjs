import { execSync } from "child_process";

const ports = process.argv.slice(2).map(Number).filter(Boolean);
if (ports.length === 0) ports.push(1234, 4000, 8001);

for (const port of ports) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.includes("LISTENING")) continue;
      const pid = trimmed.split(/\s+/).pop();
      if (pid && pid !== "0") pids.add(pid);
    }
    for (const pid of pids) {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      console.log(`Freed port ${port} (PID ${pid})`);
    }
  } catch {
    /* port not in use */
  }
}
