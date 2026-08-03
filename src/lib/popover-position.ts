export type PopoverCoords = { top: number; left: number };

/**
 * Computes a `position: fixed` popover's on-screen coordinates from its
 * trigger button's bounding rect, clamped to stay fully within the
 * viewport (with an 8px margin) regardless of where the trigger sits.
 *
 * Built 2026-08-04 after a real bug: console-workspace.tsx's floating pill
 * lives inside an `overflow-y-auto` aside, and its own pill wrapper has
 * `backdrop-blur` (which establishes a containing block for
 * `position: fixed` descendants in modern browsers, same as `transform`
 * does). A plain CSS `absolute`/`fixed` popover nested inside that markup
 * gets clipped by the aside's overflow (first symptom: "disappears off
 * the left of the window") or squashed against sibling content once
 * anchored the other way (second symptom: appears to render underneath
 * the settings panel). Neither is fixable by choosing a different CSS
 * anchor side — the fix is for the popover to not be a DOM descendant of
 * that clipping/containing-block ancestor at all. Callers render the
 * popover via `createPortal(..., document.body)` using the coordinates
 * this returns, so it's positioned purely by inline style and can never
 * be clipped or re-contained by anything between the trigger and
 * `<body>`.
 *
 * `align` is honored when there's room, but the viewport clamp always
 * wins — a trigger near a screen edge gets nudged inward rather than
 * ever running off-screen.
 *
 * `"center"` (2026-08-04, direct follow-up: on mobile the popover was
 * landing hard against the right edge of the screen instead of roughly
 * under the icon that opened it) — `"left"`/`"right"` edge-anchor to the
 * trigger, which reads fine next to a wide open area (desktop's pill,
 * anchored `"left"` to grow into the chat pane) but looks off-center when
 * the trigger itself is already near the middle of a narrow, centered
 * mobile pill. `"center"` anchors the popover's horizontal midpoint to
 * the trigger's, still passed through the same viewport clamp above.
 *
 * `viewportWidth` is an explicit parameter (callers pass
 * `window.innerWidth`) rather than this function reading `window` itself
 * — keeps the actual clamping math a pure function, unit-testable without
 * a DOM environment (this project's test suite has no jsdom setup; see
 * console-actions.ts's `parseExpiresAt`/`checkSingleSignerRoleCount` for
 * the same "extract the pure part so it's testable without an
 * environment" precedent, there for a Supabase client instead of a DOM).
 */
export function computePopoverPosition(
  rect: DOMRect,
  width: number,
  align: "left" | "right" | "center",
  viewportWidth: number,
  gap = 8,
  margin = 8
): PopoverCoords {
  const top = rect.bottom + gap;
  let left =
    align === "left" ? rect.left : align === "right" ? rect.right - width : rect.left + rect.width / 2 - width / 2;
  const maxLeft = Math.max(viewportWidth - width - margin, margin);
  left = Math.min(Math.max(left, margin), maxLeft);
  return { top, left };
}
