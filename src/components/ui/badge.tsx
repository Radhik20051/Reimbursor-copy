import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary/15 text-primary hover:bg-primary/20",
        secondary:
          "bg-secondary/15 text-secondary-foreground hover:bg-secondary/20",
        destructive:
          "bg-[#DC3545]/15 text-[#DC3545] hover:bg-[#DC3545]/20",
        outline: "text-foreground",
        success:
          "bg-[#28A745]/15 text-[#28A745] hover:bg-[#28A745]/20",
        warning:
          "bg-[#F0AD4E]/15 text-[#F0AD4E] hover:bg-[#F0AD4E]/20",
        gray:
          "bg-[#6C757D]/15 text-[#6C757D] hover:bg-[#6C757D]/20",
        teal:
          "bg-[#017E84]/15 text-[#017E84] hover:bg-[#017E84]/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
