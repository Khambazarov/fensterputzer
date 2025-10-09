// astro.config.mjs
import { defineConfig } from "astro/config";
import tailwind from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel/serverless";

export default defineConfig({
  site: "https://fensterputzer.netlify.app",
  integrations: [sitemap()],
    adapter: vercel(),
  vite: {
    plugins: [tailwind()],
  },
});
