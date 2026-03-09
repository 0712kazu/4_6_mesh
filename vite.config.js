import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages の repo 名
  base: "/4_6_mesh/",

  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false
  },

  server: {
    port: 5173,
    open: true
  }
});