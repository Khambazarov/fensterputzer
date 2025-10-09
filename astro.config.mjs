// astro.config.mjs
import { defineConfig } from "astro/config";
import tailwind from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import netlify from "@astrojs/netlify/functions"; // <- Node Functions (nicht Edge)

export default defineConfig({
  site: "https://fensterputzer.netlify.app", // später auf eigene Domain ändern
  integrations: [sitemap()],
  adapter: netlify({}), // Functions-Modus (für Nodemailer)
  vite: { plugins: [tailwind()] },
});
