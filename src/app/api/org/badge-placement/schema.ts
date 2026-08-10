import { z } from "zod";

export const bodySchema = z.object({
  mode: z.enum(["ask", "skip"]),
});
