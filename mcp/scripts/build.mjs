import * as esbuild from "esbuild";

// Build the committed dist bundles. Runs esbuild through its JS API so the
// shebang banner never passes through a shell: the old npm scripts used a
// single-quoted --banner:js argument, which the Windows script shell does
// not strip, so esbuild received a stray positional file and npm run build
// failed there (#33).
await esbuild.build({
  entryPoints: ["src/index.ts", "src/cli.ts"],
  outdir: "dist",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  external: ["fsevents"],
  banner: { js: "#!/usr/bin/env node" },
});
