import { z } from "zod";

// The client asks for a presigned upload URL with the file's name and size.
// Size is advisory here (client-reported) — the real byte-count is enforced at
// finalize against what actually landed in R2. 25 MB is the product cap.
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const bodySchema = z.object({
  filename: z.string().trim().min(1).max(255),
  size: z.number().int().positive().max(MAX_FILE_BYTES),
});
