import { useState, useCallback } from 'react'
import { useRefreshableQuery } from '@/hooks/useSupabase'
import * as api from '@/lib/api'
import { GroupCard } from './GroupCard'
import { GroupDetail } from './GroupDetail'
import { CreateGroupModal } from './CreateGroupModal'
import { JoinByCodeModal } from './JoinByCodeModal'
import { InvitesList } from './InvitesList'
import { Button } from '@/components/ui/button'
import { Plus, Users, Link } from 'lucide-react'

interface GroupsPageProps {
  currentUserId?: string
  onNavigateToVerse?: (book: string, chapter: number, verse?: number) => void
}

export function GroupsPage({ currentUserId, onNavigateToVerse }: GroupsPageProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

  const { data: myGroups, refresh: refreshGroups } = useRefreshableQuery(
    useCallback(() => api.listMyGroups(), [])
  )

  if (selectedGroupId) {
    return (
      <GroupDetail
        groupId={selectedGroupId}
        onBack={() => {
          refreshGroups()
          setSelectedGroupId(null)
        }}
        currentUserId={currentUserId}
        onNavigateToVerse={onNavigateToVerse}
      />
    )
  }

  return (
    <div className="py-4">
      <div className="flex justify-center items-center mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <InvitesList />
          <Button variant="duolingo-secondary" className="h-10 px-4 rounded-xl" onClick={() => setShowJoinModal(true)}>
            <Link className="h-4 w-4" />
            Join with Code
          </Button>
          <Button
            variant="duolingo-blue"
            className="h-10 px-4 rounded-xl"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
        </div>
      </div>

      {myGroups === undefined ? (
        <div className="py-8 text-center text-muted-foreground">Loading groups...</div>
      ) : myGroups.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No groups yet</h3>
          <p className="text-muted-foreground mb-6">
            Create a group or join one with an invite code!
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="duolingo-secondary" className="h-10 px-4 rounded-xl" onClick={() => setShowJoinModal(true)}>
              <Link className="h-4 w-4" />
              Join with Code
            </Button>
            <Button
              variant="duolingo-blue"
              className="h-10 px-4 rounded-xl"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {myGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onClick={() => setSelectedGroupId(group.id)}
            />
          ))}
        </div>
      )}

      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(groupId) => {
          refreshGroups()
          setSelectedGroupId(groupId)
        }}
      />

      <JoinByCodeModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoined={(groupId) => {
          refreshGroups()
          setSelectedGroupId(groupId)
        }}
      />
    </div>
  )
}
