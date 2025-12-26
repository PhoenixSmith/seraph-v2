import { useState, cloneElement, isValidElement, useEffect } from 'react'
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover'
import { NoteCard } from './NoteCard'
import { CreateNoteForm } from './CreateNoteForm'
import { Button } from '@/components/ui/button'
import { StickyNote, Plus, ChevronUp } from 'lucide-react'
import type { VerseNote } from '@/lib/api'

interface Group {
  id: string
  name: string
}

interface NotePopoverProps {
  verse: number
  notes: VerseNote[]
  groups: Group[]
  currentUserId: string
  onCreateNote: (content: string, groupId?: string) => Promise<void>
  onDeleteNote: (noteId: string) => Promise<void>
  onReply: (noteId: string, content: string) => Promise<void>
  isCreating?: boolean
  children: React.ReactNode
}

export function NotePopover({
  verse,
  notes,
  groups,
  currentUserId,
  onCreateNote,
  onDeleteNote,
  onReply,
  isCreating,
  children
}: NotePopoverProps) {
  const [open, setOpen] = useState(false)
  const verseNotes = notes.filter(n => n.verse === verse)
  const hasOtherNotes = verseNotes.length > 0
  const [formExpanded, setFormExpanded] = useState(!hasOtherNotes)

  // Reset form expanded state when popover opens
  useEffect(() => {
    if (open) {
      setFormExpanded(!hasOtherNotes)
    }
  }, [open, hasOtherNotes])

  // Pass isOpen and onClick to child
  const enhancedChildren = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ isOpen?: boolean; onClick?: () => void }>, {
        isOpen: open,
        onClick: () => setOpen(o => !o)
      })
    : children

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverAnchor asChild>
        <div>{enhancedChildren}</div>
      </PopoverAnchor>
      <PopoverContent
        className="w-80 p-0"
        side="right"
        align="start"
        sideOffset={8}
      >
        <div className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold text-sm">
              Notes on verse {verse}
            </h4>
          </div>

          {/* Show existing notes first if there are any */}
          {verseNotes.length > 0 && (
            <div className="max-h-[250px] overflow-y-auto -mx-3 px-3 mb-3">
              <div className="space-y-2">
                {verseNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    currentUserId={currentUserId}
                    onDelete={onDeleteNote}
                    onReply={onReply}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Create note form - minimized when there are existing notes */}
          {hasOtherNotes && !formExpanded ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setFormExpanded(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add your own note
            </Button>
          ) : (
            <div className="space-y-2">
              {hasOtherNotes && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-6 text-xs text-muted-foreground hover:text-foreground -mb-1"
                  onClick={() => setFormExpanded(false)}
                >
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Minimize
                </Button>
              )}
              <CreateNoteForm
                groups={groups}
                onSubmit={onCreateNote}
                isSubmitting={isCreating}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
