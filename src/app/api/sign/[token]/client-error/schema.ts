import { z } from "zod";

export const bodySchema = z.object({
  message: z.string().trim().min(1).max(500),
  // The error's `.name` (e.g. "TimeoutError" for the slow-connection case,
  // or whatever pdf.js/the fetch itself threw) — optional and unvalidated
  // beyond length, since this is diagnostic metadata, not something acted on.
  stage: z.string().trim().max(50).optional(),
});
