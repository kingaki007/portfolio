import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const site = process.env.BASE_PATH || "";

export default defineConfig({
  base: `${site}/algo/`,
  plugins: [react()],
});
