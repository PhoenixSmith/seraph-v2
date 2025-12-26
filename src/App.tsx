import { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react'
import { useSupabaseAuth, useQuery, useRefreshableQuery } from '@/hooks/useSupabase'
import { useSound } from '@/hooks/useSound'
import * as api from '@/lib/api'
import { Auth, UserButton, StreakXPDisplay, User } from './components/Auth'
import { getAvatarLayers, DEFAULT_AVATAR_CONFIG } from '@/components/avatar'
import { GroupsPage } from './components/groups'
import { ProfilePage } from './components/profile'
import { useRewardModal, RewardRenderer } from './components/rewards'
import { StorePage } from './components/store'
import { Verse } from './components/notes'
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
import { Sun, Moon, BookOpen, LayoutGrid, Users, X, Check, ArrowRight, ChevronLeft, ChevronRight, Star, CheckCircle, Lock, Flame, ShoppingBag, Sparkles, Coins } from 'lucide-react'
import { KayrhoLogo } from './components/KayrhoLogo'
import { cn } from '@/lib/utils'
import bibleData from '../BSB.json'
import questionsData from '../seraph-progress.json'

// Animated number component with rolling digit effect and peppy pop
function AnimatedNumber({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)
  const [popPhase, setPopPhase] = useState<'idle' | 'pop' | 'settle'>('idle')
  const prevValue = useRef(value)

  useLayoutEffect(() => {
    if (prevValue.current !== value) {
      setIsAnimating(true)
      setPopPhase('pop')
      const startValue = prevValue.current
      const endValue = value
      const duration = 600
      const startTime = performance.now()

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        const current = Math.round(startValue + (endValue - startValue) * eased)
        setDisplayValue(current)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setIsAnimating(false)
          prevValue.current = value
        }
      }
      requestAnimationFrame(animate)

      // Pop animation phases
      const popTimer = setTimeout(() => setPopPhase('settle'), 200)
      const settleTimer = setTimeout(() => setPopPhase('idle'), 500)
      return () => {
        clearTimeout(popTimer)
        clearTimeout(settleTimer)
      }
    }
  }, [value])

  const getTransform = () => {
    switch (popPhase) {
      case 'pop': return 'scale(1.25) translateY(-2px)'
      case 'settle': return 'scale(1.05)'
      default: return 'scale(1)'
    }
  }

  return (
    <span
      className={cn(className, isAnimating && "animate-progress-number-pop")}
      style={{
        ...style,
        display: 'inline-block',
        transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: getTransform()
      }}
    >
      {displayValue}%
    </span>
  )
}

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
  const { play: playSound, stage: stageSound, fire: fireSound } = useSound()
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

  // Fetch user's groups (for notes feature)
  const { data: myGroups, refresh: refreshMyGroups } = useRefreshableQuery(
    useCallback(() => isAuthenticated ? api.listMyGroups() : Promise.resolve([]), [isAuthenticated])
  )

  // Refresh groups when auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      refreshMyGroups()
    }
  }, [isAuthenticated, refreshMyGroups])

  // Fetch completed chapters for current book (for locking system)
  const [completedChapters, setCompletedChapters] = useState<number[]>([])

  const [position, setPosition] = useState({ book: 0, chapter: 0, verse: 0 })
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved || 'system'
  })
  const [viewMode, setViewMode] = useState<'reading' | 'overview' | 'groups' | 'store'>('overview')
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

  // Measure header logo position for exact splash animation
  useLayoutEffect(() => {
    const measurePosition = () => {
      const el = headerLogoRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const viewportCenterX = window.innerWidth / 2
      const viewportCenterY = window.innerHeight / 2
      setSplashOffset({
        x: centerX - viewportCenterX,
        y: centerY - viewportCenterY
      })
    }
    // Measure after a frame to ensure layout is ready
    requestAnimationFrame(() => {
      requestAnimationFrame(measurePosition)
    })
    window.addEventListener('resize', measurePosition)
    return () => window.removeEventListener('resize', measurePosition)
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

  // Navigate to first incomplete book when Progress tab loads
  const prevViewModeRef = useRef<string | null>(null)
  useEffect(() => {
    const isFirstMount = prevViewModeRef.current === null
    const wasNotOverview = prevViewModeRef.current !== 'overview'
    prevViewModeRef.current = viewMode

    // Trigger on first mount (if starting on overview) or when switching TO the progress tab
    if (viewMode !== 'overview' || !isAuthenticated) return
    if (!isFirstMount && !wasNotOverview) return

    api.getAllBookProgress().then((progress) => {
      // Create a map of book name -> completion status
      const completionMap = new Map(progress.map(p => [p.book, p.is_complete]))

      // Find first incomplete book in Bible order (started but not finished)
      let targetIndex = books.findIndex((book: { name: string }) => {
        const isComplete = completionMap.get(book.name)
        return isComplete === false // started but not complete
      })

      // If no started-but-incomplete, find first unstarted book
      if (targetIndex === -1) {
        targetIndex = books.findIndex((book: { name: string }) => !completionMap.has(book.name))
      }

      // If all books complete, loop back to Genesis
      if (targetIndex === -1) {
        targetIndex = 0
      }

      if (targetIndex !== position.book) {
        setPosition({ book: targetIndex, chapter: 0, verse: 0 })
      }
    }).catch(console.error)
  }, [viewMode, isAuthenticated, books])

  // Verse notes state
  const [chapterNotes, setChapterNotes] = useState<api.VerseNote[]>([])
  const [isCreatingNote, setIsCreatingNote] = useState(false)

  // Reading progress tracking
  const verseContainerRef = useRef<HTMLDivElement>(null)
  const [readingProgress, setReadingProgress] = useState(0)

  // Ref for header logo to calculate exact splash animation target
  const headerLogoRef = useRef<HTMLHeadingElement>(null)
  // Initialize with approximate values (will be measured exactly on mount)
  // Logo is at: 24px padding + ~60px (half of logo width) = ~84px from container left
  // On wide screens: container left = (100vw - 680px) / 2, so logo center = 50vw - 340px + 84px = 50vw - 256px
  const [splashOffset, setSplashOffset] = useState(() => ({
    x: -Math.min(256, window.innerWidth / 2 - 84),
    y: -(window.innerHeight / 2 - 72)
  }))

  const handleVerseScroll = useCallback(() => {
    const container = verseContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const maxScroll = scrollHeight - clientHeight
    if (maxScroll <= 0) {
      setReadingProgress(100)
      return
    }
    const progress = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100))
    setReadingProgress(progress)
  }, [])

  // Reset progress when chapter changes
  useEffect(() => {
    setReadingProgress(0)
    // Re-calculate after content loads
    const timer = setTimeout(handleVerseScroll, 100)
    return () => clearTimeout(timer)
  }, [position.book, position.chapter, handleVerseScroll])

  // Fetch notes for current chapter
  useEffect(() => {
    if (!isAuthenticated || !currentBook || !currentChapter) {
      setChapterNotes([])
      return
    }
    const groupIds = myGroups?.map(g => g.id) || []
    api.getChapterNotes(currentBook.name, currentChapter.chapter, groupIds)
      .then(setChapterNotes)
      .catch(console.error)
  }, [isAuthenticated, currentBook?.name, currentChapter?.chapter, myGroups])

  // Note handlers
  const handleCreateNote = useCallback(async (verse: number, content: string, groupId?: string) => {
    if (!currentBook || !currentChapter) return
    setIsCreatingNote(true)
    try {
      // Handle "all-groups" by creating a note for each group
      if (groupId === 'all-groups' && myGroups && myGroups.length > 0) {
        await Promise.all(
          myGroups.map(g => api.createVerseNote(currentBook.name, currentChapter.chapter, verse, content, g.id))
        )
      } else {
        const actualGroupId = groupId === 'all-groups' ? undefined : groupId
        await api.createVerseNote(currentBook.name, currentChapter.chapter, verse, content, actualGroupId)
      }
      // Refresh notes
      const groupIds = myGroups?.map(g => g.id) || []
      const notes = await api.getChapterNotes(currentBook.name, currentChapter.chapter, groupIds)
      setChapterNotes(notes)
    } catch (err) {
      console.error('Failed to create note:', err)
    } finally {
      setIsCreatingNote(false)
    }
  }, [currentBook, currentChapter, myGroups])

  const handleDeleteNote = useCallback(async (noteId: string) => {
    if (!currentBook || !currentChapter) return
    try {
      await api.deleteVerseNote(noteId)
      // Refresh notes
      const groupIds = myGroups?.map(g => g.id) || []
      const notes = await api.getChapterNotes(currentBook.name, currentChapter.chapter, groupIds)
      setChapterNotes(notes)
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }, [currentBook, currentChapter, myGroups])

  const handleNoteReply = useCallback(async (noteId: string, content: string) => {
    await api.addNoteReply(noteId, content)
  }, [])

  // Check if a chapter is unlocked (chapter 1 always unlocked, rest require previous chapter completed)
  const isChapterUnlocked = useCallback((chapterNum: number): boolean => {
    if (!isAuthenticated) return true // Allow all in debug mode
    if (chapterNum === 1) return true // First chapter always unlocked
    return completedChapters.includes(chapterNum - 1) // Previous chapter must be completed
  }, [isAuthenticated, completedChapters])

  const setBookIndex = (book: number) => setPosition({ book, chapter: 0, verse: 0 })
  const setChapterIndex = (chapter: number) => setPosition(pos => ({ ...pos, chapter, verse: 0 }))
  const setVerseIndex = (verse: number) => setPosition(pos => ({ ...pos, verse }))

  // Navigate to a specific verse from group activity feed
  const navigateToVerse = useCallback((bookName: string, chapter: number, _verse?: number) => {
    const bookIndex = books.findIndex((b: { name: string }) => b.name === bookName)
    if (bookIndex === -1) return

    const book = books[bookIndex]
    const chapterIndex = book.chapters.findIndex((c: { chapter: number }) => c.chapter === chapter)
    if (chapterIndex === -1) return

    setPosition({ book: bookIndex, chapter: chapterIndex, verse: 0 })
    setViewMode('reading')
  }, [books])

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

  // Stage sound on mousedown - determines correctness and preps the audio
  const stageAnswer = useCallback((letter: string) => {
    if (quizState.showResult) return
    const currentQuestion = quizState.inRetryMode
      ? quizState.wrongAnswers[quizState.currentIndex]
      : quizState.questions[quizState.currentIndex]
    const isCorrect = letter === currentQuestion.correctAnswer
    stageSound(isCorrect ? 'success' : 'rejected')
  }, [quizState, stageSound])

  // Fire staged sound and select answer on mouseup
  const selectAnswer = useCallback((letter: string) => {
    if (quizState.showResult) return
    const currentQuestion = quizState.inRetryMode
      ? quizState.wrongAnswers[quizState.currentIndex]
      : quizState.questions[quizState.currentIndex]
    const isCorrect = letter === currentQuestion.correctAnswer

    // Fire the pre-staged sound instantly
    fireSound()

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
  }, [quizState, fireSound])

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
    setShowConfetti(false) // Kill confetti when exiting quiz
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

  // Interpolate from red to green based on reading progress
  const getProgressColor = useCallback((progress: number) => {
    // Red: hsl(0, 72%, 51%) -> Green: hsl(142, 71%, 45%)
    const hue = (progress / 100) * 142 // 0 (red) to 142 (green)
    const saturation = 72 - (progress / 100) * 1 // 72 to 71
    const lightness = 51 - (progress / 100) * 6 // 51 to 45
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }, [])

  // Book-specific colors for consistent styling across views
  const bookColor = getPastelColor(currentBook?.name || 'Genesis')
  const textColor = getDarkerColor(currentBook?.name || 'Genesis')
  const darkerBorderColor = getPastelColor(currentBook?.name || 'Genesis', 0.6, 0.3)

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
                    xp_reward: result.achievement.achievement.xp_reward,
                    talent_reward: result.achievement.achievement.talent_reward
                  },
                  currentStreak: result.current_streak,
                  streakIncreased: result.streak_increased
                })
              } else if (isLastChapter) {
                // Book completion but achievement already unlocked - just celebrate!
                queueReward({
                  type: 'book_completion',
                  book: currentBook.name,
                  chaptersCompleted: currentBook.chapters.length,
                  xpAwarded: result.xp_awarded,
                  currentStreak: result.current_streak,
                  streakIncreased: result.streak_increased
                })
              } else if (result.streak_increased && result.current_streak) {
                // Regular chapter with streak increase - show celebration modal
                queueReward({
                  type: 'book_completion',
                  book: currentBook.name,
                  chaptersCompleted: currentChapter.chapter,
                  xpAwarded: result.xp_awarded,
                  currentStreak: result.current_streak,
                  streakIncreased: result.streak_increased
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
                    xp_reward: result.achievement.achievement.xp_reward,
                    talent_reward: result.achievement.achievement.talent_reward
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
        <div className="w-24 h-24 rounded-2xl bg-[#58cc02] border-4 border-b-8 border-[#58a700] border-b-[#46a302] text-white flex items-center justify-center mb-8">
          <CheckCircle className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Chapter Complete!</h2>
        <p className="text-lg text-muted-foreground mb-4">
          You got <strong className="text-foreground">{quizState.correctCount}</strong> out of <strong className="text-foreground">{quizState.totalAnswered}</strong> correct
        </p>
        {nextChapterNum && isAuthenticated && (
          <div className="flex items-center gap-2 text-sm text-[#58a700] dark:text-[#7ed321] mb-4 animate-in slide-in-from-bottom font-bold">
            <Lock className="w-4 h-4" />
            <span>Chapter {nextChapterNum} unlocked!</span>
          </div>
        )}
        <div className="flex gap-4 mb-10">
          <div className="text-center bg-card rounded-2xl px-6 py-4 border-2 border-b-4 border-[#e5e5e5] dark:border-[#3c3c3c] border-b-[#d0d0d0] dark:border-b-[#2a2a2a]">
            <span className="block text-4xl font-bold text-[#58cc02]">
              {Math.round((quizState.correctCount / quizState.totalAnswered) * 100)}%
            </span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-bold">Accuracy</span>
          </div>
          <div className="text-center bg-card rounded-2xl px-6 py-4 border-2 border-b-4 border-[#e5e5e5] dark:border-[#3c3c3c] border-b-[#d0d0d0] dark:border-b-[#2a2a2a]">
            <span className="block text-4xl font-bold text-[#1cb0f6]">{quizState.questions.length}</span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-bold">Questions</span>
          </div>
        </div>
        <Button variant="duolingo" size="duolingo" onClick={() => exitQuiz(true)} className="min-w-[200px]">
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
    const targetProgressPercent = totalChapters > 0
      ? Math.round((completedChapters.length / totalChapters) * 100)
      : 0
    const [shouldAnimateTiles, setShouldAnimateTiles] = useState(false)
    const prevBookRef = useRef<string | undefined>(undefined)

    // Animate progress bar - start at 0, animate to target
    const [displayedProgress, setDisplayedProgress] = useState(0)
    const [progressAnimating, setProgressAnimating] = useState(false)

    // Update progress with animation whenever target changes
    useEffect(() => {
      // Delay to allow the 0% state to render first for CSS transition
      const timer = setTimeout(() => {
        setDisplayedProgress(targetProgressPercent)
        setProgressAnimating(true)
      }, 50)
      const animTimer = setTimeout(() => setProgressAnimating(false), 1050)
      return () => {
        clearTimeout(timer)
        clearTimeout(animTimer)
      }
    }, [targetProgressPercent])

    // Animate tiles on mount and when book changes
    useLayoutEffect(() => {
      // Always animate on mount (prevBookRef starts undefined) or when book changes
      if (prevBookRef.current !== currentBook?.name) {
        setShouldAnimateTiles(true)
        prevBookRef.current = currentBook?.name
        // Keep animation state for duration of staggered animation
        const timer = setTimeout(() => setShouldAnimateTiles(false), 1500)
        return () => clearTimeout(timer)
      }
    }, [currentBook?.name])

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
            const lineDelay = Math.min(i * 20, 500)
            return (
              <line
                key={`${currentBook?.name}-line-${i}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                strokeWidth="3"
                strokeLinecap="round"
                stroke={isCompletedPath ? bookColor : undefined}
                className={cn(
                  isCompletedPath ? "opacity-60" : "stroke-stone-200 dark:stroke-stone-700",
                  shouldAnimateTiles && "animate-connection-line"
                )}
                style={shouldAnimateTiles ? { animationDelay: `${lineDelay}ms` } : undefined}
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
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white border border-white/20"
                style={{ background: `linear-gradient(135deg, ${textColor}, ${bookColor})`, boxShadow: '3px 3px 8px rgba(0,0,0,0.12)' }}
              >
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{currentBook?.name}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{totalChapters} Chapters</p>
              </div>
            </div>
            <div className="text-right">
              <AnimatedNumber
                value={targetProgressPercent}
                className="text-3xl font-bold"
                style={{ color: textColor }}
              />
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
            <div
              className={cn(
                "h-4 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden",
                progressAnimating && "animate-progress-container-pop"
              )}
              style={progressAnimating ? { animation: 'progress-container-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' } : undefined}
            >
              <div
                className="h-full rounded-full relative overflow-hidden"
                style={{
                  width: `${displayedProgress}%`,
                  background: `linear-gradient(90deg, ${textColor}, ${bookColor})`,
                  transformOrigin: 'left',
                  transition: 'width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  animation: progressAnimating ? 'progress-fill-spring 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), progress-celebrate-combo 0.8s ease-out' : undefined
                }}
              >
                {/* Shimmer overlay */}
                {progressAnimating && (
                  <div
                    className="absolute inset-0 overflow-hidden rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                      animation: 'progress-shimmer-sweep 0.6s ease-out forwards'
                    }}
                  />
                )}
              </div>
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
                // Stagger delay based on position in grid - capped for large books
                const staggerDelay = Math.min(idx * 20, 500)

                return (
                  <button
                    key={`${currentBook?.name}-${idx}`}
                    className={cn(
                      "w-14 h-14 rounded-2xl flex flex-col items-center justify-center relative transition-all duration-200 border-b-4 border-l border-r border-t font-bold text-white",
                      !isLocked && "hover:-translate-y-0.5 active:border-b-2 active:mt-[2px] active:mb-[-2px]",
                      isCurrent && !isLocked && "ring-2 ring-offset-2 ring-offset-background",
                      isLocked && "cursor-not-allowed",
                      shouldAnimateTiles && "animate-chapter-tile-pop-in"
                    )}
                    style={{
                      backgroundColor: bookColor,
                      filter: isLocked ? 'saturate(0.5)' : undefined,
                      color: textColor,
                      borderBottomColor: getDarkerColor(currentBook?.name || 'Genesis'),
                      borderTopColor: `${bookColor}80`,
                      borderLeftColor: `${bookColor}80`,
                      borderRightColor: `${bookColor}80`,
                      boxShadow: isCompleted && !isLocked ? `0 4px 12px ${bookColor}50` : undefined,
                      gridColumn: col + 1,
                      gridRow: row + 1,
                      ringColor: isCurrent ? textColor : undefined,
                      animationDelay: shouldAnimateTiles ? `${staggerDelay}ms` : undefined,
                    }}
                    onClick={() => !isLocked && selectChapterFromOverview(idx)}
                    disabled={isLocked}
                  >
                    {isLocked ? (
                      <Lock className={cn("w-4 h-4", shouldAnimateTiles ? "animate-lock-in" : "opacity-40")} style={{ animationDelay: shouldAnimateTiles ? `${staggerDelay + 150}ms` : undefined }} />
                    ) : (
                      <div className={cn("flex flex-col items-center", shouldAnimateTiles && "animate-chapter-content-in")} style={{ animationDelay: shouldAnimateTiles ? `${staggerDelay + 150}ms` : undefined }}>
                        <span className="text-base font-bold">{chapterNum}</span>
                        <span className="text-[9px] font-medium opacity-60">{verseCount}v</span>
                      </div>
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
            className="w-full h-12 text-base font-semibold border-b-4 hover:-translate-y-0.5 active:translate-y-0 active:border-b-2 transition-all duration-100"
            style={{
              background: `linear-gradient(135deg, ${textColor}, ${bookColor})`,
              borderBottomColor: getPastelColor(currentBook?.name || 'Genesis', 0.6, 0.3),
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
          <div className="relative h-36 w-36">
            {getAvatarLayers(user.avatar_config ?? DEFAULT_AVATAR_CONFIG).map((src, index) => (
              <img
                key={src}
                src={src}
                alt={index === 0 ? 'Avatar base' : 'Avatar layer'}
                className="absolute inset-0 h-full w-full object-contain drop-shadow-xl"
                style={{ zIndex: index }}
                draggable={false}
              />
            ))}
          </div>
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
        <div className="bg-[#ddf4ff] dark:bg-[#1cb0f6]/20 text-[#1899d6] dark:text-[#84d8ff] px-5 py-3 rounded-2xl text-center font-bold text-sm mb-4 animate-in slide-in-from-top border-2 border-b-4 border-[#84d8ff] dark:border-[#1899d6] border-b-[#1cb0f6] dark:border-b-[#1477a6]">
          Let's try those again
        </div>
      )}

      <div className="flex-1 flex flex-col relative">
        {/* Question card */}
        <div className="bg-card rounded-2xl p-6 mb-8 border-2 border-b-4 border-[#e5e5e5] dark:border-[#3c3c3c] border-b-[#d0d0d0] dark:border-b-[#2a2a2a] shadow-sm">
          <p className="text-base md:text-lg font-medium leading-relaxed">{currentQuestion?.question}</p>
        </div>

        {/* Sparkles and XP popup for correct answers */}
        <Sparkles show={quizState.showResult && quizState.isCorrect} />
        <XPPopup show={quizState.showResult && quizState.isCorrect} />

        <div className="flex flex-col gap-4">
          {currentQuestion?.options.map((option, index) => {
            const isSelected = quizState.selectedAnswer === option.letter
            const isCorrect = quizState.showResult && isSelected && quizState.isCorrect
            const isIncorrect = quizState.showResult && isSelected && !quizState.isCorrect
            const isCorrectAnswer = quizState.showResult && option.letter === currentQuestion.correctAnswer

            return (
              <button
                key={option.letter}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
                className={cn(
                  // Base thicc Duolingo style
                  "p-5 rounded-2xl border-2 border-b-4 text-left flex items-center gap-4 transition-all relative animate-in fade-in slide-in-from-bottom-2",
                  "bg-card font-medium",
                  // Default state - blue thicc 3D effect (Duolingo style)
                  !quizState.showResult && "border-[#84d8ff] dark:border-[#1899d6] border-b-[#1cb0f6] dark:border-b-[#1899d6] hover:bg-[#ddf4ff] dark:hover:bg-[#1cb0f6]/10 hover:border-[#1cb0f6] hover:border-b-[#1899d6] active:border-b-2 active:mt-[2px] active:mb-[-2px] cursor-pointer",
                  // Correct answer - green thicc border
                  isCorrect && "border-[#58cc02] border-b-[#58a700] bg-[#d7ffb8] dark:bg-[#58cc02]/20 animate-correct-pulse",
                  // Incorrect answer - red thicc border (Duolingo red)
                  isIncorrect && "border-[#ff4b4b] border-b-[#ea2b2b] bg-[#ffdfe0] dark:bg-[#ff4b4b]/20 animate-wrong-shake",
                  // Show correct answer when wrong selected
                  isCorrectAnswer && !isSelected && "border-[#58cc02]/60 border-b-[#58a700]/60 bg-[#d7ffb8]/50 dark:bg-[#58cc02]/10",
                  // Fade non-selected wrong answers
                  !isSelected && !isCorrectAnswer && quizState.showResult && "opacity-40"
                )}
                onMouseDown={() => stageAnswer(option.letter)}
                onMouseUp={() => selectAnswer(option.letter)}
                onTouchStart={() => stageAnswer(option.letter)}
                onTouchEnd={() => selectAnswer(option.letter)}
                disabled={quizState.showResult}
              >
                <span
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0 transition-all border-2 border-b-4",
                    isCorrect && "bg-[#58cc02] border-[#58a700] border-b-[#46a302] text-white animate-glow-correct",
                    isIncorrect && "bg-[#ff4b4b] border-[#ea2b2b] border-b-[#d41a1a] text-white animate-glow-wrong",
                    isCorrectAnswer && !isSelected && "bg-[#58cc02]/70 border-[#58a700]/70 border-b-[#46a302]/70 text-white",
                    !isCorrect && !isIncorrect && !isCorrectAnswer && "bg-[#ddf4ff] dark:bg-[#1cb0f6]/20 border-[#84d8ff] dark:border-[#1899d6] border-b-[#1cb0f6] dark:border-b-[#1477a6] text-[#1899d6] dark:text-[#84d8ff]"
                  )}
                >
                  {isCorrect ? <Check className="w-5 h-5" /> : isIncorrect ? <X className="w-5 h-5" /> : option.letter}
                </span>
                <span className="flex-1 leading-relaxed text-base">{option.text}</span>
              </button>
            )
          })}
        </div>

        {quizState.showResult && (
          <div
            className={cn(
              "flex items-center justify-center gap-3 p-5 rounded-2xl font-bold mt-8 animate-result-pop border-2 border-b-4",
              quizState.isCorrect
                ? "bg-[#d7ffb8] dark:bg-[#58cc02]/20 text-[#58a700] dark:text-[#7ed321] border-[#58cc02] border-b-[#46a302]"
                : "bg-[#ffdfe0] dark:bg-[#ff4b4b]/20 text-[#ea2b2b] dark:text-[#ff6b6b] border-[#ff4b4b] border-b-[#d41a1a]"
            )}
          >
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center border-2 border-b-4",
              quizState.isCorrect
                ? "bg-[#58cc02] border-[#58a700] border-b-[#46a302]"
                : "bg-[#ff4b4b] border-[#ea2b2b] border-b-[#d41a1a]"
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
            variant="duolingo"
            size="duolingo"
            onClick={nextQuestion}
            className="animate-in fade-in slide-in-from-bottom-4 duration-300 min-w-[200px]"
          >
            Continue
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
    return <Auth />
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

      {/* Splash screen overlay - fades out smoothly when done */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-background pointer-events-none",
          introPhase === 'done' && "animate-fade-out"
        )}
      >
        <div
          className="flex items-center gap-2 transition-all duration-500 ease-out"
          style={{
            transform: introPhase === 'splash'
              ? 'scale(2.5)'
              : `scale(1) translate(${splashOffset.x}px, ${splashOffset.y}px)`
          }}
        >
          <h1 className="text-2xl font-semibold tracking-tight">Kayrho</h1>
          <KayrhoLogo size={28} className="text-blue-400" />
        </div>
      </div>

      {quizMode ? (
        quizState.completed ? <QuizComplete /> : <QuizView />
      ) : (
        <>
          <header className={cn(
            "mb-12 flex items-center justify-between transition-opacity duration-500",
            introPhase === 'splash' ? "opacity-0" : "opacity-100"
          )}>
            {/* Left side: Logo and title */}
            <div className="flex items-center gap-3">
              <h1
                ref={headerLogoRef}
                className={cn(
                  "text-2xl font-semibold tracking-tight inline-flex items-center gap-2",
                  introPhase !== 'done' && "invisible"
                )}
              >
                Kayrho
                <KayrhoLogo size={28} className="text-blue-400" />
              </h1>
            </div>

            {/* Right side: XP, Talents, Streak, User */}
            <div className="flex items-center gap-3">
              {userForComponents && (
                <div className="hidden sm:flex items-center gap-2">
                  <Badge variant="skeumorphic" className="flex items-center gap-1.5 px-3 py-1">
                    <Star className="h-3.5 w-3.5 text-amber-500" fill="currentColor" />
                    <span>{userForComponents.total_xp ?? 0} XP</span>
                  </Badge>
                  <Badge variant="skeumorphic" className="flex items-center gap-1.5 px-3 py-1">
                    <Coins className="h-3.5 w-3.5 text-amber-500" />
                    <span>{userForComponents.talents ?? 0}</span>
                  </Badge>
                  <Badge variant="skeumorphic" className="flex items-center gap-1.5 px-3 py-1">
                    <Flame className="h-3.5 w-3.5 text-red-500" fill="currentColor" />
                    <span>{userForComponents.current_streak ?? 0} day{(userForComponents.current_streak ?? 0) !== 1 ? 's' : ''}</span>
                  </Badge>
                </div>
              )}
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
          </header>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className={cn(
            "mb-6 transition-all duration-500",
            introPhase === 'splash' ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          )}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Progress</span>
              </TabsTrigger>
              <TabsTrigger value="reading" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Reading</span>
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
              <TabsTrigger value="store" className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Store</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className={cn(
            "flex-1 flex flex-col transition-all duration-500 delay-100",
            introPhase === 'splash' ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          )}>
          {viewMode === 'store' ? (
            <StorePage
              userTalents={userForComponents.talents ?? 0}
              onTalentsChange={(newTalents) => {
                // Update local user state with new talents
                if (user) {
                  refetchUser()
                }
              }}
            />
          ) : viewMode === 'groups' ? (
            <GroupsPage currentUserId={user?.id} onNavigateToVerse={navigateToVerse} />
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

              <div className="relative mb-8">
                <Card
                  ref={verseContainerRef}
                  onScroll={handleVerseScroll}
                  className="flex-1 pt-0 px-8 pb-8 overflow-y-auto max-h-[60vh]"
                >
                  <h2 className="text-xs font-semibold mb-6 text-center uppercase tracking-widest sticky top-0 z-10 bg-card pt-8 pb-2 -mx-8 px-8" style={{ color: textColor }}>
                    {currentBook?.name} {currentChapter?.chapter}
                  </h2>
                  <div className="font-serif text-lg leading-relaxed space-y-4">
                    {verses.map((verse: { verse: number; text: string }, idx: number) => (
                      isAuthenticated && user ? (
                        <Verse
                          key={idx}
                          verseNumber={verse.verse}
                          text={verse.text}
                          textColor={textColor}
                          notes={chapterNotes}
                          groups={(myGroups || []).map(g => ({ id: g.id, name: g.name }))}
                          currentUserId={user.id}
                          onCreateNote={handleCreateNote}
                          onDeleteNote={handleDeleteNote}
                          onReply={handleNoteReply}
                          isCreating={isCreatingNote}
                        />
                      ) : (
                        <p key={idx}>
                          <span className="text-xs font-sans font-semibold align-super mr-1" style={{ color: textColor }}>
                            {verse.verse}
                          </span>
                          {verse.text}
                        </p>
                      )
                    ))}
                  </div>
                </Card>
                {/* Reading progress bar - red to green */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-muted/30 rounded-b-lg overflow-hidden">
                  <div
                    className="h-full transition-all duration-150 ease-out rounded-br-lg"
                    style={{
                      width: `${readingProgress}%`,
                      backgroundColor: getProgressColor(readingProgress),
                      borderBottomLeftRadius: readingProgress === 100 ? '0.5rem' : 0,
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-center mb-8">
                <Button variant="outline" size="lg" className="min-w-[160px] border-b-4 hover:-translate-y-0.5 active:border-b-2 active:translate-y-0 transition-all duration-100" onClick={goToPrevChapter}>
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
                          className="min-w-[140px] h-11 px-8 border-b-4 font-bold uppercase tracking-wide hover:-translate-y-0.5 active:border-b-2 active:translate-y-0 active:mt-0 active:mb-0 transition-all duration-100 shadow-lg"
                          style={{
                            backgroundColor: bookColor,
                            color: textColor,
                            borderBottomColor: darkerBorderColor,
                          }}
                          onClick={startQuiz}
                        >
                          Retake Quiz
                        </Button>
                        <Button variant="outline" size="lg" className="min-w-[160px] border-b-4 hover:-translate-y-0.5 active:border-b-2 active:translate-y-0 transition-all duration-100" onClick={goToNextChapter}>
                          Next Chapter
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </>
                    )
                  } else if (!isCurrentChapterCompleted && hasQuestions && isAuthenticated) {
                    // Chapter not completed, has quiz: show Take the Quiz (replaces Next)
                    return (
                      <Button
                        size="lg"
                        className="min-w-[160px] border-b-4 font-bold uppercase tracking-wide hover:-translate-y-0.5 active:border-b-2 active:translate-y-0 transition-all duration-100 shadow-lg"
                        style={{
                          backgroundColor: bookColor,
                          color: textColor,
                          borderBottomColor: darkerBorderColor,
                        }}
                        onClick={startQuiz}
                      >
                        Take the Quiz
                      </Button>
                    )
                  } else {
                    // No quiz or not authenticated: just show Next Chapter
                    return (
                      <Button variant="outline" size="lg" className="min-w-[160px] border-b-4 hover:-translate-y-0.5 active:border-b-2 active:translate-y-0 transition-all duration-100" onClick={goToNextChapter}>
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
