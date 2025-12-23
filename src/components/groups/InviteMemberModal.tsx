import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
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
import { Id } from '../../../convex/_generated/dataModel'

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: Id<"groups">
}

export function InviteMemberModal({ isOpen, onClose, groupId }: InviteMemberModalProps) {
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const inviteToGroup = useMutation(api.groups.inviteToGroup)

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
      const result = await inviteToGroup({ groupId, identifier: trimmedIdentifier })
      if (result.success) {
        setSuccess(result.message)
        setIdentifier('')
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
      onClose()
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
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="identifier" className="text-sm font-medium">
                Username or Email
              </label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter username or email"
                autoFocus
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
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Close
            </Button>
            <Button type="submit" disabled={isLoading || !identifier.trim()}>
              {isLoading ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
