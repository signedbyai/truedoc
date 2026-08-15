// Reproduce the published results.
//
//   node test/verify-fixtures.mjs
//
// Zero dependencies, like the verifier itself. Put PDFs in test/fixtures/
// and describe what each should produce in test/expected.json.
//
// A fixture with no entry in expected.json is reported UNCHECKED rather
// than passing silently — a test suite that quietly ignores new inputs is
// how a verifier ends up shipping a false "verified".

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { verify } from "../verify-core.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures");
const expected = JSON.parse(readFileSync(join(here, "expected.json"), "utf8"));

// A missing fixtures directory is a LEGITIMATE state, not a failure: the
// PDFs are gitignored (some are real sealed documents, one is a third
// party's), and git cannot track an empty directory — so a fresh clone or
// a CI checkout has no test/fixtures at all. Exiting non-zero here made
// every CI run red for reasons unrelated to the code under test.
if (!existsSync(fixtures)) {
  console.log("No test/fixtures directory — nothing to check.");
  console.log("The fixtures are not redistributable; see test/README.md to make your own.");
  process.exit(0);
}
const files = readdirSync(fixtures).filter((f) => f.toLowerCase().endsWith(".pdf")).sort();
if (!files.length) {
  console.log("No fixture PDFs present — nothing to check.");
  console.log("The fixtures are not redistributable; see test/README.md to make your own.");
  process.exit(0);
}

const pad = (s, n) => String(s).padEnd(n);
let pass = 0, fail = 0, unchecked = 0;

for (const f of files) {
  const want = expected[f];
  let got;
  try {
    got = await verify(new Uint8Array(readFileSync(join(fixtures, f))));
  } catch (e) {
    console.log(`FAIL      ${pad(f, 26)} threw: ${e.message}`);
    fail++;
    continue;
  }

  if (!want) {
    console.log(`UNCHECKED ${pad(f, 26)} -> ${got.status} (no entry in expected.json)`);
    unchecked++;
    continue;
  }

  const problems = [];
  for (const key of ["status", "timestampCount", "signatureCount"]) {
    if (want[key] !== undefined && got[key] !== want[key]) {
      problems.push(`${key}: expected ${want[key]}, got ${got[key]}`);
    }
  }

  if (problems.length) {
    console.log(`FAIL      ${pad(f, 26)} ${problems.join("; ")}`);
    fail++;
  } else {
    // Match the interface: a horizon is meaningless when the proof does not
    // hold, and printing one invites reading past the failure.
    const broken = got.status === "mismatch" || got.status === "unverified";
    const until = !broken && got.provableUntil
      ? `provable to ${new Date(got.provableUntil).toISOString().slice(0, 10)}`
      : "";
    console.log(`ok        ${pad(f, 26)} ${pad(got.status, 26)} ${until}`);
    pass++;
  }
}

console.log(`\n${pass} passed, ${fail} failed, ${unchecked} unchecked`);
process.exit(fail ? 1 : 0);
