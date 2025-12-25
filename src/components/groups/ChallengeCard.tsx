import { useState } from 'react'
import { Swords, Clock, Trophy, X, Check, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Challenge } from '@/lib/api'

interface ChallengeCardProps {
  challenge: Challenge
  currentGroupId: string
  onRespond: (challengeId: string, accept: boolean) => Promise<void>
  onCancel: (challengeId: string) => Promise<void>
}

function formatTimeRemaining(endTime: string): string {
  const end = new Date(endTime)
  const now = new Date()
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) return 'Ending...'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `${days}d ${hours}h left`
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

function formatScore(score: number): string {
  return score.toFixed(1)
}

export function ChallengeCard({ challenge, currentGroupId, onRespond, onCancel }: ChallengeCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const isChallenger = challenge.challenger_group_id === currentGroupId
  const opponentName = isChallenger ? challenge.challenged_group_name : challenge.challenger_group_name
  const ourScore = isChallenger ? challenge.challenger_score : challenge.challenged_score
  const theirScore = isChallenger ? challenge.challenged_score : challenge.challenger_score
  const ourXp = isChallenger ? challenge.challenger_xp_earned : challenge.challenged_xp_earned
  const theirXp = isChallenger ? challenge.challenged_xp_earned : challenge.challenger_xp_earned
  const ourMembers = isChallenger ? challenge.challenger_member_count : challenge.challenged_member_count
  const theirMembers = isChallenger ? challenge.challenged_member_count : challenge.challenger_member_count

  const isWinner = challenge.winner_group_id === currentGroupId
  const isLoser = challenge.winner_group_id !== null && challenge.winner_group_id !== currentGroupId
  const isTie = challenge.status === 'completed' && challenge.winner_group_id === null

  const handleRespond = async (accept: boolean) => {
    setIsLoading(true)
    try {
      await onRespond(challenge.id, accept)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    setIsLoading(true)
    try {
      await onCancel(challenge.id)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={cn(
      'overflow-hidden',
      challenge.status === 'active' && 'border-primary/50',
      isWinner && 'border-green-500/50 bg-green-500/5',
      isLoser && 'border-red-500/50 bg-red-500/5',
      isTie && 'border-yellow-500/50 bg-yellow-500/5'
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-primary" />
            <span className="font-medium">vs {opponentName}</span>
          </div>
          <Badge variant={
            challenge.status === 'active' ? 'default' :
            challenge.status === 'pending' ? 'secondary' :
            challenge.status === 'completed' ? 'outline' :
            'destructive'
          }>
            {challenge.status === 'active' && 'Active'}
            {challenge.status === 'pending' && (isChallenger ? 'Awaiting Response' : 'Challenge Received')}
            {challenge.status === 'completed' && (isWinner ? 'Victory!' : isLoser ? 'Defeated' : 'Tie')}
            {challenge.status === 'declined' && 'Declined'}
            {challenge.status === 'cancelled' && 'Cancelled'}
          </Badge>
        </div>

        {/* Active Challenge: Scores and Timer */}
        {challenge.status === 'active' && challenge.end_time && (
          <>
            <div className="flex items-center justify-between mb-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatTimeRemaining(challenge.end_time)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={cn(
                'rounded-lg p-3 text-center',
                ourScore > theirScore ? 'bg-green-500/10' : ourScore < theirScore ? 'bg-red-500/10' : 'bg-muted'
              )}>
                <div className="text-xs text-muted-foreground mb-1">Your Group</div>
                <div className="text-2xl font-bold">{formatScore(ourScore)}</div>
                <div className="text-xs text-muted-foreground">XP per active member</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {ourXp.toLocaleString()} XP / {ourMembers} active
                </div>
              </div>
              <div className={cn(
                'rounded-lg p-3 text-center',
                theirScore > ourScore ? 'bg-green-500/10' : theirScore < ourScore ? 'bg-red-500/10' : 'bg-muted'
              )}>
                <div className="text-xs text-muted-foreground mb-1">{opponentName}</div>
                <div className="text-2xl font-bold">{formatScore(theirScore)}</div>
                <div className="text-xs text-muted-foreground">XP per active member</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {theirXp.toLocaleString()} XP / {theirMembers} active
                </div>
              </div>
            </div>
          </>
        )}

        {/* Completed Challenge: Final Result */}
        {challenge.status === 'completed' && (
          <div className="text-center py-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className={cn(
                'h-5 w-5',
                isWinner ? 'text-yellow-500' : isTie ? 'text-yellow-500' : 'text-muted-foreground'
              )} />
              <span className="font-semibold">
                {isWinner && 'Your group won!'}
                {isLoser && `${opponentName} won`}
                {isTie && "It's a tie!"}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Final: {formatScore(ourScore)} vs {formatScore(theirScore)} XP/active member
            </div>
          </div>
        )}

        {/* Pending: Action Buttons */}
        {challenge.status === 'pending' && (
          <div className="mt-3">
            {challenge.can_respond && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleRespond(false)}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                  Decline
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleRespond(true)}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                  Accept
                </Button>
              </div>
            )}
            {challenge.can_cancel && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleCancel}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel Challenge'}
              </Button>
            )}
            {!challenge.can_respond && !challenge.can_cancel && (
              <p className="text-sm text-muted-foreground text-center">
                Waiting for {opponentName} to respond...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
