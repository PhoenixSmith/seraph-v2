import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Lock, Users, Send } from 'lucide-react'

interface Group {
  id: string
  name: string
}

interface CreateNoteFormProps {
  groups: Group[]
  onSubmit: (content: string, groupId?: string) => Promise<void>
  isSubmitting?: boolean
}

export function CreateNoteForm({ groups, onSubmit, isSubmitting }: CreateNoteFormProps) {
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<'private' | string>('private')

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return
    const groupId = visibility === 'private' ? undefined : visibility
    await onSubmit(content.trim(), groupId)
    setContent('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Write a note about this verse..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-[80px] text-sm resize-none"
        disabled={isSubmitting}
      />

      <div className="flex items-center gap-2">
        <Select value={visibility} onValueChange={setVisibility}>
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue placeholder="Choose visibility" />
          </SelectTrigger>
          <SelectContent className="z-[150]">
            <SelectItem value="private" className="text-xs">
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5" />
                <span>Private (only you)</span>
              </div>
            </SelectItem>
            {groups.length > 0 && (
              <SelectItem value="all-groups" className="text-xs">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  <span>All My Groups</span>
                </div>
              </SelectItem>
            )}
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id} className="text-xs">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 opacity-50" />
                  <span>{group.name} (Group)</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className="h-8"
        >
          <Send className="h-3.5 w-3.5 mr-1" />
          Save
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Press Cmd/Ctrl + Enter to save
      </p>
    </div>
  )
}
