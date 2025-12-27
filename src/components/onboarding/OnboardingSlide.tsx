import { cn } from '@/lib/utils'
import type { SlideConfig } from './slides'

interface OnboardingSlideProps {
  slide: SlideConfig
  isActive: boolean
  direction: 'enter' | 'exit' | 'idle'
}

// Sparkle component for decorative effect (subtle, behind content)
const Sparkle = ({ delay, x, y }: { delay: number; x: number; y: number }) => (
  <div
    className="absolute w-1.5 h-1.5 animate-reward-sparkle opacity-30"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      animationDelay: `${delay}s`
    }}
  >
    <svg viewBox="0 0 24 24" className="w-full h-full text-yellow-300 fill-current">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  </div>
)

export function OnboardingSlide({ slide, isActive, direction }: OnboardingSlideProps) {
  // Generate sparkles for active slide
  const sparkles = isActive
    ? Array.from({ length: 8 }, (_, i) => ({
        id: i,
        delay: Math.random() * 2,
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80
      }))
    : []

  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center p-8 transition-all duration-400',
        isActive && direction === 'enter' && 'animate-onboarding-slide-enter',
        !isActive && direction === 'exit' && 'animate-onboarding-slide-exit',
        !isActive && direction === 'idle' && 'opacity-0 pointer-events-none'
      )}
    >
      {/* Sparkles layer - behind all content */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {sparkles.map((sparkle) => (
          <Sparkle
            key={sparkle.id}
            delay={sparkle.delay}
            x={sparkle.x}
            y={sparkle.y}
          />
        ))}
      </div>

      {/* Icon with gradient background */}
      <div className="relative mb-6 z-10">
        {/* Glow effect */}
        <div
          className={cn(
            'absolute -inset-4 rounded-full blur-xl opacity-40 animate-reward-glow',
            `bg-gradient-to-br ${slide.iconGradient}`
          )}
        />
        {/* Icon container */}
        <div
          className={cn(
            'relative w-24 h-24 rounded-full flex items-center justify-center',
            `bg-gradient-to-br ${slide.iconGradient}`,
            'shadow-lg'
          )}
        >
          {slide.icon}
        </div>
      </div>

      {/* Title */}
      <h2 className="font-serif text-2xl font-bold text-center text-foreground mb-3 animate-reward-bounce">
        {slide.title}
      </h2>

      {/* Body */}
      <p className="text-muted-foreground text-center max-w-xs leading-relaxed">
        {slide.body}
      </p>
    </div>
  )
}

export default OnboardingSlide
