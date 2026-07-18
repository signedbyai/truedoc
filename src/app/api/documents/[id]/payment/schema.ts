import { z } from "zod";

// https-only: this is opened directly on the signer's device, so no
// javascript:/data: schemes etc. An empty string clears the payment link.
export const bodySchema = z.object({
  payment_link_url: z.union([z.string().trim().url().startsWith("https://"), z.literal("")]),
  payment_label: z.string().trim().max(100).optional().nullable(),
});
