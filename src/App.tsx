import { useState, useEffect, useMemo, useCallback } from 'react'
import { useConvexAuth, useQuery, useMutation } from "convex/react"
import { api } from "../convex/_generated/api"
import { Auth, UserButton, StreakXPDisplay } from './components/Auth'
import { GroupsPage } from './components/groups'
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
import { Sun, Moon, BookOpen, LayoutGrid, Users, X, Check, ArrowRight, ChevronLeft, ChevronRight, Star, CheckCircle } from 'lucide-react'
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
  const { isLoading, isAuthenticated } = useConvexAuth()
  const user = useQuery(api.users.currentUser)
  const recordVerseRead = useMutation(api.progress.recordVerseRead)

  const [position, setPosition] = useState({ book: 0, chapter: 0, verse: 0 })
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved || 'system'
  })
  const [viewMode, setViewMode] = useState<'reading' | 'overview' | 'groups'>('reading')
  const pendingInvites = useQuery(api.groups.getPendingInvites)

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
    if (theme === 'system') {
      root.removeAttribute('data-theme')
      root.classList.remove('dark')
    } else if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark')
      root.classList.add('dark')
    } else {
      root.setAttribute('data-theme', 'light')
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const [lastTrackedVerse, setLastTrackedVerse] = useState<string | null>(null)
  useEffect(() => {
    if (!isAuthenticated) return
    const verseKey = `${position.book}-${position.chapter}-${position.verse}`
    if (lastTrackedVerse === verseKey) return
    setLastTrackedVerse(verseKey)
    recordVerseRead().catch(console.error)
  }, [position, isAuthenticated, recordVerseRead, lastTrackedVerse])

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
      setPosition(pos => ({ ...pos, chapter: pos.chapter + 1, verse: 0 }))
    } else if (position.book < books.length - 1) {
      setPosition({ book: position.book + 1, chapter: 0, verse: 0 })
    } else {
      setPosition({ book: 0, chapter: 0, verse: 0 })
    }
  }

  const goToPrevChapter = () => {
    if (position.chapter > 0) {
      setChapterIndex(position.chapter - 1)
    } else if (position.book > 0) {
      const prevBook = books[position.book - 1]
      setPosition({
        book: position.book - 1,
        chapter: prevBook.chapters.length - 1,
        verse: 0
      })
    }
  }

  const goToNextChapter = () => {
    if (position.chapter < chapters.length - 1) {
      setChapterIndex(position.chapter + 1)
    } else if (position.book < books.length - 1) {
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
  }, [quizState])

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

  const exitQuiz = useCallback(() => {
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
  }, [])

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
    setChapterIndex(chapterIdx)
    setViewMode('reading')
  }, [])

  const [showConfetti, setShowConfetti] = useState(false)
  useEffect(() => {
    if (quizState.completed) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [quizState.completed])

  const currentQuestion = quizState.inRetryMode
    ? quizState.wrongAnswers[quizState.currentIndex]
    : quizState.questions[quizState.currentIndex]

  const totalQuestions = quizState.questions.length + (quizState.inRetryMode ? quizState.wrongAnswers.length : 0)
  const answeredQuestions = quizState.inRetryMode
    ? quizState.questions.length + quizState.currentIndex + (quizState.showResult ? 1 : 0)
    : quizState.currentIndex + (quizState.showResult ? 1 : 0)
  const progressPercent = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0

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
              animationDelay: `${Math.random() * 3}s`,
              backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)]
            }}
          />
        ))}
      </div>
    )
  }

  const QuizComplete = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95">
      <Confetti />
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center mb-8 shadow-lg">
        <CheckCircle className="w-12 h-12" />
      </div>
      <h2 className="text-3xl font-bold mb-4">Chapter Complete!</h2>
      <p className="text-lg text-muted-foreground mb-8">
        You got <strong className="text-foreground">{quizState.correctCount}</strong> out of <strong className="text-foreground">{quizState.totalAnswered}</strong> correct
      </p>
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
      <Button size="lg" onClick={exitQuiz}>
        Continue Reading
      </Button>
    </div>
  )

  const ChapterOverview = () => {
    const COLS = 5
    const totalChapters = chapters.length
    const rows = Math.ceil(totalChapters / COLS)
    const bookColor = getPastelColor(currentBook?.name || 'Genesis')
    const textColor = getDarkerColor(currentBook?.name || 'Genesis')

    const getGridPosition = (index: number) => {
      const row = Math.floor(index / COLS)
      const colInRow = index % COLS
      const col = row % 2 === 0 ? colInRow : (COLS - 1 - colInRow)
      return { row, col }
    }

    const ConnectionLines = () => {
      const cellSize = 64
      const gap = 12
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
          className="absolute top-0 left-0 pointer-events-none opacity-60"
          width={totalWidth}
          height={totalHeight}
        >
          {Array.from({ length: totalChapters - 1 }, (_, i) => {
            const from = getCenter(i)
            const to = getCenter(i + 1)
            return (
              <line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="text-border"
              />
            )
          })}
        </svg>
      )
    }

    return (
      <div className="flex-1 flex flex-col gap-6 animate-in fade-in">
        <Card className="p-5 relative overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: `linear-gradient(90deg, ${bookColor}, hsl(var(--primary)))` }}
          />
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white shadow"
              style={{ background: `linear-gradient(135deg, ${bookColor}, hsl(var(--primary)))` }}
            >
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{currentBook?.name}</h2>
              <span className="text-sm text-muted-foreground">{totalChapters} Chapters</span>
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-4">
          <Progress value={((position.chapter + 1) / totalChapters) * 100} className="flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Chapter {position.chapter + 1} of {totalChapters}
          </span>
        </div>

        <Card className="p-6 relative overflow-hidden">
          <ConnectionLines />
          <div
            className="grid gap-3 justify-center relative z-10"
            style={{ gridTemplateColumns: `repeat(${COLS}, 64px)` }}
          >
            {chapters.map((chapter: { chapter: number; verses: unknown[] }, idx: number) => {
              const { row, col } = getGridPosition(idx)
              const isCurrent = idx === position.chapter
              const isCompleted = idx < position.chapter
              const verseCount = chapter.verses?.length || 0

              return (
                <button
                  key={idx}
                  className={cn(
                    "w-16 h-16 rounded-lg flex flex-col items-center justify-center gap-0.5 relative transition-all hover:-translate-y-1 hover:shadow-lg",
                    isCurrent && "ring-2 ring-primary ring-offset-2",
                    isCompleted && "opacity-75"
                  )}
                  style={{
                    backgroundColor: bookColor,
                    color: textColor,
                    order: row * COLS + col
                  }}
                  onClick={() => selectChapterFromOverview(idx)}
                >
                  <span className="text-lg font-bold">{chapter.chapter}</span>
                  {isCurrent && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-white flex items-center justify-center shadow">
                      <Star className="w-3 h-3" fill="currentColor" />
                    </div>
                  )}
                  {isCompleted && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center shadow">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  <span className="text-[10px] font-medium opacity-70">{verseCount}v</span>
                </button>
              )
            })}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex justify-center gap-12">
            <div className="text-center">
              <span className="block text-3xl font-bold text-primary">{verses.length}</span>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Verses in Chapter</span>
            </div>
            <div className="text-center">
              <span className="block text-3xl font-bold text-primary">{position.verse + 1}</span>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Current Verse</span>
            </div>
          </div>
        </Card>

        <Button size="lg" className="mt-auto" onClick={() => setViewMode('reading')}>
          <ArrowRight className="w-5 h-5" />
          Continue Reading
        </Button>
      </div>
    )
  }

  const QuizView = () => (
    <div className="flex-1 flex flex-col animate-in fade-in">
      <div className="flex items-center gap-4 py-4 mb-8">
        <Button variant="outline" size="icon" onClick={exitQuiz}>
          <X className="w-5 h-5" />
        </Button>
        <Progress value={progressPercent} className="flex-1" />
        <span className="text-sm font-semibold text-muted-foreground min-w-12 text-right">
          {answeredQuestions}/{totalQuestions}
        </span>
      </div>

      {quizState.inRetryMode && (
        <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 p-3 rounded-lg text-center font-semibold text-sm mb-8 animate-in slide-in-from-top">
          Let's try those again
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <p className="text-xl font-medium mb-8">{currentQuestion?.question}</p>

        <div className="flex flex-col gap-3">
          {currentQuestion?.options.map((option) => {
            const isSelected = quizState.selectedAnswer === option.letter
            const isCorrect = quizState.showResult && isSelected && quizState.isCorrect
            const isIncorrect = quizState.showResult && isSelected && !quizState.isCorrect

            return (
              <button
                key={option.letter}
                className={cn(
                  "p-4 rounded-lg border-2 text-left flex items-start gap-4 transition-all hover:translate-x-1",
                  !quizState.showResult && "hover:border-primary hover:bg-muted/50",
                  isCorrect && "border-green-500 bg-green-500/10",
                  isIncorrect && "border-red-500 bg-red-500/10",
                  !isSelected && quizState.showResult && "opacity-60"
                )}
                onClick={() => selectAnswer(option.letter)}
                disabled={quizState.showResult}
              >
                <span
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm flex-shrink-0",
                    isCorrect && "bg-green-500 text-white",
                    isIncorrect && "bg-red-500 text-white",
                    !isCorrect && !isIncorrect && "bg-muted text-muted-foreground"
                  )}
                >
                  {option.letter}
                </span>
                <span className="flex-1 leading-relaxed">{option.text}</span>
              </button>
            )
          })}
        </div>

        {quizState.showResult && (
          <div
            className={cn(
              "flex items-center gap-3 p-4 rounded-lg font-semibold mt-8 animate-in zoom-in-95",
              quizState.isCorrect ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
            )}
          >
            {quizState.isCorrect ? (
              <Check className="w-6 h-6" />
            ) : (
              <X className="w-6 h-6" />
            )}
            <span>{quizState.isCorrect ? 'Correct!' : 'Not quite'}</span>
          </div>
        )}
      </div>

      {quizState.showResult && (
        <div className="py-8 flex justify-center">
          <Button size="lg" onClick={nextQuestion}>
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

  if (!isAuthenticated) {
    return <Auth />
  }

  return (
    <div className="max-w-[680px] mx-auto px-6 py-12 min-h-screen flex flex-col">
      {showConfetti && <Confetti />}

      {quizMode ? (
        quizState.completed ? <QuizComplete /> : <QuizView />
      ) : (
        <>
          <header className="text-center mb-12 relative">
            <Button
              variant="outline"
              size="icon"
              className="absolute top-0 left-0"
              onClick={toggleTheme}
              aria-label={isDarkMode() ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode() ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <div className="absolute top-0 right-0">
              {user && <UserButton user={user} />}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Seraph</h1>
            <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">
              Berean Standard Bible
            </p>
            {user && <StreakXPDisplay user={user} />}
          </header>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className="mb-6">
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

          {viewMode === 'groups' ? (
            <GroupsPage currentUserId={user?._id} />
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
                  onValueChange={(v) => setChapterIndex(Number(v))}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map((chapter: { chapter: number }, idx: number) => (
                      <SelectItem key={idx} value={idx.toString()}>
                        Chapter {chapter.chapter}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={position.verse.toString()}
                  onValueChange={(v) => setVerseIndex(Number(v))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {verses.map((verse: { verse: number }, idx: number) => (
                      <SelectItem key={idx} value={idx.toString()}>
                        Verse {verse.verse}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Card className="flex-1 p-10 mb-8 flex flex-col justify-center min-h-[280px]">
                <h2 className="text-xs font-semibold text-primary mb-6 text-center uppercase tracking-widest">
                  {currentVerse?.name}
                </h2>
                <p className="font-serif text-xl leading-relaxed text-center">
                  {currentVerse?.text}
                </p>
              </Card>

              {hasQuestions && (
                <div className="flex justify-center py-4 mb-4">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/90 hover:to-indigo-500/90"
                    onClick={startQuiz}
                  >
                    Practice Questions
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-2 mb-8">
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" className="min-w-[140px]" onClick={goToPrevChapter}>
                    <ChevronLeft className="w-4 h-4" />
                    Prev Chapter
                  </Button>
                  <Button variant="outline" className="min-w-[140px]" onClick={goToNextChapter}>
                    Next Chapter
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" className="min-w-[140px]" onClick={goToPrevVerse}>
                    <ChevronLeft className="w-4 h-4" />
                    Prev Verse
                  </Button>
                  <Button variant="outline" className="min-w-[140px]" onClick={goToNextVerse}>
                    Next Verse
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <footer className="text-center text-xs text-muted-foreground border-t pt-4">
                {currentBook?.name} &middot; Chapter {currentChapter?.chapter} of {chapters.length} &middot; Verse {currentVerse?.verse} of {verses.length}
              </footer>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default App
