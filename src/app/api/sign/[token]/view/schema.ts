import { z } from "zod";
import { MAX_SECONDS_PER_DELTA } from "@/lib/page-view-tracking";

export const bodySchema = z.object({
  deltas: z
    .array(
      z.object({
        page: z.number().int().positive(),
        seconds: z.number().int().positive().max(MAX_SECONDS_PER_DELTA),
      })
    )
    .min(1)
    .max(50),
});
