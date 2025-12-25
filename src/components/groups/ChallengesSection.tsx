import { useState, useCallback } from 'react'
import { Swords, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChallengeCard } from './ChallengeCard'
import { CreateChallengeModal } from './CreateChallengeModal'
import { useRefreshableQuery } from '@/hooks/useSupabase'
import * as api from '@/lib/api'

interface ChallengesSectionProps {
  groupId: string
  isLeader: boolean
}

export function ChallengesSection({ groupId, isLeader }: ChallengesSectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: challenges, refresh } = useRefreshableQuery(
    useCallback(() => api.getGroupChallenges(groupId), [groupId])
  )

  const activeChallenges = challenges?.filter(c => c.challenge_status === 'active') ?? []
  const pendingChallenges = challenges?.filter(c => c.challenge_status === 'pending') ?? []
  const completedChallenges = challenges?.filter(c => c.challenge_status === 'completed') ?? []

  const handleRespond = async (challengeId: string, accept: boolean) => {
    try {
      const result = await api.respondToChallenge(challengeId, accept)
      if (!result.success) {
        alert(result.message)
      }
      refresh()
    } catch (err) {
      alert((err as Error).message || 'Failed to respond to challenge')
    }
  }

  const handleCancel = async (challengeId: string) => {
    try {
      const result = await api.cancelChallenge(challengeId)
      if (!result.success) {
        alert(result.message)
      }
      refresh()
    } catch (err) {
      alert((err as Error).message || 'Failed to cancel challenge')
    }
  }

  const handleChallengeCreated = () => {
    setShowCreateModal(false)
    refresh()
  }

  if (challenges === undefined) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading challenges...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5" />
          <h3 className="font-semibold">Group Challenges</h3>
        </div>
        {isLeader && (
          <Button
            variant="duolingo-orange"
            className="h-9 px-4 rounded-xl"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Challenge
          </Button>
        )}
      </div>

      {challenges.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Swords className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No challenges yet</p>
          {isLeader && (
            <p className="text-sm mt-1">Challenge another group to a 1-week competition!</p>
          )}
        </div>
      ) : (
        <Tabs defaultValue={activeChallenges.length > 0 ? 'active' : pendingChallenges.length > 0 ? 'pending' : 'completed'}>
          <TabsList className="w-full">
            <TabsTrigger value="active" className="flex-1">
              Active {activeChallenges.length > 0 && `(${activeChallenges.length})`}
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-1">
              Pending {pendingChallenges.length > 0 && `(${pendingChallenges.length})`}
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3 mt-3">
            {activeChallenges.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground text-sm">
                No active challenges
              </p>
            ) : (
              activeChallenges.map(challenge => (
                <ChallengeCard
                  key={challenge.challenge_id}
                  challenge={challenge}
                  currentGroupId={groupId}
                  onRespond={handleRespond}
                  onCancel={handleCancel}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-3 mt-3">
            {pendingChallenges.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground text-sm">
                No pending challenges
              </p>
            ) : (
              pendingChallenges.map(challenge => (
                <ChallengeCard
                  key={challenge.challenge_id}
                  challenge={challenge}
                  currentGroupId={groupId}
                  onRespond={handleRespond}
                  onCancel={handleCancel}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3 mt-3">
            {completedChallenges.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground text-sm">
                No completed challenges
              </p>
            ) : (
              completedChallenges.slice(0, 10).map(challenge => (
                <ChallengeCard
                  key={challenge.challenge_id}
                  challenge={challenge}
                  currentGroupId={groupId}
                  onRespond={handleRespond}
                  onCancel={handleCancel}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      <CreateChallengeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleChallengeCreated}
        challengerGroupId={groupId}
      />
    </div>
  )
}
