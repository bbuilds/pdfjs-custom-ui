import { defineConfig } from "vite";

export default defineConfig({
  // This sets the base URL for GitHub Pages (replace 'pdfjs' with your actual repo name)
  // This assumes your repository name is 'pdfjs'
  base: process.env.NODE_ENV === "production" ? "/pdfjs/" : "/",

  // Optionally add build settings
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: true,
  },
});
