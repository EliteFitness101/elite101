import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        // Keep the initial app shell lean and isolate heavyweight dependencies.
        // Route-level lazy imports remain independently split by Vite.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          const normalized = id.replace(/\\/g, "/");
          const marker = "/node_modules/";
          const packagePath = normalized.slice(normalized.lastIndexOf(marker) + marker.length);
          const segments = packagePath.split("/");
          const scope = segments[0];
          const packageName = scope.startsWith("@") ? segments[1] : scope;

          if (["react", "react-dom", "scheduler", "use-sync-external-store"].includes(scope)) return "vendor-react";
          if (["react-router", "react-router-dom"].includes(scope)) return "vendor-router";
          if (scope === "@supabase") return "vendor-supabase";
          if (scope === "@tanstack") return "vendor-query";
          if (["framer-motion", "motion-dom", "motion-utils"].includes(scope)) return "vendor-motion";
          if (scope === "@radix-ui") return "vendor-radix";
          if (scope === "lucide-react") return "vendor-icons";
          if (scope === "sonner") return "vendor-notifications";

          // Isolate remaining packages rather than creating one oversized vendor chunk.
          const chunkName = scope.startsWith("@") ? `${scope.slice(1)}-${packageName}` : scope;
          return `vendor-${chunkName.replace(/[^a-zA-Z0-9-]/g, "-")}`;
        },
      },
    },
  },
}));
