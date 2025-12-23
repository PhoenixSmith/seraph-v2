import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { LeaderboardRow } from './LeaderboardRow'
import { InviteMemberModal } from './InviteMemberModal'
import { TransferLeaderModal } from './TransferLeaderModal'
import { ConfirmModal } from './ConfirmModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ArrowLeft, UserPlus, ArrowRightLeft, Trash2, LogOut, X } from 'lucide-react'
import { Id } from '../../../convex/_generated/dataModel'

interface GroupDetailProps {
  groupId: Id<"groups">
  onBack: () => void
  currentUserId: Id<"users">
}

export function GroupDetail({ groupId, onBack, currentUserId }: GroupDetailProps) {
  const group = useQuery(api.groups.getGroup, { groupId })
  const leaderboard = useQuery(api.groups.getGroupLeaderboard, { groupId })
  const pendingInvites = useQuery(api.groups.getGroupPendingInvites, { groupId })

  const leaveGroup = useMutation(api.groups.leaveGroup)
  const deleteGroup = useMutation(api.groups.deleteGroup)
  const removeMember = useMutation(api.groups.removeMember)
  const cancelInvite = useMutation(api.groups.cancelInvite)

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  if (!group) {
    return (
      <div className="py-2">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="py-8 text-center text-muted-foreground">Loading group...</div>
      </div>
    )
  }

  const handleLeave = async () => {
    try {
      await leaveGroup({ groupId })
      onBack()
    } catch (error) {
      console.error('Failed to leave group:', error)
      alert((error as Error).message)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteGroup({ groupId })
      onBack()
    } catch (error) {
      console.error('Failed to delete group:', error)
      alert((error as Error).message)
    }
  }

  const handleRemoveMember = async (memberId: Id<"users">) => {
    if (!confirm('Remove this member from the group?')) return
    try {
      await removeMember({ groupId, memberId })
    } catch (error) {
      console.error('Failed to remove member:', error)
      alert((error as Error).message)
    }
  }

  const handleCancelInvite = async (inviteId: Id<"groupInvites">) => {
    try {
      await cancelInvite({ inviteId })
    } catch (error) {
      console.error('Failed to cancel invite:', error)
    }
  }

  return (
    <div className="py-2">
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h2 className="text-2xl font-semibold flex-1">{group.name}</h2>
        {group.isLeader && (
          <Badge variant="secondary">Leader</Badge>
        )}
      </div>

      {/* Leader Actions */}
      {group.isLeader && (
        <div className="flex flex-wrap gap-3 mb-6">
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
          <Button variant="outline" onClick={() => setShowTransferModal(true)}>
            <ArrowRightLeft className="h-4 w-4" />
            Transfer Leadership
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4" />
            Delete Group
          </Button>
        </div>
      )}

      {/* Member Actions */}
      {!group.isLeader && group.isMember && (
        <div className="flex flex-wrap gap-3 mb-6">
          <Button variant="outline" onClick={() => setShowLeaveConfirm(true)}>
            <LogOut className="h-4 w-4" />
            Leave Group
          </Button>
        </div>
      )}

      {/* Pending Invites (Leader Only) */}
      {group.isLeader && pendingInvites && pendingInvites.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">
            Pending Invites ({pendingInvites.length})
          </h3>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div
                key={invite._id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <span className="text-sm">
                  {invite.invitedUserName || invite.invitedUserEmail || 'Unknown'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleCancelInvite(invite._id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Leaderboard</h3>
        <Card className="overflow-hidden">
          {leaderboard?.map((member) => (
            <LeaderboardRow
              key={member.userId}
              member={member}
              canRemove={group.isLeader}
              onRemove={handleRemoveMember}
            />
          ))}
          {(!leaderboard || leaderboard.length === 0) && (
            <div className="p-8 text-center text-muted-foreground">
              No members yet
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        groupId={groupId}
      />

      <TransferLeaderModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        groupId={groupId}
        members={leaderboard}
        currentUserId={currentUserId}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Group"
        message="Are you sure you want to delete this group? This action cannot be undone and all members will be removed."
        confirmText="Delete Group"
        confirmDanger
      />

      <ConfirmModal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeave}
        title="Leave Group"
        message="Are you sure you want to leave this group?"
        confirmText="Leave Group"
      />
    </div>
  )
}
