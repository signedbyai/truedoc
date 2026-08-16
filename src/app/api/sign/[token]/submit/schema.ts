import { z } from "zod";

// SHAPE only. This schema deliberately does NOT validate field values against
// their type, because it can't: a field's type lives in the database and isn't
// knowable from the payload. Per-type validation happens in route.ts, after
// the fields are fetched — see validateFieldValue and
// SIGNATURE_FIELD_VALIDATION_SCOPE.md layer 1.
//
// Don't be reassured by how permissive this looks: until 2026-08-16 this WAS
// the only check, and it let any string through for any field type.
export const bodySchema = z.object({
  consent: z.literal(true),
  values: z.record(z.string().uuid(), z.string()),
  // How each signature/initials mark was produced (layer 3). Optional so a
  // client that predates it — or a draft restored from before it shipped —
  // still submits successfully; those fields just record no method, exactly
  // like every document signed before 2026-08-16.
  methods: z.record(z.string().uuid(), z.enum(["typed", "drawn"])).optional(),
});
