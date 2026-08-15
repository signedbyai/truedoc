// Inlines verify-core.mjs into shell.html to produce one self-contained file.
import { readFileSync, writeFileSync } from "fs";
const core = readFileSync("verify-core.mjs", "utf8")
  .replace(/^export\s+/gm, "")            // no module boundary once inlined
  .replace(/\/\*\s*-+\s*\*\//g, "");
const html = readFileSync("shell.html", "utf8").replace("/*__CORE__*/", core);
writeFileSync("index.html", html);
console.log("index.html", (html.length / 1024).toFixed(1) + " KB");
