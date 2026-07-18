import { z } from "zod";

// Finalize payload: the browser has PUT the PDF to R2 via a presigned URL and
// now hands back the server-issued documentId + key to create the record.
export const bodySchema = z.object({
  documentId: z.string().uuid(),
  key: z.string().min(1).max(1024),
  title: z.string().trim().max(255).optional().default(""),
  filename: z.string().trim().min(1).max(255),
});
