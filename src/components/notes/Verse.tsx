import { useState } from 'react'
import { NoteIndicator } from './NoteIndicator'
import { NotePopover } from './NotePopover'
import type { VerseNote } from '@/lib/api'

interface Group {
  id: string
  name: string
}

interface VerseProps {
  verseNumber: number
  text: string
  textColor: string
  notes: VerseNote[]
  groups: Group[]
  currentUserId: string
  onCreateNote: (verse: number, content: string, groupId?: string) => Promise<void>
  onDeleteNote: (noteId: string) => Promise<void>
  onReply: (noteId: string, content: string) => Promise<void>
  isCreating?: boolean
}

export function Verse({
  verseNumber,
  text,
  textColor,
  notes,
  groups,
  currentUserId,
  onCreateNote,
  onDeleteNote,
  onReply,
  isCreating
}: VerseProps) {
  const [isHovered, setIsHovered] = useState(false)

  const verseNotes = notes.filter(n => n.verse === verseNumber)
  const noteCount = verseNotes.length
  const hasOwnNote = verseNotes.some(n => n.user_id === currentUserId)

  const handleCreateNote = async (content: string, groupId?: string) => {
    await onCreateNote(verseNumber, content, groupId)
  }

  return (
    <p
      className="relative group pr-6"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        className="text-xs font-sans font-semibold align-super"
        style={{ color: textColor }}
      >
        {verseNumber}
      </span>
      {' '}{text}
      <NotePopover
        verse={verseNumber}
        notes={notes}
        groups={groups}
        currentUserId={currentUserId}
        onCreateNote={handleCreateNote}
        onDeleteNote={onDeleteNote}
        onReply={onReply}
        isCreating={isCreating}
      >
        <NoteIndicator
          noteCount={noteCount}
          hasOwnNote={hasOwnNote}
          isHovered={isHovered}
          className="absolute right-0 top-0"
        />
      </NotePopover>
    </p>
  )
}
