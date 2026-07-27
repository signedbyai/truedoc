import { z } from "zod";

// Split into a sibling file (not exported from route.ts) per the Next 16
// route-export constraint -- route.ts may only export request handlers.
export const bodySchema = z.object({
  origin: z.enum(["ai_suggested", "sender_placed"]),
  fieldType: z.enum(["signature", "initials", "date", "text", "checkbox"]),
  layout: z.enum(["single_party", "stacked_blocks", "side_by_side_columns", "unknown"]),
  partyCount: z.number().int().min(0).max(50),
  columnCount: z.number().int().min(1).max(10).nullable(),
  pageFractionX: z.number().min(0).max(1),
  pageFractionY: z.number().min(0).max(1),
  outcome: z.enum(["kept", "moved", "deleted", "role_changed"]).nullable(),
  moved: z.boolean(),
  roleCorrected: z.boolean(),
  deltaX: z.number().min(-1).max(1).nullable(),
  deltaY: z.number().min(-1).max(1).nullable(),
  provider: z.enum(["anthropic", "mistral", "deepseek"]).nullable(),
  model: z.string().min(1).max(100).nullable(),
});
