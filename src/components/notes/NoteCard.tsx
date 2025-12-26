import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { UserAvatar } from '@/components/avatar/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ChevronDown, ChevronUp, MessageCircle, Trash2, Lock, Users, Send } from 'lucide-react'
import * as api from '@/lib/api'
import type { VerseNote, NoteReply } from '@/lib/api'

interface NoteCardProps {
  note: VerseNote
  currentUserId: string
  onDelete?: (noteId: string) => void
  onReply?: (noteId: string, content: string) => Promise<void>
}

export function NoteCard({ note, currentUserId, onDelete, onReply }: NoteCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [replies, setReplies] = useState<NoteReply[]>([])
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)

  const isOwner = note.user_id === currentUserId
  const hasReplies = note.reply_count > 0

  const loadReplies = async () => {
    if (loadingReplies || replies.length > 0) return
    setLoadingReplies(true)
    try {
      const noteWithReplies = await api.getNoteWithReplies(note.id)
      if (noteWithReplies) {
        setReplies(noteWithReplies.replies)
      }
    } catch (err) {
      console.error('Failed to load replies:', err)
    } finally {
      setLoadingReplies(false)
    }
  }

  const handleExpand = () => {
    if (!expanded && hasReplies) {
      loadReplies()
    }
    setExpanded(!expanded)
  }

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || submittingReply) return
    setSubmittingReply(true)
    try {
      if (onReply) {
        await onReply(note.id, replyContent.trim())
      }
      // Reload replies after submitting
      const noteWithReplies = await api.getNoteWithReplies(note.id)
      if (noteWithReplies) {
        setReplies(noteWithReplies.replies)
      }
      setReplyContent('')
    } catch (err) {
      console.error('Failed to submit reply:', err)
    } finally {
      setSubmittingReply(false)
    }
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-card">
      {/* Header */}
      <div className="flex items-start gap-2">
        <UserAvatar
          size="sm"
          editable={false}
          config={note.user_avatar_config || api.DEFAULT_AVATAR_CONFIG}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {note.user_name || 'Anonymous'}
            </span>
            {note.is_private ? (
              <Badge variant="outline" className="text-xs py-0 px-1.5 gap-1">
                <Lock className="h-3 w-3" />
                Private
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs py-0 px-1.5 gap-1">
                <Users className="h-3 w-3" />
                {note.group_name}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
          </div>
        </div>
        {isOwner && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(note.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Content */}
      <p className="text-sm whitespace-pre-wrap">{note.content}</p>

      {/* Replies section (only for group notes) */}
      {!note.is_private && (
        <div className="pt-1">
          <button
            onClick={handleExpand}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>
              {note.reply_count} {note.reply_count === 1 ? 'reply' : 'replies'}
            </span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2">
              {loadingReplies ? (
                <div className="text-xs text-muted-foreground py-2">Loading replies...</div>
              ) : (
                <>
                  {replies.map((reply) => (
                    <div key={reply.id} className="flex gap-2 pl-2 border-l-2 border-muted">
                      <UserAvatar
                        size="sm"
                        editable={false}
                        config={reply.user_avatar_config || api.DEFAULT_AVATAR_CONFIG}
                        className="w-6 h-6"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-xs truncate">
                            {reply.user_name || 'Anonymous'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* Reply input */}
                  <div className="flex gap-2 pl-2">
                    <Textarea
                      placeholder="Write a reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="min-h-[60px] text-xs resize-none"
                    />
                    <Button
                      size="sm"
                      onClick={handleSubmitReply}
                      disabled={!replyContent.trim() || submittingReply}
                      className="self-end"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
