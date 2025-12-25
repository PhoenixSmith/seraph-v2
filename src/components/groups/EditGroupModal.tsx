import { useState, useEffect } from 'react'
import * as api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EditGroupModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: string
  currentName: string
  currentDescription: string | null
  onUpdated?: () => void
}

export function EditGroupModal({
  isOpen,
  onClose,
  groupId,
  currentName,
  currentDescription,
  onUpdated
}: EditGroupModalProps) {
  const [name, setName] = useState(currentName)
  const [description, setDescription] = useState(currentDescription || '')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setName(currentName)
      setDescription(currentDescription || '')
      setError('')
    }
  }, [isOpen, currentName, currentDescription])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Please enter a group name')
      return
    }

    if (trimmedName.length > 50) {
      setError('Group name must be 50 characters or less')
      return
    }

    setIsLoading(true)
    try {
      const result = await api.updateGroup(groupId, trimmedName, description.trim() || undefined)
      if (!result.success) {
        setError(result.message)
        return
      }
      onUpdated?.()
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Failed to update group')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
          <DialogDescription>
            Update your group's name and description.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="editGroupName" className="text-sm font-medium">
                Group Name
              </label>
              <Input
                id="editGroupName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name"
                maxLength={50}
                autoFocus
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="editGroupDescription" className="text-sm font-medium">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="editGroupDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this group about?"
                maxLength={500}
                rows={3}
                disabled={isLoading}
              />
            </div>
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
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
              Cancel
            </Button>
            <Button
              type="submit"
              variant="duolingo-blue"
              className="h-10 px-4 rounded-xl"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
