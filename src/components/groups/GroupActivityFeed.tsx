import { useQuery } from '@/hooks/useSupabase'
import * as api from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, UserPlus, Trophy, StickyNote, ArrowRight } from 'lucide-react'
import { UserAvatar } from '@/components/avatar/UserAvatar'
import { MemberHoverCard } from './MemberHoverCard'

interface GroupActivityFeedProps {
  groupId: string
  onNavigateToVerse?: (book: string, chapter: number, verse?: number) => void
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString()
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'chapter_completed':
      return <BookOpen className="h-4 w-4 text-emerald-500" />
    case 'joined':
      return <UserPlus className="h-4 w-4 text-blue-500" />
    case 'achievement':
      return <Trophy className="h-4 w-4 text-yellow-500" />
    case 'note_created':
      return <StickyNote className="h-4 w-4 text-amber-500" />
    default:
      return <BookOpen className="h-4 w-4 text-muted-foreground" />
  }
}

function getActivityMessage(activity: api.GroupActivity): string {
  switch (activity.activity_type) {
    case 'chapter_completed': {
      const book = activity.metadata.book as string | undefined
      const chapter = activity.metadata.chapter as number | undefined
      return `read ${book || 'Unknown'} ${chapter || ''}`
    }
    case 'joined':
      return 'joined the group'
    case 'achievement': {
      const name = activity.metadata.achievement_name as string | undefined
      const icon = activity.metadata.achievement_icon as string | undefined
      return `earned ${icon || '🏆'} ${name || 'an achievement'}`
    }
    case 'note_created': {
      const book = activity.metadata.book as string | undefined
      const chapter = activity.metadata.chapter as number | undefined
      const verse = activity.metadata.verse as number | undefined
      return `added a note on ${book || 'Unknown'} ${chapter || ''}:${verse || ''}`
    }
    default:
      return 'did something'
  }
}

export function GroupActivityFeed({ groupId, onNavigateToVerse }: GroupActivityFeedProps) {
  const activities = useQuery(() => api.getGroupActivityFeed(groupId), [groupId])

  if (activities === undefined) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground py-4">Loading activity...</div>
      </Card>
    )
  }

  if (activities.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground py-4">
          No activity yet. Start reading to see updates here!
        </div>
      </Card>
    )
  }

  const handleJumpToVerse = (activity: api.GroupActivity) => {
    if (!onNavigateToVerse) return
    const book = activity.metadata.book as string | undefined
    const chapter = activity.metadata.chapter as number | undefined
    const verse = activity.metadata.verse as number | undefined
    if (book && chapter) {
      onNavigateToVerse(book, chapter, verse)
    }
  }

  return (
    <Card className="divide-y divide-border overflow-visible">
      {activities.map((activity) => (
        <div key={activity.activity_id} className="flex items-center gap-3 p-3">
          <MemberHoverCard
            userId={activity.user_id}
            userName={activity.user_name}
            avatarConfig={activity.user_avatar_config}
          >
            <UserAvatar size="sm" editable={false} config={activity.user_avatar_config} />
          </MemberHoverCard>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">{activity.user_name || 'Anonymous'}</span>{' '}
              <span className="text-muted-foreground">{getActivityMessage(activity)}</span>
            </p>
            {activity.activity_type === 'note_created' && activity.metadata.preview && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate italic">
                "{activity.metadata.preview as string}"
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {activity.activity_type === 'note_created' && onNavigateToVerse && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handleJumpToVerse(activity)}
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                Go
              </Button>
            )}
            {getActivityIcon(activity.activity_type)}
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(activity.created_at)}
            </span>
          </div>
        </div>
      ))}
    </Card>
  )
}
