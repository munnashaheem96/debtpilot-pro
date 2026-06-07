import * as React from "react"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
}

export function Card({ className = "", hoverable = false, ...props }: CardProps) {
  return (
    <div
      className={`glass-card p-6 ${hoverable ? 'glass-card-hover cursor-pointer' : ''} ${className}`}
      {...props}
    />
  )
}

export function CardHeader({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col space-y-1.5 pb-4 ${className}`} {...props} />
}

export function CardTitle({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-lg font-bold leading-none tracking-tight text-slate-900 ${className}`}
      {...props}
    />
  )
}

export function CardDescription({ className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-xs text-slate-400 ${className}`} {...props} />
}

export function CardContent({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`pt-0 ${className}`} {...props} />
}

export function CardFooter({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex items-center pt-4 border-t border-slate-100 ${className}`} {...props} />
}
