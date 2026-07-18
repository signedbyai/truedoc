import { z } from "zod";

export const bodySchema = z.object({
  consent: z.literal(true),
  values: z.record(z.string().uuid(), z.string()),
});
