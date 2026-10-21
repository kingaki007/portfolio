// Combine the Next static export (/) and the Vite build (/algo) into ./site
import { cpSync, rmSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";

rmSync("site", { recursive: true, force: true });
mkdirSync("site/algo", { recursive: true });
cpSync("apps/portfolio/out", "site", { recursive: true });
cpSync("apps/algo/dist", "site/algo", { recursive: true });
// SPA fallback so deep links like /algo/stack work on static hosts
copyFileSync("site/algo/index.html", "site/algo/404.html");
writeFileSync("site/.nojekyll", "");
console.log("merged into ./site");
