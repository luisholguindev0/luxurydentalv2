import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "danger" | "outline"
    size?: "sm" | "md" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luxury-gold disabled:pointer-events-none disabled:opacity-50",
                    {
                        // Primary: Gold gradient, dark text, shadow
                        "bg-gradient-to-r from-luxury-gold to-[#B89628] text-luxury-darker hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]": variant === "primary",

                        // Secondary: Ghost with gold border
                        "border border-luxury-gold/50 text-luxury-gold hover:bg-luxury-gold/10 hover:border-luxury-gold": variant === "secondary",

                        // Ghost: Transparent, hover gold text
                        "text-text-secondary hover:text-luxury-gold hover:bg-white/5": variant === "ghost",

                        // Outline: White border (neutral)
                        "border border-white/10 text-white hover:bg-white/5": variant === "outline",

                        // Danger: Red background
                        "bg-luxury-danger text-white hover:bg-opacity-90 shadow-sm": variant === "danger",

                        // Sizes
                        "h-9 px-4 text-sm": size === "sm",
                        "h-11 px-8 text-base": size === "md",
                        "h-14 px-10 text-lg": size === "lg",
                    },
                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
