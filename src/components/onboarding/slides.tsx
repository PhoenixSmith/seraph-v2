import { BookOpen, Flame, Star, Trophy, Users } from 'lucide-react'
import { KayrhoLogo } from '@/components/KayrhoLogo'

export interface SlideConfig {
  id: string
  icon: React.ReactNode
  iconGradient: string
  title: string
  body: string
  showConfetti?: boolean
}

export const slides: SlideConfig[] = [
  {
    id: 'welcome',
    icon: <KayrhoLogo className="w-20 h-20" />,
    iconGradient: 'from-amber-500 to-yellow-500',
    title: 'Welcome to Kayroh',
    body: 'Your journey through Scripture starts here. Read, learn, and grow—one chapter at a time.'
  },
  {
    id: 'reading',
    icon: <BookOpen className="w-12 h-12 text-white" />,
    iconGradient: 'from-blue-500 to-indigo-500',
    title: 'Beautiful Bible Reading',
    body: 'Read chapter by chapter. Complete quizzes to unlock the next one. Track your progress across all 66 books.'
  },
  {
    id: 'xp-streaks',
    icon: (
      <div className="flex items-center gap-1">
        <Flame className="w-10 h-10 text-white" />
        <Star className="w-8 h-8 text-white" />
      </div>
    ),
    iconGradient: 'from-orange-500 to-red-500',
    title: 'Earn XP & Streaks',
    body: 'Earn XP for reading and quizzes. Keep your daily streak alive for special rewards.'
  },
  {
    id: 'achievements',
    icon: <Trophy className="w-12 h-12 text-white" />,
    iconGradient: 'from-purple-500 to-pink-500',
    title: 'Unlock Achievements',
    body: 'Complete books to earn badges. Unlock avatar items and show off your progress.'
  },
  {
    id: 'groups',
    icon: <Users className="w-12 h-12 text-white" />,
    iconGradient: 'from-teal-500 to-emerald-500',
    title: 'Study Together',
    body: 'Join groups to share notes, compete in challenges, and grow in community.',
    showConfetti: true
  }
]

export default slides
