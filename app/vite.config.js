/* eslint-disable import/no-extraneous-dependencies */
// silence `'vite' should be listed in project's dependencies, not devDependencies`

import glob from "glob";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { viteStaticCopy } from "vite-plugin-static-copy";

// import from "path" and "fs" causes eslint to crash for some reason
const path = require("path");
const { readFileSync, writeFileSync } = require("fs");

function prodScriptPlugin(command) {
  return {
    name: "prod-script",
    buildStart() {
      if (command === "build") {
        const targetFilePath = path.resolve(__dirname, "./templates/base.html");

        const html = readFileSync(targetFilePath, "utf-8");

        const updatedHtml = html.replace(
          `<script type="module">
      import "http://localhost:5173/@vite/client";
      window.process = { env: { NODE_ENV: "development" } };
    </script>
    <script type="module" src="http://localhost:5173/js/index.js"></script>`,
          `<script type="module" src="/js/index.js"></script>`,
        );

        writeFileSync(targetFilePath, updatedHtml);
      }
    },
  };
}

export default defineConfig(({ command }) => ({
  appType: "mpa",
  build: {
    // include source maps if env var set to true
    sourcemap: process.env.SOURCE_MAP === "true",
    rollupOptions: {
      input: Object.fromEntries(
        glob
          .sync(path.join(__dirname, "/**/*.html"))
          .filter((htmlFilePath) => !htmlFilePath.includes("dist/"))
          .map((htmlFilePath) => {
            const baseName = path.basename(htmlFilePath);
            return [
              baseName.slice(
                0,
                baseName.length - path.extname(baseName).length,
              ),
              htmlFilePath,
            ];
          }),
      ),
    },
  },
  // we want to preserve the same directory structure between / at dev time and
  // dist/ at prod time, so copy static files manually with viteStaticCopy
  // instead of using the public/ dir
  publicDir: false,
  plugins: [
    viteStaticCopy({
      targets: [
        { src: "robots.txt", dest: "" },
        { src: "favicon.ico", dest: "" },
        { src: "images/", dest: "" },
      ],
    }),
    VitePWA({
      includeAssets: [`favicon.ico`, `images/logo/apple-touch-icon.png`],
      manifest: {
        name: "My Web App",
        short_name: "mwa",
        description: "This is a test web app",
        //
        icons: [
          {
            src: `images/logo/logo_512x512.png`,
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: `images/logo/logo_192x192.png`,
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: `images/logo/logo_192x192.png`,
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        start_url: `index.html`,
        display: "fullscreen",
        // TODO: USE ACTUAL THEME COLORS
        theme_color: "#FFFFFF",
        background_color: "#FFFFFF",
      },
    }),
    prodScriptPlugin(command),
  ],
}));
