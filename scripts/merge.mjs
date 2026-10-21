// Combine the Next static export (/) and the Vite build (/algo) into ./site
import { cpSync, rmSync, mkdirSync, copyFileSync, writeFileSync, readFileSync } from "node:fs";

const base = process.env.BASE_PATH || "";

rmSync("site", { recursive: true, force: true });
mkdirSync("site/algo", { recursive: true });
cpSync("apps/portfolio/out", "site", { recursive: true });
cpSync("apps/algo/dist", "site/algo", { recursive: true });
copyFileSync("site/algo/index.html", "site/algo/404.html");
writeFileSync("site/.nojekyll", "");

// GitHub Pages serves only the root 404.html. Deep links under /algo/ are saved
// and bounced to the SPA entry, which restores them (see apps/algo/src/main.tsx).
const redirect = `<script>
(function () {
  var base = ${JSON.stringify(base)} + "/algo/";
  var p = location.pathname;
  if (p.indexOf(base) === 0) {
    try { sessionStorage.setItem("spa-redirect", p + location.search + location.hash); } catch (e) {}
    location.replace(base);
  }
})();
</script>`;
const notFound = readFileSync("site/404.html", "utf8");
writeFileSync("site/404.html", notFound.replace("<head>", `<head>${redirect}`));
console.log(`merged into ./site (base="${base}")`);
