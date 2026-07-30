import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

// Referral programme terms, linked from the in-app referral popover and card.
//
// Split out from /terms rather than folded into it, for the reason Lemonade and
// Robinhood both do the same: a promotion changes far more often than the terms
// of service, and every edit to a promotion shouldn't restate the whole
// contract. It also gives the in-app "Terms & Conditions" link somewhere
// specific to point, so a user checking one rule doesn't have to read a
// document about liability and governing law to find it.
//
// noindex, like the other legal pages — required in-app reading, not a landing
// page competing with the homepage in search results.
export const metadata: Metadata = {
  title: "Referral Programme Terms — SignedBy",
  robots: { index: false, follow: true },
};

export default function ReferralTermsPage() {
  return (
    <LegalPage title="Referral Programme Terms" effectiveDate="July 19, 2026">
      <p>
        These terms govern the SignedBy referral programme (&ldquo;give a month, get a month&rdquo;)
        operated by SPRK10 B.V. (&ldquo;SignedBy,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). They apply
        in addition to the{" "}
        <a href="/terms" className="underline">
          Beta Trial Terms of Service
        </a>
        . Participating in the programme means you accept these terms.
      </p>

      <h2>Who can take part</h2>
      <p>
        You must have a SignedBy account in good standing. Each workspace has one referral link. The
        programme is for genuine referrals of people who are not already SignedBy users.
      </p>

      <h2>How a reward is earned</h2>
      <p>
        Share your referral link. When someone creates a new SignedBy workspace through that link and
        that workspace makes its first paid subscription payment, both workspaces receive one free
        month of the Pro plan, applied as a 100% discount to a single billing period.
      </p>
      <p>
        The reward is tied to a real payment rather than to signup, so a referral that never becomes a
        paying customer does not earn a reward. Rewards are applied automatically; the referred
        workspace&rsquo;s discount is applied at its first checkout and the referring workspace&rsquo;s
        at its next billing period or checkout.
      </p>

      <h2>Limits</h2>
      <ul>
        <li>First referral wins: a workspace can only ever be referred once, by one referrer.</li>
        <li>You cannot refer yourself, and a workspace cannot be both referrer and referred.</li>
        <li>
          A free-plan referrer holds one pending reward at a time. If you earn further rewards before
          redeeming a pending one, only the pending one is redeemed at your next checkout.
        </li>
        <li>Rewards have no cash value and cannot be exchanged, transferred, or refunded.</li>
      </ul>

      <h2>What is not allowed</h2>
      <p>You may only use the referral programme in good faith. You may not:</p>
      <ul>
        <li>create additional accounts or workspaces in order to refer yourself;</li>
        <li>
          post your referral link in a way that misrepresents SignedBy, or that presents it as an
          offer from SignedBy rather than from you;
        </li>
        <li>use paid search advertising on SignedBy&rsquo;s brand terms to distribute your link;</li>
        <li>send unsolicited bulk email or messages containing your link;</li>
        <li>
          otherwise attempt to obtain rewards for referrals that are not genuine new customers.
        </li>
      </ul>
      <p>
        We may withhold or reverse rewards, and suspend participation, where we reasonably believe
        these rules have been broken.
      </p>

      <h2>Changes and ending the programme</h2>
      <p>
        We may change or end the referral programme at any time. Rewards already earned before a
        change takes effect will still be honoured. If we make a material change, the effective date
        above will be updated.
      </p>

      <h2>Tax</h2>
      <p>
        You are responsible for any tax arising from a reward you receive. Where a reward is a
        discount on a subscription, it reduces the amount charged and is reflected on your invoice.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about the referral programme:{" "}
        <a href="mailto:support@signedby.ai" className="underline">
          support@signedby.ai
        </a>
        .
      </p>
    </LegalPage>
  );
}
