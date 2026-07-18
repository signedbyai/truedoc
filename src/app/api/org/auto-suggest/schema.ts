import { z } from "zod";

export const bodySchema = z.object({ enabled: z.boolean() });
