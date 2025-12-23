import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Mail, Check, X } from 'lucide-react'
import { Id } from '../../../convex/_generated/dataModel'

export function InvitesList() {
  const pendingInvites = useQuery(api.groups.getPendingInvites)
  const respondToInvite = useMutation(api.groups.respondToInvite)
  const [loadingInvite, setLoadingInvite] = useState<Id<"groupInvites"> | null>(null)

  const inviteCount = pendingInvites?.length || 0

  if (inviteCount === 0) return null

  const handleRespond = async (inviteId: Id<"groupInvites">, accept: boolean) => {
    setLoadingInvite(inviteId)
    try {
      await respondToInvite({ inviteId, accept })
    } catch (error) {
      console.error('Failed to respond to invite:', error)
    } finally {
      setLoadingInvite(null)
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Mail className="h-4 w-4" />
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            variant="destructive"
          >
            {inviteCount}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>Pending Invites</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-72 overflow-y-auto">
          {pendingInvites?.map((invite) => (
            <div key={invite._id} className="p-3 border-b last:border-b-0">
              <div className="mb-2">
                <p className="font-medium">{invite.groupName}</p>
                <p className="text-xs text-muted-foreground">
                  Invited by {invite.invitedByName || 'Unknown'} on {formatDate(invite.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleRespond(invite._id, true)}
                  disabled={loadingInvite === invite._id}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {loadingInvite === invite._id ? '...' : 'Accept'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleRespond(invite._id, false)}
                  disabled={loadingInvite === invite._id}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
