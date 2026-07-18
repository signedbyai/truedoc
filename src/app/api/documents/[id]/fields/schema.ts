import { z } from "zod";

export const fieldSchema = z.object({
  type: z.enum(["signature", "initials", "date", "text", "checkbox"]),
  page: z.number().int().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
  required: z.boolean().default(true),
  signer_id: z.string().uuid().nullable().optional(),
  // Only meaningful while signer_id is null — see field-editor.tsx.
  template_role: z.number().int().nullable().optional(),
  // AI-detected purpose of a text field ("name"/"title"/"company"); drives
  // sign-time pre-fill. Lenient string so an unexpected value never blocks a
  // save — the signing view only acts on "name".
  purpose: z.string().max(20).nullable().optional(),
});

export const bodySchema = z.object({ fields: z.array(fieldSchema) });
