import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30",
        secondary:
          "border-transparent bg-slate-800 text-slate-300 hover:bg-slate-700",
        destructive:
          "border-transparent bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30",
        outline: "text-slate-300 border-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
