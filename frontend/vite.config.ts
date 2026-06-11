import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split heavy vendors so the initial payload stays lean and they cache independently.
        manualChunks: {
          three: ["three", "@react-three/fiber", "@react-three/drei"],
          echarts: ["echarts"],
          motion: ["framer-motion"],
          grid: ["react-grid-layout"],
          vendor: ["react", "react-dom", "react-router-dom", "zustand", "lucide-react"],
        },
      },
    },
  },
});
