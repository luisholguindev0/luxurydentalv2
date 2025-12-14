"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MonthlyBreakdown } from "@/lib/actions/transactions"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts"
import { useEffect, useState } from "react"

type RevenueChartProps = {
    data: MonthlyBreakdown[]
    title?: string
}

// Format currency for tooltip
const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`
    }
    return `$${value}`
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; color: string }>
    label?: string
}) => {
    if (!active || !payload?.length) return null

    return (
        <div className="rounded-lg border border-white/10 bg-luxury-darker p-3 shadow-xl">
            <p className="mb-2 font-medium text-white">{label}</p>
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                    <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-text-muted">{entry.name}:</span>
                    <span className="font-mono text-white">
                        {new Intl.NumberFormat("es-CO", {
                            style: "currency",
                            currency: "COP",
                            minimumFractionDigits: 0,
                        }).format(entry.value)}
                    </span>
                </div>
            ))}
        </div>
    )
}

export function RevenueChart({ data, title = "Ingresos vs Gastos" }: RevenueChartProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return (
        <Card className="h-[300px] flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-luxury-gold" />
        </Card>
    )

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.05)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#718096", fontSize: 12 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#718096", fontSize: 12 }}
                                tickFormatter={formatCurrency}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ paddingTop: "20px" }}
                                formatter={(value) => (
                                    <span className="text-sm text-text-secondary">{value}</span>
                                )}
                            />
                            <Bar
                                dataKey="income"
                                name="Ingresos"
                                fill="#D4AF37"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                            />
                            <Bar
                                dataKey="payments"
                                name="Pagos"
                                fill="#2ECC71"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                            />
                            <Bar
                                dataKey="expenses"
                                name="Gastos"
                                fill="#E74C3C"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
