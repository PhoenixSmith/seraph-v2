import { RewardModal, XPBurst } from './RewardModal'
import { Trophy, Flame, Target, Zap, Medal, Award, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Achievement category configurations
const CATEGORY_CONFIG: Record<string, {
  title: string
  gradient: string
  bgGradient: string
  borderColor: string
  confettiColors: string[]
  Icon: React.ComponentType<{ className?: string }>
}> = {
  book_completion: {
    title: 'BOOK COMPLETED',
    gradient: 'from-amber-500 to-yellow-500',
    bgGradient: 'from-amber-900/50 via-amber-800/50 to-amber-900/50',
    borderColor: 'border-amber-500/30',
    confettiColors: ['#FFD700', '#FFA500', '#FF8C00', '#FFEAA7'],
    Icon: Trophy
  },
  streak: {
    title: 'STREAK MILESTONE',
    gradient: 'from-orange-500 to-red-500',
    bgGradient: 'from-orange-900/50 via-red-800/50 to-orange-900/50',
    borderColor: 'border-orange-500/30',
    confettiColors: ['#FF6B6B', '#FF8E53', '#FFA07A', '#FF4500'],
    Icon: Flame
  },
  xp_milestone: {
    title: 'XP MILESTONE',
    gradient: 'from-emerald-500 to-teal-500',
    bgGradient: 'from-emerald-900/50 via-teal-800/50 to-emerald-900/50',
    borderColor: 'border-emerald-500/30',
    confettiColors: ['#4ECDC4', '#45B7D1', '#2ECC71', '#1ABC9C'],
    Icon: Target
  },
  special: {
    title: 'SPECIAL ACHIEVEMENT',
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-900/50 via-pink-800/50 to-purple-900/50',
    borderColor: 'border-purple-500/30',
    confettiColors: ['#9B59B6', '#E91E63', '#DDA0DD', '#FF69B4'],
    Icon: Award
  },
  challenge: {
    title: 'CHALLENGE VICTORY',
    gradient: 'from-blue-500 to-indigo-500',
    bgGradient: 'from-blue-900/50 via-indigo-800/50 to-blue-900/50',
    borderColor: 'border-blue-500/30',
    confettiColors: ['#3498DB', '#5DADE2', '#85C1E9', '#1E90FF'],
    Icon: Medal
  }
}

// Rarity based on XP reward
const getRarity = (xpReward: number): { label: string; color: string; glow: string } => {
  if (xpReward >= 300) return { label: 'LEGENDARY', color: 'text-orange-400', glow: 'shadow-orange-500/50' }
  if (xpReward >= 150) return { label: 'EPIC', color: 'text-purple-400', glow: 'shadow-purple-500/50' }
  if (xpReward >= 75) return { label: 'RARE', color: 'text-blue-400', glow: 'shadow-blue-500/50' }
  if (xpReward >= 30) return { label: 'UNCOMMON', color: 'text-green-400', glow: 'shadow-green-500/50' }
  return { label: 'COMMON', color: 'text-slate-400', glow: 'shadow-slate-500/50' }
}

export interface Achievement {
  id?: string
  key?: string
  name: string
  description: string
  icon: string
  category: 'book_completion' | 'streak' | 'xp_milestone' | 'special' | 'challenge'
  xp_reward: number
}

interface AchievementUnlockRewardProps {
  open: boolean
  onClose: () => void
  achievement: Achievement
  totalXP?: number
  onComplete?: () => void
}

export function AchievementUnlockReward({
  open,
  onClose,
  achievement,
  totalXP,
  onComplete
}: AchievementUnlockRewardProps) {
  const config = CATEGORY_CONFIG[achievement.category] || CATEGORY_CONFIG.special
  const rarity = getRarity(achievement.xp_reward)
  const CategoryIcon = config.Icon

  return (
    <RewardModal
      open={open}
      onClose={onClose}
      onComplete={onComplete}
      confettiColors={config.confettiColors}
    >
      <div className="flex flex-col items-center text-center space-y-5">
        {/* Category header */}
        <div className="flex items-center gap-2 animate-reward-bounce">
          <CategoryIcon className={cn('w-5 h-5', `text-${achievement.category === 'streak' ? 'orange' : 'amber'}-400`)} />
          <span className={cn(
            'text-sm font-bold uppercase tracking-wider bg-gradient-to-r bg-clip-text text-transparent',
            config.gradient
          )}>
            {config.title}
          </span>
          <CategoryIcon className={cn('w-5 h-5', `text-${achievement.category === 'streak' ? 'orange' : 'amber'}-400`)} />
        </div>

        {/* Achievement icon with animated effects */}
        <div className="relative">
          {/* Rotating gradient ring */}
          <div className={cn(
            'absolute inset-0 -m-6 rounded-full bg-gradient-to-r animate-reward-spin opacity-40 blur-lg',
            config.gradient
          )} />

          {/* Pulsing glow */}
          <div className={cn(
            'absolute inset-0 -m-3 rounded-full animate-reward-glow',
            rarity.glow
          )}
            style={{ boxShadow: `0 0 40px currentColor` }}
          />

          {/* Main icon container */}
          <div className={cn(
            'relative w-28 h-28 rounded-2xl bg-gradient-to-br flex items-center justify-center border-2 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform',
            config.bgGradient,
            config.borderColor
          )}>
            <span className="text-6xl animate-reward-icon-pulse">{achievement.icon}</span>
          </div>

          {/* Corner decorations */}
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center animate-reward-star-1 shadow-lg">
            <Star className="w-4 h-4 text-slate-900 fill-slate-900" />
          </div>
          <Zap className="absolute -bottom-2 -left-2 w-6 h-6 text-yellow-400 animate-reward-star-2" />
        </div>

        {/* Rarity badge */}
        <Badge className={cn(
          'px-4 py-1 font-bold tracking-wider border-0',
          rarity.color,
          'bg-slate-800/80'
        )}>
          {rarity.label}
        </Badge>

        {/* Achievement name and description */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white font-serif leading-tight">
            {achievement.name}
          </h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            {achievement.description}
          </p>
        </div>

        {/* XP reward section */}
        <div className={cn(
          'flex flex-col items-center gap-2 py-4 px-8 rounded-xl w-full',
          config.bgGradient
        )}>
          <XPBurst xp={achievement.xp_reward} className="text-4xl" />
          {totalXP && (
            <span className="text-sm text-slate-400">
              Total XP: <span className="text-amber-400 font-semibold">{totalXP.toLocaleString()}</span>
            </span>
          )}
        </div>

        {/* Progress indicator for collection */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Trophy className="w-4 h-4" />
          <span>Achievement added to your collection</span>
        </div>
      </div>
    </RewardModal>
  )
}

export default AchievementUnlockReward
