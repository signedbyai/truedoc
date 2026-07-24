import { z } from "zod";

export const bodySchema = z.object({ provider: z.enum(["anthropic", "mistral"]) });
