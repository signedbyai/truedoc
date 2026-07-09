import { LegalPage } from "@/components/legal-page";

export default function DpaPage() {
  return (
    <LegalPage title="Data Processing Addendum" effectiveDate="July 10, 2026">
      <p>
        This Data Processing Addendum (&ldquo;DPA&rdquo;) supplements the SignedBy{" "}
        <a href="/terms" className="underline">
          Terms of Service
        </a>{" "}
        and applies where SignedBy processes personal data on behalf of a customer (&ldquo;Customer&rdquo;) in the
        course of providing the service — for example, the names and email addresses of Signers a Customer invites
        to sign a document.
      </p>
      <p>
        <em>
          This document is a first draft prepared for SignedBy&apos;s launch. It has not yet been reviewed by a
          licensed attorney and should be reviewed before being relied upon as a final, binding agreement,
          particularly if you need it to satisfy GDPR Article 28 or similar requirements.
        </em>
      </p>

      <h2>1. Roles of the parties</h2>
      <p>
        For personal data submitted to SignedBy by or through a Customer&apos;s use of the service (including data
        about that Customer&apos;s Signers), the Customer is the controller (or &ldquo;business,&rdquo; depending on
        applicable law) and SignedBy is the processor (or &ldquo;service provider&rdquo;). SignedBy processes such
        data only on the Customer&apos;s documented instructions, as reflected in this DPA and the Customer&apos;s
        configuration and use of the service.
      </p>

      <h2>2. Scope and nature of processing</h2>
      <p>
        SignedBy processes personal data to: render and store uploaded documents; capture field values and
        signatures entered by Signers; route signing requests by email; record the audit trail (timestamps, IP
        addresses, user agent strings, and document hashes) needed for a legally defensible electronic signature;
        and generate the final signed PDF and certificate of completion. Processing lasts for the duration of the
        Customer&apos;s use of the service and any applicable retention period described in our{" "}
        <a href="/privacy" className="underline">
          Privacy Policy
        </a>
        .
      </p>

      <h2>3. Sub-processors</h2>
      <p>SignedBy uses the following sub-processors to provide the service:</p>
      <ul>
        <li>Supabase — database hosting and authentication</li>
        <li>Cloudflare, Inc. (R2) — document file storage</li>
        <li>Resend — transactional email delivery</li>
        <li>Stripe, Inc. — payment processing for subscriptions</li>
        <li>Vercel Inc. — application hosting</li>
      </ul>
      <p>
        We will provide reasonable advance notice before adding or replacing a sub-processor that processes personal
        data covered by this DPA, so the Customer can object on reasonable grounds. Each sub-processor is bound by
        confidentiality and data-protection obligations at least as protective as this DPA.
      </p>

      <h2>4. SignedBy&apos;s obligations</h2>
      <p>SignedBy will:</p>
      <ul>
        <li>Process personal data only on the Customer&apos;s documented instructions;</li>
        <li>Ensure personnel with access to personal data are subject to confidentiality obligations;</li>
        <li>Implement appropriate technical and organizational security measures, including encryption in transit and at rest;</li>
        <li>Assist the Customer, to the extent reasonably possible, in responding to data subject requests (access, correction, deletion) relating to data the Customer controls; and</li>
        <li>Notify the Customer without undue delay after becoming aware of a personal data breach affecting the Customer&apos;s data.</li>
      </ul>

      <h2>5. Deletion or return of data</h2>
      <p>
        On termination of the Customer&apos;s account, SignedBy will delete or, on written request made before
        termination, return the personal data processed on the Customer&apos;s behalf, except to the extent we are
        required by law to retain it (for example, audit-trail records tied to a completed electronic signature that
        must remain reproducible).
      </p>

      <h2>6. Audits</h2>
      <p>
        SignedBy will make available information reasonably necessary to demonstrate compliance with this DPA and
        will allow for, and contribute to, audits conducted by the Customer or an auditor mandated by the Customer,
        subject to reasonable advance notice and confidentiality.
      </p>

      <h2>7. Liability</h2>
      <p>Liability under this DPA is subject to the limitation of liability set out in the SignedBy Terms of Service.</p>

      <h2>8. Contact</h2>
      <p>Questions about this DPA can be sent to privacy@signedby.ai.</p>
    </LegalPage>
  );
}
