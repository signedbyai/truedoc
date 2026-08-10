import { z } from "zod";

// Mirrors payment/schema.ts's shape — badge_page/x/y/width are set together
// (a full Badge Placer save) or all cleared together (null clears back to
// "no saved position for this document," falling through to the org's
// last_badge_* or the hardcoded fallback at seal time). Bounds match
// badge-resize.ts's own clamp range so a malformed/adversarial request
// can't push a stamp off-page.
export const bodySchema = z.object({
  badge_page: z.number().int().min(1).max(500).nullable(),
  badge_x: z.number().min(0).max(1).nullable(),
  badge_y: z.number().min(0).max(1).nullable(),
  badge_width: z.number().min(0.05).max(0.6).nullable(),
});
