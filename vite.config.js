import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import legacy from "@vitejs/plugin-legacy";

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [
    tailwindcss(),
    react(),
    legacy({
      targets: ["defaults", "iOS >= 12", "Safari >= 12"],
    }),
  ],
});
