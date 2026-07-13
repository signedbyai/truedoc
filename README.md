# SignedBy

Lean e-signature app. Next.js (App Router) + Supabase + Cloudflare R2 + Resend + Stripe.
See `SignedBy_Build_Plan.docx` (project folder) for the full product/architecture rationale.

Current state: Week 1–2 milestone — repo scaffold, auth, DB schema, landing page + waitlist.
Upload/signing flow is not built yet.

## 1. One-time setup — connecting your 5 accounts

You said these accounts already exist. Here's exactly where to get each key and where it goes
in `.env.local` (copy `.env.local.example` to `.env.local` first — it's git-ignored, so secrets
never get committed).

### Supabase
1. Open your project at [supabase.com/dashboard](https://supabase.com/dashboard) → **Project Settings → API**.
2. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`.
3. Copy the **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copy the **service_role** key (click "Reveal") → `SUPABASE_SERVICE_ROLE_KEY`. Keep this one secret — it bypasses all security rules.
5. Run the schema: **SQL Editor → New query**, paste the contents of `supabase/migrations/0001_init.sql`, run it, then repeat for `0002_new_user_org.sql`.
6. Enable email auth: **Authentication → Providers → Email** should already be on by default. Under **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` (and later `https://signedby.ai/auth/callback`) to the redirect allow-list.

### Cloudflare (R2 storage)
1. Dashboard → **R2 Object Storage** → create a bucket named `signedby-documents` (or your own name — just match `CLOUDFLARE_R2_BUCKET_NAME`).
2. **R2 → Manage API Tokens → Create API Token** with read/write access to that bucket.
3. Copy the **Account ID** (shown on the R2 overview page) → `CLOUDFLARE_R2_ACCOUNT_ID`.
4. Copy the generated **Access Key ID** / **Secret Access Key** → `CLOUDFLARE_R2_ACCESS_KEY_ID` / `CLOUDFLARE_R2_SECRET_ACCESS_KEY`.
   (The R2 upload/download client code lands in the Week 3–4 milestone — the bucket just needs to exist for now.)

### Resend
1. [resend.com/api-keys](https://resend.com/api-keys) → **Create API Key** → copy it into `RESEND_API_KEY`.
2. Add and verify your sending domain (or use their shared test domain while developing) under **Domains**.

### Stripe
1. **Developers → API keys** → copy the **Secret key** → `STRIPE_SECRET_KEY`, and the **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Use the **test mode** keys while developing.
2. Webhook secret is created once we wire up billing (Week 9 milestone) — for now you can leave `STRIPE_WEBHOOK_SECRET` blank.

### Vercel
Nothing to put in `.env.local` — Vercel is where this app deploys to, not a key you paste into code.
When you're ready to deploy: push this repo to GitHub, then **Vercel → Add New Project → Import** it,
and paste every variable from `.env.local` into **Project Settings → Environment Variables** there too.

### Anthropic (optional, for the AI field-detection/summary features — not needed yet)
Get a key at [platform.claude.com](https://platform.claude.com) → `ANTHROPIC_API_KEY`.

### Mistral (optional, alternative AI provider — org-selectable in dashboard/settings)
Only needed if you want the Mistral option to actually work; Anthropic remains the default either way.
Get a key at [console.mistral.ai](https://console.mistral.ai) → `MISTRAL_API_KEY`.

## 2. Running locally

```bash
npm install
cp .env.local.example .env.local   # then fill in the real values above
npm run dev
```

Open http://localhost:3000. The landing page and waitlist form work as soon as Supabase is
connected. Sign in via `/login` sends a magic-link email through Supabase Auth (no Resend
needed for that specific email — Supabase sends its own auth emails by default).

## 3. What's built vs. what's next

Built (Week 1–2):
- Landing page with waitlist capture (`/`, `POST /api/waitlist`)
- Magic-link auth (`/login`, `/auth/callback`, protected `/dashboard`)
- Full database schema with Row Level Security (`supabase/migrations/`)
- Auto-provisioning of a personal workspace on signup

Not built yet (see the 12-week roadmap in the build plan doc):
- PDF upload + field placement editor (Week 3–4)
- Signer routing + email invites + signing page (Week 5–6)
- Audit trail + Certificate of Completion (Week 7)
- Templates + reminders (Week 8)
- Stripe billing (Week 9)
