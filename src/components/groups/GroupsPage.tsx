import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { GroupCard } from './GroupCard'
import { GroupDetail } from './GroupDetail'
import { CreateGroupModal } from './CreateGroupModal'
import { InvitesList } from './InvitesList'
import { Button } from '@/components/ui/button'
import { Plus, Users } from 'lucide-react'
import { Id } from '../../../convex/_generated/dataModel'

interface GroupsPageProps {
  currentUserId: Id<"users">
}

export function GroupsPage({ currentUserId }: GroupsPageProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<Id<"groups"> | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const myGroups = useQuery(api.groups.listMyGroups)

  if (selectedGroupId) {
    return (
      <GroupDetail
        groupId={selectedGroupId}
        onBack={() => setSelectedGroupId(null)}
        currentUserId={currentUserId}
      />
    )
  }

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-semibold">Groups</h2>
        <div className="flex items-center gap-3">
          <InvitesList />
          <Button onClick={() => setShowCreateModal(true)}>
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
            Create a group to start tracking progress with friends!
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            Create Your First Group
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {myGroups.map((group) => (
            <GroupCard
              key={group._id}
              group={group}
              onClick={() => setSelectedGroupId(group._id)}
            />
          ))}
        </div>
      )}

      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(groupId) => setSelectedGroupId(groupId)}
      />
    </div>
  )
}
