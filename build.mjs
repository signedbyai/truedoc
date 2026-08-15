// Inlines verify-core.mjs into shell.html to produce one self-contained file,
// and stamps it with a build identifier.
//
// WHY A SOURCE HASH AND NOT A GIT SHA
// A commit SHA looks like the obvious stamp, but it cannot work: index.html
// is committed alongside the sources that produce it, so any SHA baked into
// it necessarily names the PREVIOUS commit. A reader clicking through would
// land on the version before the one in front of them.
//
// The hash of the two source files has no such problem. It is deterministic,
// needs no git, and anyone can recompute it in one command:
//
//   cat verify-core.mjs shell.html | shasum -a 256 | cut -c1-12
//
// shell.html is hashed WITH its <!--BUILD--> placeholder still in place, so
// there is no circularity — the stamp never feeds into its own input.
import { readFileSync, writeFileSync } from "fs";
import { createHash } from "node:crypto";

const coreSrc = readFileSync("verify-core.mjs", "utf8");
const shellSrc = readFileSync("shell.html", "utf8");

const stamp = createHash("sha256")
  .update(coreSrc).update(shellSrc)
  .digest("hex").slice(0, 12);

const core = coreSrc
  .replace(/^export\s+/gm, "")            // no module boundary once inlined
  .replace(/\/\*\s*-+\s*\*\//g, "");
const html = shellSrc
  .replace("/*__CORE__*/", core)
  .replace("<!--BUILD-->", stamp);

writeFileSync("index.html", html);
console.log("index.html", (html.length / 1024).toFixed(1) + " KB", "· build", stamp);
