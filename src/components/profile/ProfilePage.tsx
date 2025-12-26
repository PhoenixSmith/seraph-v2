import { useState, useEffect } from 'react'
import { useQuery } from '@/hooks/useSupabase'
import * as api from '@/lib/api'
import { ActivityHeatmap } from './ActivityHeatmap'
import { AchievementsSection } from './AchievementsSection'
import { ShareModal } from './ShareModal'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserAvatar, DEFAULT_AVATAR_CONFIG, type AvatarConfig } from '@/components/avatar'
import { updateAvatarConfig } from '@/lib/api'
import {
  Star,
  Flame,
  BookOpen,
  Target,
  TrendingUp,
  ArrowLeft,
  Share2,
  ScrollText,
  Sun,
  Moon
} from 'lucide-react'

interface ProfilePageProps {
  user: api.User
  onBack: () => void
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  subtext?: string
}

function StatCard({ icon, label, value, subtext }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground">{subtext}</p>
          )}
        </div>
      </div>
    </Card>
  )
}

export function ProfilePage({ user, onBack }: ProfilePageProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(user.avatar_config ?? DEFAULT_AVATAR_CONFIG)
  const stats = useQuery(() => api.getProfileStats(), [])
  const achievements = useQuery(() => api.getUserAchievements(), []) // Used for ShareModal

  // Theme state
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved || 'system'
  })

  useEffect(() => {
    const root = document.documentElement
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mediaQuery.matches)
      const handleChange = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mediaQuery.addEventListener('change', handleChange)
      localStorage.setItem('theme', theme)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      applyTheme(theme === 'dark')
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(current => {
      if (current === 'light') return 'dark'
      if (current === 'dark') return 'light'
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      return isDark ? 'light' : 'dark'
    })
  }

  const isDarkMode = () => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  const handleAvatarChange = async (newConfig: AvatarConfig) => {
    setAvatarConfig(newConfig)
    try {
      await updateAvatarConfig(newConfig)
    } catch (err) {
      console.error('Failed to save avatar config:', err)
    }
  }

  const displayName = user.name || user.email || 'User'

  if (stats === undefined) {
    return (
      <div className="py-2">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="py-8 text-center text-muted-foreground">
          Loading profile...
        </div>
      </div>
    )
  }

  const tierProgress =
    stats && stats.next_tier_threshold
      ? (stats.rolling_xp / stats.next_tier_threshold) * 100
      : 100

  return (
    <div className="py-2 space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          variant="outline"
          onClick={() => setShareModalOpen(true)}
          disabled={!stats}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>

      {/* User Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <UserAvatar size="lg" editable={true} config={avatarConfig} onConfigChange={handleAvatarChange} />
        </div>
        <h1 className="text-2xl font-bold">{displayName}</h1>
        {user.email && user.name && (
          <p className="text-sm text-muted-foreground">{user.email}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">Tap avatar to customize</p>
      </div>

      {/* Tier Progress */}
      {stats && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Badge
              className="text-white"
              style={{ backgroundColor: stats.tier_color }}
            >
              {stats.current_tier}
            </Badge>
            {stats.next_tier && (
              <span className="text-sm text-muted-foreground">
                {stats.xp_to_next_tier} XP to {stats.next_tier}
              </span>
            )}
          </div>
          <Progress value={tierProgress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {stats.rolling_xp} / {stats.next_tier_threshold ?? stats.rolling_xp}{' '}
            XP (14-day rolling)
          </p>
        </Card>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={<ScrollText className="h-5 w-5 text-violet-500" />}
          label="Verses Read"
          value={stats?.verses_read ?? 0}
        />
        <StatCard
          icon={<Star className="h-5 w-5 text-amber-500" />}
          label="Total XP"
          value={stats?.total_xp ?? 0}
        />
        <StatCard
          icon={<Flame className="h-5 w-5 text-red-500" />}
          label="Current Streak"
          value={stats?.current_streak ?? 0}
          subtext="Days"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-green-500" />}
          label="Longest Streak"
          value={stats?.longest_streak ?? 0}
          subtext="Days"
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-blue-500" />}
          label="Chapters"
          value={stats?.chapters_completed ?? 0}
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-purple-500" />}
          label="Books Started"
          value={stats?.books_started ?? 0}
        />
      </div>

      {/* Activity Heatmap */}
      <ActivityHeatmap />

      {/* Achievements Section */}
      <AchievementsSection />

      {/* Share Modal */}
      {stats && (
        <ShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          user={user}
          stats={stats}
          achievements={achievements ?? []}
        />
      )}

      {/* Dark Mode Toggle */}
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          className="w-full"
          onClick={toggleTheme}
        >
          {isDarkMode() ? (
            <>
              <Sun className="h-4 w-4 mr-2" />
              Switch to Light Mode
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 mr-2" />
              Switch to Dark Mode
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
