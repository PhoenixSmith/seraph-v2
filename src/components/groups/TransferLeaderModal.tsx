import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'

interface Member {
  userId: Id<"users">
  name?: string
  image?: string
}

interface TransferLeaderModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: Id<"groups">
  members?: Member[]
  currentUserId: Id<"users">
}

export function TransferLeaderModal({
  isOpen,
  onClose,
  groupId,
  members,
  currentUserId
}: TransferLeaderModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const transferLeadership = useMutation(api.groups.transferLeadership)

  const eligibleMembers = members?.filter((m) => m.userId !== currentUserId) || []

  const handleTransfer = async () => {
    if (!selectedUserId) {
      setError('Please select a new leader')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      await transferLeadership({ groupId, newLeaderId: selectedUserId })
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
                key={member.userId}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  selectedUserId === member.userId
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-border/80"
                )}
              >
                <input
                  type="radio"
                  name="newLeader"
                  value={member.userId}
                  checked={selectedUserId === member.userId}
                  onChange={() => setSelectedUserId(member.userId)}
                  disabled={isLoading}
                  className="accent-primary"
                />
                <Avatar className="h-9 w-9">
                  <AvatarImage src={member.image} />
                  <AvatarFallback>
                    {(member.name || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
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
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
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
