import { LegalPage } from "@/components/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" effectiveDate="July 14, 2026">
      <p>
        This Privacy Policy explains how SignedBy, operated by SPRK10 B.V., a company incorporated in the
        Netherlands (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), collects, uses, and protects personal
        data when you use signedby.ai, whether as an account holder (&ldquo;Sender&rdquo;) or as someone asked to
        sign a document (&ldquo;Signer&rdquo;).
      </p>
      <p>
        <em>
          This document is a first draft prepared for SignedBy&apos;s launch. It has not yet been reviewed by a
          licensed attorney and should be reviewed before being relied upon as a final, binding policy.
        </em>
      </p>

      <h2>1. Information we collect</h2>
      <p>We collect the following categories of information:</p>
      <ul>
        <li>
          <strong>Account information:</strong> your name, email address, and organization details when you sign up.
        </li>
        <li>
          <strong>Documents and field data:</strong> the PDFs you upload, the field values Signers enter (including
          typed or drawn signature images), and template configurations.
        </li>
        <li>
          <strong>Signer information:</strong> the name and email address of anyone you send a document to.
        </li>
        <li>
          <strong>Audit trail data:</strong> for every action taken on a document (created, sent, viewed, consent
          given, signed, declined, completed, voided), we record a timestamp, IP address, browser/device
          (&ldquo;user agent&rdquo;) string, and a cryptographic hash of the signed document. This exists to make the
          signing process legally defensible under ESIGN/UETA and is not used for advertising.
        </li>
        <li>
          <strong>Engagement data:</strong> for Senders on paid plans, we record how long a Signer spends viewing
          each page of a document before signing (aggregated dwell time per page, not exact scroll position or
          keystrokes), so the Sender can see whether a document was actually read.
        </li>
        <li>
          <strong>Billing information:</strong> if you subscribe to a paid plan, our payment processor, Stripe,
          collects your payment card details directly — SignedBy never sees or stores full card numbers.
        </li>
        <li>
          <strong>Usage data:</strong> basic technical logs (e.g. request metadata) needed to operate and secure the
          service.
        </li>
      </ul>

      <h2>2. How we use information</h2>
      <p>We use the information above to:</p>
      <ul>
        <li>Provide the core service — rendering documents, routing them to Signers, and producing signed PDFs;</li>
        <li>Send transactional email, such as signing invitations, reminders, and completion notices;</li>
        <li>
          Power optional AI-assisted features — suggesting where to place signature and text fields, drafting a
          document from your description, and summarizing a document&apos;s contents — by sending the relevant
          document text to an AI provider for analysis. By default this is Mistral AI; an organization can instead
          choose Anthropic for these features in its workspace settings, in which case that organization&apos;s
          document text is sent to Anthropic instead;
        </li>
        <li>Maintain the audit trail required for a legally defensible electronic signature;</li>
        <li>Process subscription payments and manage billing;</li>
        <li>Secure the service and prevent abuse; and</li>
        <li>Comply with legal obligations.</li>
      </ul>
      <p>We do not sell personal data, and we do not use document content to serve advertising.</p>

      <h2>3. Who we share data with</h2>
      <p>
        We share personal data only with the service providers (&ldquo;sub-processors&rdquo;) needed to run
        SignedBy, each of which is contractually bound to protect it:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — hosts our database and handles account authentication;
        </li>
        <li>
          <strong>Cloudflare (R2)</strong> — stores uploaded and signed document files;
        </li>
        <li>
          <strong>Resend</strong> — delivers transactional email (invitations, reminders, notices);
        </li>
        <li>
          <strong>Mistral AI</strong> — the default AI provider behind optional field-suggestion, document-drafting,
          and summary features; only document text relevant to a feature you use is sent, and it is not used to
          train Mistral&apos;s models;
        </li>
        <li>
          <strong>Anthropic</strong> — an alternative AI provider for those same features, used only for an
          organization that has specifically chosen it in workspace settings instead of Mistral (never both at
          once); same handling — only relevant document text is sent, and it is not used to train Anthropic&apos;s
          models;
        </li>
        <li>
          <strong>Stripe</strong> — processes subscription payments;
        </li>
        <li>
          <strong>Vercel</strong> — hosts the application itself.
        </li>
      </ul>
      <p>
        We may also disclose information if required by law, subpoena, or legal process, or to protect the rights,
        property, or safety of SignedBy, our users, or the public. A full sub-processor list is maintained in our{" "}
        <a href="/dpa" className="underline">
          Data Processing Addendum
        </a>
        .
      </p>

      <h2>4. Data retention</h2>
      <p>
        We retain signed documents and their audit trail for as long as your account is active, because retrievable,
        reproducible records are a legal requirement for electronic signatures under ESIGN. If you delete a document
        or close your account, we will delete the underlying files and personal data within a reasonable period,
        except where we are required to retain it for legal, tax, or dispute-resolution purposes.
      </p>

      <h2>5. Security</h2>
      <p>
        Documents are encrypted in transit (TLS) and at rest. Access to signer-facing signing links is controlled by
        an unguessable, single-use token rather than a shared password. We restrict internal access to Customer Data
        to what is needed to operate and support the service. No method of transmission or storage is 100% secure,
        and we cannot guarantee absolute security.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Under the EU General Data Protection Regulation (GDPR) and, depending on where you live, other applicable
        privacy laws, you may have the right to access, correct, export, restrict, or delete personal data we hold
        about you, or to object to certain processing. You can exercise most of these rights directly from your
        account settings, or by emailing privacy@signedby.ai. You also have the right to lodge a complaint with your
        local data protection authority — in the Netherlands, this is the Autoriteit Persoonsgegevens. Where we act
        as a processor on behalf of a Sender (for example, for a Signer&apos;s data), we will direct your request to
        that Sender or assist them in responding, consistent with our Data Processing Addendum.
      </p>

      <h2>7. International users and data transfers</h2>
      <p>
        SignedBy is operated by SPRK10 B.V. from the Netherlands. Several of our sub-processors (see Section 3) are
        based in the United States. Where personal data is transferred outside the European Economic Area, we rely
        on appropriate safeguards recognized under GDPR, such as the European Commission&apos;s Standard Contractual
        Clauses, to protect that data. Mistral AI, the default AI provider for AI-assisted features, is based in
        France, keeping that processing within the European Economic Area by default; an organization that instead
        chooses Anthropic (based in the United States) for those features relies on the safeguards described above.
      </p>

      <h2>8. Children&apos;s privacy</h2>
      <p>SignedBy is not directed to children under 18, and we do not knowingly collect personal data from them.</p>

      <h2>9. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. If we make material changes, we will provide reasonable
        notice, such as by email or an in-product notice, before the changes take effect.
      </p>

      <h2>10. Contact</h2>
      <p>Questions about this policy, or requests regarding your personal data, can be sent to privacy@signedby.ai.</p>
    </LegalPage>
  );
}
