import type { Metadata } from "next";
import { SignatureQuizView } from "@/components/signature-quiz-view";

const TITLE = "What does your signature say about you? — SignedBy";
const DESCRIPTION =
  "8 quick questions about how you sign things, matched to a real signature style. No email required.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/quiz" },
  // images intentionally omitted here -- src/app/quiz/opengraph-image.tsx
  // (a route-scoped file convention, colocated with this page) gets merged
  // in automatically for this exact segment. That's different from
  // /vs/signnow and /vs/docusign, which have no image file of their own
  // and have to explicitly point back at the root layout's
  // opengraph-image.tsx instead -- see the comment there for why.
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/quiz" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function QuizPage() {
  return <SignatureQuizView />;
}
