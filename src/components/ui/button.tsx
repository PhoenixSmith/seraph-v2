import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Duolingo-style thicc 3D button (green - for correct/continue)
        duolingo:
          "bg-[#58cc02] text-white font-bold uppercase tracking-wide rounded-2xl border-b-4 border-[#58a700] hover:bg-[#61dc03] active:border-b-0 active:mt-1 active:mb-[-4px] transition-all shadow-lg",
        // Duolingo-style thicc 3D button (blue - for primary actions)
        "duolingo-blue":
          "bg-[#1cb0f6] text-white font-bold uppercase tracking-wide rounded-2xl border-b-4 border-[#1899d6] hover:bg-[#1dc9f7] active:border-b-0 active:mt-1 active:mb-[-4px] transition-all shadow-lg",
        "duolingo-secondary":
          "bg-white text-[#4b4b4b] font-bold uppercase tracking-wide rounded-2xl border-2 border-[#e5e5e5] border-b-4 border-b-[#e5e5e5] hover:bg-[#f7f7f7] active:border-b-2 active:mt-[2px] active:mb-[-2px] transition-all dark:bg-muted dark:text-foreground dark:border-border dark:border-b-border/80",
        "duolingo-orange":
          "bg-[#ff9500] text-white font-bold uppercase tracking-wide rounded-2xl border-b-4 border-[#e68a00] hover:bg-[#ffaa1a] active:border-b-0 active:mt-1 active:mb-[-4px] transition-all shadow-lg",
        "duolingo-destructive":
          "bg-[#ff4b4b] text-white font-bold uppercase tracking-wide rounded-2xl border-b-4 border-[#ea2b2b] hover:bg-[#ff5c5c] active:border-b-0 active:mt-1 active:mb-[-4px] transition-all shadow-lg",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        // Duolingo thicc size
        duolingo: "h-14 px-8 py-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
