import { useState } from 'react'
import * as api from '@/lib/api'
import type { AvatarConfig } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/avatar/UserAvatar'

interface Member {
  user_id: string
  name?: string | null
  avatar_url?: string | null
  avatar_config: AvatarConfig
}

interface TransferLeaderModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: string
  members?: Member[]
  currentUserId?: string
  onTransferred?: () => void
}

export function TransferLeaderModal({
  isOpen,
  onClose,
  groupId,
  members,
  currentUserId,
  onTransferred
}: TransferLeaderModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const eligibleMembers = members?.filter((m) => m.user_id !== currentUserId) || []

  const handleTransfer = async () => {
    if (!selectedUserId) {
      setError('Please select a new leader')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      await api.transferLeadership(groupId, selectedUserId)
      onTransferred?.()
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Failed to transfer leadership')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedUserId(null)
      setError('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Leadership</DialogTitle>
          <DialogDescription>
            Select a member to become the new group leader.
          </DialogDescription>
        </DialogHeader>

        {eligibleMembers.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            No other members to transfer leadership to.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2 py-4">
            {eligibleMembers.map((member) => (
              <label
                key={member.user_id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  selectedUserId === member.user_id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-border/80"
                )}
              >
                <input
                  type="radio"
                  name="newLeader"
                  value={member.user_id}
                  checked={selectedUserId === member.user_id}
                  onChange={() => setSelectedUserId(member.user_id)}
                  disabled={isLoading}
                  className="accent-primary"
                />
                <UserAvatar size="sm" editable={false} config={member.avatar_config} />
                <span className="font-medium">{member.name || 'Unknown User'}</span>
              </label>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="duolingo-secondary"
            className="h-10 px-4 rounded-xl"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="duolingo-blue"
            className="h-10 px-4 rounded-xl"
            onClick={handleTransfer}
            disabled={isLoading || !selectedUserId || eligibleMembers.length === 0}
          >
            {isLoading ? 'Transferring...' : 'Transfer Leadership'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
