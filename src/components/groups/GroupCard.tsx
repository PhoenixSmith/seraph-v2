import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Crown, ChevronRight } from 'lucide-react'
import { Id } from '../../../convex/_generated/dataModel'

interface Group {
  _id: Id<"groups">
  name: string
  memberCount: number
  isLeader: boolean
}

interface GroupCardProps {
  group: Group
  onClick: () => void
}

export function GroupCard({ group, onClick }: GroupCardProps) {
  return (
    <Card
      className="p-4 cursor-pointer hover:border-border/80 hover:shadow-md transition-all flex justify-between items-center gap-4"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold truncate">{group.name}</h3>
        <div className="flex gap-3 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      {group.isLeader && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Crown className="h-3 w-3" />
          Leader
        </Badge>
      )}
      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
    </Card>
  )
}
