import { useState } from 'react'
import { useQuery } from '@/hooks/useSupabase'
import * as api from '@/lib/api'
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

export function InvitesList() {
  const pendingInvites = useQuery(() => api.getPendingInvites(), [])
  const [loadingInvite, setLoadingInvite] = useState<string | null>(null)

  const inviteCount = pendingInvites?.length || 0

  if (inviteCount === 0) return null

  const handleRespond = async (inviteId: string, accept: boolean) => {
    setLoadingInvite(inviteId)
    try {
      await api.respondToInvite(inviteId, accept)
    } catch (error) {
      console.error('Failed to respond to invite:', error)
    } finally {
      setLoadingInvite(null)
    }
  }

  const formatDate = (timestamp: string) => {
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
            <div key={invite.id} className="p-3 border-b last:border-b-0">
              <div className="mb-2">
                <p className="font-medium">{invite.group_name}</p>
                <p className="text-xs text-muted-foreground">
                  Invited by {invite.invited_by_name || 'Unknown'} on {formatDate(invite.created_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleRespond(invite.id, true)}
                  disabled={loadingInvite === invite.id}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {loadingInvite === invite.id ? '...' : 'Accept'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleRespond(invite.id, false)}
                  disabled={loadingInvite === invite.id}
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
