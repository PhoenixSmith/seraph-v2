import { useState } from 'react'
import { useQueryWithLoading } from '@/hooks/useSupabase'
import * as api from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  Trophy,
  Lock,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Flame,
  Swords,
  Sparkles,
  RefreshCw
} from 'lucide-react'

type AchievementCategory = 'all' | 'book_completion' | 'streak' | 'special'

// Helper to check if an achievement should be considered unlocked
// Either explicitly unlocked, or has 100% progress for book achievements
function isAchievementUnlocked(
  achievement: api.Achievement,
  bookProgress?: api.BookAchievementProgress[]
): boolean {
  if (achievement.unlocked) return true

  if (achievement.category === 'book_completion' && bookProgress) {
    const progress = bookProgress.find(p => p.achievement_key === achievement.key)
    if (progress && progress.percentage === 100) {
      return true
    }
  }

  return false
}

const CATEGORY_INFO: Record<AchievementCategory, { label: string; icon: React.ReactNode }> = {
  all: { label: 'All', icon: <Trophy className="h-4 w-4" /> },
  book_completion: { label: 'Books', icon: <BookOpen className="h-4 w-4" /> },
  streak: { label: 'Streaks', icon: <Flame className="h-4 w-4" /> },
  special: { label: 'Challenges', icon: <Swords className="h-4 w-4" /> }
}

function getUnlockHint(achievement: api.Achievement, bookProgress?: api.BookAchievementProgress[]): string {
  const req = JSON.parse(JSON.stringify(achievement)) // Clone to parse requirement if needed

  // Book completion achievements
  if (achievement.category === 'book_completion') {
    const progress = bookProgress?.find(p => p.achievement_key === achievement.key)
    if (progress) {
      if (progress.percentage === 0) {
        return `Start reading ${progress.book}`
      }
      return `${progress.completed_chapters}/${progress.total_chapters} chapters (${progress.percentage}%)`
    }
    return 'Complete all chapters in this book'
  }

  // Streak achievements
  if (achievement.category === 'streak') {
    const match = achievement.key.match(/streak_(\d+)/)
    if (match) {
      const days = parseInt(match[1])
      return `Read for ${days} consecutive days`
    }
  }

  // Challenge achievements
  if (achievement.key.startsWith('challenge_wins')) {
    const match = achievement.key.match(/challenge_wins_(\d+)/)
    if (match) {
      const wins = parseInt(match[1])
      return `Win ${wins} group challenge${wins > 1 ? 's' : ''}`
    }
  }

  return achievement.description
}

interface AchievementCardProps {
  achievement: api.Achievement
  bookProgress?: api.BookAchievementProgress[]
  currentStreak?: number
}

function AchievementCard({ achievement, bookProgress, currentStreak }: AchievementCardProps) {
  const isUnlocked = isAchievementUnlocked(achievement, bookProgress)
  const hint = getUnlockHint(achievement, bookProgress)

  // Calculate progress for progress bar
  let progressValue = isUnlocked ? 100 : 0
  let progressText = ''

  if (!isUnlocked) {
    if (achievement.category === 'book_completion') {
      const progress = bookProgress?.find(p => p.achievement_key === achievement.key)
      if (progress) {
        progressValue = progress.percentage
        progressText = `${progress.completed_chapters}/${progress.total_chapters}`
      }
    } else if (achievement.category === 'streak' && currentStreak !== undefined) {
      const match = achievement.key.match(/streak_(\d+)/)
      if (match) {
        const requiredDays = parseInt(match[1])
        progressValue = Math.min((currentStreak / requiredDays) * 100, 100)
        progressText = `${currentStreak}/${requiredDays} days`
      }
    }
  }

  return (
    <Card
      className={cn(
        'p-4 transition-all',
        isUnlocked
          ? 'bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/30'
          : 'opacity-75 grayscale-[30%]'
      )}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl text-2xl shrink-0',
            isUnlocked ? 'bg-amber-500/20' : 'bg-muted'
          )}
        >
          {isUnlocked ? (
            achievement.icon
          ) : (
            <Lock className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className={cn(
                'font-semibold text-sm',
                !isUnlocked && 'text-muted-foreground'
              )}>
                {achievement.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {isUnlocked ? achievement.description : hint}
              </p>
            </div>
            <Badge
              variant={isUnlocked ? 'default' : 'secondary'}
              className={cn(
                'shrink-0 text-xs',
                isUnlocked && 'bg-amber-500 hover:bg-amber-600'
              )}
            >
              +{achievement.xp_reward} XP
            </Badge>
          </div>

          {/* Progress bar for locked achievements */}
          {!isUnlocked && progressValue > 0 && (
            <div className="mt-2">
              <Progress value={progressValue} className="h-1.5" />
              {progressText && (
                <p className="text-xs text-muted-foreground mt-1">{progressText}</p>
              )}
            </div>
          )}

          {/* Unlock date for unlocked achievements */}
          {isUnlocked && achievement.unlocked_at && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}

export function AchievementsSection() {
  const [category, setCategory] = useState<AchievementCategory>('all')
  const [showAll, setShowAll] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<string | null>(null)

  const { data: achievements, refetch: refetchAchievements } = useQueryWithLoading(
    () => api.getAchievementsWithStatus(),
    []
  )
  const { data: bookProgress, refetch: refetchBookProgress } = useQueryWithLoading(
    () => api.getAllBookProgress(),
    []
  )
  const { data: stats } = useQueryWithLoading(() => api.getProfileStats(), [])

  const handleCheckAchievements = async () => {
    setIsChecking(true)
    setCheckResult(null)
    try {
      // Check both book and misc achievements
      const [bookResult, miscResult] = await Promise.all([
        api.checkAllBookAchievements(),
        api.checkAllMiscAchievements()
      ])

      const bookAwarded = bookResult.newly_awarded?.length ?? 0
      const streakAwarded = miscResult.streak?.newly_awarded?.length ?? 0
      const challengeAwarded = miscResult.challenges?.newly_awarded?.length ?? 0
      const totalAwarded = bookAwarded + streakAwarded + challengeAwarded

      if (totalAwarded > 0) {
        setCheckResult(`Unlocked ${totalAwarded} achievement${totalAwarded > 1 ? 's' : ''}!`)
      } else {
        setCheckResult('No new achievements to unlock')
      }

      // Refetch to update the UI
      refetchAchievements()
      refetchBookProgress()
    } catch (err) {
      console.error('Error checking achievements:', err)
      setCheckResult('Error checking achievements')
    } finally {
      setIsChecking(false)
    }
  }

  if (achievements === undefined) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground text-sm py-4">
          Loading achievements...
        </div>
      </Card>
    )
  }

  // Filter and sort achievements
  let filtered = achievements
  if (category !== 'all') {
    if (category === 'special') {
      filtered = achievements.filter(a => a.category === 'special' || a.key.startsWith('challenge'))
    } else {
      filtered = achievements.filter(a => a.category === category)
    }
  }

  // Sort: unlocked first, then by category, then by XP reward
  const sorted = [...filtered].sort((a, b) => {
    const aUnlocked = isAchievementUnlocked(a, bookProgress ?? [])
    const bUnlocked = isAchievementUnlocked(b, bookProgress ?? [])
    // Unlocked first
    if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1
    // Then by XP reward (higher first for unlocked, lower first for locked)
    if (aUnlocked) return b.xp_reward - a.xp_reward
    return a.xp_reward - b.xp_reward
  })

  const unlockedCount = achievements.filter(a => isAchievementUnlocked(a, bookProgress ?? [])).length
  const totalCount = achievements.length
  const displayAchievements = showAll ? sorted : sorted.slice(0, 6)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h2 className="font-semibold">Achievements</h2>
        </div>
        <Badge variant="outline">
          {unlockedCount}/{totalCount}
        </Badge>
        {/* Sync button - commented out for now
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCheckAchievements}
          disabled={isChecking}
          className="h-8 text-xs"
        >
          <RefreshCw className={cn('h-3 w-3 mr-1', isChecking && 'animate-spin')} />
          {isChecking ? 'Checking...' : 'Sync'}
        </Button>
        */}
      </div>

      {/* Check result message */}
      {checkResult && (
        <div className={cn(
          'text-sm px-3 py-2 rounded-md',
          checkResult.includes('Unlocked')
            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
            : 'bg-muted text-muted-foreground'
        )}>
          {checkResult}
        </div>
      )}

      {/* Overall progress */}
      <div>
        <Progress value={totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1">
          {totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0}% complete
        </p>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(CATEGORY_INFO) as AchievementCategory[]).map((cat) => (
          <Button
            key={cat}
            variant={category === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory(cat)}
            className="text-xs"
          >
            {CATEGORY_INFO[cat].icon}
            <span className="ml-1">{CATEGORY_INFO[cat].label}</span>
            {cat !== 'all' && (
              <span className="ml-1 opacity-70">
                ({achievements.filter(a =>
                  cat === 'special'
                    ? a.category === 'special' || a.key.startsWith('challenge')
                    : a.category === cat
                ).filter(a => isAchievementUnlocked(a, bookProgress ?? [])).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Achievement cards */}
      <div className="grid gap-3">
        {displayAchievements.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            bookProgress={bookProgress ?? []}
            currentStreak={stats?.current_streak}
          />
        ))}
      </div>

      {/* Show more/less button */}
      {sorted.length > 6 && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Show All ({sorted.length - 6} more)
            </>
          )}
        </Button>
      )}
    </div>
  )
}
