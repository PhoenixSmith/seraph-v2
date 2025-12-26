import { RewardModal, XPBurst } from './RewardModal'
import { Book, Crown, Star, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getItemById, getItemImagePath } from '@/config/avatarItems'
import type { UnlockedItem } from '@/lib/api'

// Book icons/emojis for each book of the Bible
const BOOK_ICONS: Record<string, string> = {
  Genesis: '🌍',
  Exodus: '🚶',
  Leviticus: '⚖️',
  Numbers: '🔢',
  Deuteronomy: '📜',
  Joshua: '⚔️',
  Judges: '🏛️',
  Ruth: '🌾',
  '1 Samuel': '👑',
  '2 Samuel': '🏰',
  '1 Kings': '👑',
  '2 Kings': '🔥',
  '1 Chronicles': '📖',
  '2 Chronicles': '🏛️',
  Ezra: '🔨',
  Nehemiah: '🧱',
  Esther: '👸',
  Job: '💔',
  Psalms: '🎶',
  Proverbs: '🦉',
  Ecclesiastes: '🌅',
  'Song of Solomon': '💕',
  Isaiah: '🕊️',
  Jeremiah: '😢',
  Lamentations: '💧',
  Ezekiel: '👁️',
  Daniel: '🦁',
  Hosea: '💔',
  Joel: '🦗',
  Amos: '🌿',
  Obadiah: '⚡',
  Jonah: '🐋',
  Micah: '⚖️',
  Nahum: '🌊',
  Habakkuk: '🏔️',
  Zephaniah: '🌓',
  Haggai: '🏠',
  Zechariah: '🌟',
  Malachi: '☀️',
  Matthew: '📖',
  Mark: '🦁',
  Luke: '🩺',
  John: '🦅',
  Acts: '🔥',
  Romans: '⚖️',
  '1 Corinthians': '💌',
  '2 Corinthians': '💌',
  Galatians: '🔓',
  Ephesians: '⛪',
  Philippians: '😊',
  Colossians: '👑',
  '1 Thessalonians': '🌟',
  '2 Thessalonians': '⏳',
  '1 Timothy': '📝',
  '2 Timothy': '🏃',
  Titus: '🏝️',
  Philemon: '🤝',
  Hebrews: '✝️',
  James: '💪',
  '1 Peter': '🪨',
  '2 Peter': '⚠️',
  '1 John': '❤️',
  '2 John': '📬',
  '3 John': '📬',
  Jude: '🛡️',
  Revelation: '🌈'
}

// Fun completion titles
const COMPLETION_TITLES = [
  'Book Conquered!',
  'Chapter Master!',
  'Scripture Scholar!',
  'Divine Reader!',
  'Holy Milestone!',
  'Blessed Completion!'
]

// Rarity colors for item display
const ITEM_RARITY_CONFIG: Record<string, { border: string; bg: string; text: string }> = {
  common: { border: 'border-slate-400', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
  rare: { border: 'border-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  epic: { border: 'border-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  legendary: { border: 'border-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
}

interface BookCompletionRewardProps {
  open: boolean
  onClose: () => void
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
  onComplete?: () => void
}

export function BookCompletionReward({
  open,
  onClose,
  book,
  chaptersCompleted,
  xpAwarded,
  totalXP,
  achievement,
  onComplete
}: BookCompletionRewardProps) {
  const bookIcon = BOOK_ICONS[book] || '📖'
  const title = COMPLETION_TITLES[Math.floor(Math.random() * COMPLETION_TITLES.length)]

  // Get item info if there's an unlocked item
  const unlockedItem = achievement?.unlocked_item
  const itemDef = unlockedItem ? getItemById(unlockedItem.item_key) : null
  const itemImagePath = itemDef ? getItemImagePath(itemDef) : null
  const itemRarityConfig = unlockedItem ? ITEM_RARITY_CONFIG[unlockedItem.rarity] || ITEM_RARITY_CONFIG.common : null

  return (
    <RewardModal
      open={open}
      onClose={onClose}
      onComplete={onComplete}
      confettiColors={['#FFD700', '#FFA500', '#FF8C00', '#4ECDC4', '#45B7D1', '#FFEAA7']}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Header with animated title */}
        <div className="flex items-center gap-2 text-amber-400 animate-reward-bounce">
          <Crown className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">{title}</span>
          <Crown className="w-5 h-5" />
        </div>

        {/* Book icon display */}
        <div className="relative">
          {/* Animated ring */}
          <div className="absolute inset-0 -m-4 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 animate-reward-spin opacity-30 blur-md" />

          {/* Icon container */}
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center border-4 border-amber-500/50 shadow-lg shadow-amber-500/20">
            <span className="text-5xl animate-reward-icon-pulse">{bookIcon}</span>
          </div>

          {/* Stars around icon */}
          <Star className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 fill-yellow-400 animate-reward-star-1" />
          <Star className="absolute -bottom-1 -left-3 w-5 h-5 text-yellow-400 fill-yellow-400 animate-reward-star-2" />
          <Sparkles className="absolute -top-1 -left-2 w-5 h-5 text-amber-400 animate-reward-star-3" />
        </div>

        {/* Book name */}
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-serif">{book}</h2>
          <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
            <Book className="w-4 h-4" />
            <span>{chaptersCompleted} chapters completed</span>
          </div>
        </div>

        {/* XP reward section - only show if XP was earned */}
        {xpAwarded > 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 border-y border-slate-300/50 dark:border-slate-700/50 w-full">
            <XPBurst xp={xpAwarded} className="text-3xl" />
            {totalXP && (
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Total XP: <span className="text-amber-500 dark:text-amber-400 font-semibold">{totalXP.toLocaleString()}</span>
              </span>
            )}
          </div>
        ) : (
          <div className="py-4 border-y border-slate-300/50 dark:border-slate-700/50 w-full text-center">
            <span className="text-slate-600 dark:text-slate-400">Another journey through {book} complete!</span>
          </div>
        )}

        {/* Achievement unlock (if earned) */}
        {achievement && (
          <div className="w-full animate-reward-achievement-slide space-y-3">
            <div className="bg-gradient-to-r from-purple-100/80 via-purple-50/80 to-purple-100/80 dark:from-purple-900/50 dark:via-purple-800/50 dark:to-purple-900/50 rounded-xl p-4 border border-purple-500/30">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                Achievement Unlocked!
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{achievement.icon}</span>
                <div className="flex-1 text-left">
                  <h4 className="font-bold text-slate-900 dark:text-white">{achievement.name}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{achievement.description}</p>
                </div>
                <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30">
                  +{achievement.xp_reward} XP
                </Badge>
              </div>
            </div>

            {/* Unlocked item (if any) */}
            {unlockedItem && itemRarityConfig && (
              <div className={cn(
                'flex items-center gap-3 p-3 rounded-xl border-2',
                itemRarityConfig.border,
                itemRarityConfig.bg
              )}>
                {/* Item image */}
                <div className="relative flex-shrink-0">
                  <div className={cn(
                    'w-12 h-12 rounded-lg border-2 overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center',
                    itemRarityConfig.border
                  )}>
                    {itemImagePath ? (
                      <img
                        src={itemImagePath}
                        alt={unlockedItem.name}
                        className="w-10 h-10 object-contain"
                      />
                    ) : (
                      <Sparkles className={cn('w-6 h-6', itemRarityConfig.text)} />
                    )}
                  </div>
                  <Sparkles className={cn(
                    'absolute -top-1 -right-1 w-3 h-3 animate-reward-icon-pulse',
                    itemRarityConfig.text
                  )} />
                </div>

                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Item Unlocked!
                    </span>
                    <Badge className={cn(
                      'text-[9px] px-1.5 py-0 border-0 uppercase tracking-wider',
                      itemRarityConfig.text,
                      'bg-white/50 dark:bg-slate-800/50'
                    )}>
                      {unlockedItem.rarity}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {unlockedItem.name}
                  </h4>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Motivational message */}
        <p className="text-sm text-slate-500 dark:text-slate-500 italic">
          "Your word is a lamp to my feet and a light to my path." — Psalm 119:105
        </p>
      </div>
    </RewardModal>
  )
}

export default BookCompletionReward
