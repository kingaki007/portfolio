/** @type {import('next').NextConfig} */
export default {
  output: "export",
  images: { unoptimized: true },
  transpilePackages: ["@repo/ui"],
};
