import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), ".firecrawl/chunks");
for (const f of fs.readdirSync(dir)) {
  const s = fs.readFileSync(path.join(dir, f), "utf8");
  const urls = [...new Set([...s.matchAll(/https?:\/\/[^"'`\s)]+/g)].map((m) => m[0]))];
  const interesting = urls.filter(
    (u) =>
      /personify|amazonaws|api\.|signlanguage|translate|graphql/i.test(u) &&
      !/w3\.org|schema\.org|google|gstatic|recaptcha/i.test(u)
  );
  const routes = [...new Set([...s.matchAll(/"\/[a-zA-Z0-9_\-/]+"/g)].map((m) => m[0]))].filter(
    (r) => /login|dashboard|api|sign|translate|demo|auth|user|token/i.test(r)
  );
  if (interesting.length || routes.length) {
    console.log("\n===", f, "===");
    if (interesting.length) console.log("urls:", interesting);
    if (routes.length) console.log("routes:", routes.slice(0, 40));
  }
}
