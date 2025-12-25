import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Crown, Star, Flame, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/avatar/UserAvatar'
import { MemberHoverCard } from './MemberHoverCard'
import type { AvatarConfig } from '@/lib/api'

interface Member {
  user_id: string
  rank: number
  name?: string | null
  avatar_url?: string | null
  avatar_config: AvatarConfig
  total_xp: number
  current_streak: number
  is_leader: boolean
  is_current_user: boolean
}

interface LeaderboardRowProps {
  member: Member
  onRemove: (userId: string) => void
  canRemove: boolean
}

export function LeaderboardRow({ member, onRemove, canRemove }: LeaderboardRowProps) {
  const getRankClass = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-amber-500 text-amber-900'
    if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700'
    if (rank === 3) return 'bg-gradient-to-br from-amber-600 to-amber-700 text-white'
    return 'bg-muted text-muted-foreground'
  }

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return '1st'
    if (rank === 2) return '2nd'
    if (rank === 3) return '3rd'
    return `${rank}th`
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 border-b last:border-b-0",
        member.is_current_user && "bg-primary/5"
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0",
          getRankClass(member.rank)
        )}
      >
        {member.rank <= 3 ? getRankDisplay(member.rank) : member.rank}
      </div>

      <MemberHoverCard
        userId={member.user_id}
        userName={member.name ?? null}
        avatarConfig={member.avatar_config}
      >
        <UserAvatar
          size="sm"
          editable={false}
          config={member.avatar_config}
        />
      </MemberHoverCard>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{member.name || 'Unknown User'}</span>
          {member.is_leader && (
            <Crown className="h-4 w-4 text-amber-500" fill="currentColor" />
          )}
          {member.is_current_user && (
            <Badge variant="secondary" className="text-xs">You</Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Star className="h-3.5 w-3.5" fill="currentColor" />
          <span>{member.total_xp} XP</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Flame className="h-3.5 w-3.5" fill="currentColor" />
          <span>{member.current_streak}d</span>
        </div>
      </div>

      {canRemove && !member.is_current_user && !member.is_leader && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => onRemove(member.user_id)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
