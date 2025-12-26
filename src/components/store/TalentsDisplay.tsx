import { Coins } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TalentsDisplayProps {
  talents: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const sizeClasses = {
  sm: {
    container: 'gap-1.5 px-3 py-1.5',
    icon: 'w-4 h-4',
    text: 'text-sm font-bold',
  },
  md: {
    container: 'gap-2 px-4 py-2',
    icon: 'w-5 h-5',
    text: 'text-base font-bold',
  },
  lg: {
    container: 'gap-2.5 px-5 py-2.5',
    icon: 'w-6 h-6',
    text: 'text-lg font-bold',
  },
}

export function TalentsDisplay({
  talents,
  size = 'md',
  showLabel = false,
  className,
}: TalentsDisplayProps) {
  const sizes = sizeClasses[size]

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-2xl',
        'bg-gradient-to-b from-amber-400 to-amber-500',
        'border-2 border-amber-500 border-b-4 border-b-amber-600',
        'text-white shadow-lg',
        sizes.container,
        className
      )}
    >
      <div className="relative">
        <Coins className={cn(sizes.icon, 'text-white drop-shadow-sm')} />
        <div className="absolute inset-0 bg-white/20 rounded-full blur-sm" />
      </div>
      <span className={cn(sizes.text, 'drop-shadow-sm')}>
        {talents.toLocaleString()}
        {showLabel && <span className="ml-1 opacity-90">Talents</span>}
      </span>
    </div>
  )
}
