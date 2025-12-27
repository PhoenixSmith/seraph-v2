import { StickyNote, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NoteIndicatorProps {
  noteCount: number
  hasOwnNote?: boolean
  isHovered: boolean
  isOpen?: boolean
  onClick?: () => void
  className?: string
}

export function NoteIndicator({
  noteCount,
  hasOwnNote,
  isHovered,
  isOpen,
  onClick,
  className
}: NoteIndicatorProps) {
  const hasNotes = noteCount > 0

  // Only show if hovered OR has notes OR popover is open
  if (!isHovered && !hasNotes && !isOpen) {
    return null
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-0.5 transition-all duration-200',
        'rounded px-1 py-0.5',
        hasNotes
          ? 'text-primary hover:bg-primary/10'
          : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50',
        !hasNotes && !isHovered && !isOpen && 'opacity-0',
        (isHovered || isOpen) && !hasNotes && 'opacity-70',
        className
      )}
      aria-label={hasNotes ? `${noteCount} notes on this verse` : 'Add note'}
    >
      {hasNotes ? (
        <>
          <StickyNote className="h-3.5 w-3.5" />
          {noteCount > 1 && (
            <span className="text-xs font-medium">{noteCount}</span>
          )}
          {hasOwnNote && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </>
      ) : (
        <Pencil className="h-3.5 w-3.5" />
      )}
    </button>
  )
}
