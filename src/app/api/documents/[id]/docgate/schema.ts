import { z } from "zod";

// https-only: this URL is only ever released to a signer via a 302 redirect
// (src/app/g/[code]/route.ts), same reasoning as the payment link. An empty
// string clears the gate.
export const bodySchema = z.object({
  docgate_url: z.union([z.string().trim().url().startsWith("https://"), z.literal("")]),
  docgate_label: z.string().trim().max(100).optional().nullable(),
});
