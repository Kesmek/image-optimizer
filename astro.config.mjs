// @ts-check
import { defineConfig } from "astro/config";
import solidJs from "@astrojs/solid-js";
import wasmImageOptimizationPlugin from "wasm-image-optimization/vite-plugin";

// https://astro.build/config
export default defineConfig({
  integrations: [solidJs()],
  vite: {
    plugins: [wasmImageOptimizationPlugin()],
  },
});

