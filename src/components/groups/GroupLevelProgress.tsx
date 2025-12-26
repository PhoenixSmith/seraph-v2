import { useQuery } from '@/hooks/useSupabase'
import * as api from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Zap, Trophy, TrendingUp, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GroupLevelProgressProps {
  groupId: string
}

const LEVELS = [
  { name: 'Angels', threshold: 0, color: '#94a3b8' },
  { name: 'Archangels', threshold: 500, color: '#3b82f6' },
  { name: 'Virtues', threshold: 1000, color: '#8b5cf6' },
  { name: 'Cherubim', threshold: 2000, color: '#f59e0b' },
  { name: 'Seraphim', threshold: 5000, color: '#f97316' }
]

const MAX_THRESHOLD = LEVELS[LEVELS.length - 1].threshold

export function GroupLevelProgress({ groupId }: GroupLevelProgressProps) {
  const levelInfo = useQuery(() => api.getGroupLevelInfo(groupId), [groupId])

  if (levelInfo === undefined) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground py-4">
          Loading level info...
        </div>
      </Card>
    )
  }

  if (!levelInfo) return null

  const weeklyXp = levelInfo.weekly_xp

  // Calculate days left in the week
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysLeft = dayOfWeek === 0 ? 0 : 7 - dayOfWeek

  return (
    <Card className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: levelInfo.level_color }}
          >
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Group Level</h3>
            <p className="text-xs text-muted-foreground">Weekly progress resets Sunday</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-lg font-bold">
            <Zap className="h-4 w-4 text-yellow-500" />
            {weeklyXp}
          </div>
          <p className="text-xs text-muted-foreground">XP this week</p>
        </div>
      </div>

      {/* Level Tiers Visual */}
      <div className="relative mb-4">
        {/* Background track */}
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          {/* Progress fill */}
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min((weeklyXp / MAX_THRESHOLD) * 100, 100)}%`,
              background: (() => {
                // Find current level color for gradient
                let currentColor = LEVELS[0].color
                for (const level of LEVELS) {
                  if (weeklyXp >= level.threshold) currentColor = level.color
                }
                return `linear-gradient(90deg, ${LEVELS[0].color}, ${currentColor})`
              })()
            }}
          />
        </div>

        {/* Level markers */}
        <div className="absolute top-0 left-0 right-0 h-3 flex items-center">
          {LEVELS.map((level, idx) => {
            const position = idx === 0 ? 0 : (level.threshold / MAX_THRESHOLD) * 100
            const isActive = weeklyXp >= level.threshold
            const isCurrent = levelInfo.current_level === level.name

            return (
              <div
                key={level.name}
                className="absolute transform -translate-x-1/2"
                style={{ left: `${position}%` }}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 border-background transition-all",
                    isCurrent && "ring-2 ring-offset-2 ring-offset-background",
                    isActive ? "scale-110" : "opacity-50"
                  )}
                  style={{
                    backgroundColor: level.color,
                    // @ts-expect-error CSS custom property for ring color
                    '--tw-ring-color': level.color
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Level Cards */}
      <div className="grid grid-cols-5 gap-1.5 mb-4">
        {LEVELS.map((level) => {
          const isActive = weeklyXp >= level.threshold
          const isCurrent = levelInfo.current_level === level.name
          const xpNeeded = Math.max(0, level.threshold - weeklyXp)

          return (
            <div
              key={level.name}
              className={cn(
                "relative rounded-lg p-3 text-center transition-all border-2",
                isCurrent
                  ? "border-current shadow-sm"
                  : isActive
                    ? "border-transparent bg-muted/50"
                    : "border-dashed border-muted-foreground/30"
              )}
              style={isCurrent ? { borderColor: level.color, backgroundColor: `${level.color}10` } : {}}
            >
              {isCurrent && (
                <div
                  className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: level.color }}
                >
                  CURRENT
                </div>
              )}
              <div
                className={cn(
                  "text-sm font-bold mb-0.5",
                  !isActive && "text-muted-foreground"
                )}
                style={isActive ? { color: level.color } : {}}
              >
                {level.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {level.threshold === 0 ? 'Start' : `${level.threshold} XP`}
              </div>
              {!isActive && xpNeeded > 0 && (
                <div className="text-[10px] text-muted-foreground mt-1">
                  {xpNeeded} XP to go
                </div>
              )}
              {isActive && !isCurrent && (
                <div className="text-[10px] text-green-600 dark:text-green-400 mt-1">
                  ✓ Unlocked
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between pt-3 border-t text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{daysLeft} day{daysLeft !== 1 ? 's' : ''} left this week</span>
        </div>
        {levelInfo.next_level && levelInfo.xp_to_next_level !== null && levelInfo.xp_to_next_level > 0 && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>{levelInfo.xp_to_next_level} XP to {levelInfo.next_level}</span>
          </div>
        )}
        {levelInfo.current_level === 'Seraphim' && (
          <div className="flex items-center gap-1.5 text-orange-500 dark:text-orange-400 font-medium">
            <Trophy className="h-4 w-4" />
            <span>Max level!</span>
          </div>
        )}
      </div>
    </Card>
  )
}
