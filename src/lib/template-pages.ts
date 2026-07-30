// Content for the public /templates/[slug] SEO landing pages — one per
// AI Drafter document type (see ai-draft-types.ts's DOCUMENT_TYPES). Pure
// data, no server-only imports, so it's safe for both the dynamic route's
// generateMetadata (server) and generateStaticParams.
//
// Why this exists: SignNow/airSlate's biggest organic-traffic lever is
// programmatic SEO — a large set of "free [document] template" pages that
// each rank for a long-tail search nobody else bothers targeting
// individually (see the LinkedIn marketing research, 2026-07-21). SignedBy
// already has the underlying engine (the AI Drafter's 6 document types) —
// this reuses it as public content instead of building a separate template
// library from scratch.
//
// Every `example` below is real, complete, useful content — not a thin
// gated teaser — both because a genuinely useful page is what ranks, and
// because it's the honest version of "free template": you can read and use
// the example without an account. The CTA is for customizing it to your
// own situation with AI, which is accurately described as a Pro-plan
// feature (see each page's cta copy) — never oversold as free, since a
// fresh Free-plan signup does NOT get AI drafting (see plan.ts's aiDraft
// gate). Getting that wrong on a public page would be a promise the product
// doesn't keep.

import type { DraftDocumentType } from "@/lib/ai-draft-types";

export type TemplatePage = {
  slug: string;
  documentType: DraftDocumentType;
  seoTitle: string;
  metaDescription: string;
  h1: string;
  intro: string[];
  example: { title: string; body: string };
  faq: { q: string; a: string }[];
};

export const TEMPLATE_PAGES: TemplatePage[] = [
  {
    slug: "freelance-agreement-template",
    documentType: "freelance",
    seoTitle: "Free Freelance Agreement Template — Services Contract",
    metaDescription:
      "A free freelance agreement template covering payment, deliverables, IP ownership, and termination. Customize it and send it for e-signature in minutes.",
    h1: "Free Freelance Agreement Template",
    intro: [
      "A freelance agreement (sometimes called a services agreement or independent contractor agreement) sets out what a freelancer will deliver, what they'll be paid, and who owns the finished work — before either side starts relying on a verbal understanding of the arrangement.",
      "It matters most for exactly the kind of work SignedBy is built around: a solo designer, developer, writer, or consultant taking on a project for a client, where a one-page written agreement is enough protection without needing a lawyer to draft one from scratch.",
    ],
    example: {
      title: "Freelance Services Agreement",
      body: `This Freelance Services Agreement ("Agreement") is made between [Client Name] ("Client") and [Freelancer Name] ("Freelancer").

1. Scope of Work
Freelancer will provide the following services to Client: [description of deliverables — e.g. "design and delivery of a 5-page marketing website, including up to 2 rounds of revisions"].

2. Payment
Client will pay Freelancer [Amount] for the services described above, payable [payment schedule — e.g. "50% upon signing, 50% upon delivery" or "net-30 from invoice date"].

3. Timeline
Work will begin on [Start Date] and be completed by [End Date], subject to timely feedback and materials from Client.

4. Ownership of Work
Upon full payment, Freelancer assigns to Client all rights, title, and interest in the final deliverables. Freelancer retains the right to display the work in their portfolio unless otherwise agreed in writing.

5. Independent Contractor Status
Freelancer is an independent contractor, not an employee of Client. Freelancer is responsible for their own taxes, insurance, and benefits.

6. Confidentiality
Each party agrees to keep the other's confidential business information private, both during and after this engagement.

7. Termination
Either party may terminate this Agreement with [Notice Period — e.g. "14 days"] written notice. Client will pay for all work completed up to the termination date.

SIGNATURES

Client
Signature: _______________________
Print Name: [Client Name]
Date: _______________________

Freelancer
Signature: _______________________
Print Name: [Freelancer Name]
Date: _______________________`,
    },
    faq: [
      {
        q: "Is a freelance agreement legally binding?",
        a: "Yes, once both parties sign it. Like any contract, it needs an offer, acceptance, and consideration (the payment and the work being exchanged) — a signed freelance agreement satisfies all three, and an e-signature carries the same legal weight as a wet-ink one under the U.S. ESIGN Act and similar laws elsewhere.",
      },
      {
        q: "Do I need a lawyer to use this template?",
        a: "For a standard, everyday engagement, most freelancers and small clients use a template like this one directly. For a high-value, unusual, or high-risk project, it's worth having a lawyer review the specific terms — this template is a starting point, not legal advice.",
      },
      {
        q: "What's the difference between a freelance agreement and an NDA?",
        a: "A freelance agreement covers the whole working relationship — scope, payment, ownership, termination. An NDA covers only confidentiality, and is often signed separately (sometimes before any paid work begins, e.g. during an initial scoping conversation).",
      },
    ],
  },

  {
    slug: "nda-template",
    documentType: "nda",
    seoTitle: "Free NDA Template — Non-Disclosure Agreement",
    metaDescription:
      "A free NDA template for one-way or mutual confidentiality agreements. Customize it and send it for e-signature in minutes — no lawyer required for standard use.",
    h1: "Free NDA Template",
    intro: [
      "A non-disclosure agreement (NDA) is a promise, in writing, that information shared between two parties stays private. It's the most commonly signed document before any real business discussion happens — a partnership conversation, a hiring process, a pitch to an investor, or an early conversation with a potential client.",
      "NDAs come in two shapes: mutual (both sides share confidential information and both are bound) and one-way (only one side is disclosing). The example below is written as mutual, since that covers most everyday situations — it's easy to adjust to one-way when you customize it.",
    ],
    example: {
      title: "Mutual Non-Disclosure Agreement",
      body: `This Non-Disclosure Agreement ("Agreement") is made between [Party A Name] and [Party B Name] (together, the "Parties"), in connection with [Purpose — e.g. "discussions regarding a potential business partnership"].

1. Confidential Information
"Confidential Information" means any business, technical, or financial information disclosed by either Party that is marked confidential or would reasonably be understood to be confidential given the nature of the information and the circumstances of disclosure.

2. Exclusions
Confidential Information does not include information that: (a) is or becomes publicly available through no fault of the receiving Party; (b) was already known to the receiving Party before disclosure; or (c) is independently developed without use of the disclosing Party's Confidential Information.

3. Obligations
Each Party agrees to: (a) use the other Party's Confidential Information only for the Purpose stated above; (b) not disclose it to any third party without prior written consent; and (c) protect it with the same degree of care used to protect its own confidential information, and no less than reasonable care.

4. Duration
This Agreement's confidentiality obligations remain in effect for [Duration — e.g. "2 years"] from the date of signing.

5. Remedies
Each Party acknowledges that unauthorized disclosure may cause irreparable harm, and that the disclosing Party may seek injunctive relief in addition to any other available remedy.

SIGNATURES

Party A
Signature: _______________________
Print Name: [Party A Name]
Date: _______________________

Party B
Signature: _______________________
Print Name: [Party B Name]
Date: _______________________`,
    },
    faq: [
      {
        q: "What's the difference between a mutual and a one-way NDA?",
        a: "A mutual NDA binds both signers — used when both sides will share confidential information (e.g. two companies exploring a partnership). A one-way NDA only restricts the party receiving information, and is common when a contractor, freelancer, or job candidate is being shown confidential material by a company.",
      },
      {
        q: "How long does an NDA last?",
        a: "There's no fixed rule — 1 to 3 years is typical for most business discussions, though some NDAs (especially around trade secrets) run longer. The example above uses a 2-year placeholder you can adjust.",
      },
      {
        q: "Does signing an NDA electronically hold up legally?",
        a: "Yes. An e-signed NDA is enforceable the same way a paper one is, under the U.S. ESIGN Act, UETA, and the EU's eIDAS regulation, among others — the signature and a timestamped audit trail are what matter, not the medium.",
      },
    ],
  },

  {
    slug: "waiver-template",
    documentType: "waiver",
    seoTitle: "Free Liability Waiver Template — Release of Liability",
    metaDescription:
      "A free liability waiver / release form template for workshops, events, and activities. Customize it and collect signatures from every participant in minutes.",
    h1: "Free Liability Waiver Template",
    intro: [
      "A liability waiver (or release of liability) is signed by a participant before taking part in an activity that carries some inherent risk — a workshop, a class, a rental, a one-day event — acknowledging that risk and releasing the organizer from responsibility for ordinary accidents.",
      "It's one of the most common documents organizers of any size collect, and one of the worst to manage on paper: every participant needs to sign before showing up, and paper waivers are the first thing that go missing when you actually need one.",
    ],
    example: {
      title: "Waiver and Release of Liability",
      body: `In consideration of being permitted to participate in [Activity Name — e.g. "a one-day photography workshop"] organized by [Organizer Name] on [Date], I, the undersigned participant, agree to the following:

1. Assumption of Risk
I understand that participating in this activity involves inherent risks, including but not limited to [relevant risks — e.g. "physical injury, equipment damage, or exposure to outdoor conditions"]. I voluntarily assume all such risks.

2. Release of Liability
I release [Organizer Name] and its staff, instructors, and volunteers from any liability for injury, loss, or damage arising from my participation, except in cases of gross negligence or willful misconduct.

3. Medical Information
I confirm that I am physically able to participate in this activity. In case of emergency, please contact:
Name: [Emergency Contact Name]
Phone: [Emergency Contact Phone]

4. Acknowledgment
I have read this waiver, understand its contents, and sign it voluntarily.

SIGNATURE

Signature: _______________________
Print Name: [Participant Name]
Date: _______________________`,
    },
    faq: [
      {
        q: "Does a liability waiver protect against everything?",
        a: "No — a waiver typically protects an organizer against claims of ordinary negligence, not gross negligence or intentional harm. It's a real, meaningful protection, but it isn't a blanket shield, and enforceability rules vary somewhat by state or country.",
      },
      {
        q: "Can I collect waivers from a large group quickly?",
        a: "Yes — since every participant signs the same document, this is a good candidate for a saved template you reuse for every event, so you're not rebuilding it each time.",
      },
      {
        q: "Do minors need a different waiver?",
        a: "Generally yes — a parent or legal guardian needs to sign on a minor's behalf, and the language should reflect that. This template is written for an adult participant signing for themselves.",
      },
    ],
  },

  {
    slug: "boiler-maintenance-agreement-template",
    documentType: "boiler_maintenance",
    seoTitle: "Free Boiler Maintenance Agreement Template",
    metaDescription:
      "A free boiler / heating maintenance agreement template covering service schedule, call-outs, and payment terms. Customize it and send it for e-signature.",
    h1: "Free Boiler Maintenance Agreement Template",
    intro: [
      "A boiler maintenance agreement sets the terms for an ongoing (usually annual) heating-system service relationship between an engineer or contractor and a property owner — what's covered by the standard visit, what counts as a billable extra, and what happens when the boiler breaks down outside the scheduled visit.",
      "It's a natural fit for a signed agreement rather than a verbal understanding, since it usually spans a full year and covers real money on both sides: a missed inspection or a disputed call-out fee is much easier to resolve when the terms were written down and signed up front.",
    ],
    example: {
      title: "Boiler / Heating System Maintenance Agreement",
      body: `This Maintenance Agreement ("Agreement") is made between [Contractor Name] ("Contractor") and [Customer Name] ("Customer"), covering the heating system at [Property Address].

1. Scope of Service
Contractor will perform [Number — e.g. "one"] annual inspection and service of the heating system described as: [Equipment description — e.g. "gas combi boiler, make/model"].

2. What's Included
The annual service includes a full inspection, safety check, and standard cleaning. Replacement parts, and any work beyond the standard inspection, will be quoted and billed separately.

3. Emergency Call-Outs
Emergency breakdown call-outs are [Included / Billed separately at Rate] and Contractor will aim to respond within [Response Time — e.g. "24 hours"] of being contacted.

4. Payment
Customer will pay [Amount] for this Agreement, payable [Payment Terms — e.g. "annually in advance" or "monthly by direct debit"].

5. Term and Renewal
This Agreement covers the period from [Start Date] to [End Date], and renews automatically unless either party gives [Notice Period] written notice.

6. Liability and Insurance
Contractor confirms they hold current [Gas Safe / relevant licensing] registration and appropriate liability insurance for work carried out under this Agreement.

SIGNATURES

Contractor
Signature: _______________________
Print Name: [Contractor Name]
Date: _______________________

Customer
Signature: _______________________
Print Name: [Customer Name]
Date: _______________________`,
    },
    faq: [
      {
        q: "What should a boiler maintenance agreement cover that a one-off invoice doesn't?",
        a: "An ongoing agreement fixes the service schedule and price for the year, and — importantly — spells out what happens for an emergency call-out outside the scheduled visit, which is exactly the moment a verbal-only arrangement causes disputes.",
      },
      {
        q: "Should I include licensing/certification details?",
        a: "Yes, if you're the contractor — stating your relevant registration (e.g. Gas Safe in the UK, or the equivalent local licensing) directly in the agreement is a normal, expected practice and reassures the customer.",
      },
      {
        q: "Can this renew automatically each year?",
        a: "Yes — the example above includes an auto-renewal clause with a notice period, which is standard for recurring service agreements; adjust the notice period to whatever's fair for both sides.",
      },
    ],
  },

  {
    slug: "bicycle-rental-agreement-template",
    documentType: "bike_rental",
    seoTitle: "Free Bicycle Rental Agreement Template",
    metaDescription:
      "A free bicycle rental agreement template covering rental period, deposit, and damage liability. Customize it and collect a signature before every rental.",
    h1: "Free Bicycle Rental Agreement Template",
    intro: [
      "A bicycle rental agreement is signed before handing a bike over to a renter — recording its condition at handover, the rental period and rate, the deposit, and who's responsible if it's damaged, lost, or not returned.",
      "For a shop or individual renting out even a small number of bikes, this is worth signing every time, not just for higher-value rentals: it's the difference between a quick, on-the-spot conversation about a scratch and a real dispute about who's responsible for it.",
    ],
    example: {
      title: "Bicycle Rental Agreement",
      body: `This Rental Agreement ("Agreement") is made between [Rental Company/Owner Name] ("Owner") and [Renter Name] ("Renter").

1. Bicycle(s) and Condition
Owner rents the following bicycle(s) to Renter: [Description — e.g. "1x city bike, serial number XXXX"]. Condition at handover: [Condition notes — e.g. "no visible damage, tires and brakes checked"].

2. Rental Period and Rate
The rental period runs from [Start Date/Time] to [End Date/Time], at a rate of [Amount] per [day/hour/weekend].

3. Security Deposit
Renter will pay a refundable security deposit of [Deposit Amount], returned upon return of the bicycle(s) in the condition noted above, less any deductions for damage or missing accessories.

4. Renter's Responsibility
Renter is responsible for the bicycle(s) for the full rental period, including any damage, loss, or theft, except for normal wear and tear. Renter agrees to use the bicycle(s) safely and follow all applicable traffic laws.

5. Return Condition
The bicycle(s) must be returned by the end of the rental period in substantially the same condition as at handover, at [Return Location].

6. Late Returns
A late return beyond [Grace Period — e.g. "30 minutes"] will be charged an additional [Late Fee] per [hour/day].

SIGNATURES

Owner
Signature: _______________________
Print Name: [Owner Name]
Date: _______________________

Renter
Signature: _______________________
Print Name: [Renter Name]
Date: _______________________`,
    },
    faq: [
      {
        q: "Do I need a signed agreement for a short, casual rental?",
        a: "It's worth it even for an hour-long rental — the deposit and damage terms are what actually protect you, and having the renter's signature on file (with a timestamp) is far stronger than a verbal handover.",
      },
      {
        q: "How should I handle the security deposit?",
        a: "State the exact amount and how it's returned (or partially withheld) directly in the agreement, so there's no ambiguity at return time. Many small rental operators collect the deposit as a separate hold rather than through this agreement itself — the agreement just needs to state the terms clearly.",
      },
      {
        q: "Can I reuse the same agreement for every rental?",
        a: "Yes — save it as a template once you've customized the standard terms (rates, deposit, location), and you'll only need to fill in the renter's details and bike-specific notes each time.",
      },
    ],
  },

  {
    slug: "general-agreement-template",
    documentType: "general",
    seoTitle: "Free General Agreement Template — Simple Contract",
    metaDescription:
      "A free general-purpose agreement template for simple arrangements between two parties. Customize it and send it for e-signature in minutes.",
    h1: "Free General Agreement Template",
    intro: [
      "Not every arrangement needs a specialized contract — sometimes you just need a plain, written record of what two parties agreed to: who's doing what, what's being exchanged, and how either side can end it. That's what a general agreement is for.",
      "It's a good starting point for a one-time equipment rental, an informal partnership, a simple exchange of services, or any small-business arrangement that doesn't fit neatly into a more specific template.",
    ],
    example: {
      title: "General Agreement",
      body: `This Agreement is made between [Party A Name] ("Party A") and [Party B Name] ("Party B").

1. Purpose
This Agreement covers [Description of the arrangement — e.g. "the one-time rental of photography equipment from Party A to Party B"].

2. What Each Party Agrees To Do
Party A agrees to: [Party A's obligations].
Party B agrees to: [Party B's obligations].

3. Payment or Exchange
[Description of any payment or exchange involved — e.g. "Party B will pay Party A [Amount] upon [milestone]"].

4. Timeline
This Agreement covers the period from [Start Date] to [End Date] (or: "This Agreement remains in effect until its purpose is fulfilled").

5. Ending This Agreement
Either party may end this Agreement with [Notice Period] written notice to the other.

6. General Terms
This Agreement represents the full understanding between the parties regarding its subject matter. Any changes must be agreed to in writing by both parties.

SIGNATURES

Party A
Signature: _______________________
Print Name: [Party A Name]
Date: _______________________

Party B
Signature: _______________________
Print Name: [Party B Name]
Date: _______________________`,
    },
    faq: [
      {
        q: "When should I use a general agreement instead of a more specific template?",
        a: "Use a specific template (freelance, NDA, waiver, etc.) when your situation matches it closely — it'll already cover the details that type of arrangement usually needs. Reach for a general agreement when the arrangement doesn't fit one of those shapes, or is simple enough that a plain written record is really all you need.",
      },
      {
        q: "Is a short, general agreement still legally binding?",
        a: "Yes — length isn't what makes a contract enforceable. What matters is that both parties clearly agreed to specific terms and signed. A short, clear agreement often holds up better than a long one with vague language.",
      },
      {
        q: "Can I turn this into a more detailed contract later?",
        a: "Yes — many arrangements start with something like this and get more specific over time. If your situation grows more complex, that's a good signal to move to a more specialized template, or have a lawyer review it.",
      },
    ],
  },
];

export function findTemplatePage(slug: string): TemplatePage | undefined {
  return TEMPLATE_PAGES.find((t) => t.slug === slug);
}
