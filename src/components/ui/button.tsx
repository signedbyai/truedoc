import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-slate-900 text-white hover:bg-slate-700",
        outline: "border border-slate-300 bg-white hover:bg-slate-50 text-slate-900",
        ghost: "hover:bg-slate-100 text-slate-900",
        link: "text-slate-900 underline-offset-4 hover:underline",
        destructive: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
        // The one accent color in the whole app, reserved for the single
        // primary conversion action per screen ("Start for free", "Send for
        // signature") — never used for anything else, so it stays meaningful.
        // Previously retyped as a literal className on every marketing page
        // and in field-editor.tsx; consolidated here 2026-07-22 so it's
        // defined once. See design-system.md (project root) for the full
        // token reference this variant is drawn from.
        cta: "bg-yellow-300 text-slate-900 hover:bg-yellow-400",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
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
