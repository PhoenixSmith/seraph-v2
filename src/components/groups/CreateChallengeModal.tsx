import { useState, useEffect } from 'react'
import { Swords, Loader2, Check, Clock, Users, Trophy, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import * as api from '@/lib/api'
import type { OpenGroup } from '@/lib/api'

interface CreateChallengeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  challengerGroupId: string
}

export function CreateChallengeModal({
  isOpen,
  onClose,
  onSuccess,
  challengerGroupId,
}: CreateChallengeModalProps) {
  const [tab, setTab] = useState<'browse' | 'id'>('browse')
  const [groupId, setGroupId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isBrowsing, setIsBrowsing] = useState(false)
  const [error, setError] = useState('')
  const [targetGroup, setTargetGroup] = useState<{ id: string; name: string } | null>(null)
  const [openGroups, setOpenGroups] = useState<OpenGroup[]>([])

  useEffect(() => {
    if (isOpen && tab === 'browse') {
      loadOpenGroups()
    }
  }, [isOpen, tab])

  const loadOpenGroups = async () => {
    setIsBrowsing(true)
    try {
      const groups = await api.browseOpenGroups(challengerGroupId)
      setOpenGroups(groups)
    } catch (err) {
      console.error('Failed to load open groups:', err)
    } finally {
      setIsBrowsing(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setGroupId('')
      setError('')
      setTargetGroup(null)
      setIsLoading(false)
      setIsLookingUp(false)
      setTab('browse')
      onClose()
    }
  }

  const handleSelectGroup = (group: OpenGroup) => {
    setTargetGroup({ id: group.id, name: group.name })
    setError('')
  }

  const handleLookup = async () => {
    const trimmedId = groupId.trim()
    if (!trimmedId) {
      setError('Please enter a group ID')
      return
    }

    if (trimmedId === challengerGroupId) {
      setError('Cannot challenge your own group')
      return
    }

    setError('')
    setIsLookingUp(true)
    setTargetGroup(null)

    try {
      const result = await api.lookupGroupForChallenge(trimmedId)
      if (!result.found) {
        setError('Group not found. Check the ID and try again.')
      } else {
        setTargetGroup({ id: result.id!, name: result.name! })
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to lookup group')
    } finally {
      setIsLookingUp(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!targetGroup) {
      setError('Please select a group to challenge')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const result = await api.createChallenge(challengerGroupId, targetGroup.id)
      if (!result.success) {
        setError(result.message)
      } else {
        onSuccess()
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to create challenge')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            Challenge a Group
          </DialogTitle>
          <DialogDescription>
            Start a 1-week competition. The group with the highest XP per member wins!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={tab} onValueChange={(v) => { setTab(v as 'browse' | 'id'); setTargetGroup(null); setError('') }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="browse">
                <Search className="h-4 w-4 mr-1" />
                Browse
              </TabsTrigger>
              <TabsTrigger value="id">By ID</TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="mt-3">
              {isBrowsing ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : openGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No groups open for challenges</p>
                  <p className="text-sm mt-1">Try searching by group ID instead</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {openGroups.map((group) => (
                    <Card
                      key={group.id}
                      className={`p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                        targetGroup?.id === group.id ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                      onClick={() => handleSelectGroup(group)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{group.name}</div>
                          {group.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {group.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground ml-2">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {group.member_count}
                          </div>
                          <div className="flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            {group.win_count}W-{group.loss_count}L
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="id" className="mt-3 space-y-3">
              <div className="space-y-2">
                <label htmlFor="groupId" className="text-sm font-medium">
                  Group ID
                </label>
                <div className="flex gap-2">
                  <Input
                    id="groupId"
                    value={groupId}
                    onChange={(e) => {
                      setGroupId(e.target.value)
                      setTargetGroup(null)
                      setError('')
                    }}
                    placeholder="Enter group ID to challenge"
                    disabled={isLoading || isLookingUp}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="duolingo-blue"
                    className="h-10 px-4 rounded-xl"
                    onClick={handleLookup}
                    disabled={isLoading || isLookingUp || !groupId.trim()}
                  >
                    {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ask the other group's leader for their group ID
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {targetGroup && (
            <div className="rounded-lg bg-green-500/10 p-3 flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm">
                Ready to challenge <strong>{targetGroup.name}</strong>
              </span>
            </div>
          )}

          <div className="rounded-lg bg-muted p-3 flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p><strong>Duration:</strong> 1 week</p>
              <p><strong>Scoring:</strong> XP per active member (active in last 7 days)</p>
              <p className="text-xs mt-1 opacity-75">Inactive members don't count against you!</p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

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
              variant="duolingo-orange"
              className="h-10 px-4 rounded-xl"
              disabled={isLoading || !targetGroup}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Swords className="h-4 w-4 mr-2" />
                  Send Challenge
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
