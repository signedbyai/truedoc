import { defineConfig } from "vitest/config";
import path from "path";

// Route-handler test files import from "./route", which in turn imports
// other app modules via the "@/..." path alias. tsconfig.json's "paths"
// isn't picked up by Vitest automatically, so it's mirrored here.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
