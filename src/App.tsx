import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSupabaseAuth, useQuery } from '@/hooks/useSupabase'
import { useSound } from '@/hooks/useSound'
import * as api from '@/lib/api'
import { Auth, UserButton, StreakXPDisplay, User } from './components/Auth'
import { getAvatarImageSrc, DEFAULT_AVATAR_CONFIG } from '@/components/avatar'
import { GroupsPage } from './components/groups'
import { ProfilePage } from './components/profile'
import { useRewardModal, RewardRenderer } from './components/rewards'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sun, Moon, BookOpen, LayoutGrid, Users, X, Check, ArrowRight, ChevronLeft, ChevronRight, Star, CheckCircle, Lock } from 'lucide-react'
import { ScrolilyLogo } from './components/ScrolilyLogo'
import { cn } from '@/lib/utils'
import bibleData from '../BSB.json'
import questionsData from '../seraph-progress.json'

interface Question {
  question: string
  correctAnswer: string
  options: { letter: string; text: string }[]
}

interface QuizState {
  questions: Question[]
  currentIndex: number
  wrongAnswers: Question[]
  inRetryMode: boolean
  selectedAnswer: string | null
  showResult: boolean
  isCorrect: boolean
  completed: boolean
  correctCount: number
  totalAnswered: number
}

function App() {
  const { isLoading, isAuthenticated } = useSupabaseAuth()
  const { play: playSound } = useSound()
  const { currentReward, isOpen: isRewardOpen, queueReward, dismissReward } = useRewardModal()
  const [debugMode, setDebugMode] = useState(() => {
    return localStorage.getItem('debugMode') === 'true'
  })

  // Intro animation states
  const [introPhase, setIntroPhase] = useState<'splash' | 'animating' | 'done'>('splash')

  // Fetch current user data
  const user = useQuery<api.User | null>(
    () => isAuthenticated ? api.getCurrentUser() : Promise.resolve(null),
    [isAuthenticated]
  )

  // Fetch pending invites
  const pendingInvites = useQuery<api.PendingInvite[]>(
    () => isAuthenticated ? api.getPendingInvites() : Promise.resolve([]),
    [isAuthenticated]
  )

  // Fetch completed chapters for current book (for locking system)
  const [completedChapters, setCompletedChapters] = useState<number[]>([])

  const [position, setPosition] = useState({ book: 0, chapter: 0, verse: 0 })
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved || 'system'
  })
  const [viewMode, setViewMode] = useState<'reading' | 'overview' | 'groups'>('reading')
  const [showProfile, setShowProfile] = useState(false)

  const [quizMode, setQuizMode] = useState(false)
  const [quizState, setQuizState] = useState<QuizState>({
    questions: [],
    currentIndex: 0,
    wrongAnswers: [],
    inRetryMode: false,
    selectedAnswer: null,
    showResult: false,
    isCorrect: false,
    completed: false,
    correctCount: 0,
    totalAnswered: 0
  })

  const books = bibleData.books
  const currentBook = books[position.book]
  const currentChapter = currentBook?.chapters[position.chapter]
  const currentVerse = currentChapter?.verses[position.verse]

  const chapters = useMemo(() => currentBook?.chapters || [], [currentBook])
  const verses = useMemo(() => currentChapter?.verses || [], [currentChapter])

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

  // Intro animation sequence
  useEffect(() => {
    const timer1 = setTimeout(() => setIntroPhase('animating'), 400)
    const timer2 = setTimeout(() => setIntroPhase('done'), 900)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  const [lastTrackedVerse, setLastTrackedVerse] = useState<string | null>(null)
  useEffect(() => {
    if (!isAuthenticated) return
    const verseKey = `${position.book}-${position.chapter}-${position.verse}`
    if (lastTrackedVerse === verseKey) return
    setLastTrackedVerse(verseKey)
    api.recordVerseRead().catch(console.error)
  }, [position, isAuthenticated, lastTrackedVerse])

  // Fetch completed chapters when book changes
  useEffect(() => {
    if (!isAuthenticated || !currentBook) {
      setCompletedChapters([])
      return
    }
    api.getCompletedChaptersForBook(currentBook.name)
      .then(setCompletedChapters)
      .catch(console.error)
  }, [isAuthenticated, currentBook?.name])

  // Check if a chapter is unlocked (chapter 1 always unlocked, rest require previous chapter completed)
  const isChapterUnlocked = useCallback((chapterNum: number): boolean => {
    if (!isAuthenticated) return true // Allow all in debug mode
    if (chapterNum === 1) return true // First chapter always unlocked
    return completedChapters.includes(chapterNum - 1) // Previous chapter must be completed
  }, [isAuthenticated, completedChapters])

  const setBookIndex = (book: number) => setPosition({ book, chapter: 0, verse: 0 })
  const setChapterIndex = (chapter: number) => setPosition(pos => ({ ...pos, chapter, verse: 0 }))
  const setVerseIndex = (verse: number) => setPosition(pos => ({ ...pos, verse }))

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

  const goToPrevVerse = () => {
    if (position.verse > 0) {
      setPosition(pos => ({ ...pos, verse: pos.verse - 1 }))
    } else if (position.chapter > 0) {
      const prevChapter = currentBook.chapters[position.chapter - 1]
      setPosition(pos => ({
        ...pos,
        chapter: pos.chapter - 1,
        verse: prevChapter.verses.length - 1
      }))
    } else if (position.book > 0) {
      const prevBook = books[position.book - 1]
      const lastChapter = prevBook.chapters[prevBook.chapters.length - 1]
      setPosition({
        book: position.book - 1,
        chapter: prevBook.chapters.length - 1,
        verse: lastChapter.verses.length - 1
      })
    } else {
      const lastBook = books[books.length - 1]
      const lastChapter = lastBook.chapters[lastBook.chapters.length - 1]
      setPosition({
        book: books.length - 1,
        chapter: lastBook.chapters.length - 1,
        verse: lastChapter.verses.length - 1
      })
    }
  }

  const goToNextVerse = () => {
    if (position.verse < verses.length - 1) {
      setPosition(pos => ({ ...pos, verse: pos.verse + 1 }))
    } else if (position.chapter < chapters.length - 1) {
      const nextChapterNum = chapters[position.chapter + 1]?.chapter || position.chapter + 2
      if (!isChapterUnlocked(nextChapterNum)) return // Don't go to locked chapter
      setPosition(pos => ({ ...pos, chapter: pos.chapter + 1, verse: 0 }))
    } else if (position.book < books.length - 1) {
      // Moving to next book - chapter 1 is always unlocked
      setPosition({ book: position.book + 1, chapter: 0, verse: 0 })
    } else {
      // Looping back to start - Genesis 1 is unlocked
      setPosition({ book: 0, chapter: 0, verse: 0 })
    }
  }

  const goToPrevChapter = async () => {
    if (position.chapter > 0) {
      setChapterIndex(position.chapter - 1)
    } else if (position.book > 0) {
      const prevBook = books[position.book - 1]

      if (isAuthenticated) {
        try {
          // Fetch completed chapters for the previous book
          const prevBookCompleted = await api.getCompletedChaptersForBook(prevBook.name)
          // Find highest unlocked chapter: max completed + 1, or chapter 1 if none completed
          // Cap at total chapters in the book
          const maxCompleted = prevBookCompleted.length > 0 ? Math.max(...prevBookCompleted) : 0
          const highestUnlocked = Math.min(maxCompleted + 1, prevBook.chapters.length)
          // Chapter index is 0-based, chapter numbers are 1-based
          setPosition({
            book: position.book - 1,
            chapter: highestUnlocked - 1,
            verse: 0
          })
        } catch (error) {
          console.error('Failed to fetch previous book progress:', error)
          // Fallback to chapter 1
          setPosition({
            book: position.book - 1,
            chapter: 0,
            verse: 0
          })
        }
      } else {
        // For non-authenticated/debug users, go to last chapter
        setPosition({
          book: position.book - 1,
          chapter: prevBook.chapters.length - 1,
          verse: 0
        })
      }
    }
  }

  const goToNextChapter = () => {
    if (position.chapter < chapters.length - 1) {
      const nextChapterNum = chapters[position.chapter + 1]?.chapter || position.chapter + 2
      if (!isChapterUnlocked(nextChapterNum)) return // Don't go to locked chapter
      setChapterIndex(position.chapter + 1)
    } else if (position.book < books.length - 1) {
      // Moving to next book - chapter 1 is always unlocked
      setPosition({ book: position.book + 1, chapter: 0, verse: 0 })
    }
  }

  const getChapterQuestions = useCallback((): Question[] => {
    const bookName = currentBook?.name
    const chapterNum = currentChapter?.chapter
    const chapterData = questionsData.find(
      (q: { book: string; chapter: number }) => q.book === bookName && q.chapter === chapterNum
    )
    return (chapterData as { questions: Question[] } | undefined)?.questions || []
  }, [currentBook, currentChapter])

  const startQuiz = useCallback(() => {
    const questions = getChapterQuestions()
    if (questions.length === 0) return
    const shuffled = [...questions].sort(() => Math.random() - 0.5)
    const limited = shuffled.slice(0, Math.min(10, shuffled.length))
    setQuizState({
      questions: limited,
      currentIndex: 0,
      wrongAnswers: [],
      inRetryMode: false,
      selectedAnswer: null,
      showResult: false,
      isCorrect: false,
      completed: false,
      correctCount: 0,
      totalAnswered: 0
    })
    setQuizMode(true)
  }, [getChapterQuestions])

  const selectAnswer = useCallback((letter: string) => {
    if (quizState.showResult) return
    const currentQuestion = quizState.inRetryMode
      ? quizState.wrongAnswers[quizState.currentIndex]
      : quizState.questions[quizState.currentIndex]
    const isCorrect = letter === currentQuestion.correctAnswer

    // Play sound based on answer correctness
    playSound(isCorrect ? 'success' : 'rejected')

    setQuizState(prev => ({
      ...prev,
      selectedAnswer: letter,
      showResult: true,
      isCorrect,
      correctCount: isCorrect ? prev.correctCount + 1 : prev.correctCount,
      totalAnswered: prev.totalAnswered + 1,
      wrongAnswers: !isCorrect && !prev.inRetryMode
        ? [...prev.wrongAnswers, currentQuestion]
        : prev.wrongAnswers
    }))
  }, [quizState, playSound])

  const nextQuestion = useCallback(() => {
    const questionList = quizState.inRetryMode ? quizState.wrongAnswers : quizState.questions
    const isLastQuestion = quizState.currentIndex >= questionList.length - 1
    if (isLastQuestion) {
      if (!quizState.inRetryMode && quizState.wrongAnswers.length > 0) {
        setQuizState(prev => ({
          ...prev,
          currentIndex: 0,
          inRetryMode: true,
          wrongAnswers: prev.wrongAnswers,
          selectedAnswer: null,
          showResult: false
        }))
      } else {
        setQuizState(prev => ({ ...prev, completed: true }))
      }
    } else {
      setQuizState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        selectedAnswer: null,
        showResult: false
      }))
    }
  }, [quizState])

  const exitQuiz = useCallback((navigateToNext = false) => {
    setQuizMode(false)
    setQuizState({
      questions: [],
      currentIndex: 0,
      wrongAnswers: [],
      inRetryMode: false,
      selectedAnswer: null,
      showResult: false,
      isCorrect: false,
      completed: false,
      correctCount: 0,
      totalAnswered: 0
    })

    if (navigateToNext) {
      // Navigate to next chapter or next book's first chapter
      if (position.chapter < chapters.length - 1) {
        // Go to next chapter in current book
        setChapterIndex(position.chapter + 1)
      } else if (position.book < books.length - 1) {
        // Go to first chapter of next book
        setPosition({ book: position.book + 1, chapter: 0, verse: 0 })
      } else {
        // At last chapter of last book - loop back to Genesis 1
        setPosition({ book: 0, chapter: 0, verse: 0 })
      }
    }
  }, [position, chapters.length, books.length])

  const hasQuestions = getChapterQuestions().length > 0

  const getPastelColor = useCallback((input: string, saturation = 0.6, lightness = 0.75) => {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      hash = input.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash % 360)
    return `hsl(${hue}, ${saturation * 100}%, ${lightness * 100}%)`
  }, [])

  const getDarkerColor = useCallback((input: string) => {
    return getPastelColor(input, 0.7, 0.35)
  }, [getPastelColor])

  const selectChapterFromOverview = useCallback((chapterIdx: number) => {
    const chapterNum = chapters[chapterIdx]?.chapter || chapterIdx + 1
    if (!isChapterUnlocked(chapterNum)) return // Don't navigate to locked chapters
    setChapterIndex(chapterIdx)
    setViewMode('reading')
  }, [chapters, isChapterUnlocked])

  const [showConfetti, setShowConfetti] = useState(false)
  const completionHandledRef = useRef(false)

  useEffect(() => {
    // Reset the handled flag when quiz is no longer completed
    if (!quizState.completed) {
      completionHandledRef.current = false
      return
    }

    // Only trigger confetti once per completion
    if (completionHandledRef.current) return
    completionHandledRef.current = true

    setShowConfetti(true)
    playSound('levelup')
    const timer = setTimeout(() => setShowConfetti(false), 2500)

    // Record chapter completion and refresh completed chapters list
    if (isAuthenticated && currentBook && currentChapter) {
        api.completeChapter(currentBook.name, currentChapter.chapter)
          .then((result) => {
            // Check if this completes the book (last chapter)
            const isLastChapter = currentChapter.chapter === currentBook.chapters.length

            // Show reward modal for book completion or achievement
            if (result.success && !result.already_completed) {
              if (isLastChapter && result.achievement?.awarded && result.achievement.achievement) {
                // Book completion with NEW achievement
                queueReward({
                  type: 'book_completion',
                  book: currentBook.name,
                  chaptersCompleted: currentBook.chapters.length,
                  xpAwarded: result.xp_awarded,
                  achievement: {
                    name: result.achievement.achievement.name,
                    description: result.achievement.achievement.description,
                    icon: result.achievement.achievement.icon,
                    xp_reward: result.achievement.achievement.xp_reward
                  }
                })
              } else if (isLastChapter) {
                // Book completion but achievement already unlocked - just celebrate!
                queueReward({
                  type: 'book_completion',
                  book: currentBook.name,
                  chaptersCompleted: currentBook.chapters.length,
                  xpAwarded: result.xp_awarded
                })
              } else if (result.achievement?.awarded && result.achievement.achievement) {
                // Standalone achievement (streak, etc.)
                queueReward({
                  type: 'achievement',
                  achievement: {
                    name: result.achievement.achievement.name,
                    description: result.achievement.achievement.description,
                    icon: result.achievement.achievement.icon,
                    category: result.achievement.achievement.key.startsWith('streak_') ? 'streak' : 'special',
                    xp_reward: result.achievement.achievement.xp_reward
                  }
                })
              }
            } else if (result.success && result.already_completed && isLastChapter) {
              // Re-completing the last chapter - just celebrate the book finish
              queueReward({
                type: 'book_completion',
                book: currentBook.name,
                chaptersCompleted: currentBook.chapters.length,
                xpAwarded: 0
              })
            }

            // Refresh completed chapters to unlock the next one
            return api.getCompletedChaptersForBook(currentBook.name)
          })
          .then(setCompletedChapters)
          .catch(console.error)
    }

    return () => clearTimeout(timer)
  }, [quizState.completed, isAuthenticated, currentBook, currentChapter, playSound, queueReward])

  const currentQuestion = quizState.inRetryMode
    ? quizState.wrongAnswers[quizState.currentIndex]
    : quizState.questions[quizState.currentIndex]

  const totalQuestions = quizState.questions.length + (quizState.inRetryMode ? quizState.wrongAnswers.length : 0)
  const answeredQuestions = quizState.inRetryMode
    ? quizState.questions.length + quizState.currentIndex + (quizState.showResult ? 1 : 0)
    : quizState.currentIndex + (quizState.showResult ? 1 : 0)
  const progressPercent = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0

  // Convert api.User to User type for components
  const userForComponents: User | undefined = user ? {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_url: user.avatar_url,
    avatar_config: user.avatar_config,
    total_xp: user.total_xp,
    current_streak: user.current_streak
  } : undefined

  const Confetti = () => {
    if (!showConfetti) return null
    return (
      <div className="fixed inset-0 pointer-events-none z-50">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2.5 h-2.5 rounded-sm animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 0.5}s`,
              backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)]
            }}
          />
        ))}
      </div>
    )
  }

  const QuizComplete = () => {
    const hasNextChapter = position.chapter < chapters.length - 1
    const hasNextBook = position.book < books.length - 1
    const nextChapterNum = hasNextChapter ? (currentChapter?.chapter || 0) + 1 : null

    // Determine the next destination text
    const getNextDestination = () => {
      if (hasNextChapter) {
        return `${currentBook?.name} ${nextChapterNum}`
      } else if (hasNextBook) {
        const nextBook = books[position.book + 1]
        return `${nextBook?.name} 1`
      } else {
        return 'Genesis 1'
      }
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95">
        <Confetti />
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center mb-8 shadow-lg">
          <CheckCircle className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Chapter Complete!</h2>
        <p className="text-lg text-muted-foreground mb-4">
          You got <strong className="text-foreground">{quizState.correctCount}</strong> out of <strong className="text-foreground">{quizState.totalAnswered}</strong> correct
        </p>
        {nextChapterNum && isAuthenticated && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-4 animate-in slide-in-from-bottom">
            <Lock className="w-4 h-4" />
            <span>Chapter {nextChapterNum} unlocked!</span>
          </div>
        )}
        <div className="flex gap-8 mb-10">
          <div className="text-center">
            <span className="block text-4xl font-bold text-primary">
              {Math.round((quizState.correctCount / quizState.totalAnswered) * 100)}%
            </span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Accuracy</span>
          </div>
          <div className="text-center">
            <span className="block text-4xl font-bold text-primary">{quizState.questions.length}</span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Questions</span>
          </div>
        </div>
        <Button size="lg" onClick={() => exitQuiz(true)}>
          <ArrowRight className="w-5 h-5 mr-2" />
          Continue to {getNextDestination()}
        </Button>
      </div>
    )
  }

  // Book header images mapping - DISABLED: Re-enable only if human requests
  // const bookHeaderImages: Record<string, string> = {
  //   'Genesis': '/mattes/book_headers/Genesis.png',
  //   'Exodus': '/mattes/book_headers/Exodus.png',
  //   'Leviticus': '/mattes/book_headers/Leviticus.png',
  //   'Numbers': '/mattes/book_headers/Numbers.png',
  //   'Deuteronomy': '/mattes/book_headers/Deuteronomy.png',
  //   'Joshua': '/mattes/book_headers/Joshua.png',
  //   'Judges': '/mattes/book_headers/Judges.png',
  //   'Ruth': '/mattes/book_headers/Ruth.png',
  //   '1 Samuel': '/mattes/book_headers/1 Samuel.png',
  //   '2 Samuel': '/mattes/book_headers/2 Samuel.png',
  //   '1 Kings': '/mattes/book_headers/1 Kings.png',
  // }

  const ChapterOverview = () => {
    const COLS = 5
    const totalChapters = chapters.length
    const rows = Math.ceil(totalChapters / COLS)
    const bookColor = getPastelColor(currentBook?.name || 'Genesis')
    const textColor = getDarkerColor(currentBook?.name || 'Genesis')
    const progressPercent = Math.round((completedChapters.length / totalChapters) * 100)

    const getGridPosition = (index: number) => {
      const row = Math.floor(index / COLS)
      const colInRow = index % COLS
      const col = row % 2 === 0 ? colInRow : (COLS - 1 - colInRow)
      return { row, col }
    }

    const ConnectionLines = () => {
      const cellSize = 56
      const gap = 8
      const totalWidth = COLS * cellSize + (COLS - 1) * gap
      const totalHeight = rows * cellSize + (rows - 1) * gap

      const getCenter = (index: number) => {
        const { row, col } = getGridPosition(index)
        return {
          x: col * (cellSize + gap) + cellSize / 2,
          y: row * (cellSize + gap) + cellSize / 2
        }
      }

      return (
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          width={totalWidth}
          height={totalHeight}
        >
          {Array.from({ length: totalChapters - 1 }, (_, i) => {
            const from = getCenter(i)
            const to = getCenter(i + 1)
            const isCompletedPath = completedChapters.includes(i + 1)
            return (
              <line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                strokeWidth="3"
                strokeLinecap="round"
                stroke={isCompletedPath ? bookColor : undefined}
                className={isCompletedPath ? "opacity-60" : "stroke-stone-200 dark:stroke-stone-700"}
              />
            )
          })}
        </svg>
      )
    }

    return (
      <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Hero Header */}
        <div
          className="relative -mx-4 -mt-4 px-6 pt-8 pb-6 mb-6"
          style={{
            background: `linear-gradient(135deg, ${bookColor}40 0%, ${bookColor}20 50%, transparent 100%)`
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${textColor}, ${bookColor})` }}
              >
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{currentBook?.name}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{totalChapters} Chapters</p>
              </div>
            </div>
            <div className="text-right">
              <div
                className="text-3xl font-bold"
                style={{ color: textColor }}
              >
                {progressPercent}%
              </div>
              <p className="text-xs text-muted-foreground">Complete</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-5">
            {(() => {
              const nextChapterIdx = chapters.findIndex((ch: { chapter: number }) => !completedChapters.includes(ch.chapter))
              const nextChapter = nextChapterIdx >= 0 ? chapters[nextChapterIdx] : null
              return (
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>{completedChapters.length} of {totalChapters} chapters</span>
                  {nextChapter && <span>{nextChapter.verses?.length || 0} verses in Ch. {nextChapter.chapter}</span>}
                </div>
              )
            })()}
            <div className="h-2 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background: `linear-gradient(90deg, ${textColor}, ${bookColor})`
                }}
              />
            </div>
          </div>
        </div>

        {/* Chapter Grid */}
        <div className="flex-1 flex justify-center px-2">
          <div className="relative">
            <ConnectionLines />
            <div
              className="grid gap-2 relative z-10"
              style={{ gridTemplateColumns: `repeat(${COLS}, 56px)` }}
            >
              {chapters.map((chapter: { chapter: number; verses: unknown[] }, idx: number) => {
                const { row, col } = getGridPosition(idx)
                const chapterNum = chapter.chapter
                const isCurrent = idx === position.chapter
                const isCompleted = completedChapters.includes(chapterNum)
                const isUnlocked = isChapterUnlocked(chapterNum)
                const isLocked = !isUnlocked
                const verseCount = chapter.verses?.length || 0

                return (
                  <button
                    key={idx}
                    className={cn(
                      "w-14 h-14 rounded-xl flex flex-col items-center justify-center relative transition-all duration-200",
                      !isLocked && "hover:scale-105 hover:shadow-md active:scale-95",
                      isCurrent && !isLocked && "ring-2 ring-offset-2 ring-offset-background",
                      isLocked && "cursor-not-allowed"
                    )}
                    style={{
                      backgroundColor: bookColor,
                      color: textColor,
                      filter: isLocked ? 'saturate(0.6) brightness(0.95)' : undefined,
                      gridColumn: col + 1,
                      gridRow: row + 1,
                      ringColor: isCurrent ? textColor : undefined,
                      boxShadow: isCompleted && !isLocked ? `0 4px 12px ${bookColor}50` : undefined
                    }}
                    onClick={() => !isLocked && selectChapterFromOverview(idx)}
                    disabled={isLocked}
                  >
                    {isLocked ? (
                      <Lock className="w-4 h-4 opacity-40" />
                    ) : (
                      <>
                        <span className="text-base font-bold">{chapterNum}</span>
                        <span className="text-[9px] font-medium opacity-60">{verseCount}v</span>
                      </>
                    )}

                    {/* Status Badge */}
                    {isCompleted && !isLocked && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </div>
                    )}
                    {isCurrent && !isLocked && !isCompleted && (
                      <div
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white flex items-center justify-center shadow-sm"
                        style={{ background: textColor }}
                      >
                        <Star className="w-3 h-3" fill="currentColor" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="mt-6 pt-4 border-t">
          <Button
            size="lg"
            className="w-full h-12 text-base font-semibold"
            style={{
              background: `linear-gradient(135deg, ${textColor}, ${bookColor})`,
            }}
            onClick={() => setViewMode('reading')}
          >
            <ArrowRight className="w-5 h-5 mr-2" />
            Continue Reading
          </Button>
        </div>
      </div>
    )
  }

  // Sparkle component for correct answers
  const Sparkles = ({ show }: { show: boolean }) => {
    if (!show) return null
    const sparkleColors = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa']
    return (
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-sparkle"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${30 + Math.random() * 40}%`,
              animationDelay: `${i * 0.1}s`,
            }}
          >
            <Star
              className="w-4 h-4"
              fill={sparkleColors[i % sparkleColors.length]}
              color={sparkleColors[i % sparkleColors.length]}
            />
          </div>
        ))}
      </div>
    )
  }

  // XP popup component
  const XPPopup = ({ show }: { show: boolean }) => {
    if (!show) return null
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="animate-xp-float text-2xl font-bold text-amber-500 drop-shadow-lg">
          +10 XP
        </div>
      </div>
    )
  }

  const QuizView = () => (
    <div className="flex-1 flex flex-col animate-in fade-in relative">
      {/* Player avatar standing in bottom-right corner */}
      {user && (
        <div className="fixed bottom-24 right-4 z-20 animate-in slide-in-from-bottom-8 duration-700 pointer-events-none">
          <img
            src={getAvatarImageSrc(user.avatar_config ?? DEFAULT_AVATAR_CONFIG)}
            alt="Your avatar"
            className="h-36 w-36 object-contain drop-shadow-xl"
            draggable={false}
          />
        </div>
      )}

      {/* Header with progress and exit */}
      <div className="flex items-center gap-3 py-4 mb-6">
        <Button variant="ghost" size="icon" onClick={exitQuiz} className="hover:bg-muted/80">
          <X className="w-5 h-5" />
        </Button>
        <div className="flex-1 flex flex-col gap-1">
          <Progress value={progressPercent} className="h-2" />
        </div>
        <span className="text-sm font-semibold text-muted-foreground tabular-nums">
          {answeredQuestions}/{totalQuestions}
        </span>
      </div>

      {quizState.inRetryMode && (
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-800 dark:text-amber-200 px-4 py-3 rounded-xl text-center font-semibold text-sm mb-6 animate-in slide-in-from-top border border-amber-200/50 dark:border-amber-700/50">
          Let's try those again
        </div>
      )}

      <div className="flex-1 flex flex-col relative">
        {/* Question card */}
        <div className="bg-gradient-to-br from-muted/30 to-muted/50 dark:from-muted/20 dark:to-muted/30 rounded-2xl p-6 mb-8 border border-border/50">
          <p className="text-xl md:text-2xl font-medium leading-relaxed">{currentQuestion?.question}</p>
        </div>

        {/* Sparkles and XP popup for correct answers */}
        <Sparkles show={quizState.showResult && quizState.isCorrect} />
        <XPPopup show={quizState.showResult && quizState.isCorrect} />

        <div className="flex flex-col gap-3">
          {currentQuestion?.options.map((option, index) => {
            const isSelected = quizState.selectedAnswer === option.letter
            const isCorrect = quizState.showResult && isSelected && quizState.isCorrect
            const isIncorrect = quizState.showResult && isSelected && !quizState.isCorrect
            const isCorrectAnswer = quizState.showResult && option.letter === currentQuestion.correctAnswer

            return (
              <button
                key={option.letter}
                style={{ animationDelay: `${index * 50}ms` }}
                className={cn(
                  "p-4 rounded-xl border-2 text-left flex items-start gap-4 transition-all relative animate-in fade-in slide-in-from-bottom-2",
                  "bg-card shadow-sm hover:shadow-md",
                  !quizState.showResult && "hover:translate-x-1 hover:border-primary hover:bg-accent/50 active:scale-[0.99]",
                  isCorrect && "border-green-500 bg-green-500/10 shadow-green-500/20 shadow-lg animate-correct-pulse",
                  isIncorrect && "border-red-500 bg-red-500/10 shadow-red-500/20 shadow-lg animate-wrong-shake",
                  isCorrectAnswer && !isSelected && "border-green-500/50 bg-green-500/5",
                  !isSelected && !isCorrectAnswer && quizState.showResult && "opacity-40"
                )}
                onClick={() => selectAnswer(option.letter)}
                disabled={quizState.showResult}
              >
                <span
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 transition-all",
                    isCorrect && "bg-green-500 text-white animate-glow-correct",
                    isIncorrect && "bg-red-500 text-white animate-glow-wrong",
                    isCorrectAnswer && !isSelected && "bg-green-500/70 text-white",
                    !isCorrect && !isIncorrect && !isCorrectAnswer && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCorrect ? <Check className="w-5 h-5" /> : isIncorrect ? <X className="w-5 h-5" /> : option.letter}
                </span>
                <span className="flex-1 leading-relaxed pt-1">{option.text}</span>
              </button>
            )
          })}
        </div>

        {quizState.showResult && (
          <div
            className={cn(
              "flex items-center justify-center gap-3 p-5 rounded-2xl font-bold mt-8 animate-result-pop shadow-lg",
              quizState.isCorrect
                ? "bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 text-green-600 dark:text-green-400 border border-green-500/30 shadow-green-500/10"
                : "bg-gradient-to-r from-red-500/20 via-rose-500/20 to-pink-500/20 text-red-600 dark:text-red-400 border border-red-500/30 shadow-red-500/10"
            )}
          >
            <div className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center shadow-md",
              quizState.isCorrect ? "bg-gradient-to-br from-green-400 to-emerald-500" : "bg-gradient-to-br from-red-400 to-rose-500"
            )}>
              {quizState.isCorrect ? (
                <Check className="w-6 h-6 text-white" />
              ) : (
                <X className="w-6 h-6 text-white" />
              )}
            </div>
            <span className="text-xl">{quizState.isCorrect ? 'Correct!' : 'Not quite...'}</span>
          </div>
        )}
      </div>

      {quizState.showResult && (
        <div className="py-8 flex justify-center">
          <Button
            size="lg"
            onClick={nextQuestion}
            className="animate-in fade-in slide-in-from-bottom-4 duration-300 px-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-3 border-border border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated && !debugMode) {
    return <Auth onSkip={() => {
      localStorage.setItem('debugMode', 'true')
      setDebugMode(true)
    }} />
  }

  // Render profile page if showProfile is true
  if (showProfile && user) {
    return (
      <div className="max-w-[680px] mx-auto px-6 py-12 min-h-screen flex flex-col relative">
        <ProfilePage user={user} onBack={() => setShowProfile(false)} />
      </div>
    )
  }

  return (
    <div className="max-w-[680px] mx-auto px-6 py-12 min-h-screen flex flex-col relative">
      {showConfetti && <Confetti />}

      {/* Reward celebration modal */}
      <RewardRenderer
        reward={currentReward}
        isOpen={isRewardOpen}
        onClose={dismissReward}
      />

      {/* Splash screen overlay */}
      {introPhase !== 'done' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background pointer-events-none">
          <div
            className={cn(
              "flex items-center gap-2 transition-all duration-500 ease-out",
              introPhase === 'splash' && "scale-[2.5]",
              introPhase === 'animating' && "scale-100 -translate-y-[calc(50vh-4rem)]"
            )}
          >
            <h1 className="text-2xl font-semibold tracking-tight">Scrolily</h1>
            <ScrolilyLogo size={28} className="text-purple-400" />
          </div>
        </div>
      )}

      {quizMode ? (
        quizState.completed ? <QuizComplete /> : <QuizView />
      ) : (
        <>
          <header className="text-center mb-12 relative">
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "absolute top-0 left-0 transition-opacity duration-300",
                introPhase !== 'done' ? "opacity-0" : "opacity-100"
              )}
              onClick={toggleTheme}
              aria-label={isDarkMode() ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode() ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <div className={cn(
              "absolute top-0 right-0 transition-opacity duration-300",
              introPhase !== 'done' ? "opacity-0" : "opacity-100"
            )}>
              {userForComponents ? (
                <UserButton user={userForComponents} onProfileClick={() => setShowProfile(true)} />
              ) : debugMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem('debugMode')
                    setDebugMode(false)
                  }}
                >
                  Sign in
                </Button>
              ) : null}
            </div>
            <h1 className={cn(
              "text-2xl font-semibold tracking-tight inline-flex items-center gap-2",
              introPhase !== 'done' && "invisible"
            )}>
              Scrolily
              <ScrolilyLogo size={28} className="text-purple-400" />
            </h1>
            {userForComponents && <StreakXPDisplay user={userForComponents} className={cn(
              "transition-opacity duration-300",
              introPhase !== 'done' ? "opacity-0" : "opacity-100"
            )} />}
          </header>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className={cn(
            "mb-6 transition-all duration-300",
            introPhase !== 'done' ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          )}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="reading" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Reading</span>
              </TabsTrigger>
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="groups" className="flex items-center gap-2 relative">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Groups</span>
                {pendingInvites && pendingInvites.length > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {pendingInvites.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className={cn(
            "flex-1 flex flex-col transition-all duration-300 delay-75",
            introPhase !== 'done' ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          )}>
          {viewMode === 'groups' ? (
            <GroupsPage currentUserId={user?.id} />
          ) : viewMode === 'overview' ? (
            <>
              <div className="flex justify-center mb-6">
                <Select
                  value={position.book.toString()}
                  onValueChange={(v) => setBookIndex(Number(v))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {books.map((book: { name: string }, idx: number) => (
                      <SelectItem key={book.name} value={idx.toString()}>
                        {book.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ChapterOverview />
            </>
          ) : (
            <>
              <div className="flex gap-3 justify-center flex-wrap mb-8">
                <Select
                  value={position.book.toString()}
                  onValueChange={(v) => setBookIndex(Number(v))}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {books.map((book: { name: string }, idx: number) => (
                      <SelectItem key={book.name} value={idx.toString()}>
                        {book.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={position.chapter.toString()}
                  onValueChange={(v) => {
                    const idx = Number(v)
                    const chapterNum = chapters[idx]?.chapter || idx + 1
                    if (isChapterUnlocked(chapterNum)) {
                      setChapterIndex(idx)
                    }
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map((chapter: { chapter: number }, idx: number) => {
                      const isLocked = !isChapterUnlocked(chapter.chapter)
                      return (
                        <SelectItem
                          key={idx}
                          value={idx.toString()}
                          disabled={isLocked}
                          className={cn(isLocked && "opacity-50")}
                        >
                          {isLocked && <Lock className="inline-block w-3 h-3 mr-1" />}Chapter {chapter.chapter}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>

              </div>

              <Card className="flex-1 pt-0 px-8 pb-8 mb-8 overflow-y-auto max-h-[60vh]">
                <h2 className="text-xs font-semibold text-primary mb-6 text-center uppercase tracking-widest sticky top-0 bg-card pt-8 pb-2 -mx-8 px-8">
                  {currentBook?.name} {currentChapter?.chapter}
                </h2>
                <div className="font-serif text-lg leading-relaxed space-y-4">
                  {verses.map((verse: { verse: number; text: string }, idx: number) => (
                    <p key={idx}>
                      <span className="text-xs font-sans font-semibold text-primary align-super mr-1">
                        {verse.verse}
                      </span>
                      {verse.text}
                    </p>
                  ))}
                </div>
              </Card>

              <div className="flex gap-2 justify-center mb-8">
                <Button variant="outline" className="min-w-[140px]" onClick={goToPrevChapter}>
                  <ChevronLeft className="w-4 h-4" />
                  Prev Chapter
                </Button>
                {/* Quiz/Navigation logic */}
                {(() => {
                  const currentChapterNum = currentChapter?.chapter || 1
                  const isCurrentChapterCompleted = completedChapters.includes(currentChapterNum)

                  if (isCurrentChapterCompleted && hasQuestions) {
                    // Chapter completed: show Retake Quiz in middle + Next Chapter
                    return (
                      <>
                        <Button
                          variant="outline"
                          className="min-w-[120px]"
                          onClick={startQuiz}
                        >
                          Retake Quiz
                        </Button>
                        <Button variant="outline" className="min-w-[140px]" onClick={goToNextChapter}>
                          Next Chapter
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </>
                    )
                  } else if (!isCurrentChapterCompleted && hasQuestions && isAuthenticated) {
                    // Chapter not completed, has quiz: show Take the Quiz (replaces Next)
                    return (
                      <Button
                        className="min-w-[140px] bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/90 hover:to-indigo-500/90"
                        onClick={startQuiz}
                      >
                        Take the Quiz
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )
                  } else {
                    // No quiz or not authenticated: just show Next Chapter
                    return (
                      <Button variant="outline" className="min-w-[140px]" onClick={goToNextChapter}>
                        Next Chapter
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )
                  }
                })()}
              </div>

              <footer className="text-center text-xs text-muted-foreground border-t pt-4">
                {currentBook?.name} &middot; Chapter {currentChapter?.chapter} of {chapters.length} &middot; {verses.length} verses
              </footer>
            </>
          )}
          </div>
        </>
      )}
    </div>
  )
}

export default App
