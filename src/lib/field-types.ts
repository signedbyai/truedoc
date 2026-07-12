// Shared between the client field editor (field-editor.tsx) and the
// server-side AI field-suggestion pipeline (suggest-fields.ts), so both
// agree on what a field type is and how big one defaults to. Previously
// this lived only as a local const inside field-editor.tsx; pulled out so
// the server doesn't have to duplicate (and risk drifting from) the same
// width/height defaults.

export type FieldType = "signature" | "initials" | "date" | "text" | "checkbox";

export const FIELD_TYPES: { type: FieldType; label: string; width: number; height: number }[] = [
  { type: "signature", label: "Signature", width: 0.22, height: 0.05 },
  { type: "initials", label: "Initials", width: 0.08, height: 0.05 },
  { type: "date", label: "Date", width: 0.14, height: 0.035 },
  { type: "text", label: "Text", width: 0.2, height: 0.035 },
  { type: "checkbox", label: "Checkbox", width: 0.03, height: 0.03 },
];

export function fieldDef(type: FieldType) {
  return FIELD_TYPES.find((f) => f.type === type)!;
}
