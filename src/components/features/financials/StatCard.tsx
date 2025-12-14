"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

type StatCardProps = {
    title: string
    value: string | number
    subtitle?: string
    trend?: "up" | "down" | "stable"
    trendValue?: string
    icon?: React.ReactNode
    variant?: "default" | "success" | "warning" | "danger"
}

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value)
}

export function StatCard({
    title,
    value,
    subtitle,
    trend,
    trendValue,
    icon,
    variant = "default",
}: StatCardProps) {
    const variantStyles = {
        default: "border-white/10",
        success: "border-luxury-success/30 bg-luxury-success/5",
        warning: "border-luxury-warning/30 bg-luxury-warning/5",
        danger: "border-luxury-danger/30 bg-luxury-danger/5",
    }

    const trendColors = {
        up: "text-luxury-success",
        down: "text-luxury-danger",
        stable: "text-text-muted",
    }

    const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus

    return (
        <Card className={cn("relative overflow-hidden", variantStyles[variant])}>
            <CardContent className="p-6">
                {/* Background decoration */}
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-luxury-gold/5 blur-2xl" />

                <div className="relative">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-text-muted">{title}</p>
                            <p className="mt-2 text-3xl font-bold text-white font-mono">
                                {typeof value === "number" ? formatCurrency(value) : value}
                            </p>
                            {subtitle && (
                                <p className="mt-1 text-xs text-text-muted">{subtitle}</p>
                            )}
                        </div>
                        {icon && (
                            <div className="rounded-lg bg-luxury-gold/10 p-2 text-luxury-gold">
                                {icon}
                            </div>
                        )}
                    </div>

                    {trend && trendValue && (
                        <div className={cn("mt-4 flex items-center gap-1", trendColors[trend])}>
                            <TrendIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">{trendValue}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

// Helper to format value for display
StatCard.formatCurrency = formatCurrency
