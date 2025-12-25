import { Badge } from '@/components/ui/badge'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GroupLevelBadgeProps {
  level: string
  color: string
  weeklyXp?: number
  showXp?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function GroupLevelBadge({
  level,
  color,
  weeklyXp,
  showXp = false,
  size = 'md',
  className
}: GroupLevelBadgeProps) {
  return (
    <Badge
      className={cn(
        "flex items-center gap-1 text-white",
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'px-3 py-1',
        className
      )}
      style={{ backgroundColor: color }}
    >
      <Zap
        className={cn(
          "fill-current",
          size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
        )}
      />
      <span>{level}</span>
      {showXp && weeklyXp !== undefined && (
        <span className="opacity-75">({weeklyXp} XP)</span>
      )}
    </Badge>
  )
}
