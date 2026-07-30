# Scope: EU badges, next certification, and EUID login

Status: SCOPED, NOT BUILT. Waiting on explicit go-ahead.

## Is there a "verification options" setup for adding a new certification?

No — worth being direct about this. Homepage trust content (`TRUSTED_BY` in
`homepage-content.ts`, the `/security` page's claim list) is hardcoded copy,
not a settings/admin toggle. There's no CMS or self-service panel where
adding a badge is a config change — every badge on the homepage today is a
code + design change I'd make. So "setup" isn't the blocker for any of these;
the real cost is always external (an auditor, a government body, an
integration), never an internal system gap.

## What's already true, and free to claim today

`/security` already states "EEA-based processing" and your legal pages
(`/privacy`, `/dpa`) already carry the 2026-07-20 eIDAS/DPA-Annex-A framing.
Two genuinely honest, zero-cost badges are sitting unclaimed on the
homepage right now:

- **"EU-based company"** — SPRK10 B.V. is a real Dutch entity. DocuSign,
  PandaDoc, and SignNow are all US companies; this is a true, differentiated
  claim you can make with a text badge and zero setup.
- **"GDPR-compliant / EU data residency"** — already true per `/security`
  and the DPA; a homepage badge is just surfacing what's already documented,
  not a new commitment.

**Recommendation: ship these two first, this week, before spending money on
anything formal.** They cost a design pass, not a certification process.

## The formal options, ranked by actual cost/effort (researched, not assumed)

| Option | Cost | Timeline | Verdict |
|---|---|---|---|
| Self-asserted EU/GDPR badges (above) | ~free | days | **Do this first** |
| ISO 27001 | $15K–$50K, narrower scopes can land near the low end | 6–9 months | Real credibility, real cost — not "next easiest," park until there's revenue/deal pressure demanding it |
| SOC 2 Type 1 | $15K–$40K | 3–5 months (faster if basic controls exist) | Same tier as ISO 27001; US-centric signal (bigger deal-closer for US enterprise buyers than EU ones) |
| Becoming an eIDAS Qualified Trust Service Provider yourself | Audited conformity assessment against ETSI/ISO 17065, ongoing liability as a licensed trust service | Many months, meaningfully more than ISO 27001 | Not realistic as a near-term "certification" — this is a regulated-entity undertaking, not a badge |

None of these are "next easiest" in the sense of cheap-and-fast. The
honest next easiest *formal* step, if you want one, is smaller than any of
the above:

**Integrate with an existing eIDAS Qualified Trust Service Provider (QTSP)**
rather than becoming one. This gets you a real, verifiable "eIDAS Qualified
Electronic Signature available" product claim — not just a compliance
badge — without SignedBy taking on QTSP liability itself. At least one QTSP
(TrustPro) currently offers free QES issuance via API specifically to make
this kind of integration cheap for platforms like SignedBy. This would be a
**product feature scope** (a QES option alongside your existing signature
flow), not a homepage badge — worth its own separate scoping pass if you
want to pursue it, since it touches the signing flow itself and directly
strengthens the "signing infra made for Europe" story you're also going for
in the console product (see `CONSOLE_AI_SIGNING_SCOPE.md`).

## EUID login

This needs a precise definition of "EUID" first — there are two different
things this could mean, and they're not equally ready:

- **EU Login** (the European Commission's own SSO, formerly ECAS) — this is
  for accessing EU institutional services, not a general-purpose
  "Sign in with EU" button available to any SaaS. Not applicable here.
- **The EUDI Wallet** (EU Digital Identity Wallet, under eIDAS 2.0 /
  Regulation 2024/1183) — this is almost certainly what you mean. Current
  state as of mid-2026: every member state must offer a certified wallet to
  citizens by end of 2026, but the *obligation for private-sector relying
  parties to accept it* doesn't land until late 2027, and only for
  regulated sectors (banking, healthcare, telecom, large platforms) first.
  Integrating today means registering as a "Relying Party," declaring which
  credential attributes you request, and building against wallet-verifier
  APIs that are still actively stabilizing across member states.

**Verdict: not easy today, and premature for SignedBy specifically.** It's
a real infrastructure build (wallet-verifier integration, per-attribute
registration, cross-member-state variance), not a login-button add. The
credibility upside is real and grows every quarter through 2026–2027 as
adoption ramps — worth flagging as a genuine 2027 roadmap item tied to the
"Europe-native" positioning, not something to promise now.

## Recommended sequencing
1. Ship the two free badges (EU company + GDPR/EEA) this week.
2. Decide whether the QTSP/QES integration is worth a dedicated scope —
   it's the one item here with real product + marketing upside that's
   actually achievable this year.
3. Park ISO 27001/SOC 2 until a specific deal or investor asks for it by
   name (same "demand-driven, not opportunistic" discipline already applied
   to other backlog items like the DocSend-style data room).
4. Park EUID/EUDI Wallet login as a 2027 note, not a current build.

## Open questions
- Confirm you want the two free badges built now.
- Confirm whether the QTSP/QES integration is worth its own scope doc, or
  stays parked with everything else here.
