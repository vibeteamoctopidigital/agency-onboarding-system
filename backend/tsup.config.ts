import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],          // ESM output
  target: "node22",
  outDir: "dist",
  sourcemap: true,
  clean: true,
  bundle: true,
  splitting: false,

  external: [
    "express",
    "@prisma/client",
    "cors",
    "cookie-parser",
    "compression",
    "dotenv",
    "helmet",
    "hpp",
    "morgan",
    "events",
    "path",
    "fs",
    "url"
  ],

  outExtension({ format }) {
    if (format === "esm") return { js: ".js" };
    return {};
  },
});
