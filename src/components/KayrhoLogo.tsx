import { cn } from '@/lib/utils'

interface KayrhoLogoProps {
  className?: string
  size?: number
}

// Modernist Chi Rho inspired logo
export function KayrhoLogo({ className, size = 24 }: KayrhoLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("text-blue-400", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Rho stem - vertical line */}
      <path
        d="M12 6V22"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Rho loop - the P curve */}
      <path
        d="M12 6C12 6 12 3 15 3C18 3 19 5.5 19 7C19 8.5 18 11 15 11C12 11 12 11 12 11"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Chi - diagonal stroke 1 */}
      <path
        d="M6 8L18 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Chi - diagonal stroke 2 */}
      <path
        d="M6 18L18 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  )
}

export default KayrhoLogo
