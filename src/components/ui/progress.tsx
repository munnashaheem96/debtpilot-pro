import * as React from "react"

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  indicatorColorClass?: string;
}

export function Progress({ className = "", value, indicatorColorClass = "bg-brand-500", ...props }: ProgressProps) {
  const percentage = Math.max(0, Math.min(100, value));
  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-slate-100 ${className}`} {...props}>
      <div
        className={`h-full w-full flex-1 transition-all duration-300 ease-out ${indicatorColorClass}`}
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  )
}
