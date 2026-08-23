import { z } from "zod";

// The client sends a plain <input type="date"> value (YYYY-MM-DD) or an
// empty string to clear it -- contract_end_date is a `date` column, no
// time-of-day/timezone conversion needed (unlike expires_at's
// datetime-local handling).
export const bodySchema = z.object({
  contract_end_date: z.union([z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]),
});
