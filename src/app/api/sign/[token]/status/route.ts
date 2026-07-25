import { NextResponse } from "next/server";
import { getSignerByToken, fetchSignerSpeedStat, requireVerifiedSigner } from "@/lib/signing";

// Lightweight, read-only status check used by the signer client to recover
// from a lost submit response: if the network drops on the way back from
// POST /submit, the client polls this to find out whether the signature
// actually landed before showing an error. Unlike GET /[token], this never
// mutates state (no "viewed" write) and returns the minimum needed to render
// the Signed screen — including the same speed stat the submit route returns.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getSignerByToken(token);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { admin, signer, document } = result;
  const authGate = requireVerifiedSigner(signer);
  if (authGate) return authGate;

  const speedStat = signer.status === "signed" ? await fetchSignerSpeedStat(admin, signer.id) : null;

  return NextResponse.json({
    status: signer.status,
    completed: document.status === "completed",
    speedStat,
  });
}
