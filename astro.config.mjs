// astro.config.mjs
import { defineConfig } from "astro/config";
import tailwind from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://fensterputzer.netlify.app", // <- anpassen, wichtig für Canonicals & Sitemap
  integrations: [sitemap()],
  vite: {
    plugins: [tailwind()],
  },
});
