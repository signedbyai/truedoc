import type { Metadata } from "next";
import { SignatureQuizView } from "@/components/signature-quiz-view";

const TITLE = "What does your signature say about you? — SignedBy";
const DESCRIPTION =
  "8 quick questions about how you sign things, matched to a real signature style. No email required.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/quiz" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/quiz" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function QuizPage() {
  return <SignatureQuizView />;
}
