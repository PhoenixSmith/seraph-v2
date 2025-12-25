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

interface JoinByCodeModalProps {
  isOpen: boolean
  onClose: () => void
  onJoined?: (groupId: string) => void
}

export function JoinByCodeModal({ isOpen, onClose, onJoined }: JoinByCodeModalProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const trimmedCode = code.trim().toUpperCase()
    if (!trimmedCode) {
      setError('Please enter an invite code')
      return
    }

    setIsLoading(true)
    try {
      const result = await api.joinGroupByCode(trimmedCode)
      if (!result.success) {
        setError(result.message)
        return
      }
      setSuccess(`Successfully joined "${result.group_name}"!`)
      setTimeout(() => {
        setCode('')
        setSuccess('')
        onJoined?.(result.group_id!)
        onClose()
      }, 1500)
    } catch (err) {
      setError((err as Error).message || 'Failed to join group')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCode('')
      setError('')
      setSuccess('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Group</DialogTitle>
          <DialogDescription>
            Enter the invite code shared by a group leader to join their group.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="inviteCode" className="text-sm font-medium">
                Invite Code
              </label>
              <Input
                id="inviteCode"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter code (e.g., ABC12DEF)"
                maxLength={8}
                autoFocus
                disabled={isLoading || !!success}
                className="uppercase tracking-widest text-center font-mono text-lg"
              />
            </div>
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                {success}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !code.trim() || !!success}>
              {isLoading ? 'Joining...' : 'Join Group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
