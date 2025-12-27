import { useState, useCallback, useEffect } from 'react'

const ONBOARDING_KEY = 'kayroh_onboarding_completed'
const TOTAL_SLIDES = 5

interface UseOnboardingReturn {
  isOpen: boolean
  currentSlide: number
  totalSlides: number
  nextSlide: () => void
  prevSlide: () => void
  goToSlide: (index: number) => void
  completeOnboarding: () => void
  skipOnboarding: () => void
  isFirstSlide: boolean
  isLastSlide: boolean
}

export function useOnboarding(): UseOnboardingReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  // Check localStorage on mount
  useEffect(() => {
    const hasCompleted = localStorage.getItem(ONBOARDING_KEY) === 'true'
    if (!hasCompleted) {
      setIsOpen(true)
    }
  }, [])

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.min(prev + 1, TOTAL_SLIDES - 1))
  }, [])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0))
  }, [])

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < TOTAL_SLIDES) {
      setCurrentSlide(index)
    }
  }, [])

  const markComplete = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setIsOpen(false)
    setCurrentSlide(0)
  }, [])

  const completeOnboarding = useCallback(() => {
    markComplete()
  }, [markComplete])

  const skipOnboarding = useCallback(() => {
    markComplete()
  }, [markComplete])

  return {
    isOpen,
    currentSlide,
    totalSlides: TOTAL_SLIDES,
    nextSlide,
    prevSlide,
    goToSlide,
    completeOnboarding,
    skipOnboarding,
    isFirstSlide: currentSlide === 0,
    isLastSlide: currentSlide === TOTAL_SLIDES - 1
  }
}

export default useOnboarding
