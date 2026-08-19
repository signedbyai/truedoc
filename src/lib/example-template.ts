import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFromR2, uploadToR2 } from "@/lib/r2";

// Seeds a ready-to-send "Example Agreement" template into a new (or
// existing) Pro-or-higher org, 2026-07-31 direct instruction — so there's
// something to actually send/sign the moment templates unlocks, rather
// than an empty Templates list and a blank-page start. One functional
// field (a signature, at FIELD_TYPES' own default size/position) — "a
// single signing block," matching the ask exactly rather than a fuller
// multi-field demo contract.
//
// Every org's example template row points at the SAME shared R2 object
// (EXAMPLE_TEMPLATE_R2_KEY) rather than each org getting its own uploaded
// copy — the content is generic and never customized per-org, so a single
// shared source file is both cheaper (one R2 object, not one per org) and
// doubles as the idempotency marker: "does this org already have a
// templates row pointing at this exact key" IS "have we already seeded
// them," with no extra column or migration needed.
// Exported (2026-08-19, FREE_TIER_ONE_TEMPLATE_SCOPE.md) so plan.ts's
// checkFreePlanTemplateCap can exclude this shared seeded row when counting
// a Free org's own saved templates toward its 1-template cap — the example
// template doesn't count against that limit.
export const EXAMPLE_TEMPLATE_R2_KEY = "templates/system/example-agreement.pdf";
const EXAMPLE_TEMPLATE_NAME = "Example Agreement (try me!)";

// Matches FIELD_TYPES' own "signature" default in field-types.ts exactly,
// so this reads as a normal, ordinarily-sized field rather than something
// special-cased — an org opening this template in the field editor sees
// the same size box Suggest Fields or a manual drag would produce.
const SIGNATURE_WIDTH = 0.22;
const SIGNATURE_HEIGHT = 0.05;
const SIGNATURE_X = 0.1;
const SIGNATURE_Y = 0.8; // from the top of the page — see stampFields' y convention in generate-signed-pdf.ts

const PAGE_WIDTH = 612; // US Letter
const PAGE_HEIGHT = 792;

/** Renders the example PDF's static content — a short explanation plus a
 *  printed "Signature:" line/label sitting exactly under where the
 *  functional field box above will be positioned, the same way a real
 *  paper contract prints a line for a field SignedBy then overlays. Pure
 *  and R2/DB-free so it's unit-testable on its own. */
export async function renderExampleTemplatePdf(): Promise<Uint8Array> {
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

  // Printed line + label under where the real (interactive) signature
  // field will sit, in exactly the same coordinate space stampFields()
  // uses when it later stamps a real signature over the same spot.
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

/** Uploads the shared example PDF to its fixed R2 key if it isn't there
 *  already — checked with a real R2 read rather than assumed, since the
 *  key is shared across every org and only ever needs generating once. */
async function ensureExamplePdfUploaded(): Promise<void> {
  try {
    await getFromR2(EXAMPLE_TEMPLATE_R2_KEY);
    return; // already uploaded, from a previous org's seeding
  } catch {
    // Not found (or a transient read issue) — fall through and (re)upload.
    // uploadToR2 is a plain overwrite, so a spurious re-upload here is
    // harmless, just a redundant PUT.
  }
  const bytes = await renderExampleTemplatePdf();
  await uploadToR2(EXAMPLE_TEMPLATE_R2_KEY, Buffer.from(bytes), "application/pdf");
}

/** Seeds the example template into `orgId` if it doesn't already have one —
 *  called both from the Stripe webhook (new upgrades, going forward) and
 *  from the one-off backfill script (existing Pro+ orgs). Safe to call
 *  repeatedly: the existence check below is the only guard needed, no
 *  separate "already seeded" flag. Never throws — a failure here shouldn't
 *  take down whatever triggered it (a webhook, a backfill run); logged and
 *  swallowed instead. */
export async function seedExampleTemplateIfNeeded(orgId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("templates")
      .select("id")
      .eq("org_id", orgId)
      .eq("base_file_path", EXAMPLE_TEMPLATE_R2_KEY)
      .maybeSingle();
    if (existing) return;

    await ensureExamplePdfUploaded();

    const { error } = await admin.from("templates").insert({
      org_id: orgId,
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
    if (error) console.error("Failed to seed example template", orgId, error);
  } catch (err) {
    console.error("Failed to seed example template", orgId, err);
  }
}

/** Seeds the same shared Example Agreement into a just-signed-up user's
 *  personal org (FREE_TEMPLATE_SANDBOX, 2026-08-19 direct instruction —
 *  "templates may have to work in the free version since people can't
 *  really try out the API unless they have access to it"). Confirmed the
 *  gap first: a Free org already gets a real API key and passes auth on
 *  POST /api/v1/documents (freeCapped: true, 3 sends/month — see
 *  api-auth.ts), but that route requires a template_id the org owns, and
 *  saving a template is Pro+-gated (`templates` in plan.ts) — so a Free
 *  dev could authenticate and then had nothing to actually send. Console
 *  chat's send_document/bulk_send tools hit the same dead end for the same
 *  reason.
 *
 *  This does NOT touch that gate — Free still can't save/customize its own
 *  templates, only send the one generic shared example, same as every
 *  Pro+ org already gets via the Stripe webhook below. Takes a userId
 *  rather than an orgId because the only place this needs to fire (first
 *  login) doesn't have an org row in hand yet — personal orgs are created
 *  by a DB trigger on signup (0002_new_user_org.sql), so by the time a
 *  first-login callback runs, the membership already exists and can be
 *  resolved here. Never throws — same fire-and-forget contract as
 *  seedExampleTemplateIfNeeded above, called the same way (`void`) from
 *  every first-login call site (login/actions.ts x2, auth/callback/
 *  route.ts). */
export async function seedExampleTemplateForNewUser(userId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: membership } = await admin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!membership) return;
    await seedExampleTemplateIfNeeded(membership.org_id);
  } catch (err) {
    console.error("Failed to seed example template for new user", userId, err);
  }
}
