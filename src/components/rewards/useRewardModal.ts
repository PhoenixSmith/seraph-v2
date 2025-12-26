import { useState, useCallback } from 'react'
import type { Achievement } from './AchievementUnlockReward'
import type { UnlockedItem } from '@/lib/api'

export interface BookCompletionReward {
  type: 'book_completion'
  book: string
  chaptersCompleted: number
  xpAwarded: number
  totalXP?: number
  achievement?: {
    name: string
    description: string
    icon: string
    xp_reward: number
    unlocked_item?: UnlockedItem | null
  }
}

export interface AchievementReward {
  type: 'achievement'
  achievement: Achievement
  unlockedItem?: UnlockedItem | null
  totalXP?: number
}

export type RewardData = BookCompletionReward | AchievementReward

interface RewardQueueItem {
  id: string
  data: RewardData
}

interface UseRewardModalReturn {
  // Current reward being displayed
  currentReward: RewardData | null
  // Whether modal is open
  isOpen: boolean
  // Queue a reward to be shown
  queueReward: (reward: RewardData) => void
  // Queue multiple rewards (they'll be shown in sequence)
  queueRewards: (rewards: RewardData[]) => void
  // Dismiss current reward (shows next in queue or closes)
  dismissReward: () => void
  // Check if there are pending rewards
  hasPendingRewards: boolean
  // Number of pending rewards
  pendingCount: number
}

export function useRewardModal(): UseRewardModalReturn {
  const [queue, setQueue] = useState<RewardQueueItem[]>([])
  const [currentReward, setCurrentReward] = useState<RewardData | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const generateId = () => `reward-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  const showNextReward = useCallback(() => {
    setQueue((prevQueue) => {
      if (prevQueue.length === 0) {
        setCurrentReward(null)
        setIsOpen(false)
        return prevQueue
      }

      const [next, ...rest] = prevQueue
      setCurrentReward(next.data)
      setIsOpen(true)
      return rest
    })
  }, [])

  const queueReward = useCallback((reward: RewardData) => {
    const item: RewardQueueItem = { id: generateId(), data: reward }

    setQueue((prev) => {
      // If nothing is currently showing, show this immediately
      if (!isOpen && prev.length === 0) {
        setCurrentReward(reward)
        setIsOpen(true)
        return prev
      }
      return [...prev, item]
    })
  }, [isOpen])

  const queueRewards = useCallback((rewards: RewardData[]) => {
    if (rewards.length === 0) return

    const items: RewardQueueItem[] = rewards.map((data) => ({
      id: generateId(),
      data
    }))

    setQueue((prev) => {
      // If nothing is currently showing, show first immediately
      if (!isOpen && prev.length === 0) {
        const [first, ...rest] = items
        setCurrentReward(first.data)
        setIsOpen(true)
        return rest
      }
      return [...prev, ...items]
    })
  }, [isOpen])

  const dismissReward = useCallback(() => {
    // Small delay before showing next for smooth transition
    setIsOpen(false)
    setTimeout(() => {
      showNextReward()
    }, 300)
  }, [showNextReward])

  return {
    currentReward,
    isOpen,
    queueReward,
    queueRewards,
    dismissReward,
    hasPendingRewards: queue.length > 0,
    pendingCount: queue.length
  }
}

// Helper to convert API response to reward data
export function parseChapterCompletionReward(response: {
  success: boolean
  already_completed?: boolean
  xp_awarded: number
  total_xp?: number
  achievement?: {
    awarded: boolean
    reason?: string
    achievement?: {
      id: string
      key: string
      name: string
      description: string
      icon: string
      xp_reward: number
    }
    unlocked_item?: UnlockedItem | null
  }
}, book: string, chapter: number, totalChapters: number): RewardData | null {
  if (!response.success || response.already_completed) {
    return null
  }

  // Check if this completes the book (chapter === totalChapters)
  const completesBook = chapter === totalChapters

  if (completesBook && response.achievement?.awarded && response.achievement.achievement) {
    // Book completion with achievement
    return {
      type: 'book_completion',
      book,
      chaptersCompleted: totalChapters,
      xpAwarded: response.xp_awarded,
      totalXP: response.total_xp,
      achievement: {
        name: response.achievement.achievement.name,
        description: response.achievement.achievement.description,
        icon: response.achievement.achievement.icon,
        xp_reward: response.achievement.achievement.xp_reward,
        unlocked_item: response.achievement.unlocked_item
      }
    }
  }

  // Standalone achievement (streak, challenge, etc.)
  if (response.achievement?.awarded && response.achievement.achievement) {
    return {
      type: 'achievement',
      achievement: {
        name: response.achievement.achievement.name,
        description: response.achievement.achievement.description,
        icon: response.achievement.achievement.icon,
        category: 'special' as const, // Default, can be enhanced based on key
        xp_reward: response.achievement.achievement.xp_reward
      },
      unlockedItem: response.achievement.unlocked_item,
      totalXP: response.total_xp
    }
  }

  return null
}

export default useRewardModal
