import { RewardModal, XPBurst } from './RewardModal'
import { Book, Crown, Star, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border-4 border-amber-500/50 shadow-lg shadow-amber-500/20">
            <span className="text-5xl animate-reward-icon-pulse">{bookIcon}</span>
          </div>

          {/* Stars around icon */}
          <Star className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 fill-yellow-400 animate-reward-star-1" />
          <Star className="absolute -bottom-1 -left-3 w-5 h-5 text-yellow-400 fill-yellow-400 animate-reward-star-2" />
          <Sparkles className="absolute -top-1 -left-2 w-5 h-5 text-amber-400 animate-reward-star-3" />
        </div>

        {/* Book name */}
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-white font-serif">{book}</h2>
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Book className="w-4 h-4" />
            <span>{chaptersCompleted} chapters completed</span>
          </div>
        </div>

        {/* XP reward section */}
        <div className="flex flex-col items-center gap-2 py-4 border-y border-slate-700/50 w-full">
          <XPBurst xp={xpAwarded} className="text-3xl" />
          {totalXP && (
            <span className="text-sm text-slate-400">
              Total XP: <span className="text-amber-400 font-semibold">{totalXP.toLocaleString()}</span>
            </span>
          )}
        </div>

        {/* Achievement unlock (if earned) */}
        {achievement && (
          <div className="w-full animate-reward-achievement-slide">
            <div className="bg-gradient-to-r from-purple-900/50 via-purple-800/50 to-purple-900/50 rounded-xl p-4 border border-purple-500/30">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                Achievement Unlocked!
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{achievement.icon}</span>
                <div className="flex-1 text-left">
                  <h4 className="font-bold text-white">{achievement.name}</h4>
                  <p className="text-sm text-slate-400">{achievement.description}</p>
                </div>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  +{achievement.xp_reward} XP
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Motivational message */}
        <p className="text-sm text-slate-500 italic">
          "Your word is a lamp to my feet and a light to my path." — Psalm 119:105
        </p>
      </div>
    </RewardModal>
  )
}

export default BookCompletionReward
