import { BookCompletionReward } from './BookCompletionReward'
import { AchievementUnlockReward } from './AchievementUnlockReward'
import type { RewardData } from './useRewardModal'

interface RewardRendererProps {
  reward: RewardData | null
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

export function RewardRenderer({
  reward,
  isOpen,
  onClose,
  onComplete
}: RewardRendererProps) {
  if (!reward) return null

  if (reward.type === 'book_completion') {
    return (
      <BookCompletionReward
        open={isOpen}
        onClose={onClose}
        book={reward.book}
        chaptersCompleted={reward.chaptersCompleted}
        xpAwarded={reward.xpAwarded}
        totalXP={reward.totalXP}
        achievement={reward.achievement}
        onComplete={onComplete}
      />
    )
  }

  if (reward.type === 'achievement') {
    return (
      <AchievementUnlockReward
        open={isOpen}
        onClose={onClose}
        achievement={reward.achievement}
        unlockedItem={reward.unlockedItem}
        totalXP={reward.totalXP}
        onComplete={onComplete}
      />
    )
  }

  return null
}

export default RewardRenderer
