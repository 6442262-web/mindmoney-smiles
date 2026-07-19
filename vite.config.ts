import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
// ตอนพัฒนา/ทดสอบในเครื่อง แอปเรียก /api/* (Vercel Edge Function) ซึ่ง vite ไม่รู้จัก
// จึง proxy ไปที่ mock server (:54321) — มีผลเฉพาะ dev/preview ในเครื่อง Vercel ไม่ใช้ค่านี้
const localApiProxy = {
  "/api": {
    target: process.env.MOCK_API_TARGET || "http://localhost:54321",
    changeOrigin: true,
  },
};

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    proxy: localApiProxy,
  },
  preview: {
    proxy: localApiProxy,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // แยก vendor ก้อนใหญ่ออกจาก entry หลัก — โหลดขนานกันได้และ cache แยกกัน
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/") || id.includes("node_modules/react-router")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/@radix-ui")) return "radix";
          if (id.includes("node_modules/@supabase")) return "supabase";
        },
      },
    },
  },
});
