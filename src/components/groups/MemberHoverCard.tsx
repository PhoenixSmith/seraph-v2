import { useState } from 'react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { UserAvatar } from '@/components/avatar/UserAvatar'
import { Badge } from '@/components/ui/badge'
import * as api from '@/lib/api'
import { Flame, Sparkles } from 'lucide-react'

interface MemberHoverCardProps {
  userId: string
  userName: string | null
  avatarConfig: api.AvatarConfig
  children: React.ReactNode
}

const tierColors: Record<string, string> = {
  Bronze: 'bg-amber-700',
  Silver: 'bg-gray-400',
  Gold: 'bg-yellow-500',
  Platinum: 'bg-cyan-400',
  Diamond: 'bg-purple-500',
}

export function MemberHoverCard({ userId, userName, avatarConfig, children }: MemberHoverCardProps) {
  const [profile, setProfile] = useState<api.MemberProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  const loadProfile = async () => {
    if (hasLoaded || isLoading) return
    setIsLoading(true)
    try {
      const data = await api.getMemberProfile(userId)
      setProfile(data)
      setHasLoaded(true)
    } catch (err) {
      console.error('Failed to load member profile:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      loadProfile()
    }
  }

  return (
    <HoverCard openDelay={300} closeDelay={100} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>
        <span className="cursor-pointer">{children}</span>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 p-0 overflow-hidden" side="top">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4">
          <div className="flex items-center gap-3">
            <UserAvatar size="lg" editable={false} config={avatarConfig} />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-base truncate">
                {userName || 'Anonymous'}
              </h4>
              {profile && (
                <Badge
                  variant="secondary"
                  className={`${tierColors[profile.current_tier] || 'bg-amber-700'} text-white text-xs mt-1`}
                >
                  {profile.current_tier}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-2">
              Loading...
            </div>
          ) : profile ? (
            <>
              {/* Stats */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <div>
                    <div className="text-sm font-semibold">{profile.total_xp.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">XP</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <div>
                    <div className="text-sm font-semibold">{profile.current_streak}</div>
                    <div className="text-xs text-muted-foreground">Day Streak</div>
                  </div>
                </div>
              </div>

              {/* Recent Achievements */}
              {profile.achievements.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Recent Achievements
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className="flex items-center gap-1 bg-muted/50 rounded-full px-2 py-1"
                        title={achievement.name}
                      >
                        <span className="text-sm">{achievement.icon}</span>
                        <span className="text-xs truncate max-w-[100px]">
                          {achievement.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profile.achievements.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  No achievements yet
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-2">
              Could not load profile
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
