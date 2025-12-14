import { type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'
import { Button } from './button'

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    action?: {
        label: string
        onClick: () => void
    }
    children?: ReactNode
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    children
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
            <div className="mb-6 p-6 bg-luxury-card rounded-full border border-luxury-gold/10">
                <Icon className="w-12 h-12 text-luxury-gold/60" />
            </div>

            <h3 className="text-xl font-serif text-text-primary mb-2">
                {title}
            </h3>

            <p className="text-text-secondary max-w-md mb-6">
                {description}
            </p>

            {action && (
                <Button onClick={action.onClick}>
                    {action.label}
                </Button>
            )}

            {children}
        </div>
    )
}
