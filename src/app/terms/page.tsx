import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

// Kept out of the search index — required in-app reading, not a landing page.
// See the note on the Privacy page for why noindex (not robots.txt disallow).
export const metadata: Metadata = {
  title: "Terms of Service — SignedBy",
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPage title="SignedBy Beta Trial Terms of Service" effectiveDate="July 11, 2026">
      <p>
        These Beta Trial Terms of Service (&ldquo;Terms&rdquo;) govern access to and use of the beta version of
        SignedBy, an electronic signature and document-workflow service currently offered as a beta trial
        (&ldquo;Beta Trial&rdquo;) at signedby.ai by SPRK10 B.V., a company incorporated in the Netherlands
        (&ldquo;SignedBy,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By creating an account,
        uploading a document, or signing a document through SignedBy, you agree to these Terms. If you are using
        SignedBy on behalf of an organization, you represent that you have authority to bind that organization, and
        &ldquo;you&rdquo; refers to that organization.
      </p>
      <h2>1. Beta Trial status</h2>
      <p>
        SignedBy is currently offered as a beta trial while we actively develop and refine the service. During the
        Beta Trial:
      </p>
      <ul>
        <li>
          Features, pricing, plans, and functionality may change, be added, or be removed at any time, and may
          change with shorter or no advance notice compared to what Section 12 (&ldquo;Changes to these
          Terms&rdquo;) describes for the Terms themselves;
        </li>
        <li>
          The service may contain bugs or errors and may be interrupted; we do not guarantee any particular level
          of uptime, availability, or performance during the Beta Trial;
        </li>
        <li>We may suspend, limit, or discontinue the Beta Trial, in whole or for specific features, at any time, with or without notice; and</li>
        <li>
          We may ask for your feedback about the service. You agree that we may use any feedback you provide to
          improve SignedBy without any obligation or compensation to you.
        </li>
      </ul>
      <p>
        The Beta Trial label describes the maturity of the software and the level of support we provide — it does
        not affect the legal validity of signatures executed through SignedBy. Documents signed through the service
        are still intended to be legally binding electronic signatures under applicable law; see Section 4
        (&ldquo;Electronic signatures and your responsibilities&rdquo;).
      </p>

      <h2>2. The service</h2>
      <p>
        SignedBy lets a sending party (&ldquo;Sender&rdquo;) upload a document, place signature and data fields on
        it, and route it to one or more recipients (&ldquo;Signers&rdquo;) for electronic signature. SignedBy
        records an audit trail of the signing process and produces a completed, tamper-evident PDF with a
        certificate of completion once every required Signer has acted.
      </p>

      <h2>3. Accounts and eligibility</h2>
      <p>
        You must be at least 18 years old and able to form a binding contract to create an account. You are
        responsible for maintaining the confidentiality of your account credentials and for all activity that
        occurs under your account. Signers do not need an account to sign a document sent to them — access is
        controlled by a unique, unguessable link tied to that signing request.
      </p>

      <h2>4. Electronic signatures and your responsibilities</h2>
      <p>
        SignedBy is designed to help documents satisfy the requirements of the U.S. Electronic Signatures in Global
        and National Commerce Act (ESIGN) and the Uniform Electronic Transactions Act (UETA) as adopted by
        applicable states. Using SignedBy correctly — including obtaining each Signer&apos;s consent to sign
        electronically, and using the platform&apos;s intent-to-sign and audit trail features as intended — is your
        responsibility. SignedBy is not a law firm and does not provide legal advice about whether any particular
        document or transaction is valid or enforceable, or whether electronic signature is appropriate for it.
      </p>
      <p>
        Certain documents are commonly excluded from electronic signature under U.S. law and should not be signed
        through SignedBy, including (without limitation) wills, codicils, and testamentary trusts; documents related
        to adoption, divorce, or other family-law matters; court orders and other court documents; and notices of
        cancellation of utility services. This list is illustrative, not exhaustive — consult an attorney if you are
        unsure whether a document is suitable for electronic signature.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to use SignedBy to:</p>
      <ul>
        <li>Upload or send documents you do not have the right to send, or that infringe another party&apos;s rights;</li>
        <li>Forge a signature, impersonate a Signer, or send a document to someone without their knowledge for the purpose of misleading them;</li>
        <li>Transmit malware, or attempt to probe, scan, or breach the security of the service;</li>
        <li>Use the service for any unlawful purpose, including fraud; or</li>
        <li>Send content that is defamatory, obscene, or otherwise unlawful.</li>
      </ul>
      <p>We may suspend or terminate accounts that violate this section.</p>

      <h2>6. Plans, billing, and cancellation</h2>
      <p>
        SignedBy offers a free plan and paid subscription plans as described on our pricing page. Paid plans are
        billed in advance on a recurring monthly basis through our payment processor, Stripe, and subscriptions
        renew automatically until cancelled. You can cancel at any time through the billing portal linked from your
        dashboard; cancellation takes effect at the end of the current billing period, and we do not provide prorated
        refunds for partial periods except where required by law. We may change plan pricing on a going-forward
        basis with reasonable notice.
      </p>

      <h2>7. Your documents and data</h2>
      <p>
        As between you and SignedBy, you retain all ownership rights in the documents you upload and the data you
        submit (&ldquo;Customer Data&rdquo;). You grant SignedBy a limited license to host, process, and transmit
        Customer Data solely to provide and improve the service. See our{" "}
        <a href="/privacy" className="underline">
          Privacy Policy
        </a>{" "}
        for details on how we collect, use, and protect personal data, and our{" "}
        <a href="/dpa" className="underline">
          Data Processing Addendum
        </a>{" "}
        for terms governing personal data we process on your behalf.
      </p>

      <h2>8. Service availability</h2>
      <p>
        We aim to keep SignedBy available and reliable but do not guarantee uninterrupted access. The service is
        provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis, without warranties of any kind,
        express or implied, including implied warranties of merchantability, fitness for a particular purpose, and
        non-infringement, to the maximum extent permitted by law.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, SignedBy will not be liable for any indirect, incidental, special,
        consequential, or punitive damages, or any loss of profits, revenue, data, or goodwill, arising from your use
        of the service. Our total liability for any claim arising out of these Terms or the service will not exceed
        the amount you paid us in the twelve months preceding the claim.
      </p>

      <h2>10. Indemnification</h2>
      <p>
        You agree to indemnify and hold SignedBy harmless from any claims, damages, or expenses (including
        reasonable attorneys&apos; fees) arising from your use of the service, the documents you send through it, or
        your violation of these Terms.
      </p>

      <h2>11. Termination</h2>
      <p>
        You may stop using SignedBy and close your account at any time. We may suspend or terminate your access if
        you materially breach these Terms and do not cure the breach after notice, or as needed to comply with law
        or protect the service and other users.
      </p>

      <h2>12. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. If we make material changes, we will provide reasonable notice,
        such as by email or an in-product notice, before the changes take effect. Continued use of SignedBy after
        changes take effect constitutes acceptance of the updated Terms.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These Terms are governed by the laws of the Netherlands, without regard to conflict-of-law principles. Any
        dispute arising out of or in connection with these Terms will be submitted to the exclusive jurisdiction of
        the competent courts of Amsterdam, the Netherlands, except where mandatory consumer-protection law gives you
        the right to bring a claim in your own country of residence.
      </p>

      <h2>14. Contact</h2>
      <p>Questions about these Terms can be sent to support@signedby.ai.</p>
    </LegalPage>
  );
}
