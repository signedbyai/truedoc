import { z } from "zod";

// The client converts a <input type="datetime-local"> value to a full ISO
// string (new Date(value).toISOString()) before sending, so this only ever
// sees a proper UTC ISO datetime or an empty string to clear the expiration.
export const bodySchema = z.object({
  expires_at: z.union([z.string().trim().datetime(), z.literal("")]),
});
