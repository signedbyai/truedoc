import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Radius and default height live here rather than at the call sites. The field
// editor's chrome was retrofitted to this look by passing
// `size="sm" className="rounded-lg"` on every button individually, which is
// why the rest of the app drifted away from it — a per-call-site style is one
// someone has to remember. Setting it on the shared component means new
// buttons inherit it instead of needing the same override copied forward.
//
// rounded-lg (8px) over rounded-md (6px): at h-9 the 6px corner reads square
// next to the pill-shaped chips and rounded-xl cards already in the UI.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-slate-900 text-white hover:bg-slate-700",
        outline: "border border-slate-300 bg-white hover:bg-slate-50 text-slate-900",
        ghost: "hover:bg-slate-100 text-slate-900",
        link: "text-slate-900 underline-offset-4 hover:underline",
        destructive: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
      },
      size: {
        // h-10 -> h-9. `sm` deliberately keeps its h-9 so every existing
        // size="sm" call site (most of the field editor) renders exactly as it
        // does today; the two now differ only in padding. Shrinking `sm` to
        // h-8 would have silently restyled the editor chrome we just settled.
        default: "h-9 px-3.5 py-2",
        sm: "h-9 px-3",
        // Marketing CTAs stay tall on purpose — a hero button is meant to be
        // an easy target, not part of the app chrome.
        lg: "h-11 px-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
