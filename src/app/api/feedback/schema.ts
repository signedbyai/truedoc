import { z } from "zod";

export const bodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  // The page the user was on when they opened the widget — helps triage.
  page: z.string().trim().max(300).optional(),
});
