import { z } from "zod";

export const bodySchema = z.object({ orgId: z.string().uuid() });
