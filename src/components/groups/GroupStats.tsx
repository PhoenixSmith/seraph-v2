import { useQuery } from '@/hooks/useSupabase'
import * as api from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Users, Zap, BookOpen, Calendar, Activity } from 'lucide-react'

interface GroupStatsProps {
  groupId: string
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  subtext?: string
}

function StatCard({ icon, label, value, subtext }: StatCardProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-4 px-2 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">
          {label}{subtext && ` ${subtext}`}
        </p>
      </div>
    </div>
  )
}

function formatNumber(num: number | undefined | null): string {
  if (num == null || typeof num !== 'number' || isNaN(num)) return '0'
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function GroupStats({ groupId }: GroupStatsProps) {
  const stats = useQuery(() => api.getGroupStatistics(groupId), [groupId])

  if (stats === undefined) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground py-4">Loading stats...</div>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <Card className="p-2">
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
        <StatCard
          icon={<Users className="h-5 w-5 text-blue-500" />}
          label="Members"
          value={stats.member_count}
        />
        <StatCard
          icon={<Activity className="h-5 w-5 text-green-500" />}
          label="Active (7d)"
          value={stats.active_members}
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-purple-500" />}
          label="Chapters"
          value={formatNumber(stats.total_chapters)}
        />
        <StatCard
          icon={<Zap className="h-5 w-5 text-yellow-500" />}
          label="XP"
          value={formatNumber(stats.total_xp)}
          subtext="total"
        />
        <StatCard
          icon={<Calendar className="h-5 w-5 text-orange-500" />}
          label="XP"
          value={formatNumber(stats.xp_this_week)}
          subtext="this week"
        />
      </div>
    </Card>
  )
}
