/**
 * Next.js configuration: static export, the base path and trailing slashes for the site's
 * address, and development-only rewrites for the static animations and fx folders.
 */

const base = process.env.BASE_PATH || "";

/** @type {import('next').NextConfig} */
export default {
  output: "export",
  basePath: base,
  // keep trailing slashes (/animations/) so relative asset paths resolve the same in dev and on GitHub Pages
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@repo/ui"],
  env: { NEXT_PUBLIC_BASE: base },
  // `next dev` does not serve a folder's index.html, so map the clean URL in development only.
  // Static hosts (GitHub Pages) already serve /animations/ from animations/index.html.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      { source: "/animations", destination: "/animations/index.html" },
      { source: "/animations/", destination: "/animations/index.html" },
      { source: "/fx", destination: "/fx/index.html" },
      { source: "/fx/", destination: "/fx/index.html" },
    ];
  },
};
