import { useState, useEffect, useMemo, useCallback } from 'react'
import bibleData from '../BSB.json'
import questionsData from '../seraph-progress.json'

function App() {
  const [position, setPosition] = useState({ book: 0, chapter: 0, verse: 0 })
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved || 'system'
  })

  // Quiz mode state
  const [quizMode, setQuizMode] = useState(false)
  const [quizState, setQuizState] = useState({
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

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', theme)
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  // Helper to change book (resets chapter and verse)
  const setBookIndex = (book) => setPosition({ book, chapter: 0, verse: 0 })

  // Helper to change chapter (resets verse)
  const setChapterIndex = (chapter) => setPosition(pos => ({ ...pos, chapter, verse: 0 }))

  // Helper to change verse only
  const setVerseIndex = (verse) => setPosition(pos => ({ ...pos, verse }))

  const toggleTheme = () => {
    setTheme(current => {
      if (current === 'light') return 'dark'
      if (current === 'dark') return 'light'
      // If system, detect current and switch to opposite
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

  // Get questions for current chapter
  const getChapterQuestions = useCallback(() => {
    const bookName = currentBook?.name
    const chapterNum = currentChapter?.chapter
    const chapterData = questionsData.find(
      q => q.book === bookName && q.chapter === chapterNum
    )
    return chapterData?.questions || []
  }, [currentBook, currentChapter])

  // Start quiz for current chapter
  const startQuiz = useCallback(() => {
    const questions = getChapterQuestions()
    if (questions.length === 0) return

    // Shuffle and limit to max 10 questions
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

  // Handle answer selection
  const selectAnswer = useCallback((letter) => {
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

  // Continue to next question
  const nextQuestion = useCallback(() => {
    const questionList = quizState.inRetryMode ? quizState.wrongAnswers : quizState.questions
    const isLastQuestion = quizState.currentIndex >= questionList.length - 1

    if (isLastQuestion) {
      // Check if we need to retry wrong answers
      if (!quizState.inRetryMode && quizState.wrongAnswers.length > 0) {
        // Enter retry mode
        setQuizState(prev => ({
          ...prev,
          currentIndex: 0,
          inRetryMode: true,
          wrongAnswers: prev.wrongAnswers,
          selectedAnswer: null,
          showResult: false
        }))
      } else {
        // Quiz complete!
        setQuizState(prev => ({
          ...prev,
          completed: true
        }))
      }
    } else {
      // Move to next question
      setQuizState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        selectedAnswer: null,
        showResult: false
      }))
    }
  }, [quizState])

  // Exit quiz
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

  // Check if current chapter has questions
  const hasQuestions = getChapterQuestions().length > 0

  // Confetti effect
  const [showConfetti, setShowConfetti] = useState(false)
  useEffect(() => {
    if (quizState.completed) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [quizState.completed])

  // Get current question
  const currentQuestion = quizState.inRetryMode
    ? quizState.wrongAnswers[quizState.currentIndex]
    : quizState.questions[quizState.currentIndex]

  // Calculate progress
  const totalQuestions = quizState.questions.length + (quizState.inRetryMode ? quizState.wrongAnswers.length : 0)
  const answeredQuestions = quizState.inRetryMode
    ? quizState.questions.length + quizState.currentIndex + (quizState.showResult ? 1 : 0)
    : quizState.currentIndex + (quizState.showResult ? 1 : 0)
  const progressPercent = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0

  // Confetti component
  const Confetti = () => {
    if (!showConfetti) return null
    return (
      <div className="confetti-container">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="confetti"
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

  // Quiz completed view
  const QuizComplete = () => (
    <div className="quiz-complete">
      <Confetti />
      <div className="complete-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12l2 2 4-4" />
        </svg>
      </div>
      <h2>Chapter Complete!</h2>
      <p className="score">
        You got <strong>{quizState.correctCount}</strong> out of <strong>{quizState.totalAnswered}</strong> correct
      </p>
      <div className="complete-stats">
        <div className="stat">
          <span className="stat-value">{Math.round((quizState.correctCount / quizState.totalAnswered) * 100)}%</span>
          <span className="stat-label">Accuracy</span>
        </div>
        <div className="stat">
          <span className="stat-value">{quizState.questions.length}</span>
          <span className="stat-label">Questions</span>
        </div>
      </div>
      <button className="quiz-btn primary" onClick={exitQuiz}>
        Continue Reading
      </button>
    </div>
  )

  // Quiz view
  const QuizView = () => (
    <div className="quiz-view">
      <div className="quiz-header">
        <button className="quiz-close" onClick={exitQuiz}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="progress-text">
          {answeredQuestions}/{totalQuestions}
        </span>
      </div>

      {quizState.inRetryMode && (
        <div className="retry-banner">
          Let's try those again
        </div>
      )}

      <div className="quiz-content">
        <p className="question-text">{currentQuestion?.question}</p>

        <div className="options">
          {currentQuestion?.options.map((option) => {
            let optionClass = 'option'
            if (quizState.showResult) {
              if (option.letter === quizState.selectedAnswer) {
                optionClass += quizState.isCorrect ? ' correct' : ' incorrect'
              }
            } else if (quizState.selectedAnswer === option.letter) {
              optionClass += ' selected'
            }

            return (
              <button
                key={option.letter}
                className={optionClass}
                onClick={() => selectAnswer(option.letter)}
                disabled={quizState.showResult}
              >
                <span className="option-letter">{option.letter}</span>
                <span className="option-text">{option.text}</span>
              </button>
            )
          })}
        </div>

        {quizState.showResult && (
          <div className={`result-feedback ${quizState.isCorrect ? 'correct' : 'incorrect'}`}>
            <div className="feedback-icon">
              {quizState.isCorrect ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              )}
            </div>
            <span>{quizState.isCorrect ? 'Correct!' : 'Not quite'}</span>
          </div>
        )}
      </div>

      {quizState.showResult && (
        <div className="quiz-footer">
          <button className="quiz-btn primary" onClick={nextQuestion}>
            Continue
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="app">
      {showConfetti && <Confetti />}

      {quizMode ? (
        quizState.completed ? <QuizComplete /> : <QuizView />
      ) : (
        <>
          <header>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={isDarkMode() ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode() ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                </svg>
              )}
            </button>
            <h1>Seraph</h1>
            <p className="subtitle">Berean Standard Bible</p>
          </header>

          <nav className="selectors">
            <select
              value={position.book}
              onChange={(e) => setBookIndex(Number(e.target.value))}
            >
              {books.map((book, idx) => (
                <option key={book.name} value={idx}>{book.name}</option>
              ))}
            </select>

            <select
              value={position.chapter}
              onChange={(e) => setChapterIndex(Number(e.target.value))}
            >
              {chapters.map((chapter, idx) => (
                <option key={idx} value={idx}>Chapter {chapter.chapter}</option>
              ))}
            </select>

            <select
              value={position.verse}
              onChange={(e) => setVerseIndex(Number(e.target.value))}
            >
              {verses.map((verse, idx) => (
                <option key={idx} value={idx}>Verse {verse.verse}</option>
              ))}
            </select>
          </nav>

          <main className="verse-display">
            <h2>{currentVerse?.name}</h2>
            <p className="verse-text">{currentVerse?.text}</p>
          </main>

          {/* Debug button - temporary */}
          {hasQuestions && (
            <div className="quiz-start-section">
              <button className="quiz-start-btn" onClick={startQuiz}>
                Practice Questions
              </button>
            </div>
          )}

          <nav className="navigation">
            <div className="nav-row">
              <button onClick={goToPrevChapter}>
                Prev Chapter
              </button>
              <button onClick={goToNextChapter}>
                Next Chapter
              </button>
            </div>
            <div className="nav-row">
              <button onClick={goToPrevVerse}>
                Prev Verse
              </button>
              <button onClick={goToNextVerse}>
                Next Verse
              </button>
            </div>
          </nav>

          <footer>
            <p>{currentBook?.name} &middot; Chapter {currentChapter?.chapter} of {chapters.length} &middot; Verse {currentVerse?.verse} of {verses.length}</p>
          </footer>
        </>
      )}
    </div>
  )
}

export default App
