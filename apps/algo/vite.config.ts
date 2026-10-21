/**
 * Vite configuration for the Algo Lab: serves and builds it under the /algo/ base path (prefixed
 * with BASE_PATH when the site is deployed under a sub-path).
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const site = process.env.BASE_PATH || "";

export default defineConfig({
  base: `${site}/algo/`,
  plugins: [react()],
});
