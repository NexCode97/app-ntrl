import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/(catalog|customers)/,
            handler: "NetworkFirst",
            options: { cacheName: "api-read", expiration: { maxAgeSeconds: 3600 } },
          },
        ],
        backgroundSync: {
          name: "ntrl-sync-queue",
          options: { maxRetentionTime: 24 * 60 },
        },
      },
      manifest: {
        name: "APP NTRL",
        short_name: "NTRL",
        description: "Natural Ropa Deportiva — Gestión de Pedidos",
        theme_color: "#98f909",
        background_color: "#000000",
        display: "standalone",
        orientation: "any",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
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
