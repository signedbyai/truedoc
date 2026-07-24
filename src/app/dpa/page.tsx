import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

// Kept out of the search index — required in-app reading, not a landing page.
// See the note on the Privacy page for why noindex (not robots.txt disallow).
export const metadata: Metadata = {
  title: "Data Processing Addendum — SignedBy",
  robots: { index: false, follow: true },
};

export default function DpaPage() {
  return (
    <LegalPage title="Data Processing Addendum" effectiveDate="July 24, 2026">
      <p>
        This Data Processing Addendum (&ldquo;DPA&rdquo;) supplements the SignedBy{" "}
        <a href="/terms" className="underline">
          Terms of Service
        </a>{" "}
        between the Customer and SPRK10 B.V., a company incorporated in the Netherlands (&ldquo;SignedBy&rdquo;),
        and applies where SignedBy processes personal data on behalf of a customer (&ldquo;Customer&rdquo;) in the
        course of providing the service — for example, the names and email addresses of Signers a Customer invites
        to sign a document.
      </p>
      <p>
        Because SignedBy is established in the Netherlands, this DPA is intended to meet the requirements of Article
        28 of the GDPR.
      </p>

      <h2>1. Roles of the parties</h2>
      <p>
        For personal data submitted to SignedBy by or through a Customer&apos;s use of the service (including data
        about that Customer&apos;s Signers), the Customer is the controller and SignedBy is the processor within the
        meaning of the GDPR (or &ldquo;business&rdquo; and &ldquo;service provider,&rdquo; respectively, under other
        applicable law). SignedBy processes such data only on the Customer&apos;s documented instructions, as
        reflected in this DPA and the Customer&apos;s configuration and use of the service.
      </p>
      <p>
        Notwithstanding the foregoing, to the extent SignedBy retains audit-trail records after closure of the
        Customer&apos;s account for its own legal-defensibility, evidentiary, and compliance purposes, SignedBy acts
        as an independent controller with respect to those retained records and processes them under its own
        responsibility in accordance with applicable law.
      </p>
      <p>
        As controller of its recipients&apos; personal data, the Customer is responsible for complying with
        applicable data protection law in respect of the documents it sends, including providing recipients with
        any required privacy information and informing them, where required, about the audit-trail and engagement
        tracking involved in the signing process (such as open notifications and, on paid plans, per-page
        engagement data).
      </p>

      <h2>2. Scope and nature of processing</h2>
      <p>
        SignedBy processes personal data to: render and store uploaded documents; capture field values and
        signatures entered by Signers; route signing requests by email; record the audit trail (timestamps, IP
        addresses, user agent strings, and document hashes) needed for a legally defensible electronic signature;
        generate the final signed PDF and certificate of completion; and, for Customers using optional AI-assisted
        features, send relevant document text to an AI sub-processor for field-suggestion, drafting, or
        summarization — Mistral AI by default, or Anthropic if a Customer on the Business plan has selected it in
        workspace settings. Processing lasts for the duration of the
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
        <li>Mistral AI — default AI processing for optional field-suggestion, document-drafting, and summary features</li>
        <li>
          Anthropic, PBC — alternative AI processing for the same features, available only to a Customer on the
          Business plan that selects it in workspace settings instead of Mistral
        </li>
        <li>Stripe, Inc. — payment processing for subscriptions</li>
        <li>Vercel Inc. — application hosting</li>
      </ul>
      <p>
        We will provide reasonable advance notice before adding or replacing a sub-processor that processes personal
        data covered by this DPA, so the Customer can object on reasonable grounds. Each sub-processor is bound by
        confidentiality and data-protection obligations at least as protective as this DPA. Where a sub-processor is
        located outside the European Economic Area, SignedBy relies on appropriate transfer safeguards recognized
        under GDPR, such as the European Commission&apos;s Standard Contractual Clauses.
      </p>
      <p>
        Where personal data covered by this DPA is transferred to, or accessible by, a sub-processor incorporated in
        the United States (including Supabase, Cloudflare, Resend, Stripe, and Vercel), the Standard Contractual
        Clauses adopted by the European Commission in Commission
        Implementing Decision (EU) 2021/914 of 4 June 2021 (the &ldquo;2021 SCCs&rdquo;), including the module
        applicable to the relevant controller-to-processor or processor-to-processor transfer, are hereby
        incorporated into this DPA by reference and apply as if set out in full. In the event of any conflict
        between the 2021 SCCs and the other terms of this DPA or the Terms of Service, the 2021 SCCs will prevail
        with respect to the transfers they govern.
      </p>

      <h2>4. SignedBy&apos;s obligations</h2>
      <p>SignedBy will:</p>
      <ul>
        <li>Process personal data only on the Customer&apos;s documented instructions;</li>
        <li>Ensure personnel with access to personal data are subject to confidentiality obligations;</li>
        <li>Implement appropriate technical and organizational security measures, including encryption in transit and at rest;</li>
        <li>
          Assist the Customer, to the extent reasonably possible, in responding to data subject requests (access,
          correction, deletion) relating to data the Customer controls, and, where SignedBy receives such a request
          directly from a data subject, promptly notify the Customer and not respond to the request itself except
          on the Customer&apos;s documented instructions; and
        </li>
        <li>
          Notify the Customer of any personal data breach affecting the Customer&apos;s data without undue delay,
          and in any event no later than 48 hours after becoming aware of it, providing at least the nature of the
          breach, the categories and approximate number of data subjects and records affected, the likely
          consequences of the breach, the measures taken or proposed to address it, and a contact point from whom
          further information can be obtained.
        </li>
      </ul>

      <h2>5. Deletion or return of data</h2>
      <p>
        On termination of the Customer&apos;s account, SignedBy will, at the Customer&apos;s election (made in
        writing on or before termination), delete or return the personal data processed on the Customer&apos;s
        behalf, and will do so within a reasonable period not exceeding ninety (90) days after termination, except
        to the extent SignedBy is required by law to retain it. Audit-trail records tied to a completed electronic
        signature that must remain reproducible are expressly carved out from this deletion or return obligation
        and will be retained by SignedBy, and any such retained records will continue to be held subject to the
        confidentiality and security obligations of this DPA.
      </p>

      <h2>6. Audits</h2>
      <p>
        SignedBy will make available information reasonably necessary to demonstrate compliance with this DPA and
        will allow for, and contribute to, audits conducted by the Customer or an auditor mandated by the Customer,
        subject to reasonable advance notice and confidentiality.
      </p>

      <h2>7. Liability</h2>
      <p>
        Liability under this DPA is subject to, and does not increase, the limitation of liability and exclusions
        of liability set out in the SignedBy Terms of Service. Those limitations, caps, and exclusions apply to and
        flow through to all claims arising under or in connection with this DPA, whether in contract, tort, or
        otherwise, and nothing in this DPA increases or expands either party&apos;s aggregate liability beyond what
        is provided in the Terms of Service.
      </p>

      <h2>8. Contact</h2>
      <p>Questions about this DPA can be sent to privacy@signedby.ai.</p>

      <h2>Annex A — Details of Processing</h2>
      <p>
        This Annex A sets out the details of the processing carried out by SignedBy on behalf of the Customer, as
        required by Article 28(3) of the GDPR.
      </p>
      <p>
        <strong>Subject matter of the processing:</strong> SignedBy&apos;s processing of personal data on behalf of
        the Customer in connection with providing the SignedBy electronic-signature and document-workflow service
        under the Terms of Service and this DPA.
      </p>
      <p>
        <strong>Duration of the processing:</strong> For the duration of the Customer&apos;s use of the service and
        any applicable retention period described in the Privacy Policy, subject to the deletion and return
        provisions of this DPA and any legally required retention (including audit-trail records tied to a
        completed electronic signature).
      </p>
      <p>
        <strong>Categories of data subjects:</strong> Senders (the Customer&apos;s account holders and authorized
        users) and Signers (individuals the Customer invites to view or sign a document).
      </p>
      <p>
        <strong>Types of personal data:</strong> names; email addresses; document content uploaded by or on behalf
        of the Customer; field values and typed or drawn signature images entered by Signers; and audit-trail data
        (including timestamps, IP addresses, browser/user-agent strings, and cryptographic document hashes).
      </p>
      <p>
        <strong>Special categories of data:</strong> SignedBy does not intentionally collect or request special
        categories of personal data (as defined in Article 9 of the GDPR). Uploaded documents may contain any
        content the Customer chooses to include; as controller, the Customer is solely responsible for determining
        the content of documents, for the presence of any special-category or other sensitive data within them, and
        for ensuring an appropriate lawful basis for its processing.
      </p>
      <p>
        <strong>Nature and purpose of the processing:</strong> to render and store uploaded documents; capture field
        values and signatures entered by Signers; route signing requests by email; record the audit trail needed
        for a legally defensible electronic signature; generate the final signed PDF and certificate of completion;
        provide optional AI-assisted features (field-suggestion, drafting, and summarization); process billing;
        secure the service and prevent abuse; and comply with legal obligations.
      </p>
    </LegalPage>
  );
}
