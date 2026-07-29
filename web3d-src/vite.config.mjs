import { defineConfig } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root,
  base: "./",
  publicDir: resolve(root, "public"),
  build: {
    outDir: resolve(root, ".."),
    emptyOutDir: false,
    target: "es2022",
    sourcemap: false,
    assetsDir: "web3d-assets",
    rollupOptions: {
      input: {
        "neko-kumojima": resolve(root, "neko-kumojima/index.html"),
        "fushigi-photo-safari": resolve(root, "fushigi-photo-safari/index.html"),
        "nyanko-karakuri-island": resolve(root, "nyanko-karakuri-island/index.html"),
        "shinkai-hikari-rescue": resolve(root, "shinkai-hikari-rescue/index.html"),
        "iro-seirei-zukan": resolve(root, "iro-seirei-zukan/index.html")
      },
      output: {
        manualChunks(id) {
          if (id.includes("babylonjs")) return "babylon";
          if (id.includes("/shared/") || id.includes("\\shared\\")) return "neko-game-core";
        }
      }
    },
    chunkSizeWarningLimit: 6000
  }
});
