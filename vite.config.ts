/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type PluginOption } from "vite";

// Opt-in HTTPS for the dev server (`npm run dev:https`), needed to test
// anything gated behind a secure context from a phone on the LAN —
// microphone access above all. Browsers refuse getUserMedia and
// SpeechRecognition outright on a plain-http origin that isn't localhost,
// and report the refusal as a permission *denial*, so voice input looks
// permanently "blocked" no matter how many times you allow it. Serving the
// same LAN address over https makes it a secure context and the denial
// goes away. Left off by default since it costs a cert warning on first
// visit, which plain desktop work doesn't need to deal with.
//
// Imported lazily rather than at the top of the file so that the config
// still loads where the plugin isn't installed — a production image built
// with dev dependencies omitted, most importantly. A static import would
// run regardless of the flag and take the whole build down with it.
async function httpsPlugin(): Promise<PluginOption[]> {
  if (process.env.HTTPS !== "true") return [];
  const { default: basicSsl } = await import("@vitejs/plugin-basic-ssl");
  return [basicSsl()];
}

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss(), ...(await httpsPlugin())],
  server: {
    port: 3000,
    host: true,
    proxy: {
      "/chat/socket.io": {
        target: "https://deploy.farminsight.dev",
        changeOrigin: true,
        ws: false,
        // Explicitly typed: wrapping the config in an async factory means
        // it's no longer a bare object literal in defineConfig's argument
        // position, so this parameter no longer gets its type inferred.
        rewrite: (path: string) => path.replace(/^\/chat/, ""),
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
}));
