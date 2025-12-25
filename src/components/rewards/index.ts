// Reward Modal Components
export { RewardModal, XPBurst } from './RewardModal'
export { BookCompletionReward } from './BookCompletionReward'
export { AchievementUnlockReward } from './AchievementUnlockReward'
export { RewardRenderer } from './RewardRenderer'
export type { Achievement } from './AchievementUnlockReward'

// Hook for managing reward modals
export {
  useRewardModal,
  parseChapterCompletionReward
} from './useRewardModal'
export type {
  BookCompletionReward as BookCompletionRewardData,
  AchievementReward,
  RewardData
} from './useRewardModal'
