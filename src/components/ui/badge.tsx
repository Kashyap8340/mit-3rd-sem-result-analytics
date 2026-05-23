import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border-2 border-border px-3 py-0.5 text-xs font-bold uppercase tracking-wider transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "bg-accent text-accent-foreground shadow-[2px_2px_0px_#1E293B] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#1E293B]",
                secondary:
                    "bg-secondary text-secondary-foreground shadow-[2px_2px_0px_#1E293B] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#1E293B]",
                destructive:
                    "bg-destructive text-destructive-foreground shadow-[2px_2px_0px_#1E293B] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#1E293B]",
                outline: "bg-white text-foreground shadow-[2px_2px_0px_#1E293B] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#1E293B]",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
