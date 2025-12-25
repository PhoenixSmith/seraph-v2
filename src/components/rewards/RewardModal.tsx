import { useEffect, useState, useCallback } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RewardModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  confettiColors?: string[]
  showConfetti?: boolean
  onComplete?: () => void
}

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

// Sparkle effect component
const Sparkle = ({ delay, x, y }: { delay: number; x: number; y: number }) => (
  <div
    className="absolute w-2 h-2 animate-reward-sparkle"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      animationDelay: `${delay}s`
    }}
  >
    <svg viewBox="0 0 24 24" className="w-full h-full text-yellow-400 fill-current">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  </div>
)

// XP burst animation
export const XPBurst = ({ xp, className }: { xp: number; className?: string }) => (
  <div className={cn(
    'flex items-center gap-1 text-amber-500 font-bold animate-reward-xp-burst',
    className
  )}>
    <span className="text-2xl">+{xp}</span>
    <span className="text-lg">XP</span>
  </div>
)

export function RewardModal({
  open,
  onClose,
  children,
  confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'],
  showConfetti = true,
  onComplete
}: RewardModalProps) {
  const [confettiParticles, setConfettiParticles] = useState<Array<{ id: number; color: string; delay: number; left: number; size: 'sm' | 'md' | 'lg' }>>([])
  const [sparkles, setSparkles] = useState<Array<{ id: number; delay: number; x: number; y: number }>>([])
  const [isExiting, setIsExiting] = useState(false)

  // Generate confetti and sparkles when modal opens
  useEffect(() => {
    if (open && showConfetti) {
      // Generate confetti particles
      const particles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        delay: Math.random() * 0.8,
        left: Math.random() * 100,
        size: (['sm', 'md', 'lg'] as const)[Math.floor(Math.random() * 3)]
      }))
      setConfettiParticles(particles)

      // Generate sparkles
      const sparks = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        delay: Math.random() * 2,
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80
      }))
      setSparkles(sparks)
    }
  }, [open, showConfetti, confettiColors])

  const handleClose = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      setIsExiting(false)
      onClose()
      onComplete?.()
    }, 200)
  }, [onClose, onComplete])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        className={cn(
          'sm:max-w-md border-none bg-transparent shadow-none p-0 overflow-visible',
          isExiting && 'animate-reward-exit'
        )}
        hideCloseButton
      >
        {/* Confetti layer */}
        {showConfetti && (
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
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-amber-500/30 overflow-hidden">
            {/* Sparkles layer */}
            <div className="absolute inset-0 pointer-events-none">
              {sparkles.map((sparkle) => (
                <Sparkle
                  key={sparkle.id}
                  delay={sparkle.delay}
                  x={sparkle.x}
                  y={sparkle.y}
                />
              ))}
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-amber-500/5 to-amber-500/10 pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 p-6">
              {children}
            </div>
          </div>
        </div>

        {/* Continue button outside card */}
        <div className="flex justify-center mt-4 animate-reward-fade-in" style={{ animationDelay: '0.5s' }}>
          <Button
            onClick={handleClose}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-bold px-8 py-2 rounded-full shadow-lg shadow-amber-500/25 transition-all hover:scale-105"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RewardModal
