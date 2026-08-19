// One-off script: seeds the "Example Agreement" template (see
// src/lib/example-template.ts) into every EXISTING org, Free included, so
// current customers get the same starter template new upgrades get going
// forward (2026-07-31, direct instruction: "anyone that already upgraded
// to Pro or higher, make sure the example template is included").
//
// Widened to Free orgs 2026-08-19 (FREE_TEMPLATE_SANDBOX) — new Free
// signups are now seeded automatically at first login (see example-
// template.ts's seedExampleTemplateForNewUser), but that only covers
// signups going forward; this run is what backfills every Free org that
// already existed before that shipped, same "existing customers get what
// new ones get" logic as the original Pro+ backfill.
//
// Deliberately a standalone script, not a call into src/lib/example-
// template.ts directly -- that file uses this project's "@/..." path
// aliases and Next.js module resolution, neither of which a plain `node`
// process outside the Next build understands. This duplicates that file's
// constants and logic instead (kept in sync by hand -- both use the exact
// same EXAMPLE_TEMPLATE_R2_KEY, field_map shape, and PDF content, so a
// template seeded by either one is indistinguishable and the idempotency
// check works identically either way).
//
// Can't run from the sandbox this was written in -- outbound requests to
// Supabase's REST API and Cloudflare R2 are both blocked by its network
// proxy (confirmed: curl to both returned no response). Run this from a
// machine with normal internet access instead:
//
//   cd signedby-app
//   export $(grep -E "^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|CLOUDFLARE_R2_ACCOUNT_ID|CLOUDFLARE_R2_ACCESS_KEY_ID|CLOUDFLARE_R2_SECRET_ACCESS_KEY|CLOUDFLARE_R2_BUCKET_NAME)=" .env.local | tr -d ' ')
//   node scripts/backfill-example-templates.js
//
// Safe to re-run -- every org's existence check (does it already have a
// templates row pointing at EXAMPLE_TEMPLATE_R2_KEY) means a second run
// only fills in any orgs that errored or were created since the last run;
// everyone else is skipped and logged as "already had one."

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@supabase/supabase-js");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOUDFLARE_R2_ACCOUNT_ID",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "CLOUDFLARE_R2_BUCKET_NAME",
];

// Every plan gets seeded now (2026-08-19, widened from the original
// Pro-only "starter"/"team"/"business" list) -- Free orgs get the same
// shared example template so a Free API key / Console chat session has a
// real template_id to test create-and-send against. This constant name is
// now a slight misnomer (kept to avoid a bigger diff for a one-off script)
// -- it really means "every plan this script seeds," not "plans with the
// templates feature."
const TEMPLATE_PLANS = ["free", "starter", "team", "business"];

// Must match src/lib/example-template.ts's constants exactly -- see the
// file-header comment above for why this can't just import that file.
const EXAMPLE_TEMPLATE_R2_KEY = "templates/system/example-agreement.pdf";
const EXAMPLE_TEMPLATE_NAME = "Example Agreement (try me!)";
const SIGNATURE_WIDTH = 0.22;
const SIGNATURE_HEIGHT = 0.05;
const SIGNATURE_X = 0.1;
const SIGNATURE_Y = 0.8;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

async function renderExampleTemplatePdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const dark = rgb(0.06, 0.09, 0.16);
  const gray = rgb(0.45, 0.47, 0.52);
  const margin = 72;

  let y = PAGE_HEIGHT - 96;
  page.drawText("Example Agreement", { x: margin, y, size: 24, font: bold, color: dark });
  y -= 22;
  page.drawText("A sample document included with your plan — safe to send and sign for a test run.", {
    x: margin,
    y,
    size: 10,
    font,
    color: gray,
  });

  y -= 48;
  const bodyWidth = PAGE_WIDTH - margin * 2;
  const paragraph1 =
    "This Example Agreement comes with your SignedBy plan so you can try the complete signing " +
    "flow — the invite email, the recipient's signing page, and the finished, audit-trailed PDF " +
    "you get back — before sending a real document.";
  page.drawText(paragraph1, { x: margin, y, size: 12, font, color: dark, maxWidth: bodyWidth, lineHeight: 17 });

  y -= 74;
  const paragraph2 =
    "Feel free to send this to yourself or a teammate right now. There's nothing to fill in beyond " +
    "the signature below, and this document has no legal effect of any kind.";
  page.drawText(paragraph2, { x: margin, y, size: 12, font, color: dark, maxWidth: bodyWidth, lineHeight: 17 });

  const boxX = SIGNATURE_X * PAGE_WIDTH;
  const boxWidth = SIGNATURE_WIDTH * PAGE_WIDTH;
  const boxTopY = PAGE_HEIGHT - SIGNATURE_Y * PAGE_HEIGHT;
  const boxBottomY = boxTopY - SIGNATURE_HEIGHT * PAGE_HEIGHT;

  page.drawLine({
    start: { x: boxX, y: boxBottomY },
    end: { x: boxX + boxWidth, y: boxBottomY },
    thickness: 1,
    color: gray,
  });
  page.drawText("Signature", { x: boxX, y: boxBottomY - 14, size: 9, font, color: gray });

  return pdfDoc.save();
}

async function main() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(", ")}. See the comment at the top of this file.`);
    process.exit(1);
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
  });
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  // Ensure the shared source PDF exists once, up front -- every org's
  // template row below points at this same key, so there's no reason to
  // check/upload it per-org.
  let pdfExists = true;
  try {
    await r2.send(new GetObjectCommand({ Bucket: bucket, Key: EXAMPLE_TEMPLATE_R2_KEY }));
  } catch {
    pdfExists = false;
  }
  if (!pdfExists) {
    console.log(`Uploading shared example PDF to r2://${bucket}/${EXAMPLE_TEMPLATE_R2_KEY} ...`);
    const bytes = await renderExampleTemplatePdf();
    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: EXAMPLE_TEMPLATE_R2_KEY,
        Body: Buffer.from(bytes),
        ContentType: "application/pdf",
      })
    );
  } else {
    console.log("Shared example PDF already exists in R2 -- skipping upload.");
  }

  const { data: orgs, error: orgsError } = await admin
    .from("organizations")
    .select("id, name, plan")
    .in("plan", TEMPLATE_PLANS);
  if (orgsError) {
    console.error("Failed to list orgs:", orgsError.message);
    process.exit(1);
  }

  console.log(`Found ${orgs.length} org(s) on a plan this backfill covers (${TEMPLATE_PLANS.join("/")}).`);

  let seeded = 0;
  let alreadyHad = 0;
  let failed = 0;

  for (const org of orgs) {
    try {
      const { data: existing } = await admin
        .from("templates")
        .select("id")
        .eq("org_id", org.id)
        .eq("base_file_path", EXAMPLE_TEMPLATE_R2_KEY)
        .maybeSingle();
      if (existing) {
        alreadyHad += 1;
        continue;
      }

      const { error: insertError } = await admin.from("templates").insert({
        org_id: org.id,
        name: EXAMPLE_TEMPLATE_NAME,
        base_file_path: EXAMPLE_TEMPLATE_R2_KEY,
        page_count: 1,
        field_map: [
          {
            type: "signature",
            page: 1,
            x: SIGNATURE_X,
            y: SIGNATURE_Y,
            width: SIGNATURE_WIDTH,
            height: SIGNATURE_HEIGHT,
            required: true,
            role: null,
          },
        ],
      });
      if (insertError) throw new Error(insertError.message);

      seeded += 1;
      console.log(`Seeded example template for "${org.name}" (${org.id}, plan: ${org.plan}).`);
    } catch (err) {
      failed += 1;
      console.error(`Failed for org ${org.id} (${org.name}):`, err.message || err);
    }
  }

  console.log(`\nDone. Seeded: ${seeded}. Already had one: ${alreadyHad}. Failed: ${failed}. Total: ${orgs.length}.`);
}

main().catch((err) => {
  console.error("Failed:", err.message || err);
  process.exit(1);
});
