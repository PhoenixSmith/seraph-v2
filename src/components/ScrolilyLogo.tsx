import { cn } from '@/lib/utils'

interface ScrolilyLogoProps {
  className?: string
  size?: number
}

// Minimal wing - elegant and simple
export function ScrolilyLogo({ className, size = 24 }: ScrolilyLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("text-blue-400", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Back petal/wing */}
      <path
        d="M8 20C8 20 6 12 10 6C12 3 14 2 14 2C14 2 10 8 12 14C13 17 14 19 14 19"
        fill="currentColor"
        fillOpacity="0.4"
      />
      {/* Front petal/wing */}
      <path
        d="M12 22C12 22 14 14 14 8C14 4 16 2 16 2C16 2 18 6 18 10C18 16 14 22 12 22Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default ScrolilyLogo
