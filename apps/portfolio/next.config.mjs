const base = process.env.BASE_PATH || "";

/** @type {import('next').NextConfig} */
export default {
  output: "export",
  basePath: base,
  images: { unoptimized: true },
  transpilePackages: ["@repo/ui"],
  env: { NEXT_PUBLIC_BASE: base },
};
