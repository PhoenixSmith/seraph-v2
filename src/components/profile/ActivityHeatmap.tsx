import { useMemo } from 'react'
import { useQuery } from '@/hooks/useSupabase'
import * as api from '@/lib/api'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ActivityHeatmapProps {
  className?: string
}

export function ActivityHeatmap({ className }: ActivityHeatmapProps) {
  const xpHistory = useQuery(() => api.getRollingXpHistory(30), [])

  const { grid, maxXp } = useMemo(() => {
    if (!xpHistory || xpHistory.length === 0) {
      return { grid: [], maxXp: 0 }
    }

    const maxXp = Math.max(...xpHistory.map(d => d.xp), 1)

    // Create a map for quick lookup
    const xpMap = new Map(xpHistory.map(d => [d.date, d.xp]))

    // Generate last 30 days
    const days: { date: string; xp: number; dayOfWeek: number }[] = []
    const today = new Date()

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      days.push({
        date: dateStr,
        xp: xpMap.get(dateStr) ?? 0,
        dayOfWeek: date.getDay()
      })
    }

    // Group into weeks (columns)
    const weeks: typeof days[] = []
    let currentWeek: typeof days = []

    for (const day of days) {
      currentWeek.push(day)
      if (day.dayOfWeek === 6) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return { grid: weeks, maxXp }
  }, [xpHistory])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Get first and last dates for the range display - must be before conditional return
  const dateRange = useMemo(() => {
    if (grid.length === 0) return { start: '', end: '' }
    const firstWeek = grid[0]
    const lastWeek = grid[grid.length - 1]
    const startDate = firstWeek[0]?.date
    const endDate = lastWeek[lastWeek.length - 1]?.date
    return {
      start: startDate ? formatDate(startDate) : '',
      end: endDate ? formatDate(endDate) : ''
    }
  }, [grid])

  const getIntensityClass = (xp: number) => {
    if (xp === 0) return 'bg-muted'
    const ratio = xp / maxXp
    if (ratio < 0.25) return 'bg-blue-200 dark:bg-blue-900'
    if (ratio < 0.5) return 'bg-blue-400 dark:bg-blue-700'
    if (ratio < 0.75) return 'bg-blue-500 dark:bg-blue-600'
    return 'bg-blue-600 dark:bg-blue-500'
  }

  if (xpHistory === undefined) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          Loading activity...
        </div>
      </Card>
    )
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">30-Day Activity</h3>
        <span className="text-xs text-muted-foreground">
          {dateRange.start} - {dateRange.end}
        </span>
      </div>

      <div className="flex items-start justify-center gap-2">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] text-[10px] text-muted-foreground pt-0.5">
          {dayLabels.map((label, i) => (
            <div key={i} className="h-5 flex items-center justify-end pr-1">
              {i % 2 === 1 ? label : ''}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="flex gap-[3px]">
          {grid.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-[3px]">
              {/* Pad the first week if it doesn't start on Sunday */}
              {weekIdx === 0 && week[0] && week[0].dayOfWeek > 0 && (
                <>
                  {Array.from({ length: week[0].dayOfWeek }).map((_, i) => (
                    <div key={`pad-${i}`} className="w-5 h-5" />
                  ))}
                </>
              )}
              {week.map((day) => (
                <div
                  key={day.date}
                  className={cn(
                    "w-5 h-5 rounded transition-all cursor-pointer hover:scale-110 hover:ring-2 hover:ring-blue-500/30",
                    getIntensityClass(day.xp)
                  )}
                  title={`${formatDate(day.date)}: ${day.xp} XP`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-5 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <div className="w-3 h-3 rounded-sm bg-blue-200 dark:bg-blue-900" />
          <div className="w-3 h-3 rounded-sm bg-blue-400 dark:bg-blue-700" />
          <div className="w-3 h-3 rounded-sm bg-blue-500 dark:bg-blue-600" />
          <div className="w-3 h-3 rounded-sm bg-blue-600 dark:bg-blue-500" />
        </div>
        <span>More</span>
      </div>
    </Card>
  )
}
