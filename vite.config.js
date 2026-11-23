import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The site is plain HTML served as-is. Vite only bundles the React islands into assets/islands/,
// which is committed, so GitHub Pages keeps serving the branch with no build step.
// Each component is a separate chunk, loaded only on pages that have a place for it.
// Load islands.js without a ?v= query: the chunks import it by its bare name, and a second URL
// would load a second copy of React.
export default defineConfig({
  plugins: [react()],
  base: "./",
  publicDir: false,
  build: {
    outDir: "assets/islands",
    emptyOutDir: true,
    rollupOptions: {
      input: { islands: "src/islands.jsx" },
      output: { entryFileNames: "[name].js", chunkFileNames: "[name].js", assetFileNames: "[name][extname]" },
    },
  },
});
