import { useState, useCallback } from 'react'
import { useRefreshableQuery } from '@/hooks/useSupabase'
import * as api from '@/lib/api'
import { LeaderboardRow } from './LeaderboardRow'
import { InviteMemberModal } from './InviteMemberModal'
import { TransferLeaderModal } from './TransferLeaderModal'
import { ConfirmModal } from './ConfirmModal'
import { EditGroupModal } from './EditGroupModal'
import { GroupActivityFeed } from './GroupActivityFeed'
import { GroupStats } from './GroupStats'
import { GroupLevelProgress } from './GroupLevelProgress'
import { InviteCodeDisplay } from './InviteCodeDisplay'
import { ChallengesSection } from './ChallengesSection'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, UserPlus, ArrowRightLeft, Trash2, LogOut, X, Pencil, Swords, Loader2, Users } from 'lucide-react'

interface GroupDetailProps {
  groupId: string
  onBack: () => void
  currentUserId?: string
}

export function GroupDetail({ groupId, onBack, currentUserId }: GroupDetailProps) {
  const { data: group, refresh: refreshGroup } = useRefreshableQuery(
    useCallback(() => api.getGroup(groupId), [groupId])
  )
  const { data: leaderboard, refresh: refreshLeaderboard } = useRefreshableQuery(
    useCallback(() => api.getGroupLeaderboard(groupId), [groupId])
  )
  const { data: pendingInvites, refresh: refreshInvites } = useRefreshableQuery(
    useCallback(() => api.getGroupPendingInvites(groupId), [groupId])
  )

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [localInviteCode, setLocalInviteCode] = useState<string | null>(null)
  const [isTogglingOpenForChallenges, setIsTogglingOpenForChallenges] = useState(false)
  const [isTogglingMembersCanInvite, setIsTogglingMembersCanInvite] = useState(false)

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
      await api.leaveGroup(groupId)
      onBack()
    } catch (error) {
      console.error('Failed to leave group:', error)
      alert((error as Error).message)
    }
  }

  const handleDelete = async () => {
    try {
      await api.deleteGroup(groupId)
      onBack()
    } catch (error) {
      console.error('Failed to delete group:', error)
      alert((error as Error).message)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member from the group?')) return
    try {
      await api.removeMember(groupId, memberId)
      refreshLeaderboard()
    } catch (error) {
      console.error('Failed to remove member:', error)
      alert((error as Error).message)
    }
  }

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await api.cancelInvite(inviteId)
      refreshInvites()
    } catch (error) {
      console.error('Failed to cancel invite:', error)
    }
  }

  const handleToggleOpenForChallenges = async () => {
    setIsTogglingOpenForChallenges(true)
    try {
      const result = await api.toggleOpenForChallenges(groupId, !group.open_for_challenges)
      if (result.success) {
        refreshGroup()
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('Failed to toggle open for challenges:', error)
      alert((error as Error).message)
    } finally {
      setIsTogglingOpenForChallenges(false)
    }
  }

  const handleToggleMembersCanInvite = async () => {
    setIsTogglingMembersCanInvite(true)
    try {
      const result = await api.toggleMembersCanInvite(groupId, !group.members_can_invite)
      if (result.success) {
        refreshGroup()
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('Failed to toggle members can invite:', error)
      alert((error as Error).message)
    } finally {
      setIsTogglingMembersCanInvite(false)
    }
  }

  const inviteCode = localInviteCode || group.invite_code
  const canInvite = group.is_leader || (group.is_member && group.members_can_invite)

  return (
    <div className="py-2">
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-2xl font-semibold truncate">{group.name}</h2>
            {group.is_leader && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setShowEditModal(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
          {group.description && (
            <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
          )}
        </div>
        {group.is_leader && (
          <Badge variant="secondary">Leader</Badge>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        {canInvite && (
          <Button
            variant="duolingo-blue"
            className="h-10 px-4 rounded-xl"
            onClick={() => setShowInviteModal(true)}
          >
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        )}
        {!group.is_leader && group.is_member && (
          <Button variant="outline" onClick={() => setShowLeaveConfirm(true)}>
            <LogOut className="h-4 w-4" />
            Leave Group
          </Button>
        )}
      </div>

      {/* Main Tabbed Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className={`grid w-full mb-4 ${group.is_leader ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          {group.is_leader && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <GroupStats groupId={groupId} />
          <GroupLevelProgress groupId={groupId} />
          <ChallengesSection groupId={groupId} isLeader={group.is_leader} />
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          {/* Pending Invites (Leader Only) */}
          {group.is_leader && pendingInvites && pendingInvites.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Pending Invites ({pendingInvites.length})
              </h3>
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <span className="text-sm">
                      {invite.invited_user_name || invite.invited_user_email || 'Unknown'}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCancelInvite(invite.id)}
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
            <Card className="overflow-visible">
              {leaderboard?.map((member) => (
                <LeaderboardRow
                  key={member.user_id}
                  member={member}
                  canRemove={group.is_leader}
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
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <GroupActivityFeed groupId={groupId} />
        </TabsContent>

        {/* Settings Tab (Leader Only) */}
        {group.is_leader && (
          <TabsContent value="settings" className="space-y-6">
            {/* Invite Code */}
            {inviteCode && (
              <InviteCodeDisplay
                groupId={groupId}
                inviteCode={inviteCode}
                onCodeRegenerated={setLocalInviteCode}
              />
            )}

            {/* Open for Challenges Toggle */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Swords className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Open for Challenges</div>
                    <div className="text-sm text-muted-foreground">
                      {group.open_for_challenges
                        ? 'Other groups can find and challenge you'
                        : 'Your group is hidden from the challenge browser'}
                    </div>
                  </div>
                </div>
                <Button
                  variant={group.open_for_challenges ? 'duolingo-blue' : 'duolingo-secondary'}
                  className="h-9 px-4 rounded-xl"
                  onClick={handleToggleOpenForChallenges}
                  disabled={isTogglingOpenForChallenges}
                >
                  {isTogglingOpenForChallenges ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : group.open_for_challenges ? (
                    'Enabled'
                  ) : (
                    'Disabled'
                  )}
                </Button>
              </div>
            </Card>

            {/* Members Can Invite Toggle */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Members Can Invite</div>
                    <div className="text-sm text-muted-foreground">
                      {group.members_can_invite
                        ? 'All members can invite new people'
                        : 'Only you can invite new members'}
                    </div>
                  </div>
                </div>
                <Button
                  variant={group.members_can_invite ? 'duolingo-blue' : 'duolingo-secondary'}
                  className="h-9 px-4 rounded-xl"
                  onClick={handleToggleMembersCanInvite}
                  disabled={isTogglingMembersCanInvite}
                >
                  {isTogglingMembersCanInvite ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : group.members_can_invite ? (
                    'Enabled'
                  ) : (
                    'Disabled'
                  )}
                </Button>
              </div>
            </Card>

            {/* Danger Zone */}
            <Card className="p-4 border-destructive/50">
              <h4 className="font-semibold text-destructive mb-4">Danger Zone</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Transfer Leadership</div>
                    <div className="text-sm text-muted-foreground">
                      Hand over group ownership to another member
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setShowTransferModal(true)}>
                    <ArrowRightLeft className="h-4 w-4" />
                    Transfer
                  </Button>
                </div>
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Delete Group</div>
                      <div className="text-sm text-muted-foreground">
                        Permanently delete this group and remove all members
                      </div>
                    </div>
                    <Button
                      variant="duolingo-destructive"
                      className="h-9 px-4 rounded-xl"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Modals */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        groupId={groupId}
        inviteCode={inviteCode}
        onInvited={refreshInvites}
      />

      <TransferLeaderModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        groupId={groupId}
        members={leaderboard}
        currentUserId={currentUserId}
        onTransferred={refreshGroup}
      />

      <EditGroupModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        groupId={groupId}
        currentName={group.name}
        currentDescription={group.description}
        onUpdated={refreshGroup}
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
