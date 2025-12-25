"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  animate?: boolean
  indicatorClassName?: string
  indicatorStyle?: React.CSSProperties
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, animate = false, indicatorClassName, indicatorStyle, ...props }, ref) => {
  const [displayValue, setDisplayValue] = React.useState(0)
  const [isAnimating, setIsAnimating] = React.useState(false)

  React.useEffect(() => {
    if (animate) {
      setDisplayValue(0)
      setIsAnimating(true)

      // Small delay to ensure the reset is rendered before animating
      const timer = setTimeout(() => {
        setDisplayValue(value || 0)
      }, 50)

      const animationTimer = setTimeout(() => {
        setIsAnimating(false)
      }, 800)

      return () => {
        clearTimeout(timer)
        clearTimeout(animationTimer)
      }
    } else {
      setDisplayValue(value || 0)
    }
  }, [value, animate])

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1",
          !indicatorClassName && !indicatorStyle?.background && !indicatorStyle?.backgroundColor && "bg-primary",
          isAnimating
            ? "transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            : "transition-all",
          indicatorClassName
        )}
        style={{ transform: `translateX(-${100 - displayValue}%)`, ...indicatorStyle }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
