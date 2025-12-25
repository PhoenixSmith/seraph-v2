import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Crown, ChevronRight } from 'lucide-react'
import { useQuery } from '@/hooks/useSupabase'
import * as api from '@/lib/api'
import { GroupLevelBadge } from './GroupLevelBadge'

interface Group {
  id: string
  name: string
  description: string | null
  member_count: number
  is_leader: boolean
}

interface GroupCardProps {
  group: Group
  onClick: () => void
}

export function GroupCard({ group, onClick }: GroupCardProps) {
  const levelInfo = useQuery(() => api.getGroupLevelInfo(group.id), [group.id])

  return (
    <Card
      className="p-4 cursor-pointer hover:border-border/80 hover:shadow-md transition-all flex justify-between items-center gap-4"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-lg font-semibold truncate">{group.name}</h3>
          {levelInfo && (
            <GroupLevelBadge
              level={levelInfo.current_level}
              color={levelInfo.level_color}
              size="sm"
            />
          )}
        </div>
        {group.description && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
            {group.description}
          </p>
        )}
        <div className="flex gap-3 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {group.member_count} member{group.member_count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      {group.is_leader && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Crown className="h-3 w-3" />
          Leader
        </Badge>
      )}
      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
    </Card>
  )
}
