import { useState } from 'react'
import * as api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Copy, Check, RefreshCw, Link } from 'lucide-react'

interface InviteCodeDisplayProps {
  groupId: string
  inviteCode: string
  onCodeRegenerated?: (newCode: string) => void
}

export function InviteCodeDisplay({ groupId, inviteCode, onCodeRegenerated }: InviteCodeDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/join/${inviteCode}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleRegenerate = async () => {
    if (!confirm('Generate a new invite code? The old code will no longer work.')) return

    setIsRegenerating(true)
    try {
      const result = await api.regenerateInviteCode(groupId)
      if (result.success && result.invite_code) {
        onCodeRegenerated?.(result.invite_code)
      }
    } catch (err) {
      console.error('Failed to regenerate code:', err)
      alert((err as Error).message)
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Invite Code</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="h-8 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            New Code
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-lg px-4 py-2.5 font-mono text-lg tracking-widest text-center select-all">
            {inviteCode}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className="shrink-0"
            title="Copy code"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopyLink} className="w-full">
          <Link className="h-4 w-4" />
          Copy Invite Link
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Share this code with others so they can join your group
        </p>
      </div>
    </Card>
  )
}
