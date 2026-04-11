import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
      },
      manifest: {
        name: "Natural Ropa Deportiva - Gestión interna de pedidos",
        short_name: "Natural",
        description: "Natural Ropa Deportiva — Gestión de Pedidos",
        theme_color: "#98f909",
        background_color: "#000000",
        start_url: "/",
        display: "standalone",
        orientation: "any",
        icons: [
          { src: "icons/icon-192.png",          sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png",          sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api":     { target: "http://localhost:3000", changeOrigin: true },
      "/uploads": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
});
