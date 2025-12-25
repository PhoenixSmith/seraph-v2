import { useState } from 'react'
import * as api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Copy, Check, Link } from 'lucide-react'

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: string
  inviteCode?: string
  onInvited?: () => void
}

export function InviteMemberModal({ isOpen, onClose, groupId, inviteCode, onInvited }: InviteMemberModalProps) {
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const trimmedIdentifier = identifier.trim()
    if (!trimmedIdentifier) {
      setError('Please enter a username or email')
      return
    }

    setIsLoading(true)
    try {
      const result = await api.inviteToGroup(groupId, trimmedIdentifier)
      if (result.success) {
        setSuccess(result.message)
        setIdentifier('')
        onInvited?.()
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to send invite')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setIdentifier('')
      setError('')
      setSuccess('')
      setCopied(null)
      onClose()
    }
  }

  const handleCopyCode = async () => {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied('code')
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyLink = async () => {
    if (!inviteCode) return
    try {
      const url = `${window.location.origin}/join/${inviteCode}`
      await navigator.clipboard.writeText(url)
      setCopied('link')
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join this group.
          </DialogDescription>
        </DialogHeader>
        {/* Invite Code Section */}
        {inviteCode && (
          <div className="space-y-3 pb-4 border-b">
            <div className="text-sm font-medium">Share Invite Code</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-lg px-4 py-2.5 font-mono text-lg tracking-widest text-center select-all">
                {inviteCode}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyCode}
                className="shrink-0"
                title="Copy code"
              >
                {copied === 'code' ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              variant="duolingo-secondary"
              className="h-9 px-4 rounded-xl w-full"
              onClick={handleCopyLink}
            >
              {copied === 'link' ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Link className="h-4 w-4" />
              )}
              Copy Invite Link
            </Button>
          </div>
        )}

        {/* Direct Invite Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="identifier" className="text-sm font-medium">
                Or invite by username/email
              </label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter username or email"
                autoFocus={!inviteCode}
                disabled={isLoading}
              />
            </div>
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                {success}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="duolingo-secondary"
              className="h-10 px-4 rounded-xl"
              onClick={onClose}
              disabled={isLoading}
            >
              Close
            </Button>
            <Button
              type="submit"
              variant="duolingo-blue"
              className="h-10 px-4 rounded-xl"
              disabled={isLoading || !identifier.trim()}
            >
              {isLoading ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
