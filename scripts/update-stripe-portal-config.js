// One-off script: enables VAT/tax-ID + billing name/address self-service
// updates, and confirms invoice history, on the live Stripe Customer Portal
// (the same portal /api/billing/portal already opens for "Manage billing").
// See INVOICE_VAT_SETTINGS_SCOPE.md for the full scope this implements.
//
// Can't run from the sandbox this was written in -- outbound requests to
// api.stripe.com are blocked by its network proxy (confirmed: `curl
// https://api.stripe.com/...` returns "403 from proxy after CONNECT"). Run
// this from a machine with normal internet access instead:
//
//   cd signedby-app
//   export $(grep STRIPE_SECRET_KEY .env.local | tr -d ' ')
//   node scripts/update-stripe-portal-config.js
//
// Safe to re-run -- it reads the current default configuration first and
// only merges in the customer_update/invoice_history features, leaving every
// other existing feature (payment method update, subscription cancel, etc.)
// untouched. If no configuration exists yet, it creates one and makes it the
// account default.

// Plain CommonJS script, run directly with `node` (no bundler), not part of
// the Next.js app build.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Stripe = require("stripe");

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY is not set in this shell. See the comment at the top of this file.");
    process.exit(1);
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const { data: configs } = await stripe.billingPortal.configurations.list({ limit: 100 });
  const existing = configs.find((c) => c.is_default) ?? configs[0] ?? null;

  const desiredFeatures = {
    ...(existing?.features ?? {}),
    invoice_history: { enabled: true },
    customer_update: {
      enabled: true,
      allowed_updates: ["tax_id", "name", "address"],
    },
  };

  if (existing) {
    const updated = await stripe.billingPortal.configurations.update(existing.id, {
      features: desiredFeatures,
    });
    console.log(`Updated existing configuration ${updated.id} (was default: ${existing.is_default}).`);
    console.log(JSON.stringify(updated.features, null, 2));
  } else {
    const created = await stripe.billingPortal.configurations.create({
      features: desiredFeatures,
      business_profile: {},
    });
    console.log(`No configuration existed -- created ${created.id}.`);
    console.log(
      "Set it as the account default in the Stripe Dashboard: Settings -> Billing -> Customer portal, " +
        "since the Configurations API can't set is_default directly."
    );
    console.log(JSON.stringify(created.features, null, 2));
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
