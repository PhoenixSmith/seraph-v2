import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { OnboardingSlide } from './OnboardingSlide'
import { slides } from './slides'

// Confetti particle component
const ConfettiParticle = ({
  color,
  delay,
  left,
  size = 'md'
}: {
  color: string
  delay: number
  left: number
  size?: 'sm' | 'md' | 'lg'
}) => {
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  const shapes = ['rounded-full', 'rounded-sm', 'rounded-none rotate-45']
  const shape = shapes[Math.floor(Math.random() * shapes.length)]

  return (
    <div
      className={cn(
        sizes[size],
        shape,
        'absolute animate-reward-confetti'
      )}
      style={{
        backgroundColor: color,
        left: `${left}%`,
        top: '-10px',
        animationDelay: `${delay}s`,
        animationDuration: `${2.5 + Math.random() * 1.5}s`
      }}
    />
  )
}

interface OnboardingModalProps {
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

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']

export function OnboardingModal({
  isOpen,
  currentSlide,
  totalSlides,
  nextSlide,
  prevSlide,
  goToSlide,
  completeOnboarding,
  skipOnboarding,
  isFirstSlide,
  isLastSlide
}: OnboardingModalProps) {
  const [confettiParticles, setConfettiParticles] = useState<Array<{ id: number; color: string; delay: number; left: number; size: 'sm' | 'md' | 'lg' }>>([])
  const [slideDirection, setSlideDirection] = useState<'enter' | 'exit' | 'idle'>('enter')
  const [displayedSlide, setDisplayedSlide] = useState(currentSlide)
  const [isExiting, setIsExiting] = useState(false)

  // Generate confetti for final slide
  useEffect(() => {
    const currentSlideConfig = slides[currentSlide]
    if (isOpen && currentSlideConfig?.showConfetti) {
      const particles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: Math.random() * 0.8,
        left: Math.random() * 100,
        size: (['sm', 'md', 'lg'] as const)[Math.floor(Math.random() * 3)]
      }))
      setConfettiParticles(particles)
    } else {
      setConfettiParticles([])
    }
  }, [isOpen, currentSlide])

  // Handle slide transitions
  useEffect(() => {
    if (currentSlide !== displayedSlide) {
      setSlideDirection('exit')
      const timeout = setTimeout(() => {
        setDisplayedSlide(currentSlide)
        setSlideDirection('enter')
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [currentSlide, displayedSlide])

  const handleClose = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      setIsExiting(false)
      completeOnboarding()
    }, 200)
  }, [completeOnboarding])

  const handleSkip = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      setIsExiting(false)
      skipOnboarding()
    }, 200)
  }, [skipOnboarding])

  const handleNext = useCallback(() => {
    if (isLastSlide) {
      handleClose()
    } else {
      nextSlide()
    }
  }, [isLastSlide, nextSlide, handleClose])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent
        className={cn(
          'sm:max-w-md border-none bg-transparent shadow-none p-0 overflow-visible',
          isExiting && 'animate-reward-exit'
        )}
        hideCloseButton
      >
        {/* Confetti layer */}
        {confettiParticles.length > 0 && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {confettiParticles.map((particle) => (
              <ConfettiParticle
                key={particle.id}
                color={particle.color}
                delay={particle.delay}
                left={particle.left}
                size={particle.size}
              />
            ))}
          </div>
        )}

        {/* Main content with glow effect */}
        <div className="relative animate-reward-pop">
          {/* Outer glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 rounded-3xl blur-2xl animate-reward-glow" />

          {/* Card container */}
          <div className="relative bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-2xl border border-amber-500/30 overflow-hidden">
            {/* Skip button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 z-20 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip
            </button>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-amber-500/5 to-amber-500/10 pointer-events-none" />

            {/* Slide content area */}
            <div className="relative z-10 h-80 overflow-hidden">
              {slides.map((slide, index) => (
                <OnboardingSlide
                  key={slide.id}
                  slide={slide}
                  isActive={index === displayedSlide}
                  direction={index === displayedSlide ? slideDirection : 'idle'}
                />
              ))}
            </div>

            {/* Progress dots */}
            <div className="relative z-10 flex justify-center gap-2 pb-6">
              {Array.from({ length: totalSlides }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    'rounded-full transition-all duration-300',
                    index === currentSlide
                      ? 'w-3 h-3 bg-amber-500 scale-110'
                      : 'w-2 h-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center mt-4 animate-reward-fade-in" style={{ animationDelay: '0.3s' }}>
          <Button
            variant="outline"
            onClick={prevSlide}
            disabled={isFirstSlide}
            className={cn(
              'border-b-4 hover:-translate-y-0.5 active:border-b-2 active:translate-y-0 transition-all rounded-xl',
              isFirstSlide && 'opacity-0 pointer-events-none'
            )}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <Button
            variant="duolingo"
            size="duolingo"
            onClick={handleNext}
            className="shadow-lg shadow-[#58cc02]/25"
          >
            {isLastSlide ? "Let's Go!" : 'Continue'}
            {!isLastSlide && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default OnboardingModal
