import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Tests live in ./tests (not next to the source). Reuse the Vite config so the
// TSX in src/registry.tsx is compiled exactly as it is for the app.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ["tests/**/*.test.ts"],
      environment: "node",
    },
  }),
);
